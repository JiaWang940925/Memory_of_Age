import { ArrowLeft, Heart, Clock, Tag } from 'lucide-react'
import type { Memory } from '../App'

interface MemoryPageProps {
  memories: Memory[]
  onBack: () => void
}

export function MemoryPage({ memories, onBack }: MemoryPageProps) {
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 按类别分组
  const groupedMemories = memories.reduce((acc, memory) => {
    if (!acc[memory.category]) {
      acc[memory.category] = []
    }
    acc[memory.category].push(memory)
    return acc
  }, {} as Record<string, Memory[]>)

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-foreground hover:bg-accent/80 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-elder-xl font-bold text-foreground">我的回忆录</h1>
            <p className="text-elder-sm text-muted-foreground">
              已记录 {memories.length} 段珍贵回忆
            </p>
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {memories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-accent mx-auto mb-6 flex items-center justify-center">
              <Heart className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-elder-xl font-semibold text-foreground mb-3">
              开始记录您的故事
            </h2>
            <p className="text-elder-base text-muted-foreground max-w-sm mx-auto">
              和岁语对话，您的每一段分享都会被珍藏在这里
            </p>
            <button onClick={onBack} className="btn-primary mt-8">
              开始对话
            </button>
          </div>
        ) : (
          <div className="space-y-10">
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
                      className="card-warm space-y-4 animate-slide-up"
                    >
                      {/* 问题 */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-primary text-sm">问</span>
                        </div>
                        <p className="text-elder-base text-muted-foreground italic">
                          "{memory.question}"
                        </p>
                      </div>
                      
                      {/* 回答 */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-secondary text-sm">答</span>
                        </div>
                        <p className="text-elder-base text-foreground leading-relaxed">
                          {memory.answer}
                        </p>
                      </div>
                      
                      {/* 底部信息 */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        {getEmotionIcon(memory.emotion)}
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
        )}
      </div>

      {/* 底部提示 */}
      {memories.length > 0 && (
        <div className="text-center py-8 border-t border-border">
          <p className="text-elder-sm text-muted-foreground">
            每一段记忆，都是生命中闪亮的星辰
          </p>
        </div>
      )}
    </div>
  )
}
