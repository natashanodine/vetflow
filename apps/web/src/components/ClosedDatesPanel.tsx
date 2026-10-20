import { useState } from 'react'
import { reopenDay, setClosedDay } from '../api/schedule'
import { useCan } from '../auth/hooks'
import { formatDayKey, todayKey } from '../lib/clinicCalendar'
import type { ClosedDay } from '../types/schedule'

/** Holidays and other dates the clinic is closed, under the agenda calendar. */
export default function ClosedDatesPanel({
  closedDays,
  onChange,
}: {
  closedDays: ClosedDay[]
  onChange: (closedDays: ClosedDay[]) => void
}) {
  const canEdit = useCan('editRecords')
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const today = todayKey()
  const visible = closedDays.filter((day) => showPast || day.date >= today)
  const pastCount = closedDays.filter((day) => day.date < today).length

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!date) return
    setIsSaving(true)
    setError(null)
    setNotice(null)
    try {
      const saved = await setClosedDay(date, reason.trim())
      onChange(
        [...closedDays.filter((day) => day.date !== saved.date), { date: saved.date, reason: saved.reason }].sort(
          (a, b) => a.date.localeCompare(b.date),
        ),
      )
      if (saved.appointmentsThatDay > 0) {
        setNotice(
          `${saved.appointmentsThatDay} ${saved.appointmentsThatDay === 1 ? 'appointment is' : 'appointments are'} already booked on ${formatDayKey(saved.date)}. Move or cancel ${saved.appointmentsThatDay === 1 ? 'it' : 'them'} if needed.`,
        )
      }
      setDate('')
      setReason('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to close that date')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReopen(dateKey: string) {
    setError(null)
    setNotice(null)
    try {
      await reopenDay(dateKey)
      onChange(closedDays.filter((day) => day.date !== dateKey))
    } catch (reopenError) {
      setError(reopenError instanceof Error ? reopenError.message : 'Unable to reopen that date')
    }
  }

  return (
    <section
      aria-labelledby="closed-dates-title"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="closed-dates-title" className="text-lg font-bold text-slate-900">
          Closed dates
        </h2>
        {pastCount > 0 && (
          <button
            type="button"
            onClick={() => setShowPast((current) => !current)}
            className="text-sm font-semibold text-teal-700 hover:underline"
          >
            {showPast ? 'Hide past dates' : `Show past dates (${pastCount})`}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Holidays and other days the clinic is closed. They look unavailable in the calendar,
        treatment courses skip them, and you&apos;re asked before booking on one.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {notice}
        </p>
      )}

      {canEdit && (
        <form onSubmit={(event) => void handleAdd(event)} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Date</span>
            <input
              name="closedDate"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputStyles}
            />
          </label>
          <label className="block min-w-56 flex-1 space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">
              Reason <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              name="closedReason"
              maxLength={120}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Christmas Day"
              className={inputStyles}
            />
          </label>
          <button
            type="submit"
            disabled={isSaving || !date}
            className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Close this date'}
          </button>
        </form>
      )}

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No upcoming closed dates.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {visible.map((day) => (
            <li key={day.date} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span>
                <span className="font-semibold text-slate-800">{formatDayKey(day.date)}</span>
                {day.reason && <span className="text-slate-500"> · {day.reason}</span>}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void handleReopen(day.date)}
                  aria-label={`Reopen ${formatDayKey(day.date)}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Reopen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
