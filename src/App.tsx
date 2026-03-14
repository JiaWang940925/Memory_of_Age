import { useEffect, useRef, useState } from 'react'
import { WelcomePage } from './components/WelcomePage'
import { ProfileSetupPage } from './components/ProfileSetupPage'
import { ChatPage } from './components/ChatPage'
import { MemoryPage } from './components/MemoryPage'
import { JourneyPage } from './components/JourneyPage'
import { getBrowserSessionId, getSessionScopedKey } from './lib/session'
import type { UserProfile } from './lib/userProfile'

export type Page = 'welcome' | 'profile' | 'chat' | 'memory' | 'journey'

export interface PhotoAttachment {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
}

export interface Memory {
  id: string
  question: string
  answer: string
  emotion: 'positive' | 'neutral' | 'attention'
  timestamp: Date
  category: string
  photos: PhotoAttachment[]
  promptId?: string
}

export interface GeneratedAvatar {
  jobId: string
  provider: string
  videoUrl: string
  portraitDataUrl: string
  narrationText: string
  createdAt: string
}

interface StoredMemory extends Omit<Memory, 'timestamp'> {
  timestamp: string
}

function isGeneratedAvatar(value: unknown): value is GeneratedAvatar {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof (value as GeneratedAvatar).jobId === 'string'
    && typeof (value as GeneratedAvatar).provider === 'string'
    && typeof (value as GeneratedAvatar).videoUrl === 'string'
    && typeof (value as GeneratedAvatar).portraitDataUrl === 'string'
    && typeof (value as GeneratedAvatar).narrationText === 'string'
    && typeof (value as GeneratedAvatar).createdAt === 'string',
  )
}

function loadProfile(storageKey: string): UserProfile | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as UserProfile
    if (
      typeof parsed?.fullName !== 'string'
      || typeof parsed?.birthDate !== 'string'
      || typeof parsed?.birthPlace !== 'string'
      || typeof parsed?.gender !== 'string'
      || typeof parsed?.hometown !== 'string'
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function saveProfile(storageKey: string, profile: UserProfile | null) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (!profile) {
      window.sessionStorage.removeItem(storageKey)
      return
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(profile))
  } catch {
    // Ignore storage write failures and keep the in-memory copy usable.
  }
}

function loadGeneratedAvatar(storageKey: string): GeneratedAvatar | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    return isGeneratedAvatar(parsed) ? parsed : null
  } catch {
    return null
  }
}

function saveGeneratedAvatar(storageKey: string, avatar: GeneratedAvatar | null) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (!avatar) {
      window.sessionStorage.removeItem(storageKey)
      return
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(avatar))
  } catch {
    // Ignore storage write failures and keep the in-memory copy usable.
  }
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
        promptId: typeof memory.promptId === 'string' ? memory.promptId : undefined,
        photos: Array.isArray(memory.photos)
          ? memory.photos.filter(
              (photo): photo is PhotoAttachment =>
                typeof photo?.id === 'string' &&
                typeof photo?.name === 'string' &&
                typeof photo?.dataUrl === 'string' &&
                typeof photo?.width === 'number' &&
                typeof photo?.height === 'number',
            )
          : [],
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

  const profileStorageKeyRef = useRef('')
  if (!profileStorageKeyRef.current) {
    profileStorageKeyRef.current = getSessionScopedKey('profile', sessionIdRef.current)
  }

  const avatarStorageKeyRef = useRef('')
  if (!avatarStorageKeyRef.current) {
    avatarStorageKeyRef.current = getSessionScopedKey('generated-avatar', sessionIdRef.current)
  }

  const [currentPage, setCurrentPage] = useState<Page>('welcome')
  const [memories, setMemories] = useState<Memory[]>(() =>
    loadMemories(memoriesStorageKeyRef.current),
  )
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() =>
    loadProfile(profileStorageKeyRef.current),
  )
  const [generatedAvatar, setGeneratedAvatar] = useState<GeneratedAvatar | null>(() =>
    loadGeneratedAvatar(avatarStorageKeyRef.current),
  )

  useEffect(() => {
    saveMemories(memoriesStorageKeyRef.current, memories)
  }, [memories])

  useEffect(() => {
    saveProfile(profileStorageKeyRef.current, userProfile)
  }, [userProfile])

  useEffect(() => {
    saveGeneratedAvatar(avatarStorageKeyRef.current, generatedAvatar)
  }, [generatedAvatar])

  const addMemory = (memory: Memory) => {
    setMemories(prev => [...prev, memory])
  }

  return (
    <main className="min-h-screen bg-background">
      {currentPage === 'welcome' && (
        <WelcomePage
          onStart={() => setCurrentPage(userProfile ? 'chat' : 'profile')}
        />
      )}
      {currentPage === 'profile' && (
        <ProfileSetupPage
          initialProfile={userProfile}
          onSubmit={(profile) => {
            setUserProfile(profile)
            setCurrentPage('chat')
          }}
        />
      )}
      {currentPage === 'chat' && userProfile && (
        <ChatPage 
          onNavigate={setCurrentPage}
          onAddMemory={addMemory}
          memories={memories}
          userProfile={userProfile}
        />
      )}
      {currentPage === 'memory' && (
        <MemoryPage 
          memories={memories}
          userProfile={userProfile}
          onBack={() => setCurrentPage('chat')}
          onOpenJourney={() => setCurrentPage('journey')}
          generatedAvatar={generatedAvatar}
          onAvatarGenerated={setGeneratedAvatar}
        />
      )}
      {currentPage === 'journey' && userProfile && (
        <JourneyPage
          memories={memories}
          onBack={() => setCurrentPage('memory')}
          userProfile={userProfile}
          generatedAvatar={generatedAvatar}
        />
      )}
    </main>
  )
}

export default App
