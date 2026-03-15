import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Volume2,
} from 'lucide-react'
import {
  summarizePastWeekDailyRecall,
  summarizeDailyRecallHistory,
  type DailyRecallLogEntry,
  type DailyRecallWeeklySummaryItem,
} from '../lib/dailyRecall'
import {
  claimAudioChannel,
  getBrowserSessionId,
  hasAcknowledgedPrivacyNotice,
  markPrivacyNoticeAcknowledged,
  releaseAudioChannel,
} from '../lib/session'

interface WelcomePageProps {
  onStartSelf: () => void
  onStartForFamily: () => void
  onOpenDailyRecall: () => void
  dailyRecallHistory: DailyRecallLogEntry[]
}

const privacyCommitments = [
  '您的故事默认仅在当前设备和当前浏览器会话内处理，不上传到公开网络。',
  '如需保留记录，只保存在本地或以匿名方式整理，不直接暴露个人身份信息。',
  '系统会把您的回忆整理成地图、照片相册和时代大事提示，帮助家人一起回想。',
]

const privacyAnnouncement =
  '隐私保护承诺：您的故事默认仅在当前设备本地处理。如需保留，也只会在本地或匿名存储，不会上传到公开网络。系统会把您的回忆整理成家庭回忆录、人物线索和日常回想提示，帮助老人和家人一起回看人生。首次使用前，请您先阅读并知晓这些说明。'

export function WelcomePage({
  onStartSelf,
  onStartForFamily,
  onOpenDailyRecall,
  dailyRecallHistory,
}: WelcomePageProps) {
  const [needsPrivacyNotice, setNeedsPrivacyNotice] = useState(
    () => !hasAcknowledgedPrivacyNotice(),
  )
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false)
  const [privacyVoiceStatus, setPrivacyVoiceStatus] = useState(
    '首次使用时会以文字和语音同步告知隐私保护承诺',
  )
  const [pendingAction, setPendingAction] = useState<'self-story' | 'family-story' | 'daily-recall'>('self-story')
  const [showOlderRecallHistory, setShowOlderRecallHistory] = useState(false)
  const [selectedRecallIndex, setSelectedRecallIndex] = useState(6)
  const sessionIdRef = useRef('')
  const hasAttemptedVoiceNoticeRef = useRef(false)
  const weeklyRecallSummary = summarizePastWeekDailyRecall(dailyRecallHistory)
  const allRecallSummary = summarizeDailyRecallHistory(dailyRecallHistory)
  const weekStartDate = weeklyRecallSummary[0]?.date ?? ''
  const olderRecallSummary = allRecallSummary.filter((item) => item.date < weekStartDate)
  const selectedRecallDay =
    weeklyRecallSummary[selectedRecallIndex] ?? weeklyRecallSummary[weeklyRecallSummary.length - 1]
  const weeklyReviewCount = weeklyRecallSummary.reduce((sum, item) => sum + item.totalReviews, 0)
  const weeklySelfCount = weeklyRecallSummary.reduce((sum, item) => sum + item.selfRecalledCount, 0)
  const weeklySupportCount = weeklyRecallSummary.reduce(
    (sum, item) => sum + item.afterCueCount + item.familySupportedCount,
    0,
  )
  const activeDays = weeklyRecallSummary.filter((item) => item.totalReviews > 0).length

  if (!sessionIdRef.current) {
    sessionIdRef.current = getBrowserSessionId()
  }

  useEffect(() => {
    const handleStorage = () => {
      setNeedsPrivacyNotice(!hasAcknowledgedPrivacyNotice())
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      releaseAudioChannel(sessionIdRef.current)
      window.speechSynthesis?.cancel()
    }
  }, [])

  useEffect(() => {
    if (!showPrivacyDialog || !needsPrivacyNotice || hasAttemptedVoiceNoticeRef.current) {
      return
    }

    hasAttemptedVoiceNoticeRef.current = true

    if (!('speechSynthesis' in window)) {
      setPrivacyVoiceStatus('当前浏览器不支持语音告知，请直接阅读下方文字内容')
      return
    }

    if (!claimAudioChannel(sessionIdRef.current, 'privacy-voice', 12_000)) {
      setPrivacyVoiceStatus('检测到其他会话正在使用语音，本次先显示文字告知以避免冲突')
      return
    }

    const utterance = new SpeechSynthesisUtterance(privacyAnnouncement)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.96
    utterance.pitch = 1

    utterance.onend = () => {
      releaseAudioChannel(sessionIdRef.current)
      setPrivacyVoiceStatus('语音告知已完成，请阅读文字内容后继续')
    }

    utterance.onerror = () => {
      releaseAudioChannel(sessionIdRef.current)
      setPrivacyVoiceStatus('语音告知未成功播放，请阅读文字内容后继续')
    }

    setPrivacyVoiceStatus('正在语音告知隐私保护承诺')
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)

    return () => {
      releaseAudioChannel(sessionIdRef.current)
      window.speechSynthesis.cancel()
    }
  }, [needsPrivacyNotice, showPrivacyDialog])

  useEffect(() => {
    setSelectedRecallIndex((previous) => {
      if (weeklyRecallSummary.length === 0) {
        return 0
      }

      return Math.min(previous, weeklyRecallSummary.length - 1)
    })
  }, [weeklyRecallSummary.length])

  const handleStartClick = (nextAction: 'self-story' | 'family-story' | 'daily-recall') => {
    if (needsPrivacyNotice) {
      hasAttemptedVoiceNoticeRef.current = false
      setPrivacyVoiceStatus('正在准备隐私保护告知')
      setPendingAction(nextAction)
      setShowPrivacyDialog(true)
      return
    }

    if (nextAction === 'daily-recall') {
      onOpenDailyRecall()
      return
    }

    if (nextAction === 'family-story') {
      onStartForFamily()
      return
    }

    onStartSelf()
  }

  const handleAcknowledgePrivacy = () => {
    markPrivacyNoticeAcknowledged()
    setNeedsPrivacyNotice(false)
    setShowPrivacyDialog(false)
    releaseAudioChannel(sessionIdRef.current)
    window.speechSynthesis?.cancel()
    if (pendingAction === 'daily-recall') {
      onOpenDailyRecall()
      return
    }

    if (pendingAction === 'family-story') {
      onStartForFamily()
      return
    }

    onStartSelf()
  }

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 gradient-soft">
      {/* 主标题区域 */}
        <div className="text-center mb-10 animate-fade-in sm:mb-12">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full gradient-warm shadow-warm-lg sm:mb-8 sm:h-24 sm:w-24">
            <Heart className="h-10 w-10 text-primary-foreground sm:h-12 sm:w-12" />
          </div>

          <h1 className="text-elder-3xl font-bold mb-4">
            <span className="text-gradient-warm">岁语</span>
          </h1>

          <p className="mx-auto max-w-[20rem] text-elder-xl leading-relaxed text-muted-foreground sm:max-w-2xl">
            帮老人留下人生故事，也帮家人更了解父母走过的岁月
          </p>
        </div>

        {/* 功能介绍卡片 */}
        <div className="mb-8 grid w-full max-w-2xl gap-4 sm:gap-6">
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="温和陪伴"
            description="用更慢、更轻的提问方式，陪老人把故事慢慢讲出来"
            delay="animation-delay-100"
          />
          <FeatureCard
            icon={<UsersRound className="w-8 h-8" />}
            title="家人一起整理"
            description="支持子女陪访、补充人物和照片，把家庭记忆一起整理下来"
            delay="animation-delay-200"
          />
          <FeatureCard
            icon={<BookOpen className="w-8 h-8" />}
            title="回忆录与回想卡"
            description="既能整理成长文回忆录，也能每天轻轻回想熟悉的人和事"
            delay="animation-delay-300"
          />
        </div>

        <section className="card-warm mb-8 w-full max-w-2xl animate-slide-up sm:mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary sm:h-14 sm:w-14 sm:rounded-2xl">
              <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-elder-lg font-semibold text-foreground mb-2">隐私保护承诺</h2>
                <p className="text-elder-base text-muted-foreground">
                  您分享的内容默认仅用于当前设备本地处理或匿名整理，不上传到公开网络。整理后的内容主要用于生成家庭回忆录、人物线索、照片相册和日常回想提示。
                </p>
              </div>

              <div className="grid gap-3">
                {privacyCommitments.map((commitment) => (
                  <div key={commitment} className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
                    <p className="text-elder-base text-foreground">{commitment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="card-warm mb-8 w-full max-w-2xl animate-slide-up sm:mb-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-14 sm:w-14 sm:rounded-2xl">
              <BookOpen className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mb-2 text-elder-lg font-semibold text-foreground">过去一周回想情况</h2>
              <p className="text-elder-base text-muted-foreground">
                把最近七天“日常回想”的陪伴记录汇总在一起，方便家人快速了解哪几天有回想、当天主要是自己想起，还是需要提示和陪伴。
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-accent/30 px-4 py-4">
              <p className="text-elder-sm text-muted-foreground">最近七天</p>
              <p className="mt-2 text-elder-base font-semibold text-foreground">
                {activeDays} 天有记录
              </p>
            </div>
            <div className="rounded-3xl bg-accent/30 px-4 py-4">
              <p className="text-elder-sm text-muted-foreground">完成回想</p>
              <p className="mt-2 text-elder-base font-semibold text-foreground">
                {weeklyReviewCount} 次
              </p>
            </div>
            <div className="rounded-3xl bg-accent/30 px-4 py-4">
              <p className="text-elder-sm text-muted-foreground">主要方式</p>
              <p className="mt-2 text-elder-base font-semibold text-foreground">
                {weeklySelfCount >= weeklySupportCount ? '更多是自己想起' : '更多需要提示或陪伴'}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[1.75rem] border border-border bg-background/80 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-elder-base font-semibold text-foreground">七天记录</p>
                <p className="text-elder-sm text-muted-foreground">
                  点击下方日期，查看当天的回想方式和主要话题
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecallIndex((previous) => Math.max(previous - 1, 0))}
                  disabled={selectedRecallIndex === 0}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="查看前一天"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedRecallIndex((previous) =>
                      Math.min(previous + 1, weeklyRecallSummary.length - 1),
                    )
                  }
                  disabled={selectedRecallIndex >= weeklyRecallSummary.length - 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="查看后一天"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {weeklyRecallSummary.map((item, index) => (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => setSelectedRecallIndex(index)}
                  className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                    index === selectedRecallIndex
                      ? 'border-primary bg-primary/10 shadow-warm'
                      : 'border-border bg-card hover:bg-accent/70'
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {formatShortDateLabel(item.date)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.totalReviews > 0 ? `${item.totalReviews} 次回想` : '暂无记录'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {selectedRecallDay ? (
            <article className="mt-4 rounded-3xl border border-border bg-background/80 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-elder-base font-semibold text-foreground">
                    {formatDateLabel(selectedRecallDay.date)}
                  </p>
                  <p className="text-elder-sm text-muted-foreground">
                    {selectedRecallDay.totalReviews > 0
                      ? buildRecallDaySummary(selectedRecallDay)
                      : '这一天还没有留下日常回想记录'}
                  </p>
                </div>
                <span className="emotion-tag-neutral">
                  {selectedRecallDay.totalReviews > 0
                    ? `${selectedRecallDay.totalReviews} 次回想`
                    : '暂无记录'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="emotion-tag-positive">
                  自己想起 {selectedRecallDay.selfRecalledCount}
                </span>
                <span className="emotion-tag-neutral">
                  看提示后 {selectedRecallDay.afterCueCount}
                </span>
                <span className="emotion-tag-neutral">
                  家人陪同 {selectedRecallDay.familySupportedCount}
                </span>
                <span className="emotion-tag-attention">
                  今天休息 {selectedRecallDay.restCount}
                </span>
              </div>

              <div className="mt-3 rounded-2xl bg-accent/30 px-4 py-3">
                <p className="text-elder-sm font-semibold text-foreground">当天主要回想话题</p>
                {selectedRecallDay.topics.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedRecallDay.topics.map((topic) => (
                      <span
                        key={`${selectedRecallDay.date}-${topic}`}
                        className="emotion-tag-neutral"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-elder-sm text-muted-foreground">
                    完成每日回想后，这里会自动出现当天涉及的话题。
                  </p>
                )}
              </div>
            </article>
          ) : null}

          <div className="mt-4 rounded-[1.75rem] border border-border bg-background/80 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-elder-base font-semibold text-foreground">更早日期记录</p>
                <p className="text-elder-sm text-muted-foreground">
                  想回看七天以前的陪伴记录，可以展开查看更早的日期。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOlderRecallHistory((previous) => !previous)}
                disabled={olderRecallSummary.length === 0}
                className="btn-outline min-h-[3.5rem] px-5 py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showOlderRecallHistory ? '收起更早记录' : '查看更早日期记录'}
              </button>
            </div>

            {showOlderRecallHistory ? (
              olderRecallSummary.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {olderRecallSummary
                    .slice()
                    .reverse()
                    .map((item) => (
                      <div
                        key={item.date}
                        className="rounded-2xl border border-border bg-card px-4 py-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-elder-base font-semibold text-foreground">
                            {formatDateLabel(item.date)}
                          </p>
                          <span className="text-elder-sm text-muted-foreground">
                            {item.totalReviews > 0 ? `${item.totalReviews} 次回想` : '暂无记录'}
                          </span>
                        </div>
                        <p className="mt-2 text-elder-sm text-muted-foreground">
                          {item.totalReviews > 0
                            ? buildRecallDaySummary(item)
                            : '这一天没有留下新的回想记录。'}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="mt-4 text-elder-base text-muted-foreground">
                  目前还没有七天以前的日常回想记录。
                </p>
              )
            ) : null}
          </div>
        </section>

        {/* 开始按钮 */}
        <div className="flex w-full max-w-2xl flex-col gap-4">
          <button
            onClick={() => handleStartClick('self-story')}
            className="btn-primary w-full justify-center text-elder-lg animate-slide-up sm:text-elder-xl"
          >
            开始记录我的人生
          </button>
          <button
            onClick={() => handleStartClick('family-story')}
            className="btn-outline w-full justify-center text-elder-lg animate-slide-up sm:text-elder-xl"
          >
            <UsersRound className="h-6 w-6" />
            我来帮父母整理回忆
          </button>
          <button
            onClick={() => handleStartClick('daily-recall')}
            className="btn-outline w-full justify-center text-elder-lg animate-slide-up sm:text-elder-xl"
          >
            <BookOpen className="h-6 w-6" />
            今天做一次轻松回想
          </button>
        </div>

        <p className="mt-5 text-center text-elder-sm text-muted-foreground animate-fade-in sm:mt-6">
          岁语，让年岁讲出自己的故事
        </p>
      </div>

      {showPrivacyDialog && (
        <div className="fixed inset-0 z-50 bg-foreground/35 backdrop-blur-sm px-4 py-6 flex items-center justify-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl bg-card rounded-[2rem] shadow-warm-lg border border-border p-6 sm:p-8"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-elder-xl font-semibold text-foreground mb-2">首次使用隐私告知</h2>
                <p className="text-elder-base text-muted-foreground">{privacyVoiceStatus}</p>
              </div>
            </div>

            <div className="card-warm bg-accent/40 shadow-none mb-6">
              <p className="text-elder-base text-foreground leading-relaxed">{privacyAnnouncement}</p>
            </div>

            <div className="grid gap-4 mb-8">
              {privacyCommitments.map((commitment) => (
                <div key={commitment} className="flex items-start gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-secondary flex-shrink-0" />
                  <p className="text-elder-base text-foreground">{commitment}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:justify-end">
              <button
                onClick={() => {
                  setShowPrivacyDialog(false)
                  releaseAudioChannel(sessionIdRef.current)
                  window.speechSynthesis?.cancel()
                }}
                className="btn-outline justify-center"
              >
                返回
              </button>
              <button onClick={handleAcknowledgePrivacy} className="btn-primary justify-center">
                我已知晓，开始使用
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  delay: string
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <div className={`card-warm flex items-start gap-3 animate-slide-up sm:gap-4 ${delay}`}>
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-primary sm:h-14 sm:w-14">
        {icon}
      </div>
      <div>
        <h3 className="text-elder-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-elder-base text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function formatDateLabel(date: string) {
  const [year, month, day] = date.split('-').map((value) => Number.parseInt(value, 10))
  const parsedDate = new Date(year, (month || 1) - 1, day || 1)
  return parsedDate.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatShortDateLabel(date: string) {
  const [, month, day] = date.split('-')
  return `${Number.parseInt(month || '1', 10)}/${Number.parseInt(day || '1', 10)}`
}

function buildRecallDaySummary(item: DailyRecallWeeklySummaryItem) {
  if (item.totalReviews === 0) {
    return '这一天还没有留下日常回想记录'
  }

  if (item.selfRecalledCount >= item.afterCueCount + item.familySupportedCount) {
    return `当天完成 ${item.totalReviews} 次回想，主要是自己慢慢想起来的。`
  }

  if (item.familySupportedCount > 0) {
    return `当天完成 ${item.totalReviews} 次回想，更多是在家人陪伴下完成。`
  }

  if (item.afterCueCount > 0) {
    return `当天完成 ${item.totalReviews} 次回想，主要是看提示后继续想起来。`
  }

  return `当天完成 ${item.totalReviews} 次回想。`
}
