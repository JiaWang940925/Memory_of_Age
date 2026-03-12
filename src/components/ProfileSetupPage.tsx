import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  CalendarDays,
  MapPinned,
  Milestone,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { buildEventReminders } from '../lib/conversation'
import {
  buildProfileSummary,
  type UserGender,
  type UserProfile,
} from '../lib/userProfile'

interface ProfileSetupPageProps {
  initialProfile: UserProfile | null
  onSubmit: (profile: UserProfile) => void
}

const genderOptions: Array<{ value: UserGender; label: string }> = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
  { value: 'unspecified', label: '暂不说明' },
]

function createInitialState(profile: UserProfile | null): UserProfile {
  if (profile) {
    return profile
  }

  return {
    fullName: '',
    birthDate: '',
    birthPlace: '',
    gender: 'unspecified',
    hometown: '',
  }
}

export function ProfileSetupPage({
  initialProfile,
  onSubmit,
}: ProfileSetupPageProps) {
  const [form, setForm] = useState<UserProfile>(() => createInitialState(initialProfile))
  const [errorMessage, setErrorMessage] = useState('')

  const previewProfile: UserProfile = {
    ...form,
    birthPlace: form.birthPlace.trim(),
    hometown: form.hometown.trim() || form.birthPlace.trim(),
    fullName: form.fullName.trim(),
  }
  const eventReminders =
    previewProfile.birthDate && previewProfile.birthPlace
      ? buildEventReminders(previewProfile).slice(0, 4)
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

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="paper-panel space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-elder-2xl font-bold text-foreground">先认识您，再陪您回忆人生</h1>
              <p className="mt-3 text-elder-base text-muted-foreground">
                系统会先记录出生年月日、出生地、性别和成长地，再结合您的年代背景提醒关键时代事件，帮助问题更贴近您自己的人生跨度。
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-3">
                <span className="flex items-center gap-2 text-elder-base font-semibold text-foreground">
                  <UserRound className="h-5 w-5 text-primary" />
                  称呼
                </span>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  className="input-warm min-h-[4.5rem]"
                  placeholder="例如：王阿姨、李叔叔"
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
                  成长地或长期生活地
                </span>
                <input
                  type="text"
                  value={form.hometown}
                  onChange={(event) => updateField('hometown', event.target.value)}
                  className="input-warm min-h-[4.5rem]"
                  placeholder="可不填，默认沿用出生地"
                />
              </label>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-elder-base font-semibold text-foreground">性别</legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

            {errorMessage ? (
              <div className="rounded-2xl border border-warning/40 bg-warning/10 px-5 py-4 text-elder-base text-foreground">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-elder-base text-muted-foreground">
                后续提问会自动覆盖童年、求学、工作、婚恋、家庭与晚年阶段。
              </p>
              <button type="submit" className="btn-primary">
                进入智能访谈
                <ArrowRight className="h-6 w-6" />
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-6">
          <article className="paper-panel space-y-5">
            <div>
              <p className="text-elder-base font-semibold text-primary">个人信息摘要</p>
              <h2 className="mt-3 text-elder-lg font-semibold text-foreground">
                后续会基于这些资料生成不重复的引导问题
              </h2>
            </div>

            <div className="rounded-3xl bg-accent/40 px-5 py-5">
              <p className="text-elder-base leading-relaxed text-foreground">
                {previewProfile.birthDate && previewProfile.birthPlace
                  ? buildProfileSummary(previewProfile)
                  : '填写出生日期和出生地后，这里会生成个人信息摘要。'}
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-3xl bg-accent/30 px-5 py-4">
                <p className="text-elder-base font-semibold text-foreground">提问方式</p>
                <p className="mt-2 text-elder-sm text-muted-foreground">
                  系统会记录已问过的问题，不再反复追问同一个人生节点。
                </p>
              </div>
              <div className="rounded-3xl bg-accent/30 px-5 py-4">
                <p className="text-elder-base font-semibold text-foreground">时代提醒</p>
                <p className="mt-2 text-elder-sm text-muted-foreground">
                  会根据您的出生年代和地点，插入更有共鸣的大事件与情绪回忆问题。
                </p>
              </div>
            </div>
          </article>

          <article className="paper-panel space-y-5">
            <div>
              <p className="text-elder-base font-semibold text-primary">可能会重点提醒的时代节点</p>
              <p className="mt-2 text-elder-base text-muted-foreground">
                填写出生资料后，系统会从历史大事件里自动挑出更贴近您人生时间线的提示。
              </p>
            </div>

            {eventReminders.length > 0 ? (
              <div className="space-y-4">
                {eventReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="rounded-3xl border border-border bg-card px-5 py-5"
                  >
                    <p className="text-elder-base font-semibold text-foreground">
                      {reminder.title}
                    </p>
                    <p className="mt-3 text-elder-sm leading-7 text-muted-foreground">
                      {reminder.teaser}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-8">
                <p className="text-elder-base text-muted-foreground">
                  例如：如果出生于 1940 至 1960 年间，系统会更可能提醒新中国成立、抗美援朝、恢复高考、改革开放这些时代节点，并邀请您回忆当时的心情与感受。
                </p>
              </div>
            )}
          </article>
        </section>
      </div>
    </div>
  )
}
