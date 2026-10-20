import { useState } from 'react'
import { saveClinicHours } from '../api/schedule'
import { useCan } from '../auth/hooks'
import { DAY_NAMES, WEEK_ORDER, summarizeHours } from '../lib/clinicCalendar'
import type { DayHours, ScheduleRules } from '../types/schedule'

/**
 * The clinic's weekly opening hours, folded away under the agenda calendar.
 * Everyone can see them; only admins can change them.
 */
export default function WorkingHoursPanel({
  rules,
  onChange,
}: {
  rules: ScheduleRules | null
  onChange: (rules: ScheduleRules) => void
}) {
  const canEdit = useCan('manageClinicHours')
  // Unsaved edits; null means "showing what's saved".
  const [draft, setDraft] = useState<DayHours[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const days = draft ?? rules?.days ?? []
  const byWeekday = new Map(days.map((day) => [day.weekday, day]))
  const problem = draft ? validate(draft) : null

  function update(weekday: number, change: Partial<DayHours>) {
    setNotice(null)
    setError(null)
    setDraft(days.map((day) => (day.weekday === weekday ? { ...day, ...change } : day)))
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || problem) return
    setIsSaving(true)
    setError(null)
    try {
      const saved = await saveClinicHours(draft)
      onChange(saved)
      setDraft(null)
      setNotice('Opening hours saved. The calendar and new treatment courses now use them.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the opening hours')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-lg font-bold text-slate-900">Working hours</span>
          <span className="block text-sm text-slate-500">
            {rules ? summarizeHours(rules.days) : 'Loading…'}
          </span>
        </span>
        <span className="text-sm font-semibold text-teal-700">
          <span className="group-open:hidden">{canEdit ? 'Show and edit' : 'Show'}</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>

      <form onSubmit={(event) => void handleSave(event)} className="border-t border-slate-100 px-6 pb-6 pt-4">
        <p className="text-sm text-slate-500">
          Days the clinic is closed look unavailable in the calendar and you&apos;re asked before
          booking on them. Treatment courses are only planned on open days, within these hours.
          {!canEdit && ' Only admins can change them.'}
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
            {notice}
          </p>
        )}

        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {WEEK_ORDER.map((weekday) => {
            const day = byWeekday.get(weekday)
            if (!day) return null
            const name = DAY_NAMES[weekday]!
            return (
              <li key={weekday} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className="w-28 font-semibold text-slate-800">{name}</span>
                {canEdit ? (
                  <>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={day.open}
                        onChange={(event) => update(weekday, { open: event.target.checked })}
                        className="h-4 w-4 accent-teal-600"
                      />
                      Open
                    </label>
                    {day.open ? (
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="time"
                          step={900}
                          required
                          aria-label={`${name} opens at`}
                          value={day.opensAt}
                          onChange={(event) => update(weekday, { opensAt: event.target.value })}
                          className={inputStyles}
                        />
                        to
                        <input
                          type="time"
                          step={900}
                          required
                          aria-label={`${name} closes at`}
                          value={day.closesAt}
                          onChange={(event) => update(weekday, { closesAt: event.target.value })}
                          className={inputStyles}
                        />
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">Closed</span>
                    )}
                  </>
                ) : (
                  <span className={`text-sm ${day.open ? 'text-slate-600' : 'text-slate-400'}`}>
                    {day.open ? `${day.opensAt}–${day.closesAt}` : 'Closed'}
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        {canEdit && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!draft || Boolean(problem) || isSaving}
              className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save hours'}
            </button>
            {draft && (
              <button
                type="button"
                onClick={() => {
                  setDraft(null)
                  setError(null)
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Discard changes
              </button>
            )}
            {problem && <span className="text-sm text-red-700">{problem}</span>}
          </div>
        )}
      </form>
    </details>
  )
}

function validate(days: DayHours[]) {
  if (!days.some((day) => day.open)) return 'The clinic must be open at least one day a week.'
  for (const weekday of WEEK_ORDER) {
    const day = days.find((entry) => entry.weekday === weekday)
    if (!day?.open) continue
    if (!day.opensAt || !day.closesAt) return `Enter both times for ${DAY_NAMES[weekday]}.`
    if (day.opensAt >= day.closesAt) {
      return `On ${DAY_NAMES[weekday]} the closing time must be after the opening time.`
    }
  }
  return null
}

const inputStyles =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
