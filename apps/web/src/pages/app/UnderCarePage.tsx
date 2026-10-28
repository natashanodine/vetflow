import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveMedications } from '../../api/clinic'
import { getAppointments } from '../../api/schedule'
import AppointmentDetailsModal from '../../components/AppointmentDetailsModal'
import {
  addDays,
  appointmentToCalendarEvent,
  fromDateKey,
  toDateKey,
} from '../../data/calendarEvents'
import { describeMedication } from '../../lib/medications'
import { patientsInTreatment, stepName } from '../../lib/underCare'
import type { ActiveMedication } from '../../types/clinic'
import type { Appointment } from '../../types/schedule'

/** Treatment courses can run for months; look this far back and ahead for their appointments. */
const LOOK_BACK_DAYS = 90
const LOOK_AHEAD_DAYS = 180
/** Single treatment appointments (not part of a course) count when they're this soon. */
const SINGLE_TREATMENT_DAYS = 30

/** Every horse currently being cared for: treatment courses first, then medication. */
export default function UnderCarePage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [medications, setMedications] = useState<ActiveMedication[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let isActive = true
    const today = fromDateKey(toDateKey(new Date()))
    getAppointments({ from: addDays(today, -LOOK_BACK_DAYS), to: addDays(today, LOOK_AHEAD_DAYS) })
      .then((data) => {
        if (isActive) setAppointments(data)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setAppointments([])
        setError(loadError instanceof Error ? loadError.message : 'Unable to load appointments')
      })
    getActiveMedications()
      .then((data) => {
        if (isActive) setMedications(data)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setMedications([])
        setError(loadError instanceof Error ? loadError.message : 'Unable to load medications')
      })
    return () => {
      isActive = false
    }
  }, [])

  const singleTreatmentEnd = toDateKey(addDays(new Date(now), SINGLE_TREATMENT_DAYS))
  const inTreatment = appointments ? patientsInTreatment(appointments, now, singleTreatmentEnd) : []

  // Each horse on medication, with its current medications.
  const onMedication = useMemo(() => {
    const byPatient = new Map<
      string,
      { patientId: string; patientName: string; items: ActiveMedication[] }
    >()
    for (const medication of medications ?? []) {
      const entry = byPatient.get(medication.patientId) ?? {
        patientId: medication.patientId,
        patientName: medication.patientName,
        items: [],
      }
      entry.items.push(medication)
      byPatient.set(medication.patientId, entry)
    }
    return [...byPatient.values()].sort((a, b) => a.patientName.localeCompare(b.patientName))
  }, [medications])

  const selectedAppointment = appointments?.find((appointment) => appointment.id === selectedId)

  return (
    <div className="space-y-8">
      <section>
        <p className="font-semibold text-teal-600">Patients</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Under care</h1>
        <p className="mt-2 text-slate-500">
          Horses with a treatment in progress, and horses currently on medication.
        </p>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          Some information could not be loaded: {error}.
        </p>
      )}

      <section
        aria-labelledby="under-treatment-title"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="under-treatment-title" className="text-lg font-bold text-slate-900">
            Under treatment
          </h2>
          {appointments && (
            <span className="text-sm text-slate-500">
              {inTreatment.length} {inTreatment.length === 1 ? 'treatment' : 'treatments'} in
              progress
            </span>
          )}
        </div>
        {appointments === null ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : inTreatment.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No treatments in progress.</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {inTreatment.map((entry) => (
              <li key={entry.key} className="rounded-xl border border-rose-100 bg-rose-50/30 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    to={`/app/patients/${entry.patientId}`}
                    className="text-lg font-bold text-slate-900 hover:text-teal-700"
                  >
                    {entry.patientName}
                  </Link>
                  {entry.stepCount > 1 && (
                    <span className="text-xs font-semibold text-slate-500">
                      {entry.done} of {entry.stepCount} done
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-700">{entry.name}</p>
                {entry.stepCount > 1 && (
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"
                    role="progressbar"
                    aria-label={`${entry.patientName}: ${entry.name}`}
                    aria-valuemin={0}
                    aria-valuemax={entry.stepCount}
                    aria-valuenow={entry.done}
                  >
                    <div
                      className="h-full rounded-full bg-rose-400"
                      style={{ width: `${(entry.done / entry.stepCount) * 100}%` }}
                    />
                  </div>
                )}
                {entry.next && (
                  <button
                    type="button"
                    onClick={() => setSelectedId(entry.next!.id)}
                    className="mt-3 block w-full rounded-lg bg-white px-3 py-2 text-left text-sm ring-1 ring-rose-100 hover:ring-teal-300"
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Next
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatDateTime(entry.next.startsAt)}
                    </span>
                    {entry.next.treatment && (
                      <span className="text-slate-600"> · {stepName(entry.next)}</span>
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="under-medication-title"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="under-medication-title" className="text-lg font-bold text-slate-900">
            Under medication
          </h2>
          {medications && (
            <span className="text-sm text-slate-500">
              {onMedication.length} {onMedication.length === 1 ? 'horse' : 'horses'}
            </span>
          )}
        </div>
        {medications === null ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : onMedication.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No horses are on medication.</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {onMedication.map((patient) => (
              <li key={patient.patientId} className="rounded-xl border border-slate-200 p-4">
                <Link
                  to={`/app/patients/${patient.patientId}`}
                  className="text-lg font-bold text-slate-900 hover:text-teal-700"
                >
                  {patient.patientName}
                </Link>
                <ul className="mt-2 space-y-2">
                  {patient.items.map((medication) => (
                    <li key={medication.id} className="text-sm">
                      <span className="font-semibold text-slate-800">{medication.name}</span>
                      <span className="text-slate-600">{describeMedication(medication)}</span>
                      {medication.instructions && (
                        <span className="block text-xs text-slate-500">
                          {medication.instructions}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedAppointment && (
        <AppointmentDetailsModal
          key={selectedAppointment.id}
          event={appointmentToCalendarEvent(selectedAppointment)}
          appointment={selectedAppointment}
          onClose={() => setSelectedId(null)}
          onDeleted={(deletedIds) => {
            setAppointments((current) =>
              (current ?? []).filter((appointment) => !deletedIds.includes(appointment.id)),
            )
            setSelectedId(null)
          }}
          onBooked={(booked) => setAppointments((current) => [...(current ?? []), ...booked])}
          onUpdated={(updated) => {
            setAppointments((current) =>
              (current ?? []).map((appointment) =>
                appointment.id === updated.id ? updated : appointment,
              ),
            )
            // Completing a visit may have started medications.
            if (updated.status === 'COMPLETED') {
              getActiveMedications()
                .then(setMedications)
                .catch(() => undefined)
            }
          }}
        />
      )}
    </div>
  )
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}
