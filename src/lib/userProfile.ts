export type UserGender = 'male' | 'female' | 'other' | 'unspecified'

export interface UserProfile {
  fullName: string
  birthDate: string
  birthPlace: string
  gender: UserGender
  hometown: string
}

export function getBirthYear(profile: UserProfile) {
  const year = Number.parseInt(profile.birthDate.slice(0, 4), 10)
  return Number.isFinite(year) ? year : null
}

export function getAgeAtYear(profile: UserProfile, year: number) {
  const birthYear = getBirthYear(profile)
  if (birthYear === null) {
    return null
  }

  return year - birthYear
}

export function getGenderLabel(gender: UserGender) {
  switch (gender) {
    case 'male':
      return '男'
    case 'female':
      return '女'
    case 'other':
      return '其他'
    default:
      return '暂不说明'
  }
}

export function formatBirthDate(birthDate: string) {
  const date = new Date(birthDate)
  if (Number.isNaN(date.getTime())) {
    return birthDate
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function getProfileDisplayName(profile: UserProfile) {
  return profile.fullName.trim() || '您'
}

export function buildProfileSummary(profile: UserProfile) {
  const parts = [
    `出生于 ${formatBirthDate(profile.birthDate)}`,
    `出生地 ${profile.birthPlace.trim()}`,
    `性别 ${getGenderLabel(profile.gender)}`,
  ]

  if (profile.hometown.trim()) {
    parts.push(`成长地 ${profile.hometown.trim()}`)
  }

  return parts.join(' · ')
}

export function placeMatchesKeywords(place: string, keywords: string[]) {
  const normalized = place.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
}
