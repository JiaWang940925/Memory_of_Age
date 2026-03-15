import { useState } from 'react'
import {
  ArrowLeft,
  Clock,
  Download,
  Heart,
  Home,
  Image as ImageIcon,
  Landmark,
  MapPinned,
  Route,
  Sparkles,
  Tag,
} from 'lucide-react'
import type { Memory } from '../App'
import { buildFeaturedHistoricalEvents, historicalEvents } from '../lib/historicalEvents'
import { buildStoryPhotoItems, openMemoryStoryPdf } from '../lib/memoryBook'
import type { UserProfile } from '../lib/userProfile'

interface MemoryPageProps {
  memories: Memory[]
  userProfile: UserProfile | null
  onBack: () => void
  onGoHome: () => void
  onOpenDailyRecall: () => void
  onOpenJourney: () => void
}

function getEmotionIcon(emotion: 'positive' | 'neutral' | 'attention') {
  switch (emotion) {
    case 'positive':
      return <span className="emotion-tag-positive">温馨回忆</span>
    case 'attention':
      return <span className="emotion-tag-attention">人生感悟</span>
    default:
      return <span className="emotion-tag-neutral">生活点滴</span>
  }
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildMemoryQuery(memory: Memory) {
  return `${memory.category} ${memory.question} ${memory.answer}`
}

export function MemoryPage({
  memories,
  userProfile,
  onBack,
  onGoHome,
  onOpenDailyRecall,
  onOpenJourney,
}: MemoryPageProps) {
  const [storyExportStatus, setStoryExportStatus] = useState(
    '会把多次口述按时间与故事推进顺序整理成一篇连贯文章，并可另存为 PDF 交给家人保存',
  )

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
  const featuredEvents = userProfile
    ? buildFeaturedHistoricalEvents(
        userProfile,
        memories.map(buildMemoryQuery),
        Math.max(4, Math.min(memories.length, 6)),
      )
    : historicalEvents.slice(0, 4)

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

  if (memories.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={onBack}
                className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-foreground hover:bg-accent/80 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-elder-xl font-bold text-foreground">我的回忆录</h1>
                <p className="text-elder-sm text-muted-foreground">
                  先积累一些回忆，地图和时代大事提醒才会展开
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button onClick={onGoHome} className="btn-outline w-full justify-center sm:w-auto">
                <Home className="h-5 w-5" />
                返回主页
              </button>
              <button
                onClick={onOpenDailyRecall}
                className="btn-daily-recall w-full justify-center sm:w-auto"
              >
                <span className="btn-daily-recall-icon">
                  <Heart className="h-5 w-5" />
                </span>
                {"\u6bcf\u65e5\u56de\u60f3"}
              </button>
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
              先积累一些文字或照片，后面才能把人生片段整理成地图、相册和时代记忆线索。
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
        <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
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

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button onClick={onGoHome} className="btn-outline w-full justify-center sm:w-auto">
              <Home className="h-5 w-5" />
              返回主页
            </button>
            <button
              onClick={onOpenDailyRecall}
              className="btn-daily-recall w-full justify-center sm:w-auto"
            >
              <span className="btn-daily-recall-icon">
                <Heart className="h-5 w-5" />
              </span>
              {"\u6bcf\u65e5\u56de\u60f3"}
            </button>
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
                    <h2 className="text-elder-lg font-semibold text-foreground mb-2">回忆地图</h2>
                    <p className="text-elder-base text-muted-foreground">
                      回忆录写完后，可以进入地图平台，把个人经历和时代大事放在同一张地图里看，让家人更容易顺着年代继续追问。
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
                    <p className="text-elder-sm text-muted-foreground">历史大事件</p>
                    <p className="mt-2 text-elder-base font-semibold text-foreground">
                      {historicalEvents.length} 条
                    </p>
                  </div>
                </div>

                <p className="text-elder-base text-muted-foreground">
                  系统会根据您的出生年代、成长地域和已记录的内容，优先推荐最可能帮助您继续回想的时代大事。
                </p>

                <button onClick={onOpenJourney} className="btn-primary w-full sm:w-auto">
                  <Route className="w-6 h-6" />
                  进入回忆地图
                </button>
              </div>
            </article>

            <article className="card-warm space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-elder-lg font-semibold text-foreground mb-2">时代大事件提醒</h2>
                  <p className="text-elder-base text-muted-foreground">
                    这些不是人物故事，而是能帮助继续回想的时代坐标。先想“大事发生时我在哪里”，再顺着家人、工作、居住地往下讲，通常更容易打开记忆。
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {featuredEvents.map((event) => (
                  <div key={event.id} className="rounded-3xl bg-accent/30 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="emotion-tag-neutral">{event.eventYear} 年</span>
                      <p className="text-elder-base font-semibold text-foreground">{event.shortTitle}</p>
                    </div>
                    <p className="mt-3 text-elder-sm text-muted-foreground">{event.summary}</p>
                    <p className="mt-3 text-elder-sm text-foreground leading-7">{event.memoryPrompt}</p>
                  </div>
                ))}
              </div>
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
                    把多次口述按时间与故事推进顺序整合成一篇适合打印的完整文章，尽量保留原话，只做轻度语句整理与标点修正。
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
                  <Landmark className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-elder-lg font-semibold text-foreground mb-2">适合继续追问的时代线索</h2>
                  <p className="text-elder-base text-muted-foreground">
                    不知道下一步怎么问时，可以先挑一条年代线索，把“大事发生时我家在做什么”说出来，往往就能带出人物、地点和情绪。
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {featuredEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-3xl border border-border bg-background px-5 py-5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="emotion-tag-positive">{event.eraLabel}</span>
                      <p className="text-elder-base font-semibold text-foreground">{event.title}</p>
                    </div>
                    <p className="mt-3 text-elder-sm text-muted-foreground">{event.memoryCue}</p>
                    <div className="mt-4 grid gap-2">
                      {event.rememberingQuestions.slice(0, 2).map((question) => (
                        <p key={question} className="text-elder-sm text-foreground leading-7">
                          {question}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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

            <article className="card-warm space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-elder-lg font-semibold text-foreground mb-2">回忆触发器</h2>
                  <p className="text-elder-base text-muted-foreground">
                    当记忆停住时，可以优先从“当时家里用什么电器”“消息是怎么传来的”“身边有哪些人”这类具体细节重新打开。
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {featuredEvents.slice(0, 4).map((event) => (
                  <div key={event.id} className="rounded-3xl bg-accent/30 px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {event.clueTags.slice(0, 4).map((tag) => (
                        <span key={tag} className="emotion-tag-neutral">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-elder-base font-semibold text-foreground">{event.shortTitle}</p>
                    <p className="mt-2 text-elder-sm text-muted-foreground leading-7">
                      {event.memoryPrompt}
                    </p>
                  </div>
                ))}
              </div>
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

      <div className="text-center py-8 border-t border-border">
        <p className="text-elder-sm text-muted-foreground">
          每一段记忆，都是生命中闪亮的星辰
        </p>
      </div>
    </div>
  )
}
