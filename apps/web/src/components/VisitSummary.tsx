import { useEffect, useState } from 'react'
import { getMedicalRecords, getMedications } from '../api/clinic'
import { describeMedication } from '../lib/medications'
import type { MedicalRecord, Medication } from '../types/clinic'

/** What was recorded at a completed visit: notes, weight, temperature, medications. */
export default function VisitSummary({
  patientId,
  appointmentId,
}: {
  patientId: string
  appointmentId: string
}) {
  const [records, setRecords] = useState<MedicalRecord[] | null>(null)
  const [medications, setMedications] = useState<Medication[]>([])

  useEffect(() => {
    let isActive = true
    Promise.all([getMedicalRecords(patientId), getMedications(patientId)])
      .then(([allRecords, allMedications]) => {
        if (!isActive) return
        setRecords(allRecords.filter((record) => record.appointmentId === appointmentId))
        setMedications(
          allMedications.filter((medication) => medication.appointmentId === appointmentId),
        )
      })
      .catch(() => {
        if (isActive) setRecords([])
      })
    return () => {
      isActive = false
    }
  }, [patientId, appointmentId])

  if (records === null) {
    return <p className="mt-6 text-sm text-slate-500">Loading the visit notes…</p>
  }
  if (records.length === 0 && medications.length === 0) {
    return (
      <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        No visit notes were recorded for this appointment.
      </p>
    )
  }

  return (
    <section
      aria-label="Visit notes"
      className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Visit notes</p>
      {records.map((record) => (
        <div key={record.id} className="mt-3">
          {(record.weightKg !== null || record.temperatureC !== null) && (
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
              {record.weightKg !== null && (
                <Measure label="Weight" value={`${record.weightKg} kg`} />
              )}
              {record.temperatureC !== null && (
                <Measure label="Temperature" value={`${record.temperatureC} °C`} />
              )}
            </dl>
          )}
          {record.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{record.description}</p>
          )}
          {record.authorName && (
            <p className="mt-1 text-xs text-slate-500">Recorded by {record.authorName}</p>
          )}
        </div>
      ))}
      {medications.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-800">Medications started</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {medications.map((medication) => (
              <li key={medication.id}>
                <span className="font-semibold">{medication.name}</span>
                {describeMedication(medication)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Measure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-bold text-slate-900">{value}</dd>
    </div>
  )
}
