import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  ArrowLeft,
  Camera,
  Clock,
  Download,
  Film,
  Heart,
  Image as ImageIcon,
  MapPinned,
  Mic,
  Route,
  ShieldCheck,
  Sparkles,
  Square,
  Tag,
  Upload,
} from 'lucide-react'
import type { GeneratedAvatar, Memory, PhotoAttachment } from '../App'
import { createPhotoAttachment } from '../lib/images'
import { buildStoryPhotoItems, openMemoryStoryPdf } from '../lib/memoryBook'
import {
  buildDefaultAvatarNarration,
  createAiVideoJob,
  fetchAiVideoJob,
  fetchAiVideoProviderInfo,
  type AiVideoJob,
  type AiVideoMotionStyle,
  type AiVideoPreprocessMode,
  type AiVideoProviderInfo,
} from '../lib/aiVideo'
import { historicalProfiles } from '../lib/historicalProfiles'
import type { UserProfile } from '../lib/userProfile'

interface MemoryPageProps {
  memories: Memory[]
  userProfile: UserProfile | null
  onBack: () => void
  onOpenJourney: () => void
  generatedAvatar: GeneratedAvatar | null
  onAvatarGenerated: (avatar: GeneratedAvatar | null) => void
}

interface AudioAttachment {
  name: string
  dataUrl: string
  objectUrl: string
}

const motionStyleOptions: Array<{ value: AiVideoMotionStyle; label: string; description: string }> = [
  {
    value: 'steady',
    label: '沉稳讲述',
    description: '头部动作更克制，适合老照片和温和回忆。',
  },
  {
    value: 'expressive',
    label: '更有神态',
    description: '保留更多头部动作，画面会更生动一些。',
  },
]

const preprocessOptions: Array<{
  value: AiVideoPreprocessMode
  label: string
  description: string
}> = [
  {
    value: 'crop',
    label: '聚焦头像',
    description: '优先裁切到脸部附近，适合做讲述者头像。',
  },
  {
    value: 'full',
    label: '保留原图',
    description: '尽量保留更多背景与构图，适合完整老照片。',
  },
]

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('文件读取失败，请稍后再试'))
    reader.readAsDataURL(file)
  })
}

function buildPortraitSummary(
  portrait: PhotoAttachment | null,
  customPortraitSelected: boolean,
  relatedCategory: string | null,
) {
  if (!portrait) {
    return '还没有选择头像照片'
  }

  if (customPortraitSelected) {
    return `当前使用单独上传的头像照片：${portrait.name}`
  }

  if (relatedCategory) {
    return `当前头像来自“${relatedCategory}”这段回忆的照片`
  }

  return `当前头像照片：${portrait.name}`
}

function buildAudioSummary(audioAttachment: AudioAttachment | null) {
  if (!audioAttachment) {
    return 'SadTalker 需要一段讲述音频，可直接录音，也可上传已录好的音频文件'
  }

  return `当前已准备好讲述音频：${audioAttachment.name}`
}

function getJobStatusText(job: AiVideoJob | null) {
  if (!job) {
    return '尚未发起数字人生成任务'
  }

  if (job.status === 'SUCCEEDED') {
    return '数字人视频已生成完成，可以直接预览或下载保存'
  }

  if (job.status === 'FAILED') {
    return job.errorMessage ?? '数字人生成失败，请检查本地 SadTalker 配置后重试'
  }

  if (job.providerStatus === 'CONVERTING_AUDIO') {
    return '正在整理并转换讲述音频'
  }

  if (job.providerStatus === 'RUNNING_SADTALKER') {
    return 'SadTalker 正在本地合成数字人视频'
  }

  return '任务已提交，正在准备本地生成素材'
}

export function MemoryPage({
  memories,
  userProfile,
  onBack,
  onOpenJourney,
  generatedAvatar,
  onAvatarGenerated,
}: MemoryPageProps) {
  const [providerInfo, setProviderInfo] = useState<AiVideoProviderInfo | null>(null)
  const [providerMessage, setProviderMessage] = useState('正在检查 SadTalker 本地服务状态')
  const [job, setJob] = useState<AiVideoJob | null>(null)
  const [motionStyle, setMotionStyle] = useState<AiVideoMotionStyle>('steady')
  const [preprocessMode, setPreprocessMode] = useState<AiVideoPreprocessMode>('crop')
  const [enhanceFace, setEnhanceFace] = useState(true)
  const [narrationText, setNarrationText] = useState(() => buildDefaultAvatarNarration(memories))
  const [selectedPortraitId, setSelectedPortraitId] = useState('')
  const [customPortrait, setCustomPortrait] = useState<PhotoAttachment | null>(null)
  const [portraitStatus, setPortraitStatus] = useState('优先从回忆里的老照片里挑一张，也支持单独上传一张正脸照')
  const [audioAttachment, setAudioAttachment] = useState<AudioAttachment | null>(null)
  const [audioStatus, setAudioStatus] = useState('建议录一段 10 到 40 秒的讲述音频，也可以上传音频文件')
  const [isSubmittingJob, setIsSubmittingJob] = useState(false)
  const [isPreparingPortrait, setIsPreparingPortrait] = useState(false)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [storyExportStatus, setStoryExportStatus] = useState(
    '会把多次口述按时间顺序整理成一篇连贯文章，并可另存为 PDF 交给家人保存',
  )
  const portraitInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const hasEditedNarrationRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const pendingAvatarSnapshotRef = useRef<{
    portraitDataUrl: string
    narrationText: string
  } | null>(null)

  const allPhotos = memories.flatMap((memory) =>
    memory.photos.map((photo) => ({
      photo,
      category: memory.category,
      memoryId: memory.id,
    })),
  )
  const defaultNarration = buildDefaultAvatarNarration(memories)
  const matchedPortraitItem = allPhotos.find((item) => item.photo.id === selectedPortraitId) ?? null
  const selectedPortrait = customPortrait ?? matchedPortraitItem?.photo ?? null
  const portraitSummary = buildPortraitSummary(
    selectedPortrait,
    Boolean(customPortrait),
    matchedPortraitItem?.category ?? null,
  )
  const latestVideoUrl =
    (job?.status === 'SUCCEEDED' ? job.outputUrls[0] : null) ?? generatedAvatar?.videoUrl ?? ''
  const latestPortraitDataUrl =
    (job?.status === 'SUCCEEDED' ? pendingAvatarSnapshotRef.current?.portraitDataUrl : null)
    ?? generatedAvatar?.portraitDataUrl
    ?? selectedPortrait?.dataUrl
    ?? ''
  const latestNarrationText =
    (job?.status === 'SUCCEEDED' ? job.promptPreview : null)
    ?? generatedAvatar?.narrationText
    ?? narrationText

  useEffect(() => {
    let cancelled = false

    const loadProviderInfo = async () => {
      try {
        const info = await fetchAiVideoProviderInfo()
        if (cancelled) {
          return
        }

        setProviderInfo(info)
        setProviderMessage(
          info.configured
            ? 'SadTalker 本地服务已连接，照片和讲述音频会在本机生成数字人视频'
            : 'SadTalker 尚未完成本地配置，请先按下方步骤安装并设置环境变量',
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        setProviderMessage(
          error instanceof Error
            ? error.message
            : 'SadTalker 服务未启动，请先运行 npm run dev:server 或 npm run dev:full',
        )
      }
    }

    void loadProviderInfo()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (hasEditedNarrationRef.current) {
      return
    }

    setNarrationText(defaultNarration)
  }, [defaultNarration])

  useEffect(() => {
    if (customPortrait) {
      return
    }

    if (allPhotos.some((item) => item.photo.id === selectedPortraitId)) {
      return
    }

    setSelectedPortraitId(allPhotos[0]?.photo.id ?? '')
  }, [allPhotos, customPortrait, selectedPortraitId])

  useEffect(() => {
    if (!job || !['QUEUED', 'RUNNING'].includes(job.status)) {
      return
    }

    const intervalId = window.setInterval(async () => {
      try {
        const nextJob = await fetchAiVideoJob(job.id)
        setJob(nextJob)
      } catch (error) {
        setProviderMessage(
          error instanceof Error ? error.message : '数字人任务状态查询失败',
        )
      }
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [job?.id, job?.status])

  useEffect(() => {
    const outputUrl = job?.outputUrls[0]

    if (job?.status !== 'SUCCEEDED' || !outputUrl || !pendingAvatarSnapshotRef.current) {
      return
    }

    onAvatarGenerated({
      jobId: job.id,
      provider: 'SadTalker',
      videoUrl: outputUrl,
      portraitDataUrl: pendingAvatarSnapshotRef.current.portraitDataUrl,
      narrationText: pendingAvatarSnapshotRef.current.narrationText,
      createdAt: job.updatedAt,
    })
  }, [job?.id, job?.outputUrls[0], job?.status, job?.updatedAt, onAvatarGenerated])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioAttachment?.objectUrl) {
        URL.revokeObjectURL(audioAttachment.objectUrl)
      }
    }
  }, [audioAttachment?.objectUrl])

  const getEmotionIcon = (emotion: 'positive' | 'neutral' | 'attention') => {
    switch (emotion) {
      case 'positive':
        return <span className="emotion-tag-positive">温馨回忆</span>
      case 'attention':
        return <span className="emotion-tag-attention">人生感悟</span>
      default:
        return <span className="emotion-tag-neutral">生活点滴</span>
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const groupedMemories = memories.reduce((accumulator, memory) => {
    if (!accumulator[memory.category]) {
      accumulator[memory.category] = []
    }
    accumulator[memory.category].push(memory)
    return accumulator
  }, {} as Record<string, Memory[]>)

  const totalPhotoCount = memories.reduce(
    (count, memory) => count + memory.photos.length,
    0,
  )
  const storyPhotoItems = buildStoryPhotoItems(memories)
  const memoryCategories = Object.keys(groupedMemories)

  const handleOpenStoryPdf = () => {
    try {
      openMemoryStoryPdf(memories, userProfile)
      setStoryExportStatus('打印版已打开，内容会以一篇连贯文章呈现，可直接选择“另存为 PDF”')
    } catch (error) {
      setStoryExportStatus(
        error instanceof Error ? error.message : '打印版打开失败，请稍后重试',
      )
    }
  }

  const openPortraitPicker = () => {
    if (isPreparingPortrait || isSubmittingJob) {
      return
    }

    portraitInputRef.current?.click()
  }

  const openAudioPicker = () => {
    if (isRecordingAudio || isSubmittingJob) {
      return
    }

    audioInputRef.current?.click()
  }

  const handlePortraitUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setIsPreparingPortrait(true)
    setPortraitStatus('正在整理头像照片')

    try {
      const portrait = await createPhotoAttachment(file, {
        maxDimension: 1024,
        quality: 0.86,
      })
      setCustomPortrait(portrait)
      setPortraitStatus(`已选中单独上传的头像照片：${portrait.name}`)
    } catch (error) {
      setPortraitStatus(
        error instanceof Error ? error.message : '头像照片处理失败，请换一张再试',
      )
    } finally {
      setIsPreparingPortrait(false)
    }
  }

  const setAudioFromBlob = async (blob: Blob, name: string) => {
    const dataUrl = await fileToDataUrl(blob)
    const nextAttachment = {
      name,
      dataUrl,
      objectUrl: URL.createObjectURL(blob),
    }

    if (audioAttachment?.objectUrl) {
      URL.revokeObjectURL(audioAttachment.objectUrl)
    }

    setAudioAttachment(nextAttachment)
    setAudioStatus(`已准备好讲述音频：${name}`)
  }

  const handleAudioUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setAudioStatus('正在读取音频文件')

    try {
      await setAudioFromBlob(file, file.name)
    } catch (error) {
      setAudioStatus(
        error instanceof Error ? error.message : '音频读取失败，请稍后再试',
      )
    }
  }

  const startAudioRecording = async () => {
    if (isRecordingAudio || isSubmittingJob) {
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setAudioStatus('当前浏览器不支持直接录音，请改为上传音频文件')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const timeLabel = new Date().toISOString().replace(/[:.]/g, '-')

      mediaRecorderRef.current = recorder
      mediaStreamRef.current = stream
      audioChunksRef.current = []
      setAudioStatus('录音中，请直接朗读下方讲述词')
      setIsRecordingAudio(true)

      recorder.ondataavailable = (recordEvent) => {
        if (recordEvent.data.size > 0) {
          audioChunksRef.current.push(recordEvent.data)
        }
      }

      recorder.onerror = () => {
        setAudioStatus('录音失败，请改用上传音频文件')
        setIsRecordingAudio(false)
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.onstop = async () => {
        setIsRecordingAudio(false)
        stream.getTracks().forEach((track) => track.stop())

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        if (blob.size === 0) {
          setAudioStatus('没有录到有效声音，请重新录一次')
          return
        }

        try {
          await setAudioFromBlob(blob, `memory-voice-${timeLabel}.webm`)
        } catch (error) {
          setAudioStatus(
            error instanceof Error ? error.message : '录音文件处理失败，请稍后重试',
          )
        }
      }

      recorder.start()
    } catch (error) {
      setIsRecordingAudio(false)
      setAudioStatus(
        error instanceof Error ? error.message : '无法打开麦克风，请改用上传音频文件',
      )
    }
  }

  const stopAudioRecording = () => {
    mediaRecorderRef.current?.stop()
  }

  const handleGenerateVideo = async () => {
    if (isSubmittingJob) {
      return
    }

    if (!providerInfo?.configured) {
      setProviderMessage('SadTalker 尚未配置完成，请先按下方说明安装本地环境')
      return
    }

    if (!selectedPortrait) {
      setPortraitStatus('请先选择一张正脸清晰的照片作为数字人头像')
      return
    }

    if (!audioAttachment) {
      setAudioStatus('请先录制或上传一段讲述音频')
      return
    }

    setIsSubmittingJob(true)
    setProviderMessage('正在提交 SadTalker 本地任务')
    pendingAvatarSnapshotRef.current = {
      portraitDataUrl: selectedPortrait.dataUrl,
      narrationText: narrationText.trim() || defaultNarration,
    }

    try {
      const nextJob = await createAiVideoJob({
        memories,
        portrait: {
          name: selectedPortrait.name,
          dataUrl: selectedPortrait.dataUrl,
        },
        drivingAudio: {
          name: audioAttachment.name,
          dataUrl: audioAttachment.dataUrl,
        },
        narrationText: narrationText.trim() || defaultNarration,
        model: 'sadtalker_v1',
        motionStyle,
        preprocessMode,
        enhanceFace,
      })

      setJob(nextJob)
      setProviderMessage('任务已提交到 SadTalker，本地生成中')
    } catch (error) {
      setProviderMessage(
        error instanceof Error ? error.message : '数字人任务创建失败，请稍后再试',
      )
    } finally {
      setIsSubmittingJob(false)
    }
  }

  if (memories.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-5xl items-center gap-3 sm:gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-foreground hover:bg-accent/80 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-elder-xl font-bold text-foreground">我的回忆录</h1>
              <p className="text-elder-sm text-muted-foreground">
                先积累一些回忆，才能生成数字人讲述视频
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-accent mx-auto mb-6 flex items-center justify-center">
              <Heart className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-elder-xl font-semibold text-foreground mb-3">
              开始记录您的故事
            </h2>
            <p className="text-elder-base text-muted-foreground max-w-sm mx-auto">
              先积累一些文字或照片，后面才能把这些回忆变成会讲述的数字人视频
            </p>
            <button onClick={onBack} className="btn-primary mt-8 w-full sm:w-auto">
              开始对话
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-foreground hover:bg-accent/80 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-elder-xl font-bold text-foreground">我的回忆录</h1>
            <p className="text-elder-sm text-muted-foreground">
              已记录 {memories.length} 段回忆，收纳 {totalPhotoCount} 张照片
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-10">
          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <article className="relative overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-6 md:px-8 md:py-8">
              <div className="journey-noise absolute inset-0 opacity-65" />
              <div className="relative space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <MapPinned className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground mb-2">数字人回忆地图</h2>
                    <p className="text-elder-base text-muted-foreground">
                      回忆录写完后，可以进入地图平台。现在还可以先用一张照片和一段讲述音频，生成能在地图里出场的数字人视频。
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-3xl bg-accent/35 px-4 py-4">
                    <p className="text-elder-sm text-muted-foreground">场景数量</p>
                    <p className="mt-2 text-elder-base font-semibold text-foreground">
                      {memories.length} 个站点
                    </p>
                  </div>
                  <div className="rounded-3xl bg-accent/35 px-4 py-4">
                    <p className="text-elder-sm text-muted-foreground">照片素材</p>
                    <p className="mt-2 text-elder-base font-semibold text-foreground">
                      {totalPhotoCount} 张
                    </p>
                  </div>
                  <div className="rounded-3xl bg-accent/35 px-4 py-4">
                    <p className="text-elder-sm text-muted-foreground">历史人物</p>
                    <p className="mt-2 text-elder-base font-semibold text-foreground">
                      {historicalProfiles.length} 位
                    </p>
                  </div>
                </div>

                <p className="text-elder-base text-muted-foreground">
                  {generatedAvatar
                    ? `当前已生成一段 SadTalker 数字人视频，时间：${formatDate(generatedAvatar.createdAt)}`
                    : '先生成一段数字人讲述视频，再进入地图，会更像真实的人生口述展览。'}
                </p>

                <button onClick={onOpenJourney} className="btn-primary w-full sm:w-auto">
                  <Route className="w-6 h-6" />
                  进入数字人平台
                </button>
              </div>
            </article>

            <article className="card-warm space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-elder-lg font-semibold text-foreground mb-2">SadTalker 数字人工作流</h2>
                  <p className="text-elder-base text-muted-foreground">
                    这条链路不再走云端电影模型，而是用本地 SadTalker 把单张人像照片和讲述音频合成会说话的老人数字人。
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-3xl bg-accent/30 px-5 py-4">
                  <p className="text-elder-base font-semibold text-foreground">1. 选头像照片</p>
                  <p className="mt-2 text-elder-sm text-muted-foreground">
                    可以直接从回忆里的老照片挑，也可以单独上传一张正脸更清晰的照片。
                  </p>
                </div>
                <div className="rounded-3xl bg-accent/30 px-5 py-4">
                  <p className="text-elder-base font-semibold text-foreground">2. 准备讲述音频</p>
                  <p className="mt-2 text-elder-sm text-muted-foreground">
                    可以直接录音，也可以上传已经录好的音频文件。SadTalker 会按照这段音频驱动口型和表情。
                  </p>
                </div>
                <div className="rounded-3xl bg-accent/30 px-5 py-4">
                  <p className="text-elder-base font-semibold text-foreground">3. 本地生成与预览</p>
                  <p className="mt-2 text-elder-sm text-muted-foreground">
                    生成成功后，这段视频会直接回到当前网页，也会同步进回忆地图页面展示。
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <article className="card-warm space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Film className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-elder-lg font-semibold text-foreground mb-2">SadTalker 数字人视频</h2>
                  <p className="text-elder-base text-muted-foreground">
                    当前服务状态、照片、音频和讲述词都准备好后，就可以发起本地数字人生成任务。
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-accent/40 p-5 space-y-3">
                <div className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span className="text-elder-base font-semibold">当前服务状态</span>
                </div>
                <p className="text-elder-base text-muted-foreground">{providerMessage}</p>
                <p className="text-elder-sm text-muted-foreground">
                  当前链路默认按本地处理设计，不再把整理后的提示词发送到云端视频模型。
                </p>
                {providerInfo?.issues.length ? (
                  <div className="grid gap-2 pt-2">
                    {providerInfo.issues.map((issue) => (
                      <p key={issue} className="text-elder-sm text-warning">
                        {issue}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card-warm shadow-none bg-background border-dashed">
                  <div className="flex items-center gap-2 text-foreground">
                    <Camera className="w-5 h-5 text-primary" />
                    <span className="text-elder-base font-semibold">头像照片</span>
                  </div>
                  <p className="mt-3 text-elder-sm text-muted-foreground">{portraitSummary}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={openPortraitPicker} className="btn-outline">
                      <Upload className="w-5 h-5" />
                      单独上传头像
                    </button>
                    {customPortrait ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPortrait(null)
                          setPortraitStatus('已切回回忆录里的照片素材')
                        }}
                        className="btn-outline"
                      >
                        使用回忆照片
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-elder-sm text-muted-foreground">{portraitStatus}</p>
                </div>

                <div className="card-warm shadow-none bg-background border-dashed">
                  <div className="flex items-center gap-2 text-foreground">
                    <Mic className="w-5 h-5 text-primary" />
                    <span className="text-elder-base font-semibold">讲述音频</span>
                  </div>
                  <p className="mt-3 text-elder-sm text-muted-foreground">
                    {buildAudioSummary(audioAttachment)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void startAudioRecording()
                      }}
                      disabled={isRecordingAudio}
                      className="btn-outline disabled:opacity-50"
                    >
                      <Mic className="w-5 h-5" />
                      开始录音
                    </button>
                    <button
                      type="button"
                      onClick={stopAudioRecording}
                      disabled={!isRecordingAudio}
                      className="btn-outline disabled:opacity-50"
                    >
                      <Square className="w-5 h-5" />
                      停止录音
                    </button>
                    <button type="button" onClick={openAudioPicker} className="btn-outline">
                      <Upload className="w-5 h-5" />
                      上传音频
                    </button>
                  </div>
                  <p className="mt-3 text-elder-sm text-muted-foreground">{audioStatus}</p>
                  {audioAttachment ? (
                    <audio controls src={audioAttachment.objectUrl} className="mt-4 w-full" />
                  ) : null}
                </div>
              </div>

              {allPhotos.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-elder-base font-semibold text-foreground">从回忆录照片里选择头像</h3>
                    <span className="text-elder-sm text-muted-foreground">
                      共 {allPhotos.length} 张可选
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {allPhotos.map((item) => {
                      const isActive = !customPortrait && item.photo.id === selectedPortraitId
                      return (
                        <button
                          key={item.photo.id}
                          type="button"
                          onClick={() => {
                            setCustomPortrait(null)
                            setSelectedPortraitId(item.photo.id)
                            setPortraitStatus(`已选中“${item.category}”里的照片作为头像`)
                          }}
                          className={`overflow-hidden rounded-3xl border text-left transition-all ${
                            isActive
                              ? 'border-primary shadow-warm'
                              : 'border-border bg-accent/15 hover:border-primary/50'
                          }`}
                        >
                          <img
                            src={item.photo.dataUrl}
                            alt={item.photo.name}
                            className="h-48 w-full object-cover"
                          />
                          <div className="space-y-2 px-4 py-4">
                            <p className="text-elder-base font-semibold text-foreground line-clamp-1">
                              {item.category}
                            </p>
                            <p className="text-elder-sm text-muted-foreground truncate">
                              {item.photo.name}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-accent/20 px-5 py-5">
                  <p className="text-elder-base text-muted-foreground">
                    目前回忆录里还没有照片，建议先补充几张老照片，或直接上传一张头像照。
                  </p>
                </div>
              )}

              {selectedPortrait ? (
                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-sm text-muted-foreground">当前头像预览</p>
                  <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-start">
                    <img
                      src={selectedPortrait.dataUrl}
                      alt={selectedPortrait.name}
                      className="h-56 w-full max-w-[14rem] rounded-3xl border border-border bg-accent/20 object-cover sm:w-56"
                    />
                    <div className="space-y-3">
                      <p className="text-elder-base text-foreground">{portraitSummary}</p>
                      <p className="text-elder-sm text-muted-foreground">
                        建议选择正脸、光线均匀、人物占画面较大的照片，这样 SadTalker 的口型和表情会更稳定。
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-elder-sm text-muted-foreground">动作风格</span>
                  <select
                    value={motionStyle}
                    onChange={(event) => setMotionStyle(event.target.value as AiVideoMotionStyle)}
                    className="input-warm min-h-[4.2rem] py-3"
                  >
                    {motionStyleOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-elder-sm text-muted-foreground">
                    {motionStyleOptions.find((item) => item.value === motionStyle)?.description}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-elder-sm text-muted-foreground">构图裁切</span>
                  <select
                    value={preprocessMode}
                    onChange={(event) =>
                      setPreprocessMode(event.target.value as AiVideoPreprocessMode)
                    }
                    className="input-warm min-h-[4.2rem] py-3"
                  >
                    {preprocessOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-elder-sm text-muted-foreground">
                    {preprocessOptions.find((item) => item.value === preprocessMode)?.description}
                  </p>
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-4">
                <input
                  type="checkbox"
                  checked={enhanceFace}
                  onChange={(event) => setEnhanceFace(event.target.checked)}
                  className="mt-2 h-5 w-5"
                />
                <span className="text-elder-base text-foreground leading-relaxed">
                  开启脸部增强。老照片清晰度较低时，建议保持开启，但首次运行可能需要 SadTalker 本地环境已装好增强模型。
                </span>
              </label>

              <label className="space-y-2 block">
                <span className="text-elder-sm text-muted-foreground">建议讲述词</span>
                <textarea
                  value={narrationText}
                  onChange={(event) => {
                    hasEditedNarrationRef.current = true
                    setNarrationText(event.target.value)
                  }}
                  className="input-warm resize-none"
                  rows={6}
                  placeholder="可以根据回忆录自动整理，也可以手动调整成更像本人说话的口吻"
                />
                <p className="text-elder-sm text-muted-foreground">
                  这段文字主要用于提示当前要讲什么内容。真正驱动嘴型和神态的，是您录制或上传的讲述音频。
                </p>
              </label>

              <button
                onClick={() => {
                  void handleGenerateVideo()
                }}
                disabled={!providerInfo?.configured || isSubmittingJob}
                className="btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Film className="w-6 h-6" />
                {isSubmittingJob ? '提交中' : '生成 SadTalker 数字人'}
              </button>

              <input
                ref={portraitInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  void handlePortraitUpload(event)
                }}
                className="hidden"
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={(event) => {
                  void handleAudioUpload(event)
                }}
                className="hidden"
              />
            </article>

            <article className="card-warm space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
                  <Film className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-elder-lg font-semibold text-foreground mb-1">任务与预览</h2>
                  <p className="text-elder-base text-muted-foreground">
                    任务提交后，会先在本地整理照片和音频，再调用 SadTalker 生成一段数字人讲述视频。
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-accent/35 p-5 space-y-3">
                <p className="text-elder-base text-foreground">{getJobStatusText(job)}</p>
                {job?.providerTaskId ? (
                  <p className="text-elder-sm text-muted-foreground">
                    Local Task: {job.providerTaskId}
                  </p>
                ) : null}
                {generatedAvatar && !job ? (
                  <p className="text-elder-sm text-muted-foreground">
                    上一次成功生成时间：{formatDate(generatedAvatar.createdAt)}
                  </p>
                ) : null}
              </div>

              {(job?.storyOutline.length ?? 0) > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-elder-base font-semibold text-foreground">自动剧情骨架</h3>
                  <div className="grid gap-3">
                    {job?.storyOutline.map((item) => (
                      <div key={item} className="rounded-2xl bg-accent/30 px-4 py-3">
                        <p className="text-elder-base text-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {latestNarrationText ? (
                <div className="space-y-3">
                  <h3 className="text-elder-base font-semibold text-foreground">当前讲述词</h3>
                  <div className="rounded-3xl border border-border bg-background px-4 py-4 max-h-72 overflow-y-auto">
                    <p className="text-base text-foreground whitespace-pre-line leading-7">
                      {latestNarrationText}
                    </p>
                  </div>
                </div>
              ) : null}

              {latestVideoUrl ? (
                <div className="space-y-4">
                  <video
                    controls
                    src={latestVideoUrl}
                    className="w-full rounded-3xl bg-black aspect-video"
                  />
                  {latestPortraitDataUrl ? (
                    <div className="flex items-center gap-4 rounded-3xl border border-border bg-accent/20 px-4 py-4">
                      <img
                        src={latestPortraitDataUrl}
                        alt="数字人头像"
                        className="h-24 w-24 rounded-2xl object-cover border border-border"
                      />
                      <div>
                        <p className="text-elder-base font-semibold text-foreground">本次数字人头像</p>
                        <p className="text-elder-sm text-muted-foreground">
                          这张照片已同步给地图页面，作为数字人出场时的形象参考。
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <a
                    href={latestVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline justify-center w-full"
                  >
                    <Download className="w-6 h-6" />
                    打开并下载视频
                  </a>
                </div>
              ) : (
                <div className="aspect-video rounded-3xl border border-dashed border-border bg-accent/25 flex items-center justify-center px-6 text-center">
                  <p className="text-elder-base text-muted-foreground">
                    任务完成后，这里会显示 SadTalker 数字人视频预览
                  </p>
                </div>
              )}

              {providerInfo?.setupGuide.length ? (
                <div className="rounded-3xl border border-border bg-background px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">本地环境准备提示</p>
                  <div className="mt-3 grid gap-2">
                    {providerInfo.setupGuide.map((item) => (
                      <p key={item} className="text-elder-sm text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <article className="card-warm space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Download className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-elder-lg font-semibold text-foreground mb-2">人生故事 PDF</h2>
                  <p className="text-elder-base text-muted-foreground">
                    把多次口述内容按时间与故事推进顺序整合成一篇适合打印的完整文章，尽量保留原话，只做轻度语句整理与标点修正。
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-accent/35 px-4 py-4">
                  <p className="text-elder-sm text-muted-foreground">回忆段落</p>
                  <p className="mt-2 text-elder-base font-semibold text-foreground">
                    {memories.length} 段
                  </p>
                </div>
                <div className="rounded-3xl bg-accent/35 px-4 py-4">
                  <p className="text-elder-sm text-muted-foreground">人生章节</p>
                  <p className="mt-2 text-elder-base font-semibold text-foreground">
                    {memoryCategories.length} 类
                  </p>
                </div>
                <div className="rounded-3xl bg-accent/35 px-4 py-4">
                  <p className="text-elder-sm text-muted-foreground">嵌入照片</p>
                  <p className="mt-2 text-elder-base font-semibold text-foreground">
                    {storyPhotoItems.length} 张
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-background px-5 py-5">
                <p className="text-elder-base font-semibold text-foreground">当前导出说明</p>
                <p className="mt-3 text-elder-base text-muted-foreground">{storyExportStatus}</p>
                {memoryCategories.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {memoryCategories.slice(0, 6).map((category) => (
                      <span key={category} className="emotion-tag-neutral">
                        {category}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleOpenStoryPdf}
                className="btn-primary justify-center"
              >
                <Download className="w-6 h-6" />
                打开打印版并另存为 PDF
              </button>
            </article>

            <article className="card-warm space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-elder-lg font-semibold text-foreground mb-2">上传照片滚动相册集</h2>
                  <p className="text-elder-base text-muted-foreground">
                    把您在不同人生阶段上传的老照片汇总到一起。可直接左右滑动，快速浏览整段人生的图像线索。
                  </p>
                </div>
              </div>

              {storyPhotoItems.length > 0 ? (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-elder-base text-muted-foreground">
                      已汇总 {storyPhotoItems.length} 张照片，按回忆录顺序排列
                    </p>
                    <span className="text-elder-sm text-muted-foreground">左右滑动浏览全部照片</span>
                  </div>

                  <div className="photo-album-scroll overflow-x-auto pb-3">
                    <div className="flex w-max gap-4 pr-4">
                      {storyPhotoItems.map((photo) => (
                        <figure
                          key={photo.id}
                          className="photo-album-card overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-card"
                        >
                          <img
                            src={photo.dataUrl}
                            alt={photo.name}
                            className="h-56 w-full object-cover"
                          />
                          <figcaption className="space-y-3 px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <span className="emotion-tag-neutral">{photo.category}</span>
                              <span className="emotion-tag-positive">
                                {formatDate(photo.timestamp)}
                              </span>
                            </div>
                            <p className="text-elder-base font-semibold text-foreground line-clamp-1">
                              {photo.name}
                            </p>
                            <p className="text-elder-sm text-muted-foreground line-clamp-2">
                              {photo.answer}
                            </p>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-accent/20 px-5 py-6">
                  <p className="text-elder-base text-muted-foreground">
                    还没有照片进入相册集。回到访谈页上传老照片后，这里会自动汇总成可滚动浏览的相册。
                  </p>
                </div>
              )}
            </article>
          </section>

          {Object.entries(groupedMemories).map(([category, categoryMemories]) => (
            <section key={category} className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <Tag className="w-5 h-5 text-primary" />
                <h2 className="text-elder-lg font-semibold text-foreground">
                  {category}
                </h2>
                <span className="text-elder-sm text-muted-foreground">
                  ({categoryMemories.length})
                </span>
              </div>

              <div className="space-y-4">
                {categoryMemories.map((memory) => (
                  <article
                    key={memory.id}
                    className="card-warm space-y-5 animate-slide-up"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-primary text-sm">问</span>
                      </div>
                      <p className="text-elder-base text-muted-foreground italic">
                        "{memory.question}"
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-secondary text-sm">答</span>
                      </div>
                      <p className="text-elder-base text-foreground leading-relaxed">
                        {memory.answer}
                      </p>
                    </div>

                    {memory.photos.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-elder-sm text-muted-foreground">
                          <ImageIcon className="w-4 h-4" />
                          附带 {memory.photos.length} 张照片
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {memory.photos.map((photo) => (
                            <figure
                              key={photo.id}
                              className="overflow-hidden rounded-3xl border border-border bg-accent/25"
                            >
                              <img
                                src={photo.dataUrl}
                                alt={photo.name}
                                className="h-48 w-full object-cover"
                              />
                              <figcaption className="px-4 py-3 text-sm text-muted-foreground truncate">
                                {photo.name}
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 border-t border-border/50 pt-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        {getEmotionIcon(memory.emotion)}
                        {memory.photos.length > 0 ? (
                          <span className="emotion-tag-neutral">{memory.photos.length} 张照片</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-elder-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {formatDate(memory.timestamp)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {memories.length > 0 ? (
        <div className="text-center py-8 border-t border-border">
          <p className="text-elder-sm text-muted-foreground">
            每一段记忆，都是生命中闪亮的星辰
          </p>
        </div>
      ) : null}
    </div>
  )
}
