import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flag,
  HeartHandshake,
  Home,
  Landmark,
  MapPinned,
  Mountain,
  Rocket,
  School,
  ScrollText,
  Sparkles,
  TrainFront,
  UsersRound,
  Waves,
  Waypoints,
} from 'lucide-react'
import type { Memory } from '../App'
import {
  buildFeaturedHistoricalEvents,
  getHistoricalEventFit,
  historicalEvents,
  type HistoricalEvent,
} from '../lib/historicalEvents'
import {
  buildImportantPeople,
  buildImportantPeopleBySceneId,
  extractPlaceCandidates,
  type ImportantPerson,
} from '../lib/peopleMentions'
import { buildJourneyExperience, type JourneyScene } from '../lib/memoryJourney'
import { buildProfileSummary, type UserProfile } from '../lib/userProfile'

interface JourneyPageProps {
  memories: Memory[]
  onBack: () => void
  onGoHome: () => void
  userProfile: UserProfile
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
  event: HistoricalEvent
  anchorSceneId: string
}

interface PersonMapNode {
  id: string
  kind: 'person'
  x: number
  y: number
  person: ImportantPerson
  anchorSceneId: string
}

interface SelectedMapNode {
  kind: 'memory' | 'history' | 'person'
  id: string
}

const MAP_CANVAS_HEIGHT = 740
const MAP_NODE_SPACING = 250
const MAP_SIDE_PADDING = 220
const MAP_HISTORY_ROW_Y = [186, 224, 172, 212]
const MAP_MEMORY_ROW_Y = [430, 372, 452, 394, 438]
const MAP_PERSON_ROW_Y = [564, 606, 542, 588]
const PERSON_NODE_OFFSETS = [-118, 118, -168, 168]

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

  return scenes.map((scene, index) => ({
    id: scene.id,
    kind: 'memory',
    x: MAP_SIDE_PADDING + index * MAP_NODE_SPACING,
    y: MAP_MEMORY_ROW_Y[index % MAP_MEMORY_ROW_Y.length],
    scene,
  }))
}

function buildHistoryNodes(
  memoryNodes: MemoryMapNode[],
  events: HistoricalEvent[],
  canvasWidth: number,
): HistoryMapNode[] {
  if (!events.length) {
    return []
  }

  return memoryNodes.map((node, index) => {
    const event = events[index % events.length]
    const x = clamp(
      node.x + (index % 2 === 0 ? -56 : 56),
      152,
      canvasWidth - 152,
    )
    const y = MAP_HISTORY_ROW_Y[index % MAP_HISTORY_ROW_Y.length]

    return {
      id: `${event.id}-${node.id}`,
      kind: 'history',
      x,
      y,
      event,
      anchorSceneId: node.id,
    }
  })
}

function buildPersonNodes(
  memoryNodes: MemoryMapNode[],
  people: ImportantPerson[],
  canvasWidth: number,
): PersonMapNode[] {
  if (!people.length || !memoryNodes.length) {
    return []
  }

  const anchorCounts = new Map<string, number>()

  return people.map((person, index) => {
    const anchorNode =
      memoryNodes.find((node) => node.id === person.anchorMemoryId)
      ?? memoryNodes.find((node) => person.relatedSceneIds.includes(node.id))
      ?? memoryNodes[index % memoryNodes.length]
    const slot = anchorCounts.get(anchorNode.id) ?? 0
    anchorCounts.set(anchorNode.id, slot + 1)

    const x = clamp(
      anchorNode.x + PERSON_NODE_OFFSETS[slot % PERSON_NODE_OFFSETS.length],
      168,
      canvasWidth - 168,
    )
    const y = MAP_PERSON_ROW_Y[(index + slot) % MAP_PERSON_ROW_Y.length] + Math.min(slot, 2) * 8

    return {
      id: `${person.id}-${anchorNode.id}`,
      kind: 'person',
      x,
      y,
      person,
      anchorSceneId: anchorNode.id,
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

function getHistoricalIcon(event: HistoricalEvent): LucideIcon {
  if (event.title.includes('抗美援朝')) {
    return Flag
  }

  if (event.title.includes('原子弹')) {
    return Sparkles
  }

  if (event.title.includes('神舟') || event.title.includes('航天')) {
    return Rocket
  }

  if (event.title.includes('地震')) {
    return Mountain
  }

  if (event.title.includes('高考')) {
    return ScrollText
  }

  return Landmark
}

function getPersonIcon(person: ImportantPerson): LucideIcon {
  switch (person.theme) {
    case 'family':
      return HeartHandshake
    case 'work':
      return Building2
    case 'study':
      return School
    default:
      return UsersRound
  }
}

function buildEventBasisText(event: HistoricalEvent, userProfile: UserProfile) {
  return getHistoricalEventFit(event, userProfile).reasonText
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
  kind: 'memory' | 'history' | 'person'
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

export function JourneyPage({
  memories,
  onBack,
  onGoHome,
  userProfile,
}: JourneyPageProps) {
  const journey = buildJourneyExperience(memories)
  const mapCanvasWidth = getMapCanvasWidth(journey.scenes.length)
  const memoryNodes = buildMemoryNodes(journey.scenes, mapCanvasWidth)
  const featuredEvents = buildFeaturedHistoricalEvents(
    userProfile,
    journey.scenes.map(
      (scene) => `${scene.category} ${scene.backdrop.label} ${scene.answer} ${scene.question}`,
    ),
    Math.max(memoryNodes.length, 4),
  )
  const historyNodes = buildHistoryNodes(memoryNodes, featuredEvents, mapCanvasWidth)
  const allImportantPeople = buildImportantPeople(memories)
  const featuredPeople = allImportantPeople.slice(0, Math.max(4, Math.min(memoryNodes.length + 2, 8)))
  const personNodes = buildPersonNodes(memoryNodes, featuredPeople, mapCanvasWidth)
  const peopleBySceneId = buildImportantPeopleBySceneId(featuredPeople)
  const placeBySceneId = Object.fromEntries(
    journey.scenes.map((scene) => [
      scene.id,
      extractPlaceCandidates(`${scene.answer} ${scene.question}`)[0] ?? '',
    ]),
  ) as Record<string, string>
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
    const hasSelectedPerson = personNodes.some(
      (node) => node.kind === selectedNode.kind && node.id === selectedNode.id,
    )

    if (hasSelectedMemory || hasSelectedHistory || hasSelectedPerson) {
      return
    }

    setSelectedNode({
      kind: 'memory',
      id: memoryNodes[0]?.id ?? '',
    })
  }, [historyNodes, memoryNodes, personNodes, selectedNode])

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
        <header className="sticky top-0 z-10 border-b border-border bg-card/90 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
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

            <button onClick={onGoHome} className="btn-outline w-full justify-center sm:w-auto">
              <Home className="h-5 w-5" />
              返回主页
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="paper-panel text-center py-16 px-8">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-accent text-primary">
              <Waypoints className="h-12 w-12" />
            </div>
            <h2 className="text-elder-xl font-semibold text-foreground">地图还没有节点</h2>
            <p className="mt-4 text-elder-base text-muted-foreground max-w-2xl mx-auto">
              先记录几段人生故事，平台会自动生成回忆站点、时代大事线索，以及与这些故事相关的人物节点。
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
  const selectedPersonNode = selectedNode.kind === 'person'
    ? personNodes.find((node) => node.id === selectedNode.id) ?? personNodes[0]
    : null
  const selectedHistoryEvent = selectedNode.kind === 'history'
    ? selectedHistoryNode?.event ?? historyNodes[0]?.event ?? historicalEvents[0]
    : null
  const selectedPerson = selectedNode.kind === 'person'
    ? selectedPersonNode?.person ?? personNodes[0]?.person ?? featuredPeople[0]
    : null
  const selectedPersonId = selectedPersonNode?.person.id ?? selectedPerson?.id ?? ''
  const selectedTargetX = selectedNode.kind === 'history'
    ? selectedHistoryNode?.x ?? historyNodes[0]?.x ?? 0
    : selectedNode.kind === 'person'
      ? selectedPersonNode?.x ?? personNodes[0]?.x ?? 0
      : selectedMemoryNode?.x ?? memoryNodes[0]?.x ?? 0
  const activeScene = selectedMemoryNode?.scene
    ?? memoryNodes.find((node) => node.id === selectedHistoryNode?.anchorSceneId)?.scene
    ?? memoryNodes.find((node) => node.id === selectedPersonNode?.anchorSceneId)?.scene
    ?? memoryNodes[0].scene
  const linkedHistoryNode =
    historyNodes.find((node) => node.anchorSceneId === activeScene.id) ?? historyNodes[0]
  const scenePeople = peopleBySceneId[activeScene.id] ?? []
  const activeScenePlace = placeBySceneId[activeScene.id] || ''
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
      <header className="sticky top-0 z-10 border-b border-border bg-card/88 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onBack}
              className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-foreground hover:bg-accent/80 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-elder-xl font-bold text-foreground">平面回忆地图</h1>
              <p className="text-elder-sm text-muted-foreground">
                用简笔纸面地图浏览人生，也用时代大事和重要人物唤醒记忆
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <button onClick={onGoHome} className="btn-outline w-full justify-center sm:w-auto">
              <Home className="h-5 w-5" />
              返回主页
            </button>
            <div className="hidden lg:flex items-center gap-3">
              <span className="emotion-tag-neutral">{journey.scenes.length} 个回忆节点</span>
              <span className="emotion-tag-positive">{featuredEvents.length} 条时代线索</span>
              <span className="emotion-tag-neutral">{featuredPeople.length} 位重要人物</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="paper-panel space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UsersRound className="h-7 w-7" />
              </div>
              <div>
                <div className="flex flex-wrap gap-3">
                  <span className="emotion-tag-positive">{journey.readinessLabel}</span>
                  <span className="emotion-tag-neutral">{journey.guide.name}</span>
                </div>
                <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                  {journey.guide.title}
                </h2>
                <p className="mt-2 text-elder-base text-muted-foreground">
                  {journey.guide.intro}
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border bg-[linear-gradient(145deg,rgba(193,152,114,0.22),rgba(255,248,239,0.92))] px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="text-elder-base font-semibold">地图阅读建议</span>
              </div>
              <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                {journey.guide.focus}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {journey.guide.tags.map((tag) => (
                <span key={tag} className="emotion-tag-neutral">
                  {tag}
                </span>
              ))}
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
                  棕色节点是您的回忆，若回忆里提到了具体地点会优先显示地点名；青灰节点是时代大事线索，暖红节点是回忆里反复出现的重要人物。点击任一节点，都能看到它和哪一段人生场景相连。
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-3xl bg-accent/35 px-5 py-5">
                <p className="text-elder-sm text-muted-foreground">当前主线</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  {journey.title}
                </p>
              </div>
              <div className="rounded-3xl bg-accent/35 px-5 py-5">
                <p className="text-elder-sm text-muted-foreground">时代线索</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  {featuredEvents.length} 条
                </p>
              </div>
              <div className="rounded-3xl bg-accent/35 px-5 py-5">
                <p className="text-elder-sm text-muted-foreground">重要人物</p>
                <p className="mt-2 text-elder-base font-semibold text-foreground">
                  {featuredPeople.length} 位
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card px-5 py-5">
              <p className="text-elder-sm text-muted-foreground">当前用户画像</p>
              <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                {buildProfileSummary(userProfile)}
              </p>
              <p className="mt-3 text-elder-sm text-muted-foreground">
                地图中的时代线索会优先匹配您的出生年份和成长地，重要人物则从您已经讲出的回忆里自动抽取。
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="map-legend-chip">
                <span className="map-legend-dot memory" />
                <span className="text-elder-sm text-foreground">我的回忆节点</span>
              </div>
              <div className="map-legend-chip">
                <span className="map-legend-dot history" />
                <span className="text-elder-sm text-foreground">时代大事节点</span>
              </div>
              <div className="map-legend-chip">
                <span className="map-legend-dot person" />
                <span className="text-elder-sm text-foreground">重要人物节点</span>
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
                回忆主线、时代线索与重要人物在同一张纸面地图里展开
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="emotion-tag-neutral">{journey.readinessLabel}</span>
              <span className="emotion-tag-positive">
                {activeScenePlace || activeScene.backdrop.label}
              </span>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-elder-sm text-muted-foreground">
              节点已改成横向展开。可点击左右按钮，或拖动下方滑杆浏览整张地图。
            </div>
            <div className="flex w-full items-center gap-2 sm:gap-3 lg:w-auto">
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
                  {personNodes.map((node) => {
                    const anchor = memoryNodes.find((item) => item.id === node.anchorSceneId)
                    if (!anchor) {
                      return null
                    }

                    const branch = `M ${anchor.x} ${anchor.y} L ${node.x} ${node.y}`
                    return <path key={node.id} d={branch} className="sketch-route-person" />
                  })}
                </svg>

                {memoryNodes.map((node) => (
                  <PaperMapNode
                    key={node.id}
                    isActive={selectedNode.kind === 'memory' && selectedNode.id === node.id}
                    label={placeBySceneId[node.scene.id] || node.scene.backdrop.mapLabel}
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
                    label={node.event.shortTitle}
                    subtitle={`${node.event.eventYear} 年`}
                    x={node.x}
                    y={node.y}
                    kind="history"
                    icon={getHistoricalIcon(node.event)}
                    onClick={() => {
                      setSelectedNode({
                        kind: 'history',
                        id: node.id,
                      })
                    }}
                  />
                ))}

                {personNodes.map((node) => (
                  <PaperMapNode
                    key={node.id}
                    isActive={selectedNode.kind === 'person' && selectedNode.id === node.id}
                    label={node.person.displayName}
                    subtitle={node.person.groupLabel}
                    x={node.x}
                    y={node.y}
                    kind="person"
                    icon={getPersonIcon(node.person)}
                    onClick={() => {
                      setSelectedNode({
                        kind: 'person',
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
                    <span className="text-elder-base font-semibold">当时可先这样回想</span>
                  </div>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    先从“{selectedMemoryNode.scene.quote}”这句话入手，再想当时在场的人、听见的声音，以及最清楚的一件小物件。
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="emotion-tag-neutral">{selectedMemoryNode.scene.category}</span>
                  <span className="emotion-tag-positive">{selectedMemoryNode.scene.timeLabel}</span>
                  {activeScenePlace ? (
                    <span className="emotion-tag-positive">{activeScenePlace}</span>
                  ) : null}
                  <span className="emotion-tag-neutral">{selectedMemoryNode.scene.emotionLabel}</span>
                </div>
              </>
            ) : selectedNode.kind === 'history' && selectedHistoryEvent ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    {(() => {
                      const Icon = getHistoricalIcon(selectedHistoryEvent)
                      return <Icon className="h-7 w-7" />
                    })()}
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">
                      {selectedHistoryEvent.title}
                    </h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      {selectedHistoryEvent.locationLabel}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-accent/35 p-5 space-y-3">
                  <p className="text-elder-sm text-muted-foreground">时代提醒</p>
                  <p className="text-elder-base font-semibold text-foreground">
                    {selectedHistoryEvent.summary}
                  </p>
                  <p className="text-elder-base text-muted-foreground">
                    {selectedHistoryEvent.memoryCue}
                  </p>
                  <p className="text-elder-sm leading-7 text-muted-foreground">
                    {buildEventBasisText(selectedHistoryEvent, userProfile)}
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-sm text-muted-foreground">帮您继续想起什么</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    {selectedHistoryEvent.memoryPrompt}
                  </p>
                </div>

                <div className="rounded-3xl bg-[linear-gradient(145deg,rgba(92,112,116,0.1),rgba(247,245,240,0.96))] px-5 py-5">
                  <p className="text-elder-sm text-muted-foreground">为什么值得放进地图</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-foreground">
                    {selectedHistoryEvent.significance}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="emotion-tag-neutral">{selectedHistoryEvent.eraLabel}</span>
                  <span className="emotion-tag-positive">
                    {selectedHistoryEvent.eventYear} 年
                  </span>
                </div>
              </>
            ) : selectedPerson ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[rgba(170,110,92,0.12)] text-[rgba(138,80,62,0.95)]">
                    {(() => {
                      const Icon = getPersonIcon(selectedPerson)
                      return <Icon className="h-7 w-7" />
                    })()}
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">
                      {selectedPerson.displayName}
                    </h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      {selectedPerson.groupLabel} · 在 {selectedPerson.memoryCount} 段回忆里出现过
                    </p>
                  </div>
                </div>

                {selectedPerson.photo ? (
                  <div className="rounded-3xl border border-border bg-card px-5 py-5">
                    <p className="text-elder-sm text-muted-foreground">相关照片</p>
                    <img
                      src={selectedPerson.photo.dataUrl}
                      alt={selectedPerson.displayName}
                      className="mt-4 h-64 w-full rounded-3xl object-cover"
                    />
                    <p className="mt-3 text-elder-sm text-muted-foreground">
                      这张照片来自相关回忆中的上传图片，可作为人物线索参考。
                    </p>
                  </div>
                ) : null}

                <div className="rounded-3xl bg-accent/35 p-5 space-y-3">
                  <p className="text-elder-sm text-muted-foreground">人物摘要</p>
                  <p className="text-elder-base text-foreground">{selectedPerson.summary}</p>
                  <p className="text-elder-sm leading-7 text-muted-foreground">
                    {selectedPerson.detailPrompt}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {selectedPerson.clueTags.map((tag) => (
                    <span key={tag} className="emotion-tag-neutral">
                      {tag}
                    </span>
                  ))}
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
                      这一区会把图片、回想提示、时代线索和相关人物放在一起。
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
                  <p className="text-elder-base font-semibold text-foreground">回想提示</p>
                  <p className="mt-3 text-elder-base leading-relaxed text-muted-foreground">
                    {selectedMemoryNode.scene.memoryPrompt}
                  </p>
                  <p className="mt-4 text-elder-sm text-muted-foreground">
                    继续追问建议：{selectedMemoryNode.scene.conversationPrompt}
                  </p>
                </div>

                {linkedHistoryNode ? (
                  <div className="rounded-3xl border border-border bg-card px-5 py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-elder-base font-semibold text-foreground">本节点时代线索</p>
                        <p className="mt-2 text-elder-sm text-muted-foreground">
                          {linkedHistoryNode.event.memoryCue}
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
                        className="btn-outline min-h-[3.8rem] px-6 py-3 w-full sm:w-auto"
                      >
                        查看时代线索
                      </button>
                    </div>
                    <div className="mt-4 rounded-2xl bg-accent/35 px-4 py-4">
                      <p className="text-elder-base font-semibold text-foreground">
                        {linkedHistoryNode.event.title}
                      </p>
                      <p className="mt-2 text-elder-base text-muted-foreground">
                        {linkedHistoryNode.event.memoryPrompt}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-elder-base font-semibold text-foreground">本节点相关人物</p>
                      <p className="mt-2 text-elder-sm text-muted-foreground">
                        系统会把这段回忆里反复出现、对您重要的人物单独标出来。
                      </p>
                    </div>
                  </div>
                  {scenePeople.length > 0 ? (
                    <div className="mt-4 grid gap-3">
                      {scenePeople.slice(0, 3).map((person) => (
                        <div key={person.id} className="rounded-2xl bg-accent/35 px-4 py-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex gap-3">
                              {person.photo ? (
                                <img
                                  src={person.photo.dataUrl}
                                  alt={person.displayName}
                                  className="h-16 w-16 rounded-2xl object-cover border border-border"
                                />
                              ) : null}
                              <div>
                                <p className="text-elder-base font-semibold text-foreground">
                                  {person.displayName}
                                </p>
                                <p className="mt-1 text-elder-sm text-muted-foreground">
                                  {person.groupLabel}
                                </p>
                                <p className="mt-2 text-elder-sm text-foreground">
                                  {person.summary}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const personNodeId =
                                  personNodes.find((node) => node.person.id === person.id)?.id ?? ''
                                setSelectedNode({
                                  kind: 'person',
                                  id: personNodeId,
                                })
                              }}
                              className="btn-outline min-h-[3.3rem] px-5 py-2 w-full sm:w-auto"
                            >
                              查看人物信息
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-elder-base text-muted-foreground">
                      这段回忆里暂时还没有识别出足够明确的人物线索。继续多讲几句称呼、关系或一起发生的事情，人物节点会更完整。
                    </p>
                  )}
                </div>
              </>
            ) : selectedNode.kind === 'history' && selectedHistoryEvent ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Landmark className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">事件与地图关系</h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      这里显示这条时代线索被安排到哪一个回忆站点旁边，以及它适合帮助您继续回想哪些细节。
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-accent/30 px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">本次连接的回忆节点</p>
                  <p className="mt-3 text-elder-base text-muted-foreground leading-relaxed">
                    {activeScene.title}。系统将这条时代线索安排在此站旁边，目的是让个人回忆与时代记忆在同一张地图里并置阅读。
                  </p>
                  <p className="mt-4 text-elder-sm text-muted-foreground leading-7">
                    {buildEventBasisText(selectedHistoryEvent, userProfile)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNode({
                        kind: 'memory',
                        id: activeScene.id,
                      })
                    }}
                    className="btn-outline mt-4 min-h-[3.8rem] px-6 py-3 w-full sm:w-auto"
                  >
                    回到这段回忆
                  </button>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">继续追问这件大事</p>
                  <div className="mt-4 grid gap-3">
                    {selectedHistoryEvent.rememberingQuestions.map((question) => (
                      <div key={question} className="rounded-2xl bg-accent/30 px-4 py-4">
                        <p className="text-elder-base text-foreground">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : selectedPerson ? (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UsersRound className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-elder-lg font-semibold text-foreground">人物与地图关系</h2>
                    <p className="mt-2 text-elder-base text-muted-foreground">
                      这里显示这位人物被安排到哪些回忆节点旁边，以及哪几段内容让系统认为他对您很重要。
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-accent/30 px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">为什么会被标记出来</p>
                  <p className="mt-3 text-elder-base text-muted-foreground leading-relaxed">
                    {selectedPerson.summary}
                  </p>
                  <p className="mt-4 text-elder-sm text-muted-foreground leading-7">
                    {selectedPerson.detailPrompt}
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-card px-5 py-5">
                  <p className="text-elder-base font-semibold text-foreground">相关回忆节点</p>
                  <div className="mt-4 grid gap-3">
                    {selectedPerson.scenes.map((scene) => (
                      <div key={`${selectedPerson.id}-${scene.memoryId}`} className="rounded-2xl bg-accent/30 px-4 py-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <p className="text-elder-base font-semibold text-foreground">
                              {scene.category}
                            </p>
                            <p className="text-elder-sm text-muted-foreground">
                              {new Date(scene.timestamp).toLocaleDateString('zh-CN')}
                            </p>
                            <p className="text-elder-base text-foreground leading-relaxed">
                              {scene.excerpt}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNode({
                                kind: 'memory',
                                id: scene.memoryId,
                              })
                            }}
                            className="btn-outline min-h-[3.3rem] px-5 py-2 w-full sm:w-auto"
                          >
                            回到这段回忆
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </article>
        </section>

        {featuredPeople.length > 0 ? (
          <section className="paper-panel space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <UsersRound className="h-5 w-5" />
                  <span className="text-elder-base font-semibold">重要人物关系卡</span>
                </div>
                <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                  这些人物是系统从您的回忆内容里自动识别出来的高频关键人物
                </h2>
              </div>
              <span className="emotion-tag-neutral">
                共识别出 {featuredPeople.length} 位
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {featuredPeople.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    const personNodeId =
                      personNodes.find((node) => node.person.id === person.id)?.id ?? ''
                    setSelectedNode({
                      kind: 'person',
                      id: personNodeId,
                    })
                  }}
                  className={`w-full rounded-[1.75rem] border px-5 py-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-warm ${
                    selectedNode.kind === 'person' && selectedPersonId === person.id
                      ? 'border-primary bg-primary/8'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex gap-4">
                    {person.photo ? (
                      <img
                        src={person.photo.dataUrl}
                        alt={person.displayName}
                        className="h-20 w-20 rounded-3xl object-cover border border-border"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/30 text-primary">
                        {(() => {
                          const Icon = getPersonIcon(person)
                          return <Icon className="h-8 w-8" />
                        })()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-elder-base font-semibold text-foreground">{person.displayName}</p>
                        <span className="emotion-tag-neutral">{person.groupLabel}</span>
                      </div>
                      <p className="mt-3 text-elder-sm text-muted-foreground leading-7">
                        {person.summary}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="paper-panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Landmark className="h-5 w-5" />
                <span className="text-elder-base font-semibold">历史大事件数据库</span>
              </div>
              <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                当前样本库覆盖建国记忆、教育转折、改革变化、航天突破与重大公共事件
              </h2>
            </div>
            <span className="emotion-tag-neutral">
              共 {historicalEvents.length} 条时代线索，可继续扩展
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {historicalEvents.map((event) => {
              const selectedEventId = selectedHistoryNode?.event.id ?? selectedHistoryEvent?.id ?? ''

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    const historyNodeId =
                      historyNodes.find((node) => node.event.id === event.id)?.id
                      ?? historyNodes[0]?.id
                      ?? ''
                    setSelectedNode({
                      kind: 'history',
                      id: historyNodeId,
                    })
                  }}
                  className={`w-full rounded-[1.75rem] border px-5 py-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-warm ${
                    selectedNode.kind === 'history' && selectedEventId === event.id
                      ? 'border-primary bg-primary/8'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-elder-base font-semibold text-foreground">{event.title}</p>
                      <p className="mt-2 text-elder-sm text-muted-foreground">{event.locationLabel}</p>
                    </div>
                    <span className="emotion-tag-neutral">{event.eraLabel}</span>
                  </div>
                  <p className="mt-4 text-elder-base text-muted-foreground leading-relaxed">
                    {event.summary}
                  </p>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
