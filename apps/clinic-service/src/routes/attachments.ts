import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { withoutEmpty } from '../lib/db.js'
import { patientExists } from '../lib/patients.js'
import { Attachment, type AttachmentDoc } from '../models/index.js'
import { requireRequester } from '../lib/requester.js'
import { getAppointment } from '../lib/services.js'
import { deleteFile, openFile, saveFile } from '../lib/storage.js'

/** Upload limit per file. Keep in sync with the web app and nginx/gateway limits. */
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

/**
 * Total space all uploads together may use. Defaults to 9 GB so the clinic
 * stays inside Cloudflare R2's free 10 GB; set STORAGE_LIMIT_GB to change it.
 */
function storageLimitBytes() {
  const gigabytes = Number(process.env.STORAGE_LIMIT_GB ?? 9)
  return (Number.isFinite(gigabytes) && gigabytes > 0 ? gigabytes : 9) * 1024 ** 3
}

async function storedBytes() {
  const [result] = await Attachment.aggregate<{ total: number }>([
    { $group: { _id: null, total: { $sum: '$sizeBytes' } } },
  ])
  return result?.total ?? 0
}

const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  'application/pdf': (b) =>
    b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) =>
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
}

/** The real file type from its first bytes, ignoring what the browser claims. */
function detectContentType(data: Buffer) {
  const header = new Uint8Array(data.subarray(0, 12))
  return Object.keys(signatures).find((type) => signatures[type]!(header)) ?? null
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(-120)
  return cleaned || 'file'
}

function serialize(attachment: AttachmentDoc) {
  return {
    id: attachment._id,
    patientId: attachment.patientId,
    appointmentId: attachment.appointmentId ?? null,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    note: attachment.note ?? null,
    createdAt: attachment.createdAt,
    uploadedByName: attachment.uploadedByName ?? null,
    // The browser reaches this through nginx (/api) and the gateway (/clinic).
    url: `/api/clinic/attachments/${attachment._id}/file`,
  }
}

const idSchema = { type: 'string', minLength: 36, maxLength: 36 }

export const attachmentRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { patientId: string }; Querystring: { appointmentId?: string } }>(
    '/patients/:patientId/attachments',
    {
      schema: {
        params: { type: 'object', properties: { patientId: idSchema } },
        querystring: {
          type: 'object',
          properties: { appointmentId: idSchema },
        },
      },
    },
    async (request, reply) => {
      if (!requireRequester(request, reply)) return

      const { patientId } = request.params
      if (!(await patientExists(patientId))) {
        return reply.status(404).send({ message: 'Patient not found' })
      }

      const attachments = await Attachment.find({
        patientId,
        ...(request.query.appointmentId && {
          appointmentId: request.query.appointmentId,
        }),
      })
        .sort({ createdAt: -1 })
        .lean()
      return attachments.map(serialize)
    },
  )

  app.post<{ Params: { patientId: string } }>(
    '/patients/:patientId/attachments',
    { schema: { params: { type: 'object', properties: { patientId: idSchema } } } },
    async (request, reply) => {
      const requester = requireRequester(request, reply)
      if (!requester) return

      const patient = { id: request.params.patientId }
      if (!(await patientExists(patient.id))) {
        return reply.status(404).send({ message: 'Patient not found' })
      }

      let fileName = ''
      let data: Buffer | null = null
      let note: string | null = null
      let appointmentId: string | null = null

      try {
        for await (const part of request.parts()) {
          if (part.type === 'file') {
            if (part.fieldname === 'file' && !data) {
              fileName = part.filename
              data = await part.toBuffer()
            } else {
              part.file.resume()
            }
          } else if (part.fieldname === 'note') {
            note = String(part.value).trim().slice(0, 500) || null
          } else if (part.fieldname === 'appointmentId') {
            appointmentId = String(part.value).trim() || null
          }
        }
      } catch (error) {
        if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
          return reply.status(413).send({ message: 'Files must be 15 MB or smaller.' })
        }
        throw error
      }

      if (!data || data.length === 0) {
        return reply.status(400).send({ message: 'Choose a file to upload.' })
      }

      const contentType = detectContentType(data)
      if (!contentType) {
        return reply
          .status(415)
          .send({ message: 'Only PDF, JPG, PNG and WebP files can be uploaded.' })
      }

      if ((await storedBytes()) + data.length > storageLimitBytes()) {
        return reply.status(507).send({
          message:
            'File storage is full. Delete files you no longer need before uploading more.',
        })
      }

      if (appointmentId) {
        const appointment = await getAppointment(appointmentId)
        if (appointment?.patientId !== patient.id) {
          return reply
            .status(400)
            .send({ message: 'That appointment does not belong to this patient.' })
        }
      }

      const id = randomUUID()
      const displayName = fileName.slice(0, 255) || 'file'
      const storageKey = `patients/${patient.id}/${id}-${safeFileName(displayName)}`
      await saveFile(storageKey, data, contentType)

      try {
        const attachment = await Attachment.create(
          withoutEmpty({
            _id: id,
            patientId: patient.id,
            appointmentId,
            uploadedById: requester.userId,
            uploadedByName: requester.name || null,
            fileName: displayName,
            contentType,
            sizeBytes: data.length,
            storageKey,
            note,
          }),
        )
        return reply.status(201).send(serialize(attachment.toObject()))
      } catch (error) {
        // Don't leave an orphaned file behind if the database write fails.
        await deleteFile(storageKey).catch(() => undefined)
        throw error
      }
    },
  )

  app.get<{ Params: { attachmentId: string }; Querystring: { download?: string } }>(
    '/attachments/:attachmentId/file',
    async (request, reply) => {
      if (!requireRequester(request, reply)) return

      const attachment = await Attachment.findById(request.params.attachmentId).lean()
      if (!attachment) return reply.status(404).send({ message: 'File not found' })

      const stream = await openFile(attachment.storageKey)
      if (!stream) return reply.status(404).send({ message: 'File not found' })

      const disposition = request.query.download !== undefined ? 'attachment' : 'inline'
      return reply
        .header('content-type', attachment.contentType)
        .header('content-length', String(attachment.sizeBytes))
        .header(
          'content-disposition',
          `${disposition}; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        )
        .header('cache-control', 'private, no-store')
        .header('x-content-type-options', 'nosniff')
        .send(stream)
    },
  )

  app.delete<{ Params: { attachmentId: string } }>(
    '/attachments/:attachmentId',
    async (request, reply) => {
      if (!requireRequester(request, reply, 'editRecords')) return

      const attachment = await Attachment.findById(request.params.attachmentId).lean()
      if (!attachment) return reply.status(404).send({ message: 'File not found' })

      await deleteFile(attachment.storageKey)
      await Attachment.deleteOne({ _id: attachment._id })
      return reply.status(204).send()
    },
  )
}
