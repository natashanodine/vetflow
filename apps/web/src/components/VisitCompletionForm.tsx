import { useEffect, useRef, useState } from 'react'
import { createMedicalRecord, createMedication, getPatientById } from '../api/clinic'
import { bookTreatment, getTreatments, previewTreatment, updateAppointment } from '../api/schedule'
import { todayKey } from '../lib/clinicCalendar'
import type { Appointment, PlannedAppointment, Treatment } from '../types/schedule'
import AttachmentsPanel from './AttachmentsPanel'
import TreatmentPreview from './TreatmentPreview'

interface MedicationRow {
  key: number
  name: string
  dose: string
  frequency: string
  startDate: string
  endDate: string
}

interface VisitCompletionFormProps {
  appointment: Appointment
  onCancel: () => void
  /** The appointment, now completed, and any treatment appointments booked. */
  onCompleted: (appointment: Appointment, booked: Appointment[]) => void
}

/**
 * Shown after "Mark as done": what happened at the visit. Everything is
 * optional; saving writes a medical history entry, the medications started,
 * an optional treatment course, and marks the appointment completed.
 */
export default function VisitCompletionForm({
  appointment,
  onCancel,
  onCompleted,
}: VisitCompletionFormProps) {
  const visitDate = localDateKey(new Date(appointment.startsAt))
  // Medical history can't be dated in the future (marking a later visit done early).
  const recordDate = visitDate > todayKey() ? todayKey() : visitDate

  const [weight, setWeight] = useState('')
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [temperature, setTemperature] = useState('')
  const [notes, setNotes] = useState('')
  const [medications, setMedications] = useState<MedicationRow[]>([])
  const nextKey = useRef(1)

  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [treatmentId, setTreatmentId] = useState('')
  const [courseDate, setCourseDate] = useState(() =>
    localDateKey(addDays(new Date(appointment.startsAt), 1)),
  )
  const [courseTime, setCourseTime] = useState(() => localTime(new Date(appointment.startsAt)))
  const [preview, setPreview] = useState<PlannedAppointment[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [step, setStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** What already saved, so trying again after an error doesn't repeat it. */
  const saved = useRef({
    record: false,
    medications: new Set<number>(),
    booked: null as Appointment[] | null,
  })

  const selectedTreatment = treatments.find((treatment) => treatment.id === treatmentId)

  useEffect(() => {
    let isActive = true
    getPatientById(appointment.patientId)
      .then((patient) => {
        if (isActive) setCurrentWeight(patient.weightKg)
      })
      .catch(() => undefined)
    getTreatments()
      .then((data) => {
        if (isActive) setTreatments(data)
      })
      .catch(() => undefined)
    return () => {
      isActive = false
    }
  }, [appointment.patientId])

  // The dates the treatment course would get.
  useEffect(() => {
    if (!treatmentId || !courseDate || !courseTime) return
    let isActive = true
    const timer = setTimeout(() => {
      setIsPreviewing(true)
      previewTreatment(treatmentId, {
        startsAt: new Date(`${courseDate}T${courseTime}:00`).toISOString(),
        durationMinutes: appointment.durationMinutes,
        patientId: appointment.patientId,
      })
        .then((result) => {
          if (!isActive) return
          setPreview(result.appointments)
          setPreviewError(null)
        })
        .catch((loadError: unknown) => {
          if (!isActive) return
          setPreview(null)
          setPreviewError(
            loadError instanceof Error ? loadError.message : 'Unable to plan the dates',
          )
        })
        .finally(() => {
          if (isActive) setIsPreviewing(false)
        })
    }, 350)
    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [treatmentId, courseDate, courseTime, appointment.durationMinutes, appointment.patientId])

  function addMedication() {
    setMedications((current) => [
      ...current,
      {
        key: nextKey.current++,
        name: '',
        dose: '',
        frequency: '',
        startDate: recordDate,
        endDate: '',
      },
    ])
  }

  function changeMedication(key: number, change: Partial<MedicationRow>) {
    setMedications((current) =>
      current.map((row) => (row.key === key ? { ...row, ...change } : row)),
    )
  }

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const filledMedications = medications.filter((row) => row.name.trim())
    const badDates = filledMedications.find((row) => row.endDate && row.endDate < row.startDate)
    if (badDates) {
      setError(`${badDates.name}: the end date must be on or after the start date.`)
      return
    }
    if (treatmentId && previewError) {
      setError('Choose another start for the treatment course, or remove it.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const weightKg = weight ? Number(weight) : null
      const temperatureC = temperature ? Number(temperature) : null
      if (!saved.current.record && (weightKg !== null || temperatureC !== null || notes.trim())) {
        setStep('Saving the visit notes…')
        await createMedicalRecord(appointment.patientId, {
          type: 'EXAMINATION',
          recordedAt: recordDate,
          title: appointment.title,
          description: notes.trim(),
          weightKg,
          temperatureC,
          appointmentId: appointment.id,
        })
        saved.current.record = true
      }

      for (const row of filledMedications) {
        if (saved.current.medications.has(row.key)) continue
        setStep(`Adding ${row.name.trim()}…`)
        await createMedication(appointment.patientId, {
          name: row.name.trim(),
          dose: row.dose.trim() || null,
          frequency: row.frequency.trim() || null,
          startDate: row.startDate,
          endDate: row.endDate || null,
          appointmentId: appointment.id,
        })
        saved.current.medications.add(row.key)
      }

      if (treatmentId && !saved.current.booked) {
        setStep('Booking the treatment course…')
        const result = await bookTreatment(treatmentId, {
          patientId: appointment.patientId,
          startsAt: new Date(`${courseDate}T${courseTime}:00`).toISOString(),
          durationMinutes: appointment.durationMinutes,
        })
        saved.current.booked = result.appointments
      }

      setStep('Marking as done…')
      const completed = await updateAppointment(appointment.id, { status: 'COMPLETED' })
      onCompleted(completed, saved.current.booked ?? [])
    } catch (saveError) {
      setError(
        `${saveError instanceof Error ? saveError.message : 'Something went wrong'}. ` +
          'Anything already saved won’t be saved twice if you try again.',
      )
      setIsSaving(false)
      setStep(null)
    }
  }

  return (
    <div className="space-y-6">
      <form
        id="visit-completion-form"
        onSubmit={(formEvent) => void handleSubmit(formEvent)}
        className="space-y-6"
      >
        <div>
          <h3 className="text-lg font-bold text-slate-900">Visit notes</h3>
          <p className="text-sm text-slate-500">
            Everything here is optional. It&apos;s saved to {appointment.patientName}&apos;s medical
            history and the appointment is marked as done.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Weight (kg)"
            hint={currentWeight !== null ? `Last recorded: ${currentWeight} kg` : undefined}
          >
            <input
              name="visitWeight"
              type="number"
              min={0}
              max={2000}
              step="0.1"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              disabled={isSaving}
              className={inputStyles}
            />
          </Field>
          <Field label="Temperature (°C)" hint="Normal for an adult horse: 37.5–38.5 °C">
            <input
              name="visitTemperature"
              type="number"
              min={20}
              max={50}
              step="0.1"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              disabled={isSaving}
              className={inputStyles}
            />
          </Field>
        </div>

        <Field label="Findings and notes">
          <textarea
            name="visitNotes"
            rows={4}
            maxLength={20000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSaving}
            placeholder="What was examined, found and done"
            className={inputStyles}
          />
        </Field>

        <section aria-labelledby="visit-medications-title" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 id="visit-medications-title" className="font-bold text-slate-900">
              Medications started
            </h4>
            <button
              type="button"
              onClick={addMedication}
              disabled={isSaving}
              className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              + Add medication
            </button>
          </div>
          {medications.length === 0 ? (
            <p className="text-sm text-slate-500">None.</p>
          ) : (
            <ul className="space-y-3">
              {medications.map((row, index) => (
                <li key={row.key} className="rounded-xl border border-slate-200 p-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Medication">
                      <input
                        required
                        maxLength={120}
                        aria-label={`Medication ${index + 1} name`}
                        value={row.name}
                        onChange={(event) =>
                          changeMedication(row.key, { name: event.target.value })
                        }
                        disabled={isSaving}
                        placeholder="e.g. Phenylbutazone"
                        className={inputStyles}
                      />
                    </Field>
                    <Field label="Dose">
                      <input
                        maxLength={120}
                        aria-label={`Medication ${index + 1} dose`}
                        value={row.dose}
                        onChange={(event) =>
                          changeMedication(row.key, { dose: event.target.value })
                        }
                        disabled={isSaving}
                        placeholder="e.g. 2 g"
                        className={inputStyles}
                      />
                    </Field>
                    <Field label="How often">
                      <input
                        maxLength={120}
                        aria-label={`Medication ${index + 1} frequency`}
                        value={row.frequency}
                        onChange={(event) =>
                          changeMedication(row.key, { frequency: event.target.value })
                        }
                        disabled={isSaving}
                        placeholder="e.g. Twice a day"
                        className={inputStyles}
                      />
                    </Field>
                    <Field label="Start">
                      <input
                        type="date"
                        required
                        value={row.startDate}
                        onChange={(event) =>
                          changeMedication(row.key, { startDate: event.target.value })
                        }
                        disabled={isSaving}
                        className={inputStyles}
                      />
                    </Field>
                    <Field label="Until" hint="Leave empty if ongoing">
                      <input
                        type="date"
                        min={row.startDate}
                        aria-label={`Medication ${index + 1} end date`}
                        value={row.endDate}
                        onChange={(event) =>
                          changeMedication(row.key, { endDate: event.target.value })
                        }
                        disabled={isSaving}
                        className={inputStyles}
                      />
                    </Field>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() =>
                          setMedications((current) =>
                            current.filter((entry) => entry.key !== row.key),
                          )
                        }
                        disabled={isSaving}
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="visit-treatment-title" className="space-y-3">
          <h4 id="visit-treatment-title" className="font-bold text-slate-900">
            Start a treatment course
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Treatment plan">
              <select
                name="visitTreatment"
                value={treatmentId}
                onChange={(event) => {
                  setTreatmentId(event.target.value)
                  setPreview(null)
                  setPreviewError(null)
                }}
                disabled={isSaving}
                className={inputStyles}
              >
                <option value="">No treatment course</option>
                {treatments.map((treatment) => (
                  <option key={treatment.id} value={treatment.id}>
                    {treatment.name}
                  </option>
                ))}
              </select>
            </Field>
            {treatmentId && (
              <>
                <Field label="First appointment">
                  <input
                    type="date"
                    required
                    value={courseDate}
                    onChange={(event) => setCourseDate(event.target.value)}
                    disabled={isSaving}
                    className={inputStyles}
                  />
                </Field>
                <Field label="Time">
                  <input
                    type="time"
                    required
                    value={courseTime}
                    onChange={(event) => setCourseTime(event.target.value)}
                    disabled={isSaving}
                    className={inputStyles}
                  />
                </Field>
              </>
            )}
          </div>
          {treatments.length === 0 && (
            <p className="text-sm text-slate-500">
              No treatment plans yet. Add them on the Treatments page.
            </p>
          )}
          {selectedTreatment && (
            <TreatmentPreview
              treatment={selectedTreatment}
              preview={preview}
              error={previewError}
              isLoading={isPreviewing}
            />
          )}
        </section>
      </form>

      <AttachmentsPanel
        patientId={appointment.patientId}
        appointmentId={appointment.id}
        title="Test results and images"
        compact
      />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
        {step && <span className="mr-auto text-sm text-slate-500">{step}</span>}
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="visit-completion-form"
          disabled={isSaving}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save and mark as done'}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string | undefined
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5 text-left">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function localTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100'
