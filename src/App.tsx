import { useEffect, useRef, useState } from 'react'
import { WelcomePage } from './components/WelcomePage'
import { ChatPage } from './components/ChatPage'
import { MemoryPage } from './components/MemoryPage'
import { getBrowserSessionId, getSessionScopedKey } from './lib/session'

export type Page = 'welcome' | 'chat' | 'memory'

export interface Memory {
  id: string
  question: string
  answer: string
  emotion: 'positive' | 'neutral' | 'attention'
  timestamp: Date
  category: string
}

interface StoredMemory extends Omit<Memory, 'timestamp'> {
  timestamp: string
}

function loadMemories(storageKey: string): Memory[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as StoredMemory[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(
        (memory) =>
          typeof memory.id === 'string' &&
          typeof memory.question === 'string' &&
          typeof memory.answer === 'string' &&
          typeof memory.emotion === 'string' &&
          typeof memory.category === 'string' &&
          typeof memory.timestamp === 'string',
      )
      .map((memory) => ({
        ...memory,
        timestamp: new Date(memory.timestamp),
      }))
  } catch {
    return []
  }
}

function saveMemories(storageKey: string, memories: Memory[]) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const serialized: StoredMemory[] = memories.map((memory) => ({
      ...memory,
      timestamp: memory.timestamp.toISOString(),
    }))

    window.sessionStorage.setItem(storageKey, JSON.stringify(serialized))
  } catch {
    // Ignore storage write failures and keep the in-memory copy usable.
  }
}

function App() {
  const sessionIdRef = useRef('')
  if (!sessionIdRef.current) {
    sessionIdRef.current = getBrowserSessionId()
  }

  const memoriesStorageKeyRef = useRef('')
  if (!memoriesStorageKeyRef.current) {
    memoriesStorageKeyRef.current = getSessionScopedKey('memories', sessionIdRef.current)
  }

  const [currentPage, setCurrentPage] = useState<Page>('welcome')
  const [memories, setMemories] = useState<Memory[]>(() =>
    loadMemories(memoriesStorageKeyRef.current),
  )

  useEffect(() => {
    saveMemories(memoriesStorageKeyRef.current, memories)
  }, [memories])

  const addMemory = (memory: Memory) => {
    setMemories(prev => [...prev, memory])
  }

  return (
    <main className="min-h-screen bg-background">
      {currentPage === 'welcome' && (
        <WelcomePage onStart={() => setCurrentPage('chat')} />
      )}
      {currentPage === 'chat' && (
        <ChatPage 
          onNavigate={setCurrentPage}
          onAddMemory={addMemory}
          memories={memories}
        />
      )}
      {currentPage === 'memory' && (
        <MemoryPage 
          memories={memories}
          onBack={() => setCurrentPage('chat')}
        />
      )}
    </main>
  )
}

export default App
