import type { PhotoAttachment } from '../App'

const DEFAULT_MAX_DIMENSION = 1280
const DEFAULT_JPEG_QUALITY = 0.78

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片读取失败，请换一张再试'))
    image.src = src
  })
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('图片读取失败，请稍后重试'))
    reader.readAsDataURL(file)
  })
}

function fitInside(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }

  const scale = Math.min(maxDimension / width, maxDimension / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export async function createPhotoAttachment(
  file: File,
  options?: {
    maxDimension?: number
    quality?: number
  },
): Promise<PhotoAttachment> {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options?.quality ?? DEFAULT_JPEG_QUALITY
  const size = fitInside(image.naturalWidth, image.naturalHeight, maxDimension)
  const canvas = document.createElement('canvas')

  canvas.width = size.width
  canvas.height = size.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('当前环境不支持图片处理')
  }

  context.drawImage(image, 0, 0, size.width, size.height)

  return {
    id: createId(),
    name: file.name,
    dataUrl: canvas.toDataURL('image/jpeg', quality),
    width: size.width,
    height: size.height,
  }
}
