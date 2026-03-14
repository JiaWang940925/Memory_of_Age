import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Download,
  Heart,
  Home,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { Memory } from '../App'
import {
  buildDailyRecallFeedback,
  buildDailyRecallItems,
  buildDailyRecallOpening,
  openDailyRecallFile,
  type DailyRecallAssessment,
  type DailyRecallResponseState,
} from '../lib/dailyRecall'
import type { UserProfile } from '../lib/userProfile'

interface DailyRecallPageProps {
  memories: Memory[]
  userProfile: UserProfile | null
  onBack: () => void
  onGoHome: () => void
  onOpenStory: () => void
}

const responseActions: Array<{
  value: DailyRecallResponseState
  label: string
  description: string
}> = [
  {
    value: 'self-recalled',
    label: '我自己想起来了',
    description: '适合今天自己顺着题目就能讲出来的时候',
  },
  {
    value: 'after-cue',
    label: '看提示后想起来了',
    description: '适合先看线索，再慢慢接上记忆的时候',
  },
  {
    value: 'family-supported',
    label: '家人陪着补充',
    description: '适合由家属一起提醒、补充和记录的时候',
  },
  {
    value: 'rest-now',
    label: '今天先到这里',
    description: '适合今天不想继续回想，也完全可以',
  },
]

export function DailyRecallPage({
  memories,
  userProfile,
  onBack,
  onGoHome,
  onOpenStory,
}: DailyRecallPageProps) {
  const recallItems = buildDailyRecallItems(memories, userProfile)
  const opening = buildDailyRecallOpening(memories, userProfile)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [assessment, setAssessment] = useState<DailyRecallAssessment | null>(null)
  const [selectedState, setSelectedState] = useState<DailyRecallResponseState | null>(null)
  const [showCue, setShowCue] = useState(false)
  const [fileStatus, setFileStatus] = useState('可以把今天的回想题整理成一份每日回看文件')

  useEffect(() => {
    setCurrentIndex(0)
    setAnswer('')
    setAssessment(null)
    setSelectedState(null)
    setShowCue(false)
  }, [
    memories.length,
    userProfile?.fullName,
    userProfile?.birthDate,
    userProfile?.birthPlace,
    userProfile?.hometown,
  ])

  const currentItem = recallItems[currentIndex] ?? null

  const handleComplete = (responseState: DailyRecallResponseState) => {
    if (!currentItem) {
      return
    }

    setSelectedState(responseState)
    setAssessment(
      buildDailyRecallFeedback({
        answer,
        responseState,
      }),
    )
  }

  const handleNext = () => {
    if (!recallItems.length) {
      return
    }

    setCurrentIndex((previous) => (previous + 1) % recallItems.length)
    setAnswer('')
    setAssessment(null)
    setSelectedState(null)
    setShowCue(false)
  }

  const handleOpenFile = () => {
    try {
      openDailyRecallFile(recallItems, userProfile)
      setFileStatus('回想文件已打开，可直接打印或另存为 PDF')
    } catch (error) {
      setFileStatus(error instanceof Error ? error.message : '回想文件打开失败，请稍后再试')
    }
  }

  if (!userProfile && memories.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={onBack}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-foreground transition-colors hover:bg-accent/80"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-elder-xl font-bold text-foreground">日常回想</h1>
                <p className="text-elder-sm text-muted-foreground">先留下故事，之后才更方便回想</p>
              </div>
            </div>

            <button onClick={onGoHome} className="btn-outline w-full justify-center sm:w-auto">
              <Home className="h-5 w-5" />
              返回主页
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="paper-panel text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-primary">
              <Heart className="h-10 w-10" />
            </div>
            <h2 className="text-elder-xl font-semibold text-foreground">还没有可用的回想资料</h2>
            <p className="mx-auto mt-4 max-w-2xl text-elder-base text-muted-foreground">
              “日常回想”会根据之前记录过的家人、地点、经历和生活细节，生成一份可以每天查看的小文件。
              先去写下几段故事，之后再回来使用会更合适。
            </p>
            <button onClick={onOpenStory} className="btn-primary mt-8">
              <BookOpen className="h-6 w-6" />
              先去记录故事
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onBack}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-foreground transition-colors hover:bg-accent/80"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-elder-xl font-bold text-foreground">日常回想</h1>
              <p className="text-elder-sm text-muted-foreground">
                用轻一点的方式回看熟悉的人和事
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button onClick={onGoHome} className="btn-outline w-full justify-center sm:w-auto">
              <Home className="h-5 w-5" />
              返回主页
            </button>
            <button onClick={onOpenStory} className="btn-outline justify-center sm:justify-start">
              <BookOpen className="h-5 w-5" />
              去写新的回忆
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
          <article className="paper-panel space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-elder-lg font-semibold text-foreground">今天从这里开始回想</h2>
                <p className="mt-2 text-elder-base text-muted-foreground">{opening}</p>
              </div>
            </div>

            <div className="rounded-3xl bg-accent/35 px-5 py-5">
              <p className="text-elder-base font-semibold text-foreground">温柔提示</p>
              <p className="mt-3 text-elder-base leading-relaxed text-muted-foreground">
                这里更像日常陪伴式回想，不追求一次答得完整，也不把它当成医学诊断。
                如果最近明显更难回想、频繁混淆重要信息，建议让家人陪同并咨询专业医生。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-accent/30 px-4 py-4">
                <p className="text-elder-sm text-muted-foreground">回想题目</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  {recallItems.length} 个
                </p>
              </div>
              <div className="rounded-3xl bg-accent/30 px-4 py-4">
                <p className="text-elder-sm text-muted-foreground">已记录故事</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  {memories.length} 段
                </p>
              </div>
              <div className="rounded-3xl bg-accent/30 px-4 py-4">
                <p className="text-elder-sm text-muted-foreground">每日文件</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  可打印查看
                </p>
              </div>
            </div>
          </article>

          <article className="card-warm space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                <Download className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-elder-lg font-semibold text-foreground">每日回想文件</h2>
                <p className="mt-2 text-elder-base text-muted-foreground">
                  把回想题、温和提示和熟悉线索整理成一份可每日查看的文件，方便老人自己看，也方便家人陪着看。
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background px-5 py-5">
              <p className="text-elder-base text-foreground">{fileStatus}</p>
            </div>

            <div className="grid gap-3">
              {recallItems.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-3xl bg-accent/30 px-5 py-4">
                  <p className="text-elder-base font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-elder-sm text-muted-foreground">{item.prompt}</p>
                </div>
              ))}
            </div>

            <button onClick={handleOpenFile} className="btn-primary justify-center">
              <Download className="h-6 w-6" />
              打开每日回想文件
            </button>
          </article>
        </section>

        {currentItem ? (
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <article className="paper-panel space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-elder-sm text-muted-foreground">
                    第 {currentIndex + 1} 题，共 {recallItems.length} 题
                  </p>
                  <h2 className="mt-2 text-elder-lg font-semibold text-foreground">
                    {currentItem.prompt}
                  </h2>
                </div>
                <span className="emotion-tag-neutral">{currentItem.title}</span>
              </div>

              <div className="rounded-3xl bg-accent/30 px-5 py-5">
                <p className="text-elder-base font-semibold text-foreground">如果一时想不全</p>
                <p className="mt-3 text-elder-base text-muted-foreground">{currentItem.cue}</p>
                <button
                  type="button"
                  onClick={() => setShowCue((previous) => !previous)}
                  className="btn-outline mt-4 min-h-[3.8rem] justify-center px-6 py-3"
                >
                  {showCue ? '先把熟悉线索收起来' : '给我一点熟悉线索'}
                </button>
              </div>

              {showCue ? (
                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">熟悉线索</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-muted-foreground">
                    {currentItem.referenceText || currentItem.cue}
                  </p>
                </div>
              ) : null}

              <label className="block space-y-3">
                <span className="text-elder-base font-semibold text-foreground">今天想起了什么</span>
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  className="input-warm resize-none"
                  rows={5}
                  placeholder="像平常聊天一样慢慢说，不用担心说得不完整。"
                />
              </label>

              <div className="grid gap-3">
                {responseActions.map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => handleComplete(action.value)}
                    className={`w-full rounded-3xl border px-5 py-4 text-left transition-all ${
                      selectedState === action.value
                        ? 'border-primary bg-primary/10 shadow-warm'
                        : 'border-border bg-card'
                    }`}
                  >
                    <p className="text-elder-base font-semibold text-foreground">{action.label}</p>
                    <p className="mt-2 text-elder-sm text-muted-foreground">{action.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={handleNext} className="btn-outline justify-center">
                  <RefreshCw className="h-5 w-5" />
                  换一题
                </button>
              </div>
            </article>

            <article className="card-warm space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-elder-lg font-semibold text-foreground">今天的回想记录</h2>
                  <p className="mt-2 text-elder-base text-muted-foreground">
                    这里只保留温和提醒，不会判断对错，也不作为医学诊断。
                  </p>
                </div>
              </div>

              {assessment ? (
                <div
                  className={`rounded-3xl px-5 py-5 ${
                    assessment.tone === 'rest' ? 'bg-accent/35' : 'bg-secondary/12'
                  }`}
                >
                  <p className="text-elder-base font-semibold text-foreground">{assessment.title}</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-muted-foreground">
                    {assessment.message}
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-6">
                  <p className="text-elder-base text-muted-foreground">
                    回想完后，选一个最接近今天状态的按钮，这里就会记录今天的陪伴结果。
                  </p>
                </div>
              )}

              <div className="rounded-3xl bg-accent/30 px-5 py-5">
                <p className="text-elder-base font-semibold text-foreground">这题来自哪里</p>
                <p className="mt-3 text-elder-base text-muted-foreground">{currentItem.referenceLabel}</p>
              </div>

              <div className="rounded-3xl border border-border bg-background px-5 py-5">
                <p className="text-elder-base font-semibold text-foreground">今天的陪伴建议</p>
                <p className="mt-3 text-elder-base text-muted-foreground">
                  如果今天卡住了，可以改从人物称呼、地点名字、老照片或常用旧物开始，不必追求把整件事一次说完整。
                </p>
              </div>
            </article>
          </section>
        ) : null}
      </div>
    </div>
  )
}
