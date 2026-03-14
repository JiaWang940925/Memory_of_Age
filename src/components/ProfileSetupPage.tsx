import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Home,
  Landmark,
  MapPinned,
  Milestone,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  buildFeaturedHistoricalEvents,
  getHistoricalEventFit,
} from '../lib/historicalEvents'
import {
  buildHouseholdSummary,
  buildMemoryTriggerSummary,
  buildProfileSummary,
  createDefaultUserProfile,
  getOperatorRoleLabel,
  getRelationshipLabel,
  type OperatorRole,
  type RelationshipToElder,
  type UserGender,
  type UserProfile,
} from '../lib/userProfile'

interface EntryPreset {
  operatorRole: OperatorRole
  relationshipToElder: RelationshipToElder
  isElderPresent: boolean
}

interface ProfileSetupPageProps {
  initialProfile: UserProfile | null
  entryPreset: EntryPreset
  onGoHome: () => void
  onSubmit: (profile: UserProfile) => void
}

const genderOptions: Array<{ value: UserGender; label: string }> = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
  { value: 'unspecified', label: '暂不说明' },
]

const operatorOptions: Array<{ value: OperatorRole; label: string }> = [
  { value: 'elder-self', label: '老人本人' },
  { value: 'adult-child', label: '子女' },
  { value: 'family-member', label: '其他家属' },
  { value: 'caregiver', label: '照护者' },
]

const relationshipOptions: Array<{ value: RelationshipToElder; label: string }> = [
  { value: 'self', label: '本人' },
  { value: 'son', label: '儿子' },
  { value: 'daughter', label: '女儿' },
  { value: 'spouse', label: '伴侣' },
  { value: 'grandchild', label: '孙辈' },
  { value: 'relative', label: '亲属' },
  { value: 'caregiver', label: '照护者' },
  { value: 'other', label: '其他' },
]

function createInitialState(profile: UserProfile | null, preset: EntryPreset): UserProfile {
  if (profile) {
    return {
      ...profile,
      operatorRole: preset.operatorRole,
      relationshipToElder: preset.relationshipToElder,
      isElderPresent: preset.isElderPresent,
    }
  }

  return {
    ...createDefaultUserProfile(),
    operatorRole: preset.operatorRole,
    relationshipToElder: preset.relationshipToElder,
    isElderPresent: preset.isElderPresent,
  }
}

export function ProfileSetupPage({
  initialProfile,
  entryPreset,
  onGoHome,
  onSubmit,
}: ProfileSetupPageProps) {
  const [form, setForm] = useState<UserProfile>(() => createInitialState(initialProfile, entryPreset))
  const [errorMessage, setErrorMessage] = useState('')

  const previewProfile: UserProfile = {
    ...form,
    fullName: form.fullName.trim(),
    familyCallName: form.familyCallName.trim(),
    birthPlace: form.birthPlace.trim(),
    hometown: form.hometown.trim() || form.birthPlace.trim(),
    longTermPlace: form.longTermPlace.trim(),
    importantRole: form.importantRole.trim(),
    importantFamilyMembers: form.importantFamilyMembers.trim(),
    memoryTriggers: form.memoryTriggers.trim(),
  }

  const eraClues = previewProfile.birthDate
    ? buildFeaturedHistoricalEvents(
        previewProfile,
        [
          previewProfile.birthPlace,
          previewProfile.hometown,
          previewProfile.longTermPlace,
          previewProfile.importantFamilyMembers,
          previewProfile.memoryTriggers,
        ].filter(Boolean),
        4,
      )
    : []

  const updateField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!previewProfile.birthDate) {
      setErrorMessage('请先填写出生年月日')
      return
    }

    if (!previewProfile.birthPlace) {
      setErrorMessage('请先填写出生地')
      return
    }

    setErrorMessage('')
    onSubmit(previewProfile)
  }

  const isFamilyAssist =
    previewProfile.operatorRole === 'adult-child'
    || previewProfile.operatorRole === 'family-member'
    || previewProfile.operatorRole === 'caregiver'

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-6xl gap-5 sm:gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <section className="paper-panel space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onGoHome}
              className="btn-outline w-full justify-center sm:w-auto"
            >
              <Home className="h-5 w-5" />
              返回主页
            </button>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary sm:h-16 sm:w-16 sm:rounded-3xl">
              <Sparkles className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-elder-2xl font-bold text-foreground">
                {isFamilyAssist ? '先记下老人资料，再一起慢慢回想' : '先认识您，再陪您回忆人生'}
              </h1>
              <p className="mt-3 text-elder-base text-muted-foreground">
                这一步会同时记录老人资料和家庭协同方式。后续提问会结合出生年代、家庭关系、生活地点和常见线索，让回忆更贴近真实生活。
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <article className="rounded-[1.75rem] border border-border bg-card px-5 py-5">
              <div className="flex items-start gap-3">
                <UsersRound className="mt-1 h-6 w-6 text-primary" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-elder-lg font-semibold text-foreground">这次是谁在使用</h2>
                  <p className="mt-2 text-elder-base text-muted-foreground">
                    同一个家庭账号可以由老人自己使用，也可以由子女或其他家属陪同使用。
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5">
                <fieldset className="space-y-3">
                  <legend className="text-elder-base font-semibold text-foreground">当前操作者</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {operatorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('operatorRole', option.value)}
                        className={`rounded-2xl border px-4 py-4 text-left text-elder-base transition-all ${
                          form.operatorRole === option.value
                            ? 'border-primary bg-primary/10 text-foreground shadow-warm'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-elder-base font-semibold text-foreground">与老人关系</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {relationshipOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('relationshipToElder', option.value)}
                        className={`rounded-2xl border px-4 py-4 text-left text-elder-base transition-all ${
                          form.relationshipToElder === option.value
                            ? 'border-primary bg-primary/10 text-foreground shadow-warm'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-3">
                  <label className="flex items-center justify-between rounded-2xl border border-border bg-accent/25 px-4 py-4">
                    <span className="text-elder-base text-foreground">老人当前在场</span>
                    <input
                      type="checkbox"
                      checked={form.isElderPresent}
                      onChange={(event) => updateField('isElderPresent', event.target.checked)}
                      className="h-5 w-5 accent-[hsl(var(--primary))]"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-border bg-accent/25 px-4 py-4">
                    <span className="text-elder-base text-foreground">允许家属继续补充整理</span>
                    <input
                      type="checkbox"
                      checked={form.allowFamilyEditing}
                      onChange={(event) => updateField('allowFamilyEditing', event.target.checked)}
                      className="h-5 w-5 accent-[hsl(var(--primary))]"
                    />
                  </label>
                </div>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-border bg-card px-5 py-5">
              <div className="flex items-start gap-3">
                <UserRound className="mt-1 h-6 w-6 text-primary" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-elder-lg font-semibold text-foreground">老人资料</h2>
                  <p className="mt-2 text-elder-base text-muted-foreground">
                    这些信息用于生成更贴近老人经历的访谈问题、时代线索和人物提示。
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-3">
                    <span className="flex items-center gap-2 text-elder-base font-semibold text-foreground">
                      <UserRound className="h-5 w-5 text-primary" />
                      老人姓名
                    </span>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(event) => updateField('fullName', event.target.value)}
                      className="input-warm min-h-[4.5rem]"
                      placeholder="例如：王淑兰"
                    />
                  </label>

                  <label className="space-y-3">
                    <span className="flex items-center gap-2 text-elder-base font-semibold text-foreground">
                      <Sparkles className="h-5 w-5 text-primary" />
                      家里常用称呼
                    </span>
                    <input
                      type="text"
                      value={form.familyCallName}
                      onChange={(event) => updateField('familyCallName', event.target.value)}
                      className="input-warm min-h-[4.5rem]"
                      placeholder="例如：王阿姨、妈妈、外婆"
                    />
                  </label>

                  <label className="space-y-3">
                    <span className="flex items-center gap-2 text-elder-base font-semibold text-foreground">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      出生年月日
                    </span>
                    <input
                      type="date"
                      value={form.birthDate}
                      onChange={(event) => updateField('birthDate', event.target.value)}
                      className="input-warm min-h-[4.5rem]"
                    />
                  </label>

                  <label className="space-y-3">
                    <span className="flex items-center gap-2 text-elder-base font-semibold text-foreground">
                      <MapPinned className="h-5 w-5 text-primary" />
                      出生地
                    </span>
                    <input
                      type="text"
                      value={form.birthPlace}
                      onChange={(event) => updateField('birthPlace', event.target.value)}
                      className="input-warm min-h-[4.5rem]"
                      placeholder="例如：四川绵阳、江苏苏州"
                    />
                  </label>

                  <label className="space-y-3">
                    <span className="flex items-center gap-2 text-elder-base font-semibold text-foreground">
                      <Milestone className="h-5 w-5 text-primary" />
                      成长地
                    </span>
                    <input
                      type="text"
                      value={form.hometown}
                      onChange={(event) => updateField('hometown', event.target.value)}
                      className="input-warm min-h-[4.5rem]"
                      placeholder="可不填，默认沿用出生地"
                    />
                  </label>

                  <label className="space-y-3">
                    <span className="flex items-center gap-2 text-elder-base font-semibold text-foreground">
                      <MapPinned className="h-5 w-5 text-primary" />
                      长期生活或工作地
                    </span>
                    <input
                      type="text"
                      value={form.longTermPlace}
                      onChange={(event) => updateField('longTermPlace', event.target.value)}
                      className="input-warm min-h-[4.5rem]"
                      placeholder="例如：沈阳铁西、上海杨浦"
                    />
                  </label>
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-elder-base font-semibold text-foreground">性别</legend>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {genderOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('gender', option.value)}
                        className={`rounded-2xl border px-5 py-4 text-left text-elder-base transition-all ${
                          form.gender === option.value
                            ? 'border-primary bg-primary/10 text-foreground shadow-warm'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-border bg-card px-5 py-5">
              <div className="flex items-start gap-3">
                <Landmark className="mt-1 h-6 w-6 text-primary" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-elder-lg font-semibold text-foreground">家庭线索与记忆触发器</h2>
                  <p className="mt-2 text-elder-base text-muted-foreground">
                    这些内容不必一次填满，哪怕只写几个称呼、一个职业或一件旧物，也会帮助后续提问更具体。
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="space-y-3">
                  <span className="text-elder-base font-semibold text-foreground">重要职业或身份</span>
                  <input
                    type="text"
                    value={form.importantRole}
                    onChange={(event) => updateField('importantRole', event.target.value)}
                    className="input-warm min-h-[4.5rem]"
                    placeholder="例如：纺织厂工人、老师、军人、会计"
                  />
                </label>

                <label className="space-y-3">
                  <span className="text-elder-base font-semibold text-foreground">重要家庭成员称呼</span>
                  <textarea
                    value={form.importantFamilyMembers}
                    onChange={(event) => updateField('importantFamilyMembers', event.target.value)}
                    className="input-warm resize-none"
                    rows={4}
                    placeholder="例如：老伴叫老周，儿子叫建国，孙女叫朵朵"
                  />
                </label>

                <label className="space-y-3">
                  <span className="text-elder-base font-semibold text-foreground">常提到的旧物、兴趣或生活线索</span>
                  <textarea
                    value={form.memoryTriggers}
                    onChange={(event) => updateField('memoryTriggers', event.target.value)}
                    className="input-warm resize-none"
                    rows={4}
                    placeholder="例如：缝纫机、收音机、打毛衣、包饺子、赶集、唱样板戏"
                  />
                </label>
              </div>
            </article>

            {errorMessage ? (
              <div className="rounded-2xl border border-warning/40 bg-warning/10 px-5 py-4 text-elder-base text-foreground">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-elder-base text-muted-foreground">
                后续会按当前操作者身份切换成“老人自述”或“家属陪访”模式。
              </p>
              <button type="submit" className="btn-primary w-full sm:w-auto">
                进入当前使用方式
                <ArrowRight className="h-6 w-6" />
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-5 sm:space-y-6">
          <article className="paper-panel space-y-4 sm:space-y-5">
            <div>
              <p className="text-elder-base font-semibold text-primary">当前整理摘要</p>
              <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                这份家庭档案会同时服务回忆录、地图和日常回想
              </h2>
            </div>

            <div className="rounded-3xl bg-accent/40 px-5 py-5">
              <p className="text-elder-base leading-relaxed text-foreground">
                {previewProfile.birthDate && previewProfile.birthPlace
                  ? buildProfileSummary(previewProfile)
                  : '填写出生日期和出生地后，这里会生成老人资料摘要。'}
              </p>
            </div>

            <div className="rounded-3xl bg-accent/30 px-5 py-5">
              <p className="text-elder-base font-semibold text-foreground">家庭协同方式</p>
              <p className="mt-3 text-elder-sm leading-7 text-muted-foreground">
                {buildHouseholdSummary(previewProfile)}
              </p>
            </div>

            <div className="rounded-3xl bg-accent/30 px-5 py-5">
              <p className="text-elder-base font-semibold text-foreground">记忆触发器摘要</p>
              <p className="mt-3 text-elder-sm leading-7 text-muted-foreground">
                {buildMemoryTriggerSummary(previewProfile)}
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-3xl bg-accent/30 px-5 py-4">
                <p className="text-elder-base font-semibold text-foreground">当前模式</p>
                <p className="mt-2 text-elder-sm text-muted-foreground">
                  {isFamilyAssist
                    ? `由${getOperatorRoleLabel(previewProfile.operatorRole)}协助记录，系统会追加给家属看的追问建议。`
                    : '由老人本人讲述，系统会保持更简单、温和的提问节奏。'}
                </p>
              </div>
              <div className="rounded-3xl bg-accent/30 px-5 py-4">
                <p className="text-elder-base font-semibold text-foreground">当前关系</p>
                <p className="mt-2 text-elder-sm text-muted-foreground">
                  目前标记为“{getRelationshipLabel(previewProfile.relationshipToElder)}”，后续重要人物和家属文案会参照这个关系。
                </p>
              </div>
            </div>
          </article>

          <article className="paper-panel space-y-4 sm:space-y-5">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Landmark className="h-5 w-5" />
                <p className="text-elder-base font-semibold">即时生成的时代线索</p>
              </div>
              <p className="mt-2 text-elder-base text-muted-foreground">
                只要填写出生日期，右侧就会开始推测哪些时代大事更可能帮助打开记忆。家庭称呼和生活地点补得越完整，线索会越贴近。
              </p>
            </div>

            {eraClues.length > 0 ? (
              <div className="space-y-4">
                {eraClues.map((event) => {
                  const fit = getHistoricalEventFit(event, previewProfile)
                  const ageLabel =
                    fit.ageAtEvent !== null && fit.ageAtEvent >= 0
                      ? `${fit.ageAtEvent} 岁`
                      : '年代匹配'

                  return (
                    <div
                      key={event.id}
                      className="rounded-3xl border border-border bg-card px-5 py-5"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="emotion-tag-neutral">{event.eventYear} 年</span>
                        <span className="emotion-tag-positive">{ageLabel}</span>
                        {fit.isLocationMatch ? (
                          <span className="emotion-tag-neutral">地点相关</span>
                        ) : null}
                      </div>
                      <p className="mt-4 text-elder-base font-semibold text-foreground">
                        {event.title}
                      </p>
                      <p className="mt-3 text-elder-sm leading-7 text-muted-foreground">
                        {event.memoryPrompt}
                      </p>
                      <p className="mt-3 text-elder-sm text-foreground">
                        推荐理由：{fit.reasonText}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-8">
                <p className="text-elder-base text-muted-foreground">
                  例如：如果您填写了出生日期，系统会立即推测哪些时代大事更可能发生在童年、青年或成家阶段，并邀请您回忆当时的人和事。
                </p>
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  )
}
