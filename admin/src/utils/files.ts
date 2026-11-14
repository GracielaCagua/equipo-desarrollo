import type { MediaKind } from '../types'

export interface FileRule {
  accept: string[]
  acceptLabel: string
  maxMB: number
  multiple: boolean
  max: number
  label: string
  hint: string
}

export const FILE_RULES: Record<MediaKind, FileRule> = {
  image: {
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    acceptLabel: 'JPG, PNG o WebP',
    maxMB: 8,
    multiple: true,
    max: 8,
    label: 'Imágenes de la obra',
    hint: 'JPG, PNG o WebP · máximo 8 MB por archivo · hasta 8 imágenes',
  },
  video: {
    accept: ['video/mp4', 'video/webm', 'video/quicktime'],
    acceptLabel: 'MP4, WebM o MOV',
    maxMB: 120,
    multiple: true,
    max: 3,
    label: 'Videos',
    hint: 'MP4, WebM o MOV · máximo 120 MB por archivo · hasta 3 videos',
  },
  document: {
    accept: ['application/pdf'],
    acceptLabel: 'PDF',
    maxMB: 20,
    multiple: true,
    max: 5,
    label: 'Documentos',
    hint: 'PDF · máximo 20 MB por archivo · hasta 5 documentos',
  },
}

export interface ValidationResult {
  valid: File[]
  errors: string[]
}

export function validateFiles(files: File[], kind: MediaKind, currentCount = 0): ValidationResult {
  const rule = FILE_RULES[kind]
  const valid: File[] = []
  const errors: string[] = []

  files.forEach((file) => {
    if (!rule.accept.includes(file.type)) {
      errors.push(`«${file.name}» no es un formato permitido (${rule.acceptLabel}).`)
      return
    }
    if (file.size > rule.maxMB * 1024 * 1024) {
      errors.push(`«${file.name}» supera el tamaño máximo de ${rule.maxMB} MB.`)
      return
    }
    valid.push(file)
  })

  if (currentCount + valid.length > rule.max) {
    errors.push(`Puedes adjuntar hasta ${rule.max} archivos de este tipo.`)
    return { valid: valid.slice(0, Math.max(0, rule.max - currentCount)), errors }
  }

  return { valid, errors }
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No fue posible leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Reduce el peso de las imágenes antes de guardarlas como vista previa
 * en el modo demostración (localStorage).
 */
export async function compressImage(file: File, maxSide = 1400, quality = 0.72): Promise<string> {
  try {
    const dataUrl = await readAsDataUrl(file)
    const image = await loadImage(dataUrl)
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return dataUrl
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return readAsDataUrl(file)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No fue posible procesar la imagen.'))
    image.src = src
  })
}
