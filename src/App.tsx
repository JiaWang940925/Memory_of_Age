import { useEffect, useRef, useState } from 'react'
import { WelcomePage } from './components/WelcomePage'
import { ProfileSetupPage } from './components/ProfileSetupPage'
import { ChatPage } from './components/ChatPage'
import { MemoryPage } from './components/MemoryPage'
import { JourneyPage } from './components/JourneyPage'
import { DailyRecallPage } from './components/DailyRecallPage'
import type { DailyRecallLogEntry } from './lib/dailyRecall'
import { getBrowserSessionId, getSessionScopedKey } from './lib/session'
import {
  createDefaultUserProfile,
  type OperatorRole,
  type RelationshipToElder,
  type UserProfile,
} from './lib/userProfile'

export type Page = 'welcome' | 'profile' | 'chat' | 'memory' | 'journey' | 'daily-recall'

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

interface StoredMemory extends Omit<Memory, 'timestamp'> {
  timestamp: string
}

interface StoredDailyRecallLogEntry extends DailyRecallLogEntry {}

interface EntryPreset {
  operatorRole: OperatorRole
  relationshipToElder: RelationshipToElder
  isElderPresent: boolean
}

const SELF_STORY_PRESET: EntryPreset = {
  operatorRole: 'elder-self',
  relationshipToElder: 'self',
  isElderPresent: true,
}

const FAMILY_STORY_PRESET: EntryPreset = {
  operatorRole: 'adult-child',
  relationshipToElder: 'other',
  isElderPresent: true,
}

function applyEntryPreset(profile: UserProfile, preset: EntryPreset): UserProfile {
  return {
    ...profile,
    operatorRole: preset.operatorRole,
    relationshipToElder: preset.relationshipToElder,
    isElderPresent: preset.isElderPresent,
  }
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

    const parsed = JSON.parse(raw) as Partial<UserProfile> | null
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const profile = createDefaultUserProfile()

    return {
      ...profile,
      fullName: typeof parsed.fullName === 'string' ? parsed.fullName : profile.fullName,
      familyCallName:
        typeof parsed.familyCallName === 'string'
          ? parsed.familyCallName
          : profile.familyCallName,
      birthDate: typeof parsed.birthDate === 'string' ? parsed.birthDate : profile.birthDate,
      birthPlace:
        typeof parsed.birthPlace === 'string' ? parsed.birthPlace : profile.birthPlace,
      gender: typeof parsed.gender === 'string' ? parsed.gender : profile.gender,
      hometown: typeof parsed.hometown === 'string' ? parsed.hometown : profile.hometown,
      longTermPlace:
        typeof parsed.longTermPlace === 'string' ? parsed.longTermPlace : profile.longTermPlace,
      importantRole:
        typeof parsed.importantRole === 'string' ? parsed.importantRole : profile.importantRole,
      importantFamilyMembers:
        typeof parsed.importantFamilyMembers === 'string'
          ? parsed.importantFamilyMembers
          : profile.importantFamilyMembers,
      memoryTriggers:
        typeof parsed.memoryTriggers === 'string'
          ? parsed.memoryTriggers
          : profile.memoryTriggers,
      memoryConcern:
        typeof parsed.memoryConcern === 'boolean'
          ? parsed.memoryConcern
          : profile.memoryConcern,
      allowFamilyEditing:
        typeof parsed.allowFamilyEditing === 'boolean'
          ? parsed.allowFamilyEditing
          : profile.allowFamilyEditing,
      operatorRole:
        parsed.operatorRole === 'adult-child'
        || parsed.operatorRole === 'family-member'
        || parsed.operatorRole === 'caregiver'
        || parsed.operatorRole === 'elder-self'
          ? parsed.operatorRole
          : profile.operatorRole,
      relationshipToElder:
        parsed.relationshipToElder === 'self'
        || parsed.relationshipToElder === 'son'
        || parsed.relationshipToElder === 'daughter'
        || parsed.relationshipToElder === 'spouse'
        || parsed.relationshipToElder === 'grandchild'
        || parsed.relationshipToElder === 'relative'
        || parsed.relationshipToElder === 'caregiver'
        || parsed.relationshipToElder === 'other'
          ? parsed.relationshipToElder
          : profile.relationshipToElder,
      isElderPresent:
        typeof parsed.isElderPresent === 'boolean'
          ? parsed.isElderPresent
          : profile.isElderPresent,
    }
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

function getLocalDayKey(value: string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadDailyRecallHistory(storageKey: string): DailyRecallLogEntry[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as StoredDailyRecallLogEntry[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (entry) =>
        typeof entry.id === 'string'
        && typeof entry.itemId === 'string'
        && typeof entry.itemTitle === 'string'
        && typeof entry.prompt === 'string'
        && typeof entry.topic === 'string'
        && typeof entry.responseState === 'string'
        && typeof entry.answer === 'string'
        && typeof entry.recordedAt === 'string',
    )
  } catch {
    return []
  }
}

function saveDailyRecallHistory(storageKey: string, history: DailyRecallLogEntry[]) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(history))
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

  const dailyRecallHistoryStorageKeyRef = useRef('')
  if (!dailyRecallHistoryStorageKeyRef.current) {
    dailyRecallHistoryStorageKeyRef.current = getSessionScopedKey(
      'daily-recall-history',
      sessionIdRef.current,
    )
  }

  const [currentPage, setCurrentPage] = useState<Page>('welcome')
  const [memories, setMemories] = useState<Memory[]>(() =>
    loadMemories(memoriesStorageKeyRef.current),
  )
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() =>
    loadProfile(profileStorageKeyRef.current),
  )
  const [dailyRecallHistory, setDailyRecallHistory] = useState<DailyRecallLogEntry[]>(() =>
    loadDailyRecallHistory(dailyRecallHistoryStorageKeyRef.current),
  )
  const [profileEntryPreset, setProfileEntryPreset] = useState<EntryPreset>(SELF_STORY_PRESET)

  useEffect(() => {
    saveMemories(memoriesStorageKeyRef.current, memories)
  }, [memories])

  useEffect(() => {
    saveProfile(profileStorageKeyRef.current, userProfile)
  }, [userProfile])

  useEffect(() => {
    saveDailyRecallHistory(dailyRecallHistoryStorageKeyRef.current, dailyRecallHistory)
  }, [dailyRecallHistory])

  const addMemory = (memory: Memory) => {
    setMemories(prev => [...prev, memory])
  }

  const addDailyRecallLog = (entry: DailyRecallLogEntry) => {
    setDailyRecallHistory((previous) => {
      const dayKey = getLocalDayKey(entry.recordedAt)
      const next = previous.filter(
        (item) => !(item.itemId === entry.itemId && getLocalDayKey(item.recordedAt) === dayKey),
      )
      return [...next, entry]
    })
  }

  return (
    <main className="min-h-screen bg-background">
      {currentPage === 'welcome' && (
        <WelcomePage
          onStartSelf={() => {
            setProfileEntryPreset(SELF_STORY_PRESET)
            setUserProfile((previous) =>
              previous ? applyEntryPreset(previous, SELF_STORY_PRESET) : previous,
            )
            setCurrentPage(userProfile ? 'chat' : 'profile')
          }}
          onStartForFamily={() => {
            setProfileEntryPreset(FAMILY_STORY_PRESET)
            setUserProfile((previous) =>
              previous ? applyEntryPreset(previous, FAMILY_STORY_PRESET) : previous,
            )
            setCurrentPage(userProfile ? 'chat' : 'profile')
          }}
          onOpenDailyRecall={() => setCurrentPage('daily-recall')}
          dailyRecallHistory={dailyRecallHistory}
        />
      )}
      {currentPage === 'profile' && (
        <ProfileSetupPage
          initialProfile={userProfile}
          entryPreset={profileEntryPreset}
          onGoHome={() => setCurrentPage('welcome')}
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
          onGoHome={() => setCurrentPage('welcome')}
          onOpenDailyRecall={() => setCurrentPage('daily-recall')}
          onOpenJourney={() => setCurrentPage('journey')}
        />
      )}
      {currentPage === 'journey' && userProfile && (
        <JourneyPage
          memories={memories}
          onBack={() => setCurrentPage('memory')}
          onGoHome={() => setCurrentPage('welcome')}
          userProfile={userProfile}
        />
      )}
      {currentPage === 'daily-recall' && (
        <DailyRecallPage
          memories={memories}
          userProfile={userProfile}
          onRecordDailyRecall={addDailyRecallLog}
          onBack={() => setCurrentPage('welcome')}
          onGoHome={() => setCurrentPage('welcome')}
          onOpenStory={() => setCurrentPage(userProfile ? 'chat' : 'profile')}
        />
      )}
    </main>
  )
}

export default App
