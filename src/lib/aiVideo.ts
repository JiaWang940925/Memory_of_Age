import type { Memory } from '../App'

export type AiVideoJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
export type AiVideoModel = 'sadtalker_v1'
export type AiVideoMotionStyle = 'steady' | 'expressive'
export type AiVideoPreprocessMode = 'crop' | 'full'

export interface AvatarAssetInput {
  name: string
  dataUrl: string
}

export interface AiVideoProviderInfo {
  configured: boolean
  provider: string
  recommendedModel: AiVideoModel
  supportedModels: Array<{
    id: AiVideoModel
    label: string
    description: string
  }>
  issues: string[]
  setupGuide: string[]
  localOnly: boolean
}

export interface AiVideoJob {
  id: string
  status: AiVideoJobStatus
  providerTaskId: string | null
  providerStatus: string | null
  progress: number | null
  promptPreview: string
  storyOutline: string[]
  model: AiVideoModel
  motionStyle: AiVideoMotionStyle
  preprocessMode: AiVideoPreprocessMode
  enhanceFace: boolean
  outputUrls: string[]
  errorMessage: string | null
  portraitName: string
  audioName: string
  createdAt: string
  updatedAt: string
}

export interface CreateAiVideoJobInput {
  memories: Memory[]
  portrait: AvatarAssetInput
  drivingAudio: AvatarAssetInput
  narrationText: string
  model: AiVideoModel
  motionStyle: AiVideoMotionStyle
  preprocessMode: AiVideoPreprocessMode
  enhanceFace: boolean
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { message?: string }
  if (!response.ok) {
    throw new Error(data.message ?? '请求失败，请稍后再试')
  }
  return data
}

export function buildDefaultAvatarNarration(memories: Memory[]) {
  const usable = memories
    .filter((memory) => memory.answer.trim().length > 0)
    .slice(0, 4)

  if (!usable.length) {
    return '您好，这是我的人生回忆录。谢谢您愿意听我慢慢讲述这些年走过的路。'
  }

  const opening = usable[0]
  const middle = usable[Math.floor((usable.length - 1) / 2)]
  const closing = usable[usable.length - 1]

  return [
    '您好，这是我的人生回忆录。',
    `我常常会想起${opening.category}里的那一段时光，${opening.answer.replace(/\s+/g, ' ').trim()}`,
    `后来走到${middle.category}，那时候的我一直记得，${middle.answer.replace(/\s+/g, ' ').trim()}`,
    `回头看这一生，${closing.answer.replace(/\s+/g, ' ').trim()}`,
    '谢谢您愿意听我把这些珍贵的记忆慢慢讲出来。',
  ].join('\n')
}

export async function fetchAiVideoProviderInfo() {
  const response = await fetch('/api/ai-video/provider')
  const data = await readJson<{ provider: AiVideoProviderInfo }>(response)
  return data.provider
}

export async function createAiVideoJob(input: CreateAiVideoJobInput) {
  const response = await fetch('/api/ai-video/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const data = await readJson<{ job: AiVideoJob }>(response)
  return data.job
}

export async function fetchAiVideoJob(jobId: string) {
  const response = await fetch(`/api/ai-video/jobs/${jobId}`)
  const data = await readJson<{ job: AiVideoJob }>(response)
  return data.job
}
