export type UserGender = 'male' | 'female' | 'other' | 'unspecified'

export type OperatorRole = 'elder-self' | 'adult-child' | 'family-member' | 'caregiver'

export type RelationshipToElder =
  | 'self'
  | 'son'
  | 'daughter'
  | 'spouse'
  | 'grandchild'
  | 'relative'
  | 'caregiver'
  | 'other'

export type InterviewMode = 'self-narration' | 'family-assist' | 'gentle-recall'

export interface UserProfile {
  fullName: string
  familyCallName: string
  birthDate: string
  birthPlace: string
  gender: UserGender
  hometown: string
  longTermPlace: string
  importantRole: string
  importantFamilyMembers: string
  memoryTriggers: string
  allowFamilyEditing: boolean
  operatorRole: OperatorRole
  relationshipToElder: RelationshipToElder
  isElderPresent: boolean
}

export function createDefaultUserProfile(): UserProfile {
  return {
    fullName: '',
    familyCallName: '',
    birthDate: '',
    birthPlace: '',
    gender: 'unspecified',
    hometown: '',
    longTermPlace: '',
    importantRole: '',
    importantFamilyMembers: '',
    memoryTriggers: '',
    allowFamilyEditing: true,
    operatorRole: 'elder-self',
    relationshipToElder: 'self',
    isElderPresent: true,
  }
}

const operatorRoleLabels: Record<OperatorRole, string> = {
  'elder-self': '老人本人',
  'adult-child': '子女',
  'family-member': '其他家属',
  caregiver: '照护者',
}

const relationshipLabels: Record<RelationshipToElder, string> = {
  self: '本人',
  son: '儿子',
  daughter: '女儿',
  spouse: '伴侣',
  grandchild: '孙辈',
  relative: '亲属',
  caregiver: '照护者',
  other: '其他',
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

export function getOperatorRoleLabel(role: OperatorRole) {
  return operatorRoleLabels[role]
}

export function getRelationshipLabel(relationship: RelationshipToElder) {
  return relationshipLabels[relationship]
}

export function getInterviewModeForProfile(profile: UserProfile): InterviewMode {
  return profile.operatorRole === 'elder-self' ? 'self-narration' : 'family-assist'
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
  return profile.familyCallName.trim() || profile.fullName.trim() || '您'
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

  if (profile.longTermPlace.trim()) {
    parts.push(`长期生活地 ${profile.longTermPlace.trim()}`)
  }

  if (profile.importantRole.trim()) {
    parts.push(`重要身份 ${profile.importantRole.trim()}`)
  }

  return parts.join(' · ')
}

export function buildHouseholdSummary(profile: UserProfile) {
  const parts = [
    `${getOperatorRoleLabel(profile.operatorRole)}正在使用`,
    `与老人关系 ${getRelationshipLabel(profile.relationshipToElder)}`,
    profile.isElderPresent ? '老人当前在场' : '老人当前不在场',
    profile.allowFamilyEditing ? '允许家属继续补充' : '仅保留老人本人内容',
  ]

  if (profile.importantFamilyMembers.trim()) {
    parts.push(`家庭线索 ${profile.importantFamilyMembers.trim()}`)
  }

  return parts.join(' · ')
}

export function buildMemoryTriggerSummary(profile: UserProfile) {
  const parts = [
    profile.importantFamilyMembers.trim(),
    profile.memoryTriggers.trim(),
  ].filter(Boolean)

  return parts.length > 0
    ? parts.join('；')
    : '可继续补充家人称呼、旧物件、兴趣和常提到的地点，让回忆提示更贴近生活。'
}

export function placeMatchesKeywords(place: string, keywords: string[]) {
  const normalized = place.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
}
