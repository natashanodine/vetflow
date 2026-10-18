// Keep in sync with MAX_ATTACHMENT_BYTES in clinic-service.
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 2400

export const ACCEPTED_FILES =
  'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif'

/**
 * Resizes large or unsupported photos (e.g. iPhone HEIC) to a JPEG so they
 * fit the upload limit and display in every browser.
 */
export async function prepareFile(file: File): Promise<File> {
  const isImage = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)

  if (!isImage) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        'This PDF is larger than 15 MB. Please compress it or split it into smaller files.',
      )
    }
    return file
  }

  const isWebFriendly = ['image/jpeg', 'image/png', 'image/webp'].includes(
    file.type,
  )
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    if (isWebFriendly && file.size <= MAX_UPLOAD_BYTES) return file
    throw new Error(
      'This image format could not be read. Please upload a JPG or PNG.',
    )
  }

  const largestSide = Math.max(bitmap.width, bitmap.height)
  if (
    isWebFriendly &&
    file.size <= MAX_UPLOAD_BYTES &&
    largestSide <= MAX_IMAGE_DIMENSION
  ) {
    bitmap.close()
    return file
  }

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / largestSide)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
      return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
    }
  }

  throw new Error('This image is too large to upload, even after resizing.')
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
