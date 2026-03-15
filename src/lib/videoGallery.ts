export interface MemoryVideoItem {
  id: string
  title: string
  fileName: string
  url: string
}

const videoModules = import.meta.glob('../../video/*.mp4', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

function extractFileName(path: string) {
  return path.split('/').pop() ?? path
}

function buildVideoId(fileName: string) {
  return fileName.replace(/\.mp4$/i, '')
}

function buildVideoTitle(fileName: string, index: number) {
  const baseName = fileName.replace(/\.mp4$/i, '')
  const looksHashed = /^[a-f0-9]{16,}$/i.test(baseName)
  const normalized = baseName.replace(/[_-]+/g, ' ').trim()

  if (!normalized || looksHashed) {
    return `回忆影像 ${String(index + 1).padStart(2, '0')}`
  }

  return normalized
}

export const memoryVideos: MemoryVideoItem[] = Object.entries(videoModules)
  .map(([path, url]) => ({
    fileName: extractFileName(path),
    url,
  }))
  .sort((left, right) => left.fileName.localeCompare(right.fileName))
  .map((item, index) => ({
    id: buildVideoId(item.fileName),
    title: buildVideoTitle(item.fileName, index),
    fileName: item.fileName,
    url: item.url,
  }))
