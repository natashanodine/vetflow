import { describeTreatment } from '../lib/clinicCalendar'
import type { PlannedAppointment, Treatment } from '../types/schedule'

/** The dates a treatment course would get. */
export default function TreatmentPreview({
  treatment,
  preview,
  error,
  isLoading,
}: {
  treatment: Treatment
  preview: PlannedAppointment[] | null
  error: string | null
  isLoading: boolean
}) {
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

  return (
    <section
      aria-label="Treatment dates"
      aria-busy={isLoading}
      className="rounded-xl border border-teal-100 bg-teal-50/50 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold text-slate-900">{treatment.name}</h3>
        <span className="text-sm text-slate-600">{describeTreatment(treatment)}</span>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : !preview ? (
        <p className="mt-3 text-sm text-slate-500">Working out the dates…</p>
      ) : (
        <ol className={`mt-3 divide-y divide-teal-100 ${isLoading ? 'opacity-50' : ''}`}>
          {preview.map((item) => (
            <li key={item.stepNumber} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-teal-700 ring-1 ring-teal-100">
                {item.stepNumber}
              </span>
              <span className="min-w-40 flex-1 font-semibold text-slate-800">{item.name}</span>
              <span className="text-slate-700">
                {formatDate(item.startsAt)} · {formatTime(item.startsAt)}
              </span>
              {item.movedBecause && (
                <span className="basis-full pl-9 text-xs text-amber-700">
                  {item.movedBecause === 'weekend' || item.movedBecause === 'closed'
                    ? `Moved from ${formatDate(item.plannedFor)} (${item.movedBecause === 'weekend' ? 'weekend' : 'clinic closed'})`
                    : `Moved from ${formatDate(item.plannedFor)}, ${formatTime(item.plannedFor)} (that time is taken)`}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
