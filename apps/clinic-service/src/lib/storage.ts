import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Readable } from 'node:stream'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

/**
 * Uploaded files are stored in Cloudflare R2 when R2_* settings are present
 * (production), otherwise in a local folder (Docker volume / development).
 */
interface Storage {
  save(key: string, data: Buffer, contentType: string): Promise<void>
  open(key: string): Promise<Readable | null>
  remove(key: string): Promise<void>
}

function localStorage(): Storage {
  const root = path.resolve(process.env.UPLOADS_DIR ?? './uploads')

  function filePath(key: string) {
    const resolved = path.resolve(root, key)
    if (!resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error('Invalid storage key')
    }
    return resolved
  }

  return {
    async save(key, data) {
      const target = filePath(key)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, data)
    },
    async open(key) {
      const target = filePath(key)
      const exists = await stat(target).then(
        () => true,
        () => false,
      )
      return exists ? createReadStream(target) : null
    },
    async remove(key) {
      await rm(filePath(key), { force: true })
    },
  }
}

function r2Storage(bucket: string): Storage {
  const endpoint =
    process.env.R2_ENDPOINT ??
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

  const client = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  })

  return {
    async save(key, data, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
        }),
      )
    },
    async open(key) {
      try {
        const object = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        )
        return (object.Body as Readable | undefined) ?? null
      } catch (error) {
        if (error instanceof NoSuchKey) return null
        throw error
      }
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    },
  }
}

const storage = process.env.R2_BUCKET
  ? r2Storage(process.env.R2_BUCKET)
  : localStorage()

export const storageKind = process.env.R2_BUCKET ? 'r2' : 'local'

export function saveFile(key: string, data: Buffer, contentType: string) {
  return storage.save(key, data, contentType)
}

export function openFile(key: string) {
  return storage.open(key)
}

export function deleteFile(key: string) {
  return storage.remove(key)
}
