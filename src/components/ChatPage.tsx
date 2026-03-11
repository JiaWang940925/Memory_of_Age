import { useEffect, useRef, useState } from 'react'
import { Send, BookOpen, Sparkles, RefreshCw, Mic, Square } from 'lucide-react'
import type { Page, Memory } from '../App'
import { decodeAudioBlobToMonoPcm } from '../lib/audio'
import {
  claimAudioChannel,
  getBrowserSessionId,
  refreshAudioChannel,
  releaseAudioChannel,
} from '../lib/session'

interface ChatPageProps {
  onNavigate: (page: Page) => void
  onAddMemory: (memory: Memory) => void
  memories: Memory[]
}

interface Message {
  id: string
  role: 'ai' | 'user'
  content: string
  emotion?: 'positive' | 'neutral' | 'attention'
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

function analyzeEmotion(text: string): 'positive' | 'neutral' | 'attention' {
  const negativeKeywords = ['难过', '伤心', '后悔', '失去', '遗憾', '痛苦', '孤独', '害怕', '担心', '焦虑', '不幸', '悲伤', '失败', '错过']
  const positiveKeywords = ['开心', '快乐', '幸福', '感谢', '美好', '温暖', '爱', '希望', '成功', '骄傲', '满足', '喜欢']

  const hasNegative = negativeKeywords.some((keyword) => text.includes(keyword))
  const hasPositive = positiveKeywords.some((keyword) => text.includes(keyword))

  if (hasNegative && !hasPositive) return 'attention'
  if (hasPositive) return 'positive'
  return 'neutral'
}

const questionCategories = [
  {
    category: '童年时光',
    questions: [
      '您还记得小时候最喜欢玩的游戏是什么吗？能和我分享一下那时的快乐吗？',
      '您童年时最好的朋友是谁？你们在一起有什么有趣的故事？',
      '小时候，家里有什么让您印象深刻的事情吗？',
    ],
  },
  {
    category: '青春岁月',
    questions: [
      '您年轻时有什么梦想？后来实现了吗？',
      '您还记得第一份工作是什么吗？那时有什么有趣的经历？',
      '在您成长的过程中，谁对您影响最大？',
    ],
  },
  {
    category: '家庭故事',
    questions: [
      '您和爱人是怎么认识的？能分享这段美好的缘分吗？',
      '作为父母，您觉得最骄傲的时刻是什么？',
      '您的家庭中有什么温馨的传统或习惯吗？',
    ],
  },
  {
    category: '人生智慧',
    questions: [
      '回顾人生，您觉得最值得骄傲的成就是什么？',
      '如果能给年轻时的自己一个建议，您会说什么？',
      '您认为人生中最重要的是什么？',
    ],
  },
]

const positiveGuidances = [
  '我能感受到这段记忆对您来说不太容易。不过，每一段经历都让我们变得更加坚强。您觉得从这件事中，您学到了什么呢？',
  '谢谢您愿意和我分享这些。虽然过程可能艰难，但您度过来了，这本身就是一种力量。现在回想起来，有没有什么让您感到欣慰的地方？',
  '我理解您的感受。生活中确实有不如意的时候，但正是这些经历塑造了今天的您。能告诉我，在那段时间里，有谁给过您支持和温暖吗？',
  '感谢您的信任。每个人的人生都有高低起伏，重要的是我们如何看待它们。您觉得这段经历有没有带来什么意想不到的收获？',
]

const positiveResponses = [
  '这真是一段美好的回忆！我能感受到您说起这件事时的喜悦。还有什么相关的快乐时光想要分享吗？',
  '听起来真温馨！这样的时刻确实值得珍藏。能再多讲讲当时的细节吗？',
  '太棒了！您的故事让我也感到很温暖。这段记忆对您来说一定很特别吧？',
]

export function ChatPage({ onNavigate, onAddMemory, memories }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: '您好！我是岁语，很高兴能陪您回忆人生中的美好时光。让我们从一个轻松的话题开始吧——您还记得小时候最喜欢玩的游戏是什么吗？能和我分享一下那时的快乐吗？',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentCategory, setCurrentCategory] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('unsupported')
  const [voiceStatus, setVoiceStatus] = useState('正在检查语音输入能力')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const transcriptionWorkerRef = useRef<Worker | null>(null)
  const voiceBaseInputRef = useRef('')
  const voiceFinalTranscriptRef = useRef('')
  const sessionIdRef = useRef('')

  if (!sessionIdRef.current) {
    sessionIdRef.current = getBrowserSessionId()
  }

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  const releaseVoiceChannel = () => {
    releaseAudioChannel(sessionIdRef.current)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const generateAIResponse = (emotion: 'positive' | 'neutral' | 'attention') => {
    if (emotion === 'attention') {
      return positiveGuidances[Math.floor(Math.random() * positiveGuidances.length)]
    }

    if (emotion === 'positive') {
      return positiveResponses[Math.floor(Math.random() * positiveResponses.length)]
    }

    const nextQuestion = getNextQuestion()
    return `感谢您的分享！这些记忆都很珍贵。让我们继续聊聊——${nextQuestion}`
  }

  const getNextQuestion = () => {
    const category = questionCategories[currentCategory]
    const question = category.questions[currentQuestion]

    if (currentQuestion < category.questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1)
    } else if (currentCategory < questionCategories.length - 1) {
      setCurrentCategory((previous) => previous + 1)
      setCurrentQuestion(0)
    } else {
      setCurrentCategory(0)
      setCurrentQuestion(0)
    }

    return question
  }

  const handleSend = async () => {
    if (!input.trim() || isTyping || isListening || isTranscribing) return

    const userMessage = input.trim()
    const emotion = analyzeEmotion(userMessage)

    const userMessageItem: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      emotion,
    }

    setMessages((previous) => [...previous, userMessageItem])
    setInput('')

    const lastAIMessage = messages.filter((message) => message.role === 'ai').pop()
    if (lastAIMessage) {
      const memory: Memory = {
        id: Date.now().toString(),
        question: lastAIMessage.content,
        answer: userMessage,
        emotion,
        timestamp: new Date(),
        category: questionCategories[currentCategory].category,
      }
      onAddMemory(memory)
    }

    setIsTyping(true)
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000))

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      content: generateAIResponse(emotion),
    }

    setMessages((previous) => [...previous, aiMessage])
    setIsTyping(false)
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const startBrowserRecognition = () => {
    const recognition = recognitionRef.current
    if (!recognition) return

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
    if (!voiceEnabled || isTyping || isTranscribing) return

    if (voiceMode === 'browser') {
      startBrowserRecognition()
      return
    }

    if (voiceMode === 'local') {
      await startLocalRecording()
    }
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full gradient-warm flex items-center justify-center shadow-warm">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-elder-xl font-bold text-foreground">岁语</h1>
              <p className="text-elder-sm text-muted-foreground">正在倾听您的故事</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('memory')}
            className="flex items-center gap-3 px-5 py-3 rounded-xl bg-accent text-foreground hover:bg-accent/80 transition-colors"
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
      </header>

      <div className="bg-accent/50 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-2">
          <span className="text-elder-sm text-muted-foreground">当前话题：</span>
          <span className="text-elder-sm font-medium text-foreground">
            {questionCategories[currentCategory].category}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="space-y-2">
                <div className={message.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}>
                  <p className="text-elder-base leading-relaxed">{message.content}</p>
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

      <div className="bg-card border-t border-border px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col gap-4 xl:flex-row">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请慢慢讲述您的故事..."
              className="input-warm resize-none xl:flex-1"
              rows={3}
            />
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-4 xl:flex xl:w-auto">
              <button
                onClick={() => {
                  void handleVoiceInput()
                }}
                disabled={!voiceEnabled || isTyping || isTranscribing}
                className={`min-h-[5.5rem] rounded-2xl border-2 px-6 py-4 flex items-center justify-center gap-3 text-elder-lg font-semibold transition-all duration-300 xl:min-w-[12rem] ${
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
                <span>
                  {isTranscribing
                    ? '转写中'
                    : isListening
                      ? '停止录入'
                      : '语音输入'}
                </span>
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping || isListening || isTranscribing}
                className="btn-primary min-h-[5.5rem] w-full px-0 disabled:opacity-50 disabled:cursor-not-allowed xl:min-w-[6.5rem]"
                aria-label="发送消息"
              >
                <Send className="w-7 h-7" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:text-left">
            <span
              className={`text-elder-base ${
                isListening || isTranscribing ? 'text-secondary' : 'text-muted-foreground'
              }`}
            >
              {voiceStatus}
            </span>
            <span className="hidden lg:inline text-elder-base text-muted-foreground">
              语音功能按会话独占，避免与其他 session 冲突
            </span>
            <button
              onClick={() => {
                const nextQuestion = getNextQuestion()
                setMessages((previous) => [
                  ...previous,
                  {
                    id: Date.now().toString(),
                    role: 'ai',
                    content: `好的，让我们换个话题——${nextQuestion}`,
                  },
                ])
              }}
              className="text-elder-base text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
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
