import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createTreatment,
  deleteTreatment,
  getTreatments,
  updateTreatment,
} from '../../api/schedule'
import { useCan } from '../../auth/hooks'
import { describeInterval } from '../../lib/clinicCalendar'
import type { IntervalUnit, Treatment, TreatmentInput } from '../../types/schedule'

const MAX_APPOINTMENTS = 52

interface StepDraft {
  name: string
  description: string
}

interface Draft {
  name: string
  description: string
  intervalValue: number
  intervalUnit: IntervalUnit
  steps: StepDraft[]
}

const emptyDraft: Draft = {
  name: '',
  description: '',
  intervalValue: 1,
  intervalUnit: 'WEEKS',
  steps: [{ name: '', description: '' }],
}

function draftFrom(treatment: Treatment): Draft {
  return {
    name: treatment.name,
    description: treatment.description ?? '',
    intervalValue: treatment.intervalValue,
    intervalUnit: treatment.intervalUnit,
    steps: treatment.steps.map((step) => ({
      name: step.name,
      description: step.description ?? '',
    })),
  }
}

function toInput(draft: Draft): TreatmentInput {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    intervalValue: draft.intervalValue,
    intervalUnit: draft.intervalUnit,
    steps: draft.steps.map((step) => ({
      name: step.name.trim(),
      description: step.description.trim(),
    })),
  }
}

export default function TreatmentsPage() {
  const canEdit = useCan('editRecords')
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** null = not editing; 'new' = creating; otherwise the treatment id. */
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    getTreatments()
      .then((data) => {
        if (isActive) setTreatments(data)
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load treatments')
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [])

  function saved(treatment: Treatment) {
    setTreatments((current) =>
      [...current.filter((item) => item.id !== treatment.id), treatment].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    )
    setEditing(null)
  }

  async function remove(treatmentId: string) {
    setError(null)
    try {
      await deleteTreatment(treatmentId)
      setTreatments((current) => current.filter((item) => item.id !== treatmentId))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete treatment')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const editingTreatment = treatments.find((item) => item.id === editing)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-semibold text-teal-600">Treatment plans</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Treatments</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Set up a course of appointments once, then book all of it from the{' '}
            <Link to="/app/agenda" className="font-semibold text-teal-700 hover:underline">
              agenda
            </Link>{' '}
            by choosing the treatment and its first date.
          </p>
        </div>
        {canEdit && editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
          >
            New treatment
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {editing !== null && (
        <TreatmentForm
          key={editing}
          initial={editingTreatment ? draftFrom(editingTreatment) : emptyDraft}
          isNew={editing === 'new'}
          onCancel={() => setEditing(null)}
          onSave={async (input) =>
            saved(
              editingTreatment
                ? await updateTreatment(editingTreatment.id, input)
                : await createTreatment(input),
            )
          }
        />
      )}

      {isLoading ? (
        <p className="text-slate-500">Loading treatments…</p>
      ) : treatments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No treatments yet.
          {canEdit ? ' Create one with “New treatment”.' : ' An admin or vet can add them.'}
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {treatments.map((treatment) => (
            <li
              key={treatment.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{treatment.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-teal-700">
                    {treatment.steps.length}{' '}
                    {treatment.steps.length === 1 ? 'appointment' : 'appointments'},{' '}
                    {describeInterval(treatment.intervalValue, treatment.intervalUnit)}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-2 text-sm">
                    {confirmDeleteId === treatment.id ? (
                      <>
                        <span className="py-1.5 text-slate-600">Delete?</span>
                        <button
                          type="button"
                          onClick={() => void remove(treatment.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
                        >
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(treatment.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(treatment.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-500 hover:border-red-200 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {treatment.description && (
                <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                  {treatment.description}
                </p>
              )}
              <ol className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {treatment.steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
                      {index + 1}
                    </span>
                    <span>
                      <span className="font-semibold text-slate-800">{step.name}</span>
                      {step.description && (
                        <span className="block whitespace-pre-line text-slate-500">
                          {step.description}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              {confirmDeleteId === treatment.id && (
                <p className="mt-3 text-xs text-slate-500">
                  Appointments already booked with this treatment stay in the agenda.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TreatmentForm({
  initial,
  isNew,
  onCancel,
  onSave,
}: {
  initial: Draft
  isNew: boolean
  onCancel: () => void
  onSave: (input: TreatmentInput) => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setCount(count: number) {
    const safeCount = Math.min(MAX_APPOINTMENTS, Math.max(1, Math.round(count) || 1))
    setDraft((current) => ({
      ...current,
      steps: Array.from(
        { length: safeCount },
        (_, index) => current.steps[index] ?? { name: '', description: '' },
      ),
    }))
  }

  function setStep(index: number, changes: Partial<StepDraft>) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...changes } : step,
      ),
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      await onSave(toInput(draft))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save treatment')
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-6 rounded-2xl border border-teal-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900">
          {isNew ? 'New treatment' : `Edit ${initial.name}`}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <fieldset disabled={isSaving} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Treatment name">
            <input
              name="name"
              required
              maxLength={120}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="e.g. Mare cycle monitoring"
              className={inputStyles}
            />
          </Field>
          <Field label="Description (optional)">
            <input
              name="description"
              maxLength={2000}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="What this treatment is for"
              className={inputStyles}
            />
          </Field>
          <Field label="Number of appointments">
            <input
              name="appointmentCount"
              type="number"
              min={1}
              max={MAX_APPOINTMENTS}
              required
              value={draft.steps.length}
              onChange={(event) => setCount(Number(event.target.value))}
              className={inputStyles}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              How often
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Every</span>
              <input
                name="intervalValue"
                type="number"
                min={1}
                max={365}
                required
                aria-label="Interval"
                value={draft.intervalValue}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    intervalValue: Math.min(365, Math.max(1, Math.round(Number(event.target.value)) || 1)),
                  })
                }
                className={`${inputStyles} w-24`}
              />
              <select
                name="intervalUnit"
                aria-label="Interval unit"
                value={draft.intervalUnit}
                onChange={(event) =>
                  setDraft({ ...draft, intervalUnit: event.target.value as IntervalUnit })
                }
                className={`${inputStyles} w-32`}
              >
                <option value="DAYS">{draft.intervalValue === 1 ? 'day' : 'days'}</option>
                <option value="WEEKS">{draft.intervalValue === 1 ? 'week' : 'weeks'}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-5">
          <h3 className="font-bold text-slate-900">Appointments</h3>
          <p className="text-sm text-slate-500">
            Weekend dates move to the nearest weekday, and clashes with booked appointments
            move to the next free slot. You&apos;ll see every date before booking.
          </p>
          <ol className="space-y-3">
            {draft.steps.map((step, index) => (
              <li key={index} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[2.5rem_1fr_1.5fr]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-teal-700 ring-1 ring-teal-100">
                  {index + 1}
                </span>
                <Field label={`Appointment ${index + 1} name`}>
                  <input
                    name={`step-${index}-name`}
                    required
                    maxLength={120}
                    value={step.name}
                    onChange={(event) => setStep(index, { name: event.target.value })}
                    placeholder={index === 0 ? 'e.g. Baseline scan' : 'e.g. Follow-up scan'}
                    className={inputStyles}
                  />
                </Field>
                <Field label="Description (optional)">
                  <textarea
                    name={`step-${index}-description`}
                    rows={1}
                    maxLength={2000}
                    value={step.description}
                    onChange={(event) => setStep(index, { description: event.target.value })}
                    placeholder="Preparation, what will be done"
                    className={inputStyles}
                  />
                </Field>
              </li>
            ))}
          </ol>
        </div>
      </fieldset>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-teal-600 px-5 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : isNew ? 'Create treatment' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-left">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
