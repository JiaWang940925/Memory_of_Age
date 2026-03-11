const SESSION_ID_KEY = 'suiyu:session-id'
const PRIVACY_NOTICE_ACK_KEY = 'suiyu:privacy-notice-ack:v1'
const AUDIO_CHANNEL_KEY = 'suiyu:audio-channel'

const DEFAULT_AUDIO_TTL_MS = 15_000

export type AudioChannelKind = 'privacy-voice' | 'voice-input'

interface AudioChannelLock {
  ownerId: string
  kind: AudioChannelKind
  expiresAt: number
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined'
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function readAudioChannelLock(): AudioChannelLock | null {
  if (!canUseBrowserStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(AUDIO_CHANNEL_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<AudioChannelLock>
    if (
      typeof parsed.ownerId !== 'string' ||
      typeof parsed.kind !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null
    }

    return {
      ownerId: parsed.ownerId,
      kind: parsed.kind as AudioChannelKind,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

export function getBrowserSessionId() {
  if (!canUseBrowserStorage()) {
    return 'server-session'
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY)
    if (existing) {
      return existing
    }

    const nextId = createId()
    window.sessionStorage.setItem(SESSION_ID_KEY, nextId)
    return nextId
  } catch {
    return createId()
  }
}

export function getSessionScopedKey(scope: string, sessionId: string) {
  return `suiyu:${scope}:${sessionId}`
}

export function hasAcknowledgedPrivacyNotice() {
  if (!canUseBrowserStorage()) {
    return false
  }

  try {
    return window.localStorage.getItem(PRIVACY_NOTICE_ACK_KEY) === 'true'
  } catch {
    return false
  }
}

export function markPrivacyNoticeAcknowledged() {
  if (!canUseBrowserStorage()) {
    return
  }

  try {
    window.localStorage.setItem(PRIVACY_NOTICE_ACK_KEY, 'true')
  } catch {
    // Ignore write failures in restricted environments.
  }
}

export function claimAudioChannel(
  ownerId: string,
  kind: AudioChannelKind,
  ttlMs = DEFAULT_AUDIO_TTL_MS,
) {
  if (!canUseBrowserStorage()) {
    return true
  }

  const now = Date.now()
  const currentLock = readAudioChannelLock()
  if (currentLock && currentLock.ownerId !== ownerId && currentLock.expiresAt > now) {
    return false
  }

  try {
    window.localStorage.setItem(
      AUDIO_CHANNEL_KEY,
      JSON.stringify({
        ownerId,
        kind,
        expiresAt: now + ttlMs,
      } satisfies AudioChannelLock),
    )
  } catch {
    return false
  }

  const confirmedLock = readAudioChannelLock()
  return confirmedLock?.ownerId === ownerId
}

export function refreshAudioChannel(
  ownerId: string,
  kind: AudioChannelKind,
  ttlMs = DEFAULT_AUDIO_TTL_MS,
) {
  return claimAudioChannel(ownerId, kind, ttlMs)
}

export function releaseAudioChannel(ownerId: string) {
  if (!canUseBrowserStorage()) {
    return
  }

  const currentLock = readAudioChannelLock()
  if (currentLock?.ownerId !== ownerId) {
    return
  }

  try {
    window.localStorage.removeItem(AUDIO_CHANNEL_KEY)
  } catch {
    // Ignore write failures in restricted environments.
  }
}
