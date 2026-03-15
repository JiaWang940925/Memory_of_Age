import type { Memory, PhotoAttachment } from '../App'
import { buildInterviewPrompts } from './conversation'
import { buildFamilyTree } from './familyTree'
import type { UserProfile } from './userProfile'
import { buildProfileSummary, getProfileDisplayName } from './userProfile'

export interface StoryPhotoItem extends PhotoAttachment {
  category: string
  memoryId: string
  question: string
  answer: string
  timestamp: Date
}

interface ContinuousStory {
  memories: Memory[]
  paragraphs: string[]
  photos: StoryPhotoItem[]
  categoryCount: number
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatStoryDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function buildStoryAnswerHtml(answer: string) {
  return escapeHtml(answer).replace(/\n/g, '<br />')
}

function normalizeNarrativeFragment(value: string) {
  const normalized = value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/([，。！？；,.!?])\1+/g, '$1')
    .trim()

  if (!normalized) {
    return ''
  }

  return /[。！？…….!?]$/.test(normalized) ? normalized : `${normalized}。`
}

function getFallbackCategoryOrder(category: string) {
  const orderMap: Record<string, number> = {
    童年记忆: 10,
    求学成长: 30,
    时代记忆: 45,
    初入社会: 50,
    工作事业: 60,
    婚恋家庭: 70,
    家庭责任: 90,
    晚年生活: 100,
    人生体悟: 110,
    自由补充: 999,
  }

  return orderMap[category] ?? 900
}

function buildMemoryOrderResolver(userProfile: UserProfile | null) {
  const promptOrderById = new Map<string, number>()
  const promptOrderByQuestion = new Map<string, number>()

  if (userProfile) {
    buildInterviewPrompts(userProfile).forEach((prompt) => {
      promptOrderById.set(prompt.id, prompt.order)
      promptOrderByQuestion.set(prompt.text, prompt.order)
    })
  }

  return (memory: Memory) => {
    if (memory.promptId && promptOrderById.has(memory.promptId)) {
      return promptOrderById.get(memory.promptId) ?? 900
    }

    if (promptOrderByQuestion.has(memory.question)) {
      return promptOrderByQuestion.get(memory.question) ?? 900
    }

    return getFallbackCategoryOrder(memory.category)
  }
}

export function buildStoryPhotoItems(memories: Memory[]) {
  return memories.flatMap((memory) =>
    memory.photos.map((photo) => ({
      ...photo,
      category: memory.category,
      memoryId: memory.id,
      question: memory.question,
      answer: memory.answer,
      timestamp: memory.timestamp,
    })),
  )
}

function buildContinuousStory(memories: Memory[], userProfile: UserProfile | null) {
  const resolveOrder = buildMemoryOrderResolver(userProfile)
  const sortedMemories = [...memories].sort((left, right) => {
    const orderDiff = resolveOrder(left) - resolveOrder(right)
    if (orderDiff !== 0) {
      return orderDiff
    }

    const timeDiff = left.timestamp.getTime() - right.timestamp.getTime()
    if (timeDiff !== 0) {
      return timeDiff
    }

    return left.id.localeCompare(right.id)
  })

  const paragraphs: string[] = []
  let currentParagraph = ''

  sortedMemories
    .map((memory) => normalizeNarrativeFragment(memory.answer))
    .filter(Boolean)
    .forEach((fragment) => {
      if (!currentParagraph) {
        currentParagraph = fragment
        return
      }

      if (currentParagraph.length + fragment.length > 260) {
        paragraphs.push(currentParagraph)
        currentParagraph = fragment
        return
      }

      currentParagraph += fragment
    })

  if (currentParagraph) {
    paragraphs.push(currentParagraph)
  }

  return {
    memories: sortedMemories,
    paragraphs,
    photos: buildStoryPhotoItems(sortedMemories),
    categoryCount: new Set(sortedMemories.map((memory) => memory.category.trim() || '人生片段')).size,
  } satisfies ContinuousStory
}

function buildFamilyTreeHtml(memories: Memory[], userProfile: UserProfile | null) {
  const familyTree = buildFamilyTree(userProfile, memories)

  return `
    <section class="family-tree-section">
      <div class="section-title">
        <span class="section-dot"></span>
        <h2>家庭族谱</h2>
        <span class="section-count">共 ${familyTree.totalMembers} 位（含本人）</span>
      </div>
      <div class="family-tree-panel">
        ${familyTree.levels
          .map(
            (level) => `
              <section class="family-tree-tier">
                <div class="family-tree-tier-header">
                  <span class="family-tree-tier-dot"></span>
                  <div>
                    <h3>${escapeHtml(level.title)}</h3>
                    <p>${escapeHtml(level.description)}</p>
                  </div>
                </div>
                ${
                  level.members.length > 0
                    ? `
                      <div class="family-tree-grid">
                        ${level.members
                          .map(
                            (member) => `
                              <article class="family-member-card ${member.isSelf ? 'is-self' : ''}">
                                <div class="family-member-head">
                                  ${
                                    member.photo
                                      ? `<img src="${member.photo.dataUrl}" alt="${escapeHtml(member.displayName)}" />`
                                      : `<div class="family-member-avatar placeholder">${escapeHtml(member.relationLabel.slice(0, 2))}</div>`
                                  }
                                  <div class="family-member-meta">
                                    <span class="family-badge">${escapeHtml(member.relationLabel)}</span>
                                    <strong>${escapeHtml(member.displayName)}</strong>
                                    <span>${escapeHtml(member.sourceLabel)}</span>
                                  </div>
                                </div>
                                <p class="family-member-summary">${escapeHtml(member.summary)}</p>
                              </article>
                            `,
                          )
                          .join('')}
                      </div>
                    `
                    : `
                      <div class="family-tree-empty">
                        这一层暂时还没有识别到明确亲属，可继续补充称呼、名字或相关照片。
                      </div>
                    `
                }
              </section>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function buildMemoryStoryHtml(memories: Memory[], userProfile: UserProfile | null) {
  const story = buildContinuousStory(memories, userProfile)
  const displayName = userProfile ? getProfileDisplayName(userProfile) : '这位长者'
  const profileSummary = userProfile
    ? buildProfileSummary(userProfile)
    : '这是一份由岁语整理的人生故事回忆录。'
  const generatedAt = formatStoryDate(new Date())
  const familyTreeHtml = buildFamilyTreeHtml(story.memories, userProfile)

  const articleHtml = story.paragraphs
    .map(
      (paragraph) => `
        <p class="story-paragraph">${buildStoryAnswerHtml(paragraph)}</p>
      `,
    )
    .join('')

  const photosHtml = story.photos.length > 0
    ? `
      <section class="photo-section">
        <div class="section-title">
          <span class="section-dot"></span>
          <h2>相关照片</h2>
          <span class="section-count">${story.photos.length} 张</span>
        </div>
        <div class="photo-panel">
          <div class="story-meta">
            <span>按口述顺序汇总</span>
            <span>作为正文后的图像补充</span>
          </div>
          <div class="photo-grid">
            ${story.photos
              .map(
                (photo) => `
                  <figure class="photo-card">
                    <img src="${photo.dataUrl}" alt="${escapeHtml(photo.name)}" />
                    <figcaption>
                      <strong>${escapeHtml(photo.name)}</strong>
                      <span>${escapeHtml(photo.category)} · ${formatStoryDate(photo.timestamp)}</span>
                    </figcaption>
                  </figure>
                `,
              )
              .join('')}
          </div>
        </div>
      </section>
    `
    : ''

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(displayName)}的人生故事回忆录</title>
        <style>
          @page {
            size: A4;
            margin: 16mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #4d3d30;
            background: #f7efe3;
            font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            line-height: 1.7;
          }

          .book {
            max-width: 920px;
            margin: 0 auto;
            padding: 28px 24px 48px;
          }

          .cover,
          .family-tree-section,
          .story-article,
          .photo-section {
            page-break-inside: avoid;
          }

          .cover {
            border-radius: 28px;
            padding: 28px;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 247, 238, 0.95)),
              radial-gradient(circle at top right, rgba(236, 193, 149, 0.32), transparent 28%);
            border: 1px solid rgba(189, 160, 134, 0.45);
            box-shadow: 0 16px 40px -32px rgba(87, 62, 40, 0.45);
          }

          .eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 8px 14px;
            border-radius: 999px;
            background: rgba(240, 222, 203, 0.8);
            color: #8a6547;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
          }

          h1 {
            margin: 18px 0 10px;
            font-size: 36px;
            line-height: 1.2;
            color: #473225;
          }

          .cover-summary {
            margin: 0;
            font-size: 18px;
            color: #6b594c;
          }

          .cover-note {
            margin-top: 18px;
            padding: 14px 16px;
            border-radius: 18px;
            background: rgba(255, 248, 241, 0.9);
            border: 1px solid rgba(195, 173, 151, 0.4);
            font-size: 15px;
            color: #7b6654;
          }

          .stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            margin-top: 24px;
          }

          .stat-card {
            border-radius: 18px;
            padding: 16px 18px;
            background: rgba(255, 248, 241, 0.92);
            border: 1px solid rgba(195, 173, 151, 0.45);
          }

          .stat-label {
            font-size: 13px;
            color: #8d7660;
          }

          .stat-value {
            margin-top: 8px;
            font-size: 22px;
            font-weight: 700;
            color: #473225;
          }

          .family-tree-section,
          .story-article,
          .photo-section {
            margin-top: 28px;
            border-radius: 24px;
            padding: 24px;
            background: rgba(255, 252, 247, 0.94);
            border: 1px solid rgba(194, 171, 146, 0.4);
          }

          .section-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 18px;
            flex-wrap: wrap;
          }

          .section-dot {
            width: 12px;
            height: 12px;
            border-radius: 999px;
            background: linear-gradient(135deg, #d39a68, #8d6b50);
          }

          h2 {
            margin: 0;
            font-size: 24px;
            color: #4b3628;
          }

          .section-count {
            font-size: 13px;
            color: #8d7660;
          }

          .story-card,
          .photo-panel,
          .family-tree-panel {
            border-radius: 20px;
            padding: 18px;
            background: #fffaf5;
            border: 1px solid rgba(197, 177, 155, 0.45);
          }

          .story-card {
            margin-top: 18px;
          }

          .story-meta {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            font-size: 13px;
            color: #8d7660;
          }

          .story-paragraphs {
            display: grid;
            gap: 14px;
            margin-top: 14px;
          }

          .story-paragraph {
            margin: 0;
            font-size: 16px;
            color: #473225;
            text-indent: 2em;
          }

          .photo-panel {
            background: rgba(255, 248, 241, 0.86);
          }

          .family-tree-panel {
            display: grid;
            gap: 18px;
            background: rgba(255, 248, 241, 0.9);
          }

          .family-tree-tier {
            position: relative;
            padding-left: 24px;
          }

          .family-tree-tier::before {
            content: '';
            position: absolute;
            left: 7px;
            top: 8px;
            bottom: -18px;
            width: 2px;
            background: linear-gradient(180deg, rgba(201, 153, 110, 0.9), rgba(121, 153, 137, 0.3));
          }

          .family-tree-tier:last-child::before {
            bottom: 56px;
          }

          .family-tree-tier-header {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 14px;
          }

          .family-tree-tier-dot {
            width: 14px;
            height: 14px;
            border-radius: 999px;
            margin-top: 5px;
            background: linear-gradient(135deg, #cb9264, #6e9484);
            box-shadow: 0 0 0 6px rgba(255, 248, 241, 0.96);
            flex-shrink: 0;
          }

          .family-tree-tier h3 {
            margin: 0;
            font-size: 18px;
            color: #4b3628;
          }

          .family-tree-tier p {
            margin: 4px 0 0;
            font-size: 13px;
            color: #8d7660;
          }

          .family-tree-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .family-member-card {
            position: relative;
            border-radius: 18px;
            padding: 14px;
            background:
              linear-gradient(180deg, rgba(255, 253, 249, 0.96), rgba(255, 247, 238, 0.94)),
              radial-gradient(circle at top right, rgba(225, 192, 153, 0.18), transparent 28%);
            border: 1px solid rgba(193, 170, 145, 0.58);
          }

          .family-member-card::before {
            content: '';
            position: absolute;
            left: -12px;
            top: 34px;
            width: 12px;
            height: 2px;
            background: rgba(181, 144, 110, 0.66);
          }

          .family-member-card.is-self {
            border-color: rgba(168, 118, 84, 0.52);
            background:
              linear-gradient(180deg, rgba(255, 245, 232, 0.98), rgba(255, 249, 243, 0.94)),
              radial-gradient(circle at top right, rgba(220, 164, 120, 0.24), transparent 32%);
          }

          .family-member-head {
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }

          .family-member-head img,
          .family-member-avatar {
            width: 72px;
            height: 72px;
            border-radius: 18px;
            border: 1px solid rgba(187, 162, 138, 0.54);
            object-fit: cover;
            flex-shrink: 0;
          }

          .family-member-avatar.placeholder {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            font-weight: 700;
            color: #8d674a;
            background: linear-gradient(135deg, rgba(255, 241, 223, 0.98), rgba(246, 235, 224, 0.96));
          }

          .family-member-meta {
            display: grid;
            gap: 6px;
          }

          .family-member-meta strong {
            font-size: 16px;
            color: #4b3628;
          }

          .family-member-meta span {
            font-size: 12px;
            color: #8d7660;
          }

          .family-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: fit-content;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(238, 226, 210, 0.82);
            color: #715845;
            font-size: 12px;
            font-weight: 700;
          }

          .family-member-summary {
            margin: 12px 0 0;
            font-size: 13px;
            line-height: 1.7;
            color: #6f5948;
          }

          .family-tree-empty {
            border-radius: 18px;
            padding: 14px 16px;
            background: rgba(255, 251, 246, 0.88);
            border: 1px dashed rgba(188, 161, 134, 0.72);
            font-size: 13px;
            color: #7d6756;
          }

          .photo-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 18px;
          }

          .photo-card {
            margin: 0;
            overflow: hidden;
            border-radius: 18px;
            border: 1px solid rgba(197, 177, 155, 0.45);
            background: rgba(255, 247, 238, 0.86);
          }

          .photo-card img {
            display: block;
            width: 100%;
            height: 190px;
            object-fit: cover;
          }

          .photo-card figcaption {
            padding: 10px 12px 12px;
            font-size: 12px;
            color: #7d6756;
            display: grid;
            gap: 4px;
          }

          .photo-card figcaption strong {
            font-size: 13px;
            color: #5a4331;
          }

          @media print {
            body {
              background: #ffffff;
            }

            .book {
              max-width: none;
              padding: 0;
            }
          }

          @media (max-width: 720px) {
            .book {
              padding: 18px 14px 24px;
            }

            .cover,
            .family-tree-section,
            .story-article,
            .photo-section {
              padding: 18px;
            }

            h1 {
              font-size: 28px;
            }

            .stats,
            .photo-grid,
            .family-tree-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <main class="book">
          <section class="cover">
            <div class="eyebrow">岁语 · 人生故事回忆录</div>
            <h1>${escapeHtml(displayName)}的人生故事</h1>
            <p class="cover-summary">${escapeHtml(profileSummary)}</p>
            <p class="cover-note">
              以下内容会把多次口述片段按时间与故事推进顺序整合成一篇连贯文章，
              仅做轻度语句整理与标点修正，尽量保留原本的说法和情绪。
            </p>
            <div class="stats">
              <article class="stat-card">
                <div class="stat-label">回忆片段</div>
                <div class="stat-value">${story.memories.length}</div>
              </article>
              <article class="stat-card">
                <div class="stat-label">涉及主题</div>
                <div class="stat-value">${story.categoryCount}</div>
              </article>
              <article class="stat-card">
                <div class="stat-label">收录照片</div>
                <div class="stat-value">${story.photos.length}</div>
              </article>
            </div>
            <p class="cover-summary" style="margin-top: 18px;">生成日期：${generatedAt}</p>
          </section>

          ${familyTreeHtml}

          <section class="story-article">
            <div class="section-title">
              <span class="section-dot"></span>
              <h2>正文</h2>
              <span class="section-count">${story.memories.length} 段口述片段</span>
            </div>
            <article class="story-card">
              <div class="story-meta">
                <span>整篇连贯文章</span>
                <span>仅做轻度语句修整</span>
              </div>
              <div class="story-paragraphs">
                ${articleHtml}
              </div>
            </article>
          </section>

          ${photosHtml}
        </main>
      </body>
    </html>
  `
}

export function openMemoryStoryPdf(memories: Memory[], userProfile: UserProfile | null) {
  if (typeof window === 'undefined') {
    return
  }

  const nextWindow = window.open('', '_blank', 'width=1024,height=1200')
  if (!nextWindow) {
    throw new Error('浏览器拦截了新窗口，请允许弹窗后再试')
  }

  nextWindow.document.open()
  nextWindow.document.write(buildMemoryStoryHtml(memories, userProfile))
  nextWindow.document.close()

  const triggerPrint = () => {
    nextWindow.focus()
    window.setTimeout(() => {
      nextWindow.print()
    }, 220)
  }

  if (nextWindow.document.readyState === 'complete') {
    triggerPrint()
    return
  }

  nextWindow.addEventListener('load', triggerPrint, { once: true })
}
