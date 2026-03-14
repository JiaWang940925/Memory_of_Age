import type { Memory, PhotoAttachment } from '../App'
import type { UserProfile } from './userProfile'
import { buildProfileSummary, getProfileDisplayName } from './userProfile'

export interface StoryPhotoItem extends PhotoAttachment {
  category: string
  memoryId: string
  question: string
  answer: string
  timestamp: Date
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

function getEmotionLabel(emotion: Memory['emotion']) {
  switch (emotion) {
    case 'positive':
      return '温馨回忆'
    case 'attention':
      return '人生感悟'
    default:
      return '生活点滴'
  }
}

function buildStoryAnswerHtml(answer: string) {
  return escapeHtml(answer).replace(/\n/g, '<br />')
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

function buildMemoryStoryHtml(memories: Memory[], userProfile: UserProfile | null) {
  const groupedMemories = memories.reduce((accumulator, memory) => {
    if (!accumulator[memory.category]) {
      accumulator[memory.category] = []
    }
    accumulator[memory.category].push(memory)
    return accumulator
  }, {} as Record<string, Memory[]>)
  const photoItems = buildStoryPhotoItems(memories)
  const categoryCount = Object.keys(groupedMemories).length
  const displayName = userProfile ? getProfileDisplayName(userProfile) : '这位长者'
  const profileSummary = userProfile
    ? buildProfileSummary(userProfile)
    : '这是一份由岁语整理的人生故事回忆录。'
  const generatedAt = formatStoryDate(new Date())

  const sectionsHtml = Object.entries(groupedMemories)
    .map(([category, categoryMemories]) => {
      const entriesHtml = categoryMemories
        .map((memory) => {
          const photosHtml = memory.photos.length > 0
            ? `
              <div class="photo-grid">
                ${memory.photos
                  .map(
                    (photo) => `
                      <figure class="photo-card">
                        <img src="${photo.dataUrl}" alt="${escapeHtml(photo.name)}" />
                        <figcaption>${escapeHtml(photo.name)}</figcaption>
                      </figure>
                    `,
                  )
                  .join('')}
              </div>
            `
            : ''

          return `
            <article class="memory-card">
              <div class="memory-meta">
                <span>${formatStoryDate(memory.timestamp)}</span>
                <span>${getEmotionLabel(memory.emotion)}</span>
              </div>
              <h3>${escapeHtml(memory.question)}</h3>
              <p class="memory-answer">${buildStoryAnswerHtml(memory.answer)}</p>
              ${photosHtml}
            </article>
          `
        })
        .join('')

      return `
        <section class="story-section">
          <div class="section-title">
            <span class="section-dot"></span>
            <h2>${escapeHtml(category)}</h2>
            <span class="section-count">${categoryMemories.length} 段回忆</span>
          </div>
          <div class="section-body">
            ${entriesHtml}
          </div>
        </section>
      `
    })
    .join('')

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
          .story-section {
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

          .story-section {
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

          .section-body {
            display: grid;
            gap: 18px;
          }

          .memory-card {
            border-radius: 20px;
            padding: 18px;
            background: #fffaf5;
            border: 1px solid rgba(197, 177, 155, 0.45);
          }

          .memory-meta {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            font-size: 13px;
            color: #8d7660;
          }

          h3 {
            margin: 12px 0 0;
            font-size: 18px;
            color: #614634;
          }

          .memory-answer {
            margin: 14px 0 0;
            font-size: 16px;
            color: #473225;
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
            .story-section {
              padding: 18px;
            }

            h1 {
              font-size: 28px;
            }

            .stats,
            .photo-grid {
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
            <div class="stats">
              <article class="stat-card">
                <div class="stat-label">回忆段落</div>
                <div class="stat-value">${memories.length}</div>
              </article>
              <article class="stat-card">
                <div class="stat-label">主题章节</div>
                <div class="stat-value">${categoryCount}</div>
              </article>
              <article class="stat-card">
                <div class="stat-label">收录照片</div>
                <div class="stat-value">${photoItems.length}</div>
              </article>
            </div>
            <p class="cover-summary" style="margin-top: 18px;">生成日期：${generatedAt}</p>
          </section>
          ${sectionsHtml}
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
