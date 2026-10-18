import { useEffect, useRef, useState } from 'react'
import {
  deleteAttachment,
  getAttachments,
  uploadAttachment,
} from '../api/clinic'
import type { Attachment } from '../types/clinic'
import { ACCEPTED_FILES, formatBytes, prepareFile } from '../utils/files'
import { useCan } from './ViewerProvider'
import type { Appointment } from '../types/schedule'


interface AttachmentsPanelProps {
  patientId: string
  /** Show only this appointment's files and link new uploads to it. */
  appointmentId?: string
  /** Patient appointments that a new upload can optionally be linked to. */
  appointments?: Appointment[]
  title?: string
  compact?: boolean
}

export default function AttachmentsPanel({
  patientId,
  appointmentId,
  appointments = [],
  title = 'Documents & images',
  compact = false,
}: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    let isActive = true

    getAttachments(patientId, appointmentId)
      .then((data) => {
        if (isActive) setAttachments(data)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load files',
        )
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [patientId, appointmentId])

  async function handleUpload(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)
    const selected = form.get('file')

    if (!(selected instanceof File) || selected.size === 0) {
      setError('Choose a PDF or image to upload.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const file = await prepareFile(selected)
      const note = String(form.get('note') ?? '').trim()
      const linkedAppointmentId =
        appointmentId ?? (String(form.get('appointmentId') ?? '') || undefined)

      const attachment = await uploadAttachment(patientId, {
        file,
        ...(note && { note }),
        ...(linkedAppointmentId && { appointmentId: linkedAppointmentId }),
      })

      setAttachments((current) => [attachment, ...current])
      formRef.current?.reset()
      setIsFormOpen(false)
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Unable to upload the file',
      )
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(attachmentId: string) {
    setError(null)
    try {
      await deleteAttachment(attachmentId)
      setAttachments((current) =>
        current.filter((attachment) => attachment.id !== attachmentId),
      )
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete the file',
      )
    } finally {
      setPendingDeleteId(null)
    }
  }

  const images = attachments.filter((item) =>
    item.contentType.startsWith('image/'),
  )
  const documents = attachments.filter(
    (item) => !item.contentType.startsWith('image/'),
  )
  const appointmentTitles = new Map(
    appointments.map((appointment) => [appointment.id, appointment]),
  )

  return (
    <section
      className={
        compact
          ? 'rounded-xl border border-slate-200 p-4'
          : 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className={
              compact
                ? 'text-xs font-semibold uppercase tracking-wide text-slate-500'
                : 'text-lg font-bold text-slate-900'
            }
          >
            {title}
          </h2>
          {!compact && (
            <p className="mt-1 text-sm text-slate-500">
              Photos, X-rays, blood tests and other lab results.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null)
            setIsFormOpen((current) => !current)
          }}
          className={
            compact
              ? 'text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline'
              : 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700'
          }
        >
          {isFormOpen ? 'Cancel' : 'Upload file'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isFormOpen && (
        <form
          ref={formRef}
          onSubmit={(formEvent) => void handleUpload(formEvent)}
          className="mt-4 grid gap-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4 md:grid-cols-2"
        >
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              File
            </span>
            <input
              name="file"
              type="file"
              required
              accept={ACCEPTED_FILES}
              disabled={isUploading}
              className="block w-full rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
            <span className="mt-1 block text-xs text-slate-500">
              PDF, JPG, PNG or WebP up to 15 MB. Large photos are resized
              automatically.
            </span>
          </label>

          <label className={`block ${appointmentId ? 'md:col-span-2' : ''}`}>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Note <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              name="note"
              maxLength={500}
              placeholder="e.g. Blood panel, left foreleg X-ray"
              disabled={isUploading}
              className={inputStyles}
            />
          </label>

          {!appointmentId && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Link to appointment{' '}
                <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <select
                name="appointmentId"
                defaultValue=""
                disabled={isUploading}
                className={inputStyles}
              >
                <option value="">Not linked</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {formatShortDate(appointment.startsAt)} · {appointment.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={isUploading}
              className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading files…</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-slate-500">
            {appointmentId
              ? 'No files attached to this appointment.'
              : 'No files uploaded for this patient yet.'}
          </p>
        ) : (
          <div className="space-y-5">
            {images.length > 0 && (
              <div
                className={`grid gap-3 ${
                  compact
                    ? 'grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
                }`}
              >
                {images.map((image) => (
                  <figure
                    key={image.id}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block aspect-square overflow-hidden bg-slate-100"
                    >
                      {/* Files are served by the authenticated clinic service, never publicly. */}
                      <img
                        src={image.url}
                        alt={image.note ?? image.fileName}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </a>
                    <figcaption className="p-2">
                      <p
                        className="truncate text-xs font-semibold text-slate-700"
                        title={image.note ?? image.fileName}
                      >
                        {image.note ?? image.fileName}
                      </p>
                      <FileMeta
                        attachment={image}
                        appointment={
                          image.appointmentId
                            ? appointmentTitles.get(image.appointmentId)
                            : undefined
                        }
                        showAppointment={!appointmentId}
                      />
                      <FileActions
                        attachment={image}
                        isConfirming={pendingDeleteId === image.id}
                        onAskDelete={() => setPendingDeleteId(image.id)}
                        onCancelDelete={() => setPendingDeleteId(null)}
                        onDelete={() => void handleDelete(image.id)}
                      />
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            {documents.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {documents.map((document) => (
                  <li
                    key={document.id}
                    className="flex flex-wrap items-center gap-3 p-3"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-xs font-bold text-rose-700">
                      PDF
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate font-semibold text-slate-900 hover:text-teal-700"
                        title={document.fileName}
                      >
                        {document.note ?? document.fileName}
                      </a>
                      <FileMeta
                        attachment={document}
                        appointment={
                          document.appointmentId
                            ? appointmentTitles.get(document.appointmentId)
                            : undefined
                        }
                        showAppointment={!appointmentId}
                        showFileName={Boolean(document.note)}
                      />
                    </div>
                    <FileActions
                      attachment={document}
                      isConfirming={pendingDeleteId === document.id}
                      onAskDelete={() => setPendingDeleteId(document.id)}
                      onCancelDelete={() => setPendingDeleteId(null)}
                      onDelete={() => void handleDelete(document.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function FileMeta({
  attachment,
  appointment,
  showAppointment,
  showFileName = false,
}: {
  attachment: Attachment
  appointment?: Appointment
  showAppointment: boolean
  showFileName?: boolean
}) {
  const parts = [
    showFileName ? attachment.fileName : null,
    formatBytes(attachment.sizeBytes),
    formatShortDate(attachment.createdAt),
    attachment.uploadedByName,
  ].filter(Boolean)

  return (
    <div className="mt-0.5 text-xs text-slate-500">
      <p className="truncate">{parts.join(' · ')}</p>
      {showAppointment && attachment.appointmentId && (
        <p className="truncate font-medium text-teal-700">
          {appointment
            ? `${formatShortDate(appointment.startsAt)} · ${appointment.title}`
            : 'Linked to an appointment'}
        </p>
      )}
    </div>
  )
}

function FileActions({
  attachment,
  isConfirming,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  attachment: Attachment
  isConfirming: boolean
  onAskDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}) {
  const canDelete = useCan('editRecords')

  if (isConfirming) {
    return (
      <div className="mt-1.5 flex items-center gap-3 text-xs font-semibold">
        <span className="text-slate-600">Delete?</span>
        <button
          type="button"
          onClick={onDelete}
          className="text-red-700 hover:underline"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={onCancelDelete}
          className="text-slate-500 hover:underline"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div className="mt-1.5 flex items-center gap-3 text-xs font-semibold">
      <a
        href={`${attachment.url}?download`}
        className="text-teal-700 hover:underline"
      >
        Download
      </a>
      {canDelete && (
        <button
          type="button"
          onClick={onAskDelete}
          aria-label={`Delete ${attachment.fileName}`}
          className="text-slate-500 hover:text-red-700 hover:underline"
        >
          Delete
        </button>
      )}
    </div>
  )
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100'
