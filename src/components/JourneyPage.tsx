import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flag,
  HeartHandshake,
  Landmark,
  MapPinned,
  Mountain,
  Rocket,
  School,
  ScrollText,
  Shield,
  Sparkles,
  TrainFront,
  UsersRound,
  Waves,
  Waypoints,
} from 'lucide-react'
import type { GeneratedAvatar, Memory } from '../App'
import {
  buildFeaturedHistoricalEncounters,
  historicalProfiles,
  type HistoricalProfile,
} from '../lib/historicalProfiles'
import { buildJourneyExperience, type JourneyScene } from '../lib/memoryJourney'
import { buildProfileSummary, getAgeAtYear, type UserProfile } from '../lib/userProfile'

interface JourneyPageProps {
  memories: Memory[]
  onBack: () => void
  userProfile: UserProfile
  generatedAvatar: GeneratedAvatar | null
}

interface MemoryMapNode {
  id: string
  kind: 'memory'
  x: number
  y: number
  scene: JourneyScene
}

interface HistoryMapNode {
  id: string
  kind: 'history'
  x: number
  y: number
  profile: HistoricalProfile
  anchorSceneId: string
}

interface SelectedMapNode {
  kind: 'memory' | 'history'
  id: string
}

const MAP_CANVAS_HEIGHT = 640
const MAP_NODE_SPACING = 250
const MAP_SIDE_PADDING = 220
const MAP_HISTORY_ROW_Y = [186, 224, 172, 212]
const MAP_MEMORY_ROW_Y = [430, 372, 452, 394, 438]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getMapCanvasWidth(nodeCount: number) {
  if (nodeCount <= 1) {
    return 1360
  }

  return Math.max(
    1360,
    MAP_SIDE_PADDING * 2 + (nodeCount - 1) * MAP_NODE_SPACING,
  )
}

function buildMemoryNodes(
  scenes: JourneyScene[],
  canvasWidth: number,
): MemoryMapNode[] {
  if (!scenes.length) {
    return []
  }

  if (scenes.length === 1) {
    return [
      {
        id: scenes[0].id,
        kind: 'memory',
        x: canvasWidth / 2,
        y: MAP_MEMORY_ROW_Y[1],
        scene: scenes[0],
      },
    ]
  }

  return scenes.map((scene, index) => {
    const x = MAP_SIDE_PADDING + index * MAP_NODE_SPACING
    const y = MAP_MEMORY_ROW_Y[index % MAP_MEMORY_ROW_Y.length]

    return {
      id: scene.id,
      kind: 'memory',
      x,
      y,
      scene,
    }
  })
}

function buildHistoryNodes(
  memoryNodes: MemoryMapNode[],
  profiles: HistoricalProfile[],
  canvasWidth: number,
): HistoryMapNode[] {
  return memoryNodes.map((node, index) => {
    const profile = profiles[index % profiles.length]
    const x = clamp(
      node.x + (index % 2 === 0 ? -56 : 56),
      152,
      canvasWidth - 152,
    )
    const y = MAP_HISTORY_ROW_Y[index % MAP_HISTORY_ROW_Y.length]

    return {
      id: `${profile.id}-${node.id}`,
      kind: 'history',
      x,
      y,
      profile,
      anchorSceneId: node.id,
    }
  })
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return ''
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1]
    const point = points[index]
    const controlX = (previousPoint.x + point.x) / 2

    path += ` C ${controlX} ${previousPoint.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`
  }

  return path
}

function getSceneIcon(scene: JourneyScene): LucideIcon {
  switch (scene.backdrop.id) {
    case 'school':
      return School
    case 'factory':
      return Building2
    case 'waterside':
      return Waves
    case 'family':
      return HeartHandshake
    case 'journey':
      return TrainFront
    default:
      return MapPinned
  }
}

function getHistoricalIcon(profile: HistoricalProfile): LucideIcon {
  if (profile.eventTitle.includes('抗美援朝')) {
    return Flag
  }

  if (profile.eventTitle.includes('慰安妇')) {
    return Shield
  }

  if (profile.eventTitle.includes('神舟五号') || profile.eventTitle.includes('航天')) {
    return Rocket
  }

  if (profile.eventTitle.includes('汶川地震')) {
    return Mountain
  }

  if (profile.title.includes('摄影')) {
    return Camera
  }

  if (profile.title.includes('记者')) {
    return ScrollText
  }

  return Landmark
}

function buildEncounterBasisText(profile: HistoricalProfile, userProfile: UserProfile) {
  const ageAtEvent = getAgeAtYear(userProfile, profile.eventYear)
  const parts: string[] = []

  if (ageAtEvent !== null && ageAtEvent >= 0) {
    parts.push(`${profile.eventYear} 年时您大约 ${ageAtEvent} 岁`)
  }

  if (profile.locationKeywords?.some((keyword) => userProfile.birthPlace.includes(keyword) || userProfile.hometown.includes(keyword))) {
    parts.push('与您的出生地或成长地有地理关联')
  }

  if (!parts.length) {
    return '这位人物因其时代代表性被叠加到您的地图中'
  }

  return `系统优先叠加这位人物，因为${parts.join('，')}。`
}

function PaperMapNode({
  isActive,
  label,
  subtitle,
  x,
  y,
  kind,
  onClick,
  icon: Icon,
}: {
  isActive: boolean
  label: string
  subtitle: string
  x: number
  y: number
  kind: 'memory' | 'history'
  onClick: () => void
  icon: LucideIcon
}) {
  return (
    <div
      className="sketch-node"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className={`sketch-node-button ${kind} ${isActive ? 'active' : ''}`}
      >
        <Icon className="h-7 w-7" />
      </button>
      <div className={`sketch-node-label ${isActive ? 'active' : ''}`}>
        <p className="text-elder-sm font-semibold text-foreground">{label}</p>
        <p className="text-[1rem] leading-6 text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

function SourceLinks({ links }: { links: HistoricalProfile['sourceLinks'] }) {
  return (
    <div className="space-y-3">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 text-left transition-colors hover:bg-accent/50"
        >
          <span className="text-elder-base text-foreground">{link.label}</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </a>
      ))}
    </div>
  )
}

export function JourneyPage({
  memories,
  onBack,
  userProfile,
  generatedAvatar,
}: JourneyPageProps) {
  const journey = buildJourneyExperience(memories)
  const mapCanvasWidth = getMapCanvasWidth(journey.scenes.length)
  const memoryNodes = buildMemoryNodes(journey.scenes, mapCanvasWidth)
  const featuredProfiles = buildFeaturedHistoricalEncounters(
    userProfile,
    journey.scenes.map(
      (scene) => `${scene.category} ${scene.backdrop.label} ${scene.answer} ${scene.question}`,
    ),
    Math.max(memoryNodes.length, 4),
  )
  const historyNodes = buildHistoryNodes(memoryNodes, featuredProfiles, mapCanvasWidth)
  const [selectedNode, setSelectedNode] = useState<SelectedMapNode>({
    kind: 'memory',
    id: memoryNodes[0]?.id ?? '',
  })
  const [mapOffsetX, setMapOffsetX] = useState(0)
  const [mapMaxOffset, setMapMaxOffset] = useState(0)
  const [mapViewportWidth, setMapViewportWidth] = useState(0)
  const mapViewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hasSelectedMemory = memoryNodes.some(
      (node) => node.kind === selectedNode.kind && node.id === selectedNode.id,
    )
    const hasSelectedHistory = historyNodes.some(
      (node) => node.kind === selectedNode.kind && node.id === selectedNode.id,
    )

    if (hasSelectedMemory || hasSelectedHistory) {
      return
    }

    setSelectedNode({
      kind: 'memory',
      id: memoryNodes[0]?.id ?? '',
    })
  }, [historyNodes, memoryNodes, selectedNode])

  useEffect(() => {
    const syncMapScrollState = () => {
      const viewport = mapViewportRef.current
      if (!viewport) {
        return
      }

      const nextViewportWidth = viewport.clientWidth
      const nextMaxOffset = Math.max(0, mapCanvasWidth - nextViewportWidth)

      setMapViewportWidth(nextViewportWidth)
      setMapMaxOffset(nextMaxOffset)
      setMapOffsetX((previous) => clamp(previous, 0, nextMaxOffset))
    }

    syncMapScrollState()
    window.addEventListener('resize', syncMapScrollState)

    return () => {
      window.removeEventListener('resize', syncMapScrollState)
    }
  }, [mapCanvasWidth])

  if (!journey.scenes.length) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card/90 border-b border-border px-6 py-4 sticky top-0 z-10 backdrop-blur">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-foreground hover:bg-accent/80 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-elder-xl font-bold text-foreground">平面回忆地图</h1>
              <p className="text-elder-sm text-muted-foreground">
                需要先积累一些回忆，地图才能展开
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="paper-panel text-center py-16 px-8">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-accent text-primary">
              <Waypoints className="h-12 w-12" />
            </div>
            <h2 className="text-elder-xl font-semibold text-foreground">地图还没有节点</h2>
            <p className="mt-4 text-elder-base text-muted-foreground max-w-2xl mx-auto">
              先记录几段人生故事，平台会自动生成数字人、回忆站点和历史人物偶遇支线。
            </p>
            <button onClick={onBack} className="btn-primary mt-8">
              返回回忆录
            </button>
          </div>
        </div>
      </div>
    )
  }

  const selectedMemoryNode = selectedNode.kind === 'memory'
    ? memoryNodes.find((node) => node.id === selectedNode.id) ?? memoryNodes[0]
    : null
  const selectedHistoryNode = selectedNode.kind === 'history'
    ? historyNodes.find((node) => node.id === selectedNode.id) ?? historyNodes[0]
    : null
  const selectedHistoryProfile = selectedNode.kind === 'history'
    ? selectedHistoryNode?.profile ?? historyNodes[0]?.profile ?? historicalProfiles[0]
    : null
  const selectedTargetX = selectedNode.kind === 'history'
    ? selectedHistoryNode?.x ?? historyNodes[0]?.x ?? 0
    : selectedMemoryNode?.x ?? memoryNodes[0]?.x ?? 0
  const activeScene = selectedMemoryNode?.scene
    ?? memoryNodes.find((node) => node.id === selectedHistoryNode?.anchorSceneId)?.scene
    ?? memoryNodes[0].scene
  const linkedHistoryNode = historyNodes.find((node) => node.anchorSceneId === activeScene.id) ?? historyNodes[0]
  const routePath = buildPath(memoryNodes)

  useEffect(() => {
    if (mapMaxOffset <= 0 || mapViewportWidth <= 0) {
      return
    }

    const desiredOffset = clamp(
      selectedTargetX - mapViewportWidth / 2,
      0,
      mapMaxOffset,
    )

    setMapOffsetX(desiredOffset)
  }, [
    mapMaxOffset,
    mapViewportWidth,
    selectedNode.id,
    selectedNode.kind,
    selectedTargetX,
  ])

  const nudgeMap = (direction: 'left' | 'right') => {
    setMapOffsetX((previous) =>
      clamp(previous + (direction === 'left' ? -420 : 420), 0, mapMaxOffset),
    )
  }
  const handleMapSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMapOffsetX(Number(event.target.value))
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/88 border-b border-border px-6 py-4 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-foreground hover:bg-accent/80 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-elder-xl font-bold text-foreground">平面回忆地图</h1>
              <p className="text-elder-sm text-muted-foreground">
                用简笔纸面地图浏览人生，也在节点间偶遇历史人物
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <span className="emotion-tag-neutral">{journey.scenes.length} 个回忆节点</span>
            <span className="emotion-tag-positive">{historicalProfiles.length} 位历史人物</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="paper-panel space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UsersRound className="h-7 w-7" />
              </div>
              <div>
                <div className="flex flex-wrap gap-3">
                  <span className={generatedAvatar ? 'emotion-tag-positive' : 'emotion-tag-neutral'}>
                    {generatedAvatar ? '数字人视频已接入' : '可继续生成数字人视频'}
                  </span>
                  <span className="emotion-tag-neutral">{journey.avatar.title}</span>
                </div>
                <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                  {journey.avatar.name}
                </h2>
                <p className="mt-2 text-elder-base text-muted-foreground">
                  {journey.avatar.intro}
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border bg-[linear-gradient(145deg,rgba(193,152,114,0.22),rgba(255,248,239,0.92))] px-6 py-6">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="text-elder-base font-semibold">数字人形象建议</span>
              </div>
              <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                {journey.avatar.appearance}
              </p>
            </div>

            {generatedAvatar ? (
              <div className="rounded-[1.75rem] border border-border bg-card/92 px-5 py-5">
                <p className="text-elder-base font-semibold text-foreground">SadTalker 数字人预览</p>
                <video
                  controls
                  src={generatedAvatar.videoUrl}
                  className="mt-4 w-full rounded-3xl bg-black aspect-video"
                />
                <p className="mt-3 text-elder-sm text-muted-foreground">
                  最近一次生成时间：{new Date(generatedAvatar.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {journey.avatar.auraTags.map((tag) => (
                <span key={tag} className="emotion-tag-neutral">
                  {tag}
                </span>
              ))}
              {generatedAvatar ? (
                <span className="emotion-tag-positive">已同步到地图平台</span>
              ) : null}
            </div>
          </article>

          <article className="paper-panel space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                <Compass className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-elder-lg font-semibold text-foreground">地图玩法</h2>
                <p className="mt-2 text-elder-base text-muted-foreground">
                  棕色节点是您的回忆，青灰节点是历史人物偶遇。点击任一节点都能在下方读到故事，并知道它和哪一段人生场景相连。
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-accent/35 px-5 py-5">
                <p className="text-elder-sm text-muted-foreground">当前主线</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  {journey.title}
                </p>
              </div>
              <div className="rounded-3xl bg-accent/35 px-5 py-5">
                <p className="text-elder-sm text-muted-foreground">历史人物库</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  {historicalProfiles.length} 位代表人物
                </p>
              </div>
              <div className="rounded-3xl bg-accent/35 px-5 py-5">
                <p className="text-elder-sm text-muted-foreground">叠加依据</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  出生年代与成长地点
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card px-5 py-5">
              <p className="text-elder-sm text-muted-foreground">当前用户画像</p>
              <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                {buildProfileSummary(userProfile)}
              </p>
              <p className="mt-3 text-elder-sm text-muted-foreground">
                地图中的历史人物会优先匹配您的出生年份、经历年代和地域线索。
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="map-legend-chip">
                <span className="map-legend-dot memory" />
                <span className="text-elder-sm text-foreground">我的回忆节点</span>
              </div>
              <div className="map-legend-chip">
                <span className="map-legend-dot history" />
                <span className="text-elder-sm text-foreground">历史人物偶遇节点</span>
              </div>
            </div>
          </article>
        </section>

        <section className="paper-panel">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Waypoints className="h-5 w-5" />
                <span className="text-elder-base font-semibold">平面简笔画地图</span>
              </div>
              <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                回忆主线与历史偶遇支线在同一张纸面地图里展开
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="emotion-tag-neutral">{journey.readinessLabel}</span>
              <span className="emotion-tag-positive">{activeScene.backdrop.label}</span>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-elder-sm text-muted-foreground">
              节点已改成横向展开。可点击左右按钮，或拖动下方滑杆浏览整张地图。
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => nudgeMap('left')}
                disabled={mapOffsetX <= 4}
                className="map-scroll-button"
                aria-label="向左拖动地图"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="map-scroll-slider">
                <span className="flex items-center gap-2 text-elder-sm font-medium text-foreground">
                  <ArrowRight className="h-4 w-4 rotate-180 text-primary" />
                  左右拖动地图
                  <ArrowRight className="h-4 w-4 text-primary" />
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(mapMaxOffset, 1)}
                  value={Math.min(mapOffsetX, Math.max(mapMaxOffset, 1))}
                  onChange={handleMapSliderChange}
                  disabled={mapMaxOffset <= 0}
                  className="map-scroll-range"
                  aria-label="横向拖动地图"
                />
              </div>
              <button
                type="button"
                onClick={() => nudgeMap('right')}
                disabled={mapOffsetX >= mapMaxOffset - 4}
                className="map-scroll-button"
                aria-label="向右拖动地图"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="sketch-map-frame">
            <div className="sketch-map-edge left" aria-hidden="true" />
            <div className="sketch-map-edge right" aria-hidden="true" />
            <div
              ref={mapViewportRef}
              className="sketch-map-viewport"
            >
              <div
                className="sketch-map sketch-map-canvas"
                style={{
                  width: `${mapCanvasWidth}px`,
                  minWidth: `${mapCanvasWidth}px`,
                  height: `${MAP_CANVAS_HEIGHT}px`,
                  transform: `translateX(-${mapOffsetX}px)`,
                }}
              >
                <svg
                  viewBox={`0 0 ${mapCanvasWidth} ${MAP_CANVAS_HEIGHT}`}
                  className="absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <path d={routePath} className="sketch-route-outline" />
                  <path d={routePath} className="sketch-route-main" />
                  {historyNodes.map((node) => {
                    const anchor = memoryNodes.find((item) => item.id === node.anchorSceneId)
                    if (!anchor) {
                      return null
                    }

                    const branch = `M ${anchor.x} ${anchor.y} L ${node.x} ${node.y}`
                    return <path key={node.id} d={branch} className="sketch-route-branch" />
                  })}
                </svg>

                {memoryNodes.map((node) => (
                  <PaperMapNode
                    key={node.id}
                    isActive={selectedNode.kind === 'memory' && selectedNode.id === node.id}
                    label={node.scene.backdrop.mapLabel}
                    subtitle={`第 ${node.scene.index + 1} 站`}
                    x={node.x}
                    y={node.y}
                    kind="memory"
                    icon={getSceneIcon(node.scene)}
                    onClick={() => {
                      setSelectedNode({
                        kind: 'memory',
                        id: node.id,
                      })
                    }}
                  />
                ))}

                {historyNodes.map((node) => (
                  <PaperMapNode
                    key={node.id}
                    isActive={selectedNode.kind === 'history' && selectedNode.id === node.id}
                    label={node.profile.name}
                    subtitle="历史偶遇"
                    x={node.x}
                    y={node.y}
                    kind="history"
                    icon={getHistoricalIcon(node.profile)}
                    onClick={() => {
                      setSelectedNode({
                        kind: 'history',
                        id: node.id,
                      })
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="paper-panel space-y-5">
            {selectedNode.kind === 'memory' && selectedMemoryNode ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">
                      {selectedMemoryNode.scene.title}
                    </h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      {selectedMemoryNode.scene.backdrop.description}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-accent/35 p-5">
                  <p className="text-elder-sm text-muted-foreground">引导问题</p>
                  <p className="mt-2 text-elder-base italic text-foreground">
                    “{selectedMemoryNode.scene.question}”
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-sm text-muted-foreground">回忆正文</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    {selectedMemoryNode.scene.answer}
                  </p>
                </div>

                <div className="rounded-3xl bg-[linear-gradient(145deg,rgba(136,114,90,0.14),rgba(255,249,242,0.95))] px-5 py-5">
                  <div className="flex items-center gap-2 text-primary">
                    <UsersRound className="h-5 w-5" />
                    <span className="text-elder-base font-semibold">数字人讲述建议</span>
                  </div>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    “{selectedMemoryNode.scene.quote}”适合由数字人以缓慢、亲近的语调讲出来，让家人进入这段场景。
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="emotion-tag-neutral">{selectedMemoryNode.scene.category}</span>
                  <span className="emotion-tag-positive">{selectedMemoryNode.scene.timeLabel}</span>
                  <span className="emotion-tag-neutral">{selectedMemoryNode.scene.emotionLabel}</span>
                </div>
              </>
            ) : selectedHistoryProfile ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    {(() => {
                      const Icon = getHistoricalIcon(selectedHistoryProfile)
                      return <Icon className="h-7 w-7" />
                    })()}
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">
                      {selectedHistoryProfile.name}
                    </h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      {selectedHistoryProfile.title}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-accent/35 p-5 space-y-3">
                  <p className="text-elder-sm text-muted-foreground">历史事件</p>
                  <p className="text-elder-base font-semibold text-foreground">
                    {selectedHistoryProfile.eventTitle}
                  </p>
                  <p className="text-elder-base text-muted-foreground">
                    {selectedHistoryProfile.summary}
                  </p>
                  <p className="text-elder-sm leading-7 text-muted-foreground">
                    {buildEncounterBasisText(selectedHistoryProfile, userProfile)}
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-sm text-muted-foreground">第一人称转述</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    {selectedHistoryProfile.firstPersonNarrative}
                  </p>
                  <p className="mt-4 text-elder-sm text-muted-foreground leading-7">
                    {selectedHistoryProfile.perspectiveNote}
                  </p>
                </div>

                <div className="rounded-3xl bg-[linear-gradient(145deg,rgba(92,112,116,0.1),rgba(247,245,240,0.96))] px-5 py-5">
                  <p className="text-elder-sm text-muted-foreground">为什么值得被收入人物库</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    {selectedHistoryProfile.significance}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="emotion-tag-neutral">{selectedHistoryProfile.eraLabel}</span>
                  <span className="emotion-tag-positive">{selectedHistoryProfile.locationLabel}</span>
                </div>
              </>
            ) : null}
          </article>

          <article className="paper-panel space-y-5">
            {selectedNode.kind === 'memory' && selectedMemoryNode ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    <ScrollText className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">节点延展内容</h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      这一区同时放图片、视频演绎提示，以及本节点可以偶遇到的历史人物。
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-dashed border-border bg-[linear-gradient(145deg,rgba(226,205,178,0.22),rgba(255,249,241,0.94))] px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">图片场景</p>
                  {selectedMemoryNode.scene.photos.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {selectedMemoryNode.scene.photos.map((photo) => (
                        <figure
                          key={photo.id}
                          className="overflow-hidden rounded-3xl border border-border bg-card"
                        >
                          <img
                            src={photo.dataUrl}
                            alt={photo.name}
                            className="h-52 w-full object-cover"
                          />
                          <figcaption className="px-4 py-3 text-elder-sm text-muted-foreground truncate">
                            {photo.name}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-elder-base text-muted-foreground leading-relaxed">
                      {selectedMemoryNode.scene.imageDescription}
                    </p>
                  )}
                </div>

                <div className="rounded-3xl bg-accent/30 px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">视频演绎提示</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-muted-foreground">
                    {selectedMemoryNode.scene.videoPrompt}
                  </p>
                  <p className="mt-4 text-elder-sm text-muted-foreground">
                    旁白建议：{selectedMemoryNode.scene.narrationPrompt}
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-elder-base font-semibold text-foreground">本节点历史偶遇</p>
                      <p className="mt-2 text-elder-sm text-muted-foreground">
                        {linkedHistoryNode.profile.encounterPrompt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNode({
                          kind: 'history',
                          id: linkedHistoryNode.id,
                        })
                      }}
                      className="btn-outline min-h-[3.8rem] px-6 py-3"
                    >
                      读取人物故事
                    </button>
                  </div>
                  <div className="mt-4 rounded-2xl bg-accent/35 px-4 py-4">
                    <p className="text-elder-base font-semibold text-foreground">
                      {linkedHistoryNode.profile.name}
                    </p>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      {linkedHistoryNode.profile.title}
                    </p>
                  </div>
                </div>
              </>
            ) : selectedHistoryProfile ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Landmark className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">人物来源与地图关系</h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      这里显示这个历史人物被安排到哪一个回忆站点旁边，以及可继续阅读的公开资料。
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-accent/30 px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">本次偶遇连接的回忆节点</p>
                  <p className="mt-3 text-elder-base text-muted-foreground leading-relaxed">
                    {activeScene.title}。系统将这位历史人物安排在此站旁边，目的是让个人回忆与时代记忆在同一张地图里并置阅读。
                  </p>
                  <p className="mt-4 text-elder-sm text-muted-foreground leading-7">
                    {buildEncounterBasisText(selectedHistoryProfile, userProfile)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNode({
                        kind: 'memory',
                        id: activeScene.id,
                      })
                    }}
                    className="btn-outline mt-4 min-h-[3.8rem] px-6 py-3"
                  >
                    回到这段回忆
                  </button>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">公开资料来源</p>
                  <div className="mt-4">
                    <SourceLinks links={selectedHistoryProfile.sourceLinks} />
                  </div>
                </div>

                <div className="rounded-3xl border border-dashed border-border bg-[linear-gradient(145deg,rgba(200,186,166,0.18),rgba(255,251,245,0.94))] px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">节点说明</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-muted-foreground">
                    这类历史节点采用“根据公开资料整理的第一人称转述”方式，只作为阅读和理解时代处境的入口，不替代原始口述档案。
                  </p>
                </div>
              </>
            ) : null}
          </article>
        </section>

        <section className="paper-panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Landmark className="h-5 w-5" />
                <span className="text-elder-base font-semibold">历史人物画像数据库</span>
              </div>
              <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                一期样本库已覆盖战争记忆、开国见证、航天突破与地震重建
              </h2>
            </div>
            <span className="emotion-tag-neutral">
              共 {historicalProfiles.length} 位代表人物，可继续扩展
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {historicalProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                    onClick={() => {
                      const historyNodeId =
                        historyNodes.find((node) => node.profile.id === profile.id)?.id ?? ''
                      setSelectedNode({
                        kind: 'history',
                        id: historyNodeId,
                      })
                    }}
                className={`w-full rounded-[1.75rem] border px-5 py-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-warm ${
                  selectedNode.kind === 'history' && selectedNode.id === profile.id
                    ? 'border-primary bg-primary/8'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-elder-base font-semibold text-foreground">{profile.name}</p>
                    <p className="mt-2 text-elder-sm text-muted-foreground">{profile.title}</p>
                  </div>
                  <span className="emotion-tag-neutral">{profile.eraLabel}</span>
                </div>
                <p className="mt-4 text-elder-base text-muted-foreground leading-relaxed">
                  {profile.summary}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
