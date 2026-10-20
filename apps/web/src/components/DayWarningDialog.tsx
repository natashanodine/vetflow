import { useEffect } from 'react'
import { describeDayWarnings, formatDayKey, type DayWarnings } from '../lib/clinicCalendar'

/** Asks before booking on a past, weekend or closed day. */
export default function DayWarningDialog({
  dateKey,
  warnings,
  onCancel,
  onContinue,
}: {
  dateKey: string
  warnings: DayWarnings
  onCancel: () => void
  onContinue: () => void
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  const title = warnings.isPastDay
    ? 'Add an appointment in the past?'
    : 'Add an appointment on a closed day?'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="day-warning-title"
        aria-describedby="day-warning-text"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <p className="text-sm font-semibold text-amber-700">{formatDayKey(dateKey)}</p>
        <h2 id="day-warning-title" className="mt-1 text-xl font-bold text-slate-900">
          {title}
        </h2>
        <div id="day-warning-text" className="mt-3 space-y-2 text-slate-600">
          {describeDayWarnings(dateKey, warnings).map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
          <p>Are you sure you want to add an appointment on this date?</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={onContinue}
            className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
          >
            Yes, add appointment
          </button>
        </div>
      </section>
    </div>
  )
}
