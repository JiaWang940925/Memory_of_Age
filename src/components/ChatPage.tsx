import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Send, BookOpen, Sparkles, RefreshCw, Mic, Square, ImagePlus, X, Home, Heart } from 'lucide-react'
import type { Page, Memory, PhotoAttachment } from '../App'
import { decodeAudioBlobToMonoPcm } from '../lib/audio'
import {
  buildEventReminders,
  buildInterviewPrompts,
  buildOpeningQuestion,
  buildSmartResponse,
  inferCoveredPromptIds,
  getInitialAskedPromptIds,
  pickNextPrompt,
} from '../lib/conversation'
import { createPhotoAttachment } from '../lib/images'
import {
  claimAudioChannel,
  getBrowserSessionId,
  getSessionScopedKey,
  refreshAudioChannel,
  releaseAudioChannel,
} from '../lib/session'
import {
  buildHouseholdSummary,
  buildProfileSummary,
  getOperatorRoleLabel,
  getPromptStyleForProfile,
  type UserProfile,
} from '../lib/userProfile'

interface ChatPageProps {
  onNavigate: (page: Page) => void
  onAddMemory: (memory: Memory) => void
  memories: Memory[]
  userProfile: UserProfile
}

interface Message {
  id: string
  role: 'ai' | 'user'
  content: string
  emotion?: 'positive' | 'neutral' | 'attention'
  photos?: PhotoAttachment[]
}

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionResult {
  isFinal: boolean
  0: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

type VoiceMode = 'browser' | 'local' | 'unsupported'

type TranscriptionWorkerMessage =
  | {
      type: 'status'
      message: string
    }
  | {
      type: 'complete'
      text: string
    }
  | {
      type: 'error'
      message: string
    }

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const MAX_PHOTOS_PER_MEMORY = 4

function analyzeEmotion(text: string): 'positive' | 'neutral' | 'attention' {
  const negativeKeywords = ['难过', '伤心', '后悔', '失去', '遗憾', '痛苦', '孤独', '害怕', '担心', '焦虑', '不幸', '悲伤', '失败', '错过']
  const positiveKeywords = ['开心', '快乐', '幸福', '感谢', '美好', '温暖', '爱', '希望', '成功', '骄傲', '满足', '喜欢']

  const hasNegative = negativeKeywords.some((keyword) => text.includes(keyword))
  const hasPositive = positiveKeywords.some((keyword) => text.includes(keyword))

  if (hasNegative && !hasPositive) {
    return 'attention'
  }

  if (hasPositive) {
    return 'positive'
  }

  return 'neutral'
}

function dedupePromptIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))]
}

function loadAskedPromptIds(storageKey: string) {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : []
  } catch {
    return []
  }
}

function saveAskedPromptIds(storageKey: string, promptIds: string[]) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(dedupePromptIds(promptIds)))
  } catch {
    // Ignore storage write failures and keep the in-memory copy usable.
  }
}

export function ChatPage({
  onNavigate,
  onAddMemory,
  memories,
  userProfile,
}: ChatPageProps) {
  const sessionIdRef = useRef('')
  if (!sessionIdRef.current) {
    sessionIdRef.current = getBrowserSessionId()
  }

  const askedPromptIdsStorageKeyRef = useRef('')
  if (!askedPromptIdsStorageKeyRef.current) {
    askedPromptIdsStorageKeyRef.current = getSessionScopedKey(
      'asked-prompts',
      sessionIdRef.current,
    )
  }

  const promptStyle = getPromptStyleForProfile(userProfile)
  const promptPlan = buildInterviewPrompts(userProfile, promptStyle)
  const eventReminders = buildEventReminders(userProfile)
  const memoryAskedPromptIds = getInitialAskedPromptIds(promptPlan, memories)
  const inferredCoveredPromptIds = inferCoveredPromptIds(userProfile, memories)
  const storedAskedPromptIds = loadAskedPromptIds(askedPromptIdsStorageKeyRef.current)
  const initialCoveredPromptIds = dedupePromptIds([
    ...storedAskedPromptIds,
    ...memoryAskedPromptIds,
    ...inferredCoveredPromptIds,
  ])
  const initialPrompt = pickNextPrompt(promptPlan, initialCoveredPromptIds)
  const initialShownPromptIds = initialPrompt
    ? dedupePromptIds([...initialCoveredPromptIds, initialPrompt.id])
    : initialCoveredPromptIds

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: buildOpeningQuestion(userProfile, initialPrompt, promptStyle),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentPromptId, setCurrentPromptId] = useState(initialPrompt?.id ?? '')
  const [shownPromptIds, setShownPromptIds] = useState<string[]>(initialShownPromptIds)
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('unsupported')
  const [voiceStatus, setVoiceStatus] = useState('正在检查语音输入能力')
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoAttachment[]>([])
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false)
  const [photoStatus, setPhotoStatus] = useState('支持上传老照片，让回忆更完整')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const transcriptionWorkerRef = useRef<Worker | null>(null)
  const voiceBaseInputRef = useRef('')
  const voiceFinalTranscriptRef = useRef('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  const currentPrompt =
    promptPlan.find((prompt) => prompt.id === currentPromptId) ?? null

  const revealNextPrompt = (existingPromptIds: string[]) => {
    const nextPrompt = pickNextPrompt(promptPlan, existingPromptIds)
    if (!nextPrompt) {
      setCurrentPromptId('')
      return null
    }

    setCurrentPromptId(nextPrompt.id)
    setShownPromptIds(dedupePromptIds([...existingPromptIds, nextPrompt.id]))
    return nextPrompt
  }

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  const releaseVoiceChannel = () => {
    releaseAudioChannel(sessionIdRef.current)
  }

  const openPhotoPicker = () => {
    const inputElement = photoInputRef.current
    if (!inputElement || isPreparingPhotos || isTyping || isTranscribing) {
      return
    }

    try {
      if (typeof inputElement.showPicker === 'function') {
        inputElement.showPicker()
        return
      }
    } catch {
      // Fall back to click() below if showPicker is unavailable in this browser.
    }

    inputElement.click()
  }

  const removeSelectedPhoto = (photoId: string) => {
    setSelectedPhotos((previous) => {
      const nextPhotos = previous.filter((photo) => photo.id !== photoId)
      setPhotoStatus(
        nextPhotos.length > 0
          ? `还保留 ${nextPhotos.length} 张照片，可继续配合文字发送`
          : '支持上传老照片，让回忆更完整',
      )
      return nextPhotos
    })
  }

  const handlePhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    event.target.value = ''

    if (!files.length) {
      return
    }

    const remainingSlots = MAX_PHOTOS_PER_MEMORY - selectedPhotos.length
    if (remainingSlots <= 0) {
      setPhotoStatus(`每段回忆最多添加 ${MAX_PHOTOS_PER_MEMORY} 张照片`)
      return
    }

    const acceptedFiles = files
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remainingSlots)

    if (!acceptedFiles.length) {
      setPhotoStatus('请选择照片文件后再试')
      return
    }

    setIsPreparingPhotos(true)
    setPhotoStatus('正在整理照片，请稍候')

    try {
      const attachments = await Promise.all(
        acceptedFiles.map((file) =>
          createPhotoAttachment(file, {
            maxDimension: 1280,
            quality: 0.78,
          }),
        ),
      )

      setSelectedPhotos((previous) => {
        const nextPhotos = [...previous, ...attachments]
        setPhotoStatus(`已添加 ${nextPhotos.length} 张照片，可配合文字一起发送`)
        return nextPhotos
      })
    } catch (error) {
      setPhotoStatus(error instanceof Error ? error.message : '照片处理失败，请换一张再试')
    } finally {
      setIsPreparingPhotos(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    saveAskedPromptIds(askedPromptIdsStorageKeyRef.current, shownPromptIds)
  }, [shownPromptIds])

  useEffect(() => {
    const mergedPromptIds = dedupePromptIds([...shownPromptIds, ...memoryAskedPromptIds])
    if (mergedPromptIds.length !== shownPromptIds.length) {
      setShownPromptIds(mergedPromptIds)
    }
  }, [memoryAskedPromptIds, shownPromptIds])

  useEffect(() => {
    const SpeechRecognitionApi =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognitionApi) {
      const recognition = new SpeechRecognitionApi()
      recognition.lang = 'zh-CN'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event) => {
        let interimTranscript = ''

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript
          if (event.results[index].isFinal) {
            voiceFinalTranscriptRef.current += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setInput(
          `${voiceBaseInputRef.current}${voiceFinalTranscriptRef.current}${interimTranscript}`.trim(),
        )
        setVoiceStatus('正在识别语音，请继续讲话')
      }

      recognition.onerror = (event) => {
        const messageMap: Record<string, string> = {
          'audio-capture': '没有检测到麦克风，请检查设备',
          'not-allowed': '没有麦克风权限，请在浏览器里允许访问',
          'service-not-allowed': '当前浏览器限制了语音识别服务',
          'no-speech': '没有识别到语音，可以再试一次',
          aborted: '语音输入已取消',
        }

        releaseVoiceChannel()
        setIsListening(false)
        setVoiceStatus(messageMap[event.error] ?? '语音输入暂时不可用，请稍后重试')
      }

      recognition.onend = () => {
        releaseVoiceChannel()
        setIsListening(false)
        setVoiceStatus((currentStatus) =>
          currentStatus === '正在识别语音，请继续讲话'
            ? '语音输入已结束，您可以继续修改文字或直接发送'
            : currentStatus,
        )
      }

      recognitionRef.current = recognition
      setVoiceEnabled(true)
      setVoiceMode('browser')
      setVoiceStatus('点击“语音输入”后即可开始讲话')
      return
    }

    if (
      typeof navigator.mediaDevices?.getUserMedia === 'function'
      && 'MediaRecorder' in window
    ) {
      const worker = new Worker(
        new URL('../workers/transcriptionWorker.ts', import.meta.url),
        { type: 'module' },
      )

      worker.onmessage = (event: MessageEvent<TranscriptionWorkerMessage>) => {
        if (event.data.type === 'status') {
          setVoiceStatus(event.data.message)
          return
        }

        if (event.data.type === 'complete') {
          setInput(`${voiceBaseInputRef.current}${event.data.text}`.trim())
          setIsTranscribing(false)
          setVoiceStatus('语音已转成文字，您可以继续修改或直接发送')
          return
        }

        setIsTranscribing(false)
        setVoiceStatus(event.data.message)
      }

      transcriptionWorkerRef.current = worker
      setVoiceEnabled(true)
      setVoiceMode('local')
      setVoiceStatus('当前预览器不支持实时识别，将使用录音转文字')
      return
    }

    setVoiceEnabled(false)
    setVoiceMode('unsupported')
    setVoiceStatus('当前环境不支持语音输入，请改用文字输入')
  }, [])

  useEffect(() => {
    if (!isListening) {
      return
    }

    const intervalId = window.setInterval(() => {
      const refreshed = refreshAudioChannel(sessionIdRef.current, 'voice-input', 15_000)
      if (refreshed) {
        return
      }

      recognitionRef.current?.stop()

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }

      setVoiceStatus('检测到其他会话接管了语音功能，当前录入已自动停止')
    }, 5_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isListening])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden' || !isListening) {
        return
      }

      releaseVoiceChannel()
      recognitionRef.current?.stop()

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }

      setVoiceStatus('您切换到了其他会话，语音输入已自动停止')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isListening])

  useEffect(() => {
    return () => {
      releaseVoiceChannel()
      recognitionRef.current?.stop()

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }

      stopMediaStream()
      transcriptionWorkerRef.current?.terminate()
    }
  }, [])

  const handleSend = async () => {
    const trimmedInput = input.trim()
    const hasPhotos = selectedPhotos.length > 0

    if (
      (!trimmedInput && !hasPhotos)
      || isTyping
      || isListening
      || isTranscribing
      || isPreparingPhotos
    ) {
      return
    }

    const attachedPhotos = [...selectedPhotos]
    const userMessage = trimmedInput || `分享了 ${attachedPhotos.length} 张照片`
    const emotion = analyzeEmotion(trimmedInput || userMessage)

    const userMessageItem: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      emotion,
      photos: attachedPhotos,
    }

    setMessages((previous) => [...previous, userMessageItem])
    setInput('')
    setSelectedPhotos([])
    setPhotoStatus('支持上传老照片，让回忆更完整')

    const memoryQuestion = currentPrompt?.text ?? '自由补充'
    const memoryCategory = currentPrompt?.category ?? '自由补充'

    const memory: Memory = {
      id: Date.now().toString(),
      question: memoryQuestion,
      answer: userMessage,
      emotion,
      timestamp: new Date(),
      category: memoryCategory,
      photos: attachedPhotos,
      promptId: currentPrompt?.id,
    }
    onAddMemory(memory)

    const nextPrompt = revealNextPrompt(shownPromptIds)

    setIsTyping(true)
    await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 700))

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: buildSmartResponse({
        emotion,
        hasPhotos,
        nextPrompt,
        styleOrMode: promptStyle,
      }),
    }

    setMessages((previous) => [...previous, aiMessage])
    setIsTyping(false)
  }

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const startBrowserRecognition = () => {
    const recognition = recognitionRef.current
    if (!recognition) {
      return
    }

    if (isListening) {
      releaseVoiceChannel()
      recognition.stop()
      setVoiceStatus('语音输入已停止，您可以继续修改文字或直接发送')
      return
    }

    const claimed = claimAudioChannel(sessionIdRef.current, 'voice-input', 15_000)
    if (!claimed) {
      setVoiceStatus('另一会话正在使用语音功能，请稍后再试')
      return
    }

    voiceBaseInputRef.current = input ? `${input.trim()} ` : ''
    voiceFinalTranscriptRef.current = ''

    try {
      recognition.start()
      setIsListening(true)
      setVoiceStatus('正在聆听，请直接说话')
    } catch {
      releaseVoiceChannel()
      setIsListening(false)
      setVoiceStatus('语音输入启动失败，请稍后重试')
    }
  }

  const startLocalRecording = async () => {
    if (isListening) {
      releaseVoiceChannel()
      mediaRecorderRef.current?.stop()
      setVoiceStatus('录音已结束，正在整理音频')
      return
    }

    const claimed = claimAudioChannel(sessionIdRef.current, 'voice-input', 15_000)
    if (!claimed) {
      setVoiceStatus('另一会话正在使用语音功能，请稍后再试')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      mediaStreamRef.current = stream
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      voiceBaseInputRef.current = input ? `${input.trim()} ` : ''

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsListening(false)
        releaseVoiceChannel()
        stopMediaStream()

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        })

        if (!audioBlob.size) {
          setVoiceStatus('没有录到声音，请再试一次')
          return
        }

        setIsTranscribing(true)
        setVoiceStatus('正在处理录音，首次使用可能需要下载模型')

        try {
          const pcmAudio = await decodeAudioBlobToMonoPcm(audioBlob)
          transcriptionWorkerRef.current?.postMessage(
            { type: 'transcribe', audio: pcmAudio },
            [pcmAudio.buffer],
          )
        } catch (error) {
          setIsTranscribing(false)
          setVoiceStatus(
            error instanceof Error ? error.message : '录音处理失败，请稍后重试',
          )
        }
      }

      mediaRecorder.start()
      setIsListening(true)
      setVoiceStatus('正在录音，请讲话；再次点击即可结束')
    } catch {
      releaseVoiceChannel()
      setVoiceStatus('没有麦克风权限，请在浏览器里允许访问')
    }
  }

  const handleVoiceInput = async () => {
    if (!voiceEnabled || isTyping || isTranscribing) {
      return
    }

    if (voiceMode === 'browser') {
      startBrowserRecognition()
      return
    }

    if (voiceMode === 'local') {
      await startLocalRecording()
    }
  }

  const handleSwitchTopic = () => {
    if (isTyping || isListening || isTranscribing) {
      return
    }

    const nextPrompt = revealNextPrompt(shownPromptIds)
    const content = nextPrompt
      ? `我们换到“${nextPrompt.category}”继续聊：${nextPrompt.text}`
      : '主线问题已经基本问完了。接下来您可以自由补充任何还想留下的人和事，我不会再重复前面的问题。'

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now().toString(),
        role: 'ai',
        content,
      },
    ])
  }

  const getEmotionLabel = (emotion?: 'positive' | 'neutral' | 'attention') => {
    switch (emotion) {
      case 'positive':
        return <span className="emotion-tag-positive">积极正面</span>
      case 'attention':
        return <span className="emotion-tag-attention">需要关怀</span>
      default:
        return null
    }
  }

  const availableReminderTitles = eventReminders
    .filter((reminder) => !shownPromptIds.includes(reminder.id))
    .slice(0, 3)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-warm shadow-warm sm:h-14 sm:w-14">
              <Sparkles className="h-6 w-6 text-primary-foreground sm:h-7 sm:w-7" />
            </div>
            <div>
              <h1 className="text-elder-xl font-bold text-foreground">岁语</h1>
              <p className="text-elder-sm text-muted-foreground">
                {promptStyle.base === 'family'
                  ? '正在陪家人一起整理回忆'
                  : promptStyle.base === 'caregiver'
                    ? '正在协助整理回忆'
                    : '正在倾听您的故事'}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              onClick={() => onNavigate('welcome')}
              className="btn-outline w-full justify-center sm:w-auto"
            >
              <Home className="h-5 w-5" />
              返回主页
            </button>

            <button
              onClick={() => onNavigate('daily-recall')}
              className="btn-daily-recall w-full justify-center sm:w-auto"
            >
              <span className="btn-daily-recall-icon">
                <Heart className="h-5 w-5" />
              </span>
              {"\u6bcf\u65e5\u56de\u60f3"}
            </button>

            <button
              onClick={() => onNavigate('memory')}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-accent px-4 py-3 text-foreground transition-colors hover:bg-accent/80 sm:w-auto sm:justify-start sm:px-5"
            >
              <BookOpen className="w-6 h-6" />
              <span className="text-elder-sm">我的回忆录</span>
              {memories.length > 0 && (
                <span className="bg-primary text-primary-foreground text-base px-3 py-1 rounded-full leading-none">
                  {memories.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="bg-accent/50 border-b border-border/70 px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-3xl mx-auto grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl bg-card/80 px-5 py-4 shadow-card">
            <p className="text-elder-sm text-muted-foreground">当前用户画像</p>
            <p className="mt-2 text-elder-base text-foreground">
              {buildProfileSummary(userProfile)}
            </p>
          </div>
          <div className="rounded-3xl bg-card/80 px-5 py-4 shadow-card">
            <p className="text-elder-sm text-muted-foreground">当前使用方式</p>
            <p className="mt-2 text-elder-base font-semibold text-foreground">
              {promptStyle.base === 'family'
                ? '家属陪访模式'
                : promptStyle.base === 'caregiver'
                  ? '照护协助模式'
                  : '老人自述模式'}
            </p>
            <p className="mt-2 text-elder-sm text-muted-foreground">
              {buildHouseholdSummary(userProfile)}
            </p>
          </div>
          <div className="rounded-3xl bg-card/80 px-5 py-4 shadow-card">
            <p className="text-elder-sm text-muted-foreground">当前话题</p>
            <p className="mt-2 text-elder-base font-semibold text-foreground">
              {currentPrompt?.category ?? '自由补充'}
            </p>
            <p className="mt-2 text-elder-sm text-muted-foreground">
              当前操作者：{getOperatorRoleLabel(userProfile.operatorRole)}
            </p>
          </div>
        </div>

        {availableReminderTitles.length > 0 && (
          <div className="max-w-3xl mx-auto mt-4 rounded-3xl bg-card/70 px-5 py-4 shadow-card">
            <p className="text-elder-sm text-muted-foreground">根据出生年代与地点，后面还会重点提醒</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {availableReminderTitles.map((reminder) => (
                <span key={reminder.id} className="emotion-tag-neutral">
                  {reminder.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {promptStyle.base !== 'self' && currentPrompt?.familyHint ? (
          <div className="max-w-3xl mx-auto mt-4 rounded-3xl bg-card/80 px-5 py-4 shadow-card">
            <p className="text-elder-sm text-muted-foreground">给家属的追问建议</p>
            <p className="mt-2 text-elder-base text-foreground">{currentPrompt.familyHint}</p>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="space-y-2">
                <div className={message.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}>
                  <p className="text-elder-base leading-relaxed">{message.content}</p>
                  {message.photos && message.photos.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {message.photos.map((photo) => (
                        <img
                          key={photo.id}
                          src={photo.dataUrl}
                          alt={photo.name}
                          className="h-28 w-full rounded-2xl border border-white/30 object-cover sm:h-32"
                        />
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && message.emotion && (
                  <div className="flex justify-end">
                    {getEmotionLabel(message.emotion)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="chat-bubble-ai">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-card border-t border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-3xl mx-auto">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handlePhotoSelection}
          />

          {(selectedPhotos.length > 0 || isPreparingPhotos) && (
            <div className="mb-4 card-warm space-y-4">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-elder-base font-semibold text-foreground">本条回忆附带照片</p>
                  <p className="text-elder-sm text-muted-foreground">
                    {isPreparingPhotos
                      ? '正在压缩和整理照片'
                      : `已选 ${selectedPhotos.length} 张，发送后会一起进入回忆录`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhotos([])
                    setPhotoStatus('支持上传老照片，让回忆更完整')
                  }}
                  className="text-elder-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  清空照片
                </button>
              </div>

              {selectedPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {selectedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative overflow-hidden rounded-2xl border border-border bg-accent/30"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.name}
                        className="h-28 w-full object-cover"
                      />
                      <div className="p-2">
                        <p className="text-sm text-foreground truncate">{photo.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedPhoto(photo.id)}
                        className="absolute right-2 top-2 rounded-full bg-card/90 p-1 text-foreground shadow-card"
                        aria-label={`移除 ${photo.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                promptStyle.base === 'family'
                  ? '可以记录老人刚刚说的话，也可以先记下关键人物、地点和生活细节。'
                  : promptStyle.base === 'caregiver'
                    ? '请简要记录老人讲述的关键信息...'
                    : '请慢慢讲述您的故事...'
              }
              className="input-warm resize-none xl:flex-1"
              rows={3}
            />
            <div className="grid grid-cols-3 gap-3 xl:flex xl:w-auto">
              <button
                type="button"
                onClick={openPhotoPicker}
                disabled={isPreparingPhotos || isTyping || isTranscribing}
                className="flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-2 py-3 text-center text-elder-sm font-semibold text-foreground shadow-card transition-all duration-300 hover:border-primary hover:shadow-warm disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[5rem] sm:flex-row sm:px-4 sm:text-elder-base xl:min-w-[12rem] xl:gap-3"
              >
                <ImagePlus className="w-7 h-7 flex-shrink-0" />
                <span className="leading-tight">{isPreparingPhotos ? '整理照片' : '添加照片'}</span>
              </button>
              <button
                onClick={() => {
                  void handleVoiceInput()
                }}
                disabled={!voiceEnabled || isTyping || isTranscribing || isPreparingPhotos}
                className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 text-center text-elder-sm font-semibold transition-all duration-300 sm:min-h-[5rem] sm:flex-row sm:px-4 sm:text-elder-base xl:min-w-[12rem] xl:gap-3 ${
                  isListening
                    ? 'border-secondary bg-secondary text-secondary-foreground shadow-warm animate-pulse-soft'
                    : 'border-border bg-card text-foreground shadow-card hover:border-primary hover:shadow-warm'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-pressed={isListening}
                aria-label={isListening ? '停止语音输入' : '开始语音输入'}
              >
                {isListening ? (
                  <Square className="w-7 h-7 flex-shrink-0" />
                ) : (
                  <Mic className="w-7 h-7 flex-shrink-0" />
                )}
                <span className="leading-tight">
                  {isTranscribing
                    ? '转写中'
                    : isListening
                      ? '停止录入'
                      : '语音输入'}
                </span>
              </button>
              <button
                onClick={() => {
                  void handleSend()
                }}
                disabled={
                  (!input.trim() && selectedPhotos.length === 0)
                  || isTyping
                  || isListening
                  || isTranscribing
                  || isPreparingPhotos
                }
                className="btn-primary flex min-h-[4.5rem] w-full flex-col gap-2 px-2 py-3 text-elder-sm disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[5rem] sm:flex-row sm:px-4 sm:text-elder-base xl:min-w-[7rem]"
                aria-label="发送消息"
              >
                <Send className="w-7 h-7" />
                <span className="leading-tight">发送</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:gap-3">
            <span
              className={`text-elder-base ${
                isListening || isTranscribing ? 'text-secondary' : 'text-muted-foreground'
              }`}
            >
              {voiceStatus}
            </span>
            <span className="text-elder-base text-muted-foreground">{photoStatus}</span>
            <span className="hidden lg:inline text-elder-base text-muted-foreground">
              {promptStyle.base === 'self'
                ? '已记录的问题不会重复提问，可覆盖童年到晚年多个阶段'
                : '可先从称呼、地点和照片开始追问，系统会尽量避免重复提问'}
            </span>
            <button
              onClick={handleSwitchTopic}
              className="flex items-center gap-2 text-elder-base text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className="w-5 h-5" />
              换个话题
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
