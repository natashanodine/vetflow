import { useEffect, useState } from 'react'
import { createMedication, deleteMedication, getMedications, updateMedication } from '../api/clinic'
import { useCan } from '../auth/hooks'
import { todayKey } from '../lib/clinicCalendar'
import { formatShortDate } from '../lib/medications'
import type { Medication } from '../types/clinic'

type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; medication: Medication }

/** A patient's current and past medications. */
export default function MedicationsPanel({
  patientId,
  onActiveCountChange,
}: {
  patientId: string
  /** Lets the page show an "On medication" badge. */
  onActiveCountChange?: (count: number) => void
}) {
  const canEdit = useCan('editRecords')
  const [medications, setMedications] = useState<Medication[] | null>(null)
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })
  const [showPast, setShowPast] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    getMedications(patientId)
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
  }, [patientId])

  const current = (medications ?? []).filter((medication) => medication.isActive)
  const past = (medications ?? []).filter((medication) => !medication.isActive)

  useEffect(() => {
    if (medications) onActiveCountChange?.(current.length)
  }, [medications, current.length, onActiveCountChange])

  function replace(updated: Medication) {
    setMedications((list) => {
      const others = (list ?? []).filter((medication) => medication.id !== updated.id)
      return [updated, ...others].sort(
        (a, b) => Number(b.isActive) - Number(a.isActive) || b.startDate.localeCompare(a.startDate),
      )
    })
  }

  async function stop(medication: Medication) {
    setError(null)
    try {
      replace(await updateMedication(medication.id, { stoppedOn: todayKey() }))
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Unable to stop the medication')
    }
  }

  async function remove(medicationId: string) {
    setError(null)
    try {
      await deleteMedication(medicationId)
      setMedications((list) => (list ?? []).filter((medication) => medication.id !== medicationId))
      setPendingDeleteId(null)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Unable to delete the medication',
      )
    }
  }

  return (
    <section
      aria-labelledby="medications-title"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="medications-title" className="text-lg font-bold text-slate-900">
            Medications
          </h2>
          <p className="text-sm text-slate-500">
            {medications === null
              ? 'Loading…'
              : current.length === 0
                ? 'Not on any medication.'
                : `${current.length} current ${current.length === 1 ? 'medication' : 'medications'}`}
          </p>
        </div>
        {canEdit && editor.mode === 'closed' && (
          <button
            type="button"
            onClick={() => setEditor({ mode: 'new' })}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Add medication
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {editor.mode !== 'closed' && (
        <MedicationEditor
          key={editor.mode === 'edit' ? editor.medication.id : 'new'}
          medication={editor.mode === 'edit' ? editor.medication : null}
          onCancel={() => setEditor({ mode: 'closed' })}
          onSave={async (input) => {
            const saved =
              editor.mode === 'edit'
                ? await updateMedication(editor.medication.id, input)
                : await createMedication(patientId, input)
            replace(saved)
            setEditor({ mode: 'closed' })
          }}
        />
      )}

      {current.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-teal-100 bg-teal-50/30">
          {current.map((medication) => (
            <MedicationItem
              key={medication.id}
              medication={medication}
              canEdit={canEdit}
              isConfirmingDelete={pendingDeleteId === medication.id}
              onEdit={() => setEditor({ mode: 'edit', medication })}
              onStop={() => void stop(medication)}
              onAskDelete={() => setPendingDeleteId(medication.id)}
              onCancelDelete={() => setPendingDeleteId(null)}
              onDelete={() => void remove(medication.id)}
            />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowPast((value) => !value)}
            className="text-sm font-semibold text-teal-700 hover:underline"
          >
            {showPast ? 'Hide past medications' : `Show past medications (${past.length})`}
          </button>
          {showPast && (
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {past.map((medication) => (
                <MedicationItem
                  key={medication.id}
                  medication={medication}
                  canEdit={canEdit}
                  isConfirmingDelete={pendingDeleteId === medication.id}
                  onEdit={() => setEditor({ mode: 'edit', medication })}
                  onAskDelete={() => setPendingDeleteId(medication.id)}
                  onCancelDelete={() => setPendingDeleteId(null)}
                  onDelete={() => void remove(medication.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function MedicationItem({
  medication,
  canEdit,
  isConfirmingDelete,
  onEdit,
  onStop,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  medication: Medication
  canEdit: boolean
  isConfirmingDelete: boolean
  onEdit: () => void
  onStop?: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}) {
  const period = medication.stoppedOn
    ? `${formatShortDate(medication.startDate)} – stopped ${formatShortDate(medication.stoppedOn)}`
    : medication.endDate
      ? `${formatShortDate(medication.startDate)} – ${formatShortDate(medication.endDate)}`
      : `Since ${formatShortDate(medication.startDate)} · ongoing`

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {medication.name}
            {(medication.dose || medication.frequency) && (
              <span className="font-normal text-slate-600">
                {' '}
                · {[medication.dose, medication.frequency].filter(Boolean).join(' · ')}
              </span>
            )}
          </p>
          <p className="text-sm text-slate-500">
            {period}
            {medication.prescribedByName && ` · ${medication.prescribedByName}`}
          </p>
          {medication.instructions && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
              {medication.instructions}
            </p>
          )}
        </div>
        {canEdit && !isConfirmingDelete && (
          <div className="flex flex-wrap gap-2">
            {onStop && (
              <button
                type="button"
                onClick={onStop}
                aria-label={`Stop ${medication.name}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${medication.name}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onAskDelete}
              aria-label={`Delete ${medication.name}`}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {isConfirmingDelete && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-red-800">
            Delete this entry? Use Stop instead to keep it in the history.
          </span>
          <button
            type="button"
            onClick={onCancelDelete}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  )
}

function MedicationEditor({
  medication,
  onCancel,
  onSave,
}: {
  medication: Medication | null
  onCancel: () => void
  onSave: (input: {
    name: string
    dose: string | null
    frequency: string | null
    instructions: string | null
    startDate: string
    endDate: string | null
    stoppedOn?: string | null
  }) => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '').trim()
    const startDate = text('startDate')
    const endDate = text('endDate')
    if (endDate && endDate < startDate) {
      setError('The end date must be on or after the start date.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave({
        name: text('name'),
        dose: text('dose') || null,
        frequency: text('frequency') || null,
        instructions: text('instructions') || null,
        startDate,
        endDate: endDate || null,
        // Editing a stopped one: clearing "Stopped on" restarts it.
        ...(medication?.stoppedOn ? { stoppedOn: text('stoppedOn') || null } : {}),
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the medication')
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={(formEvent) => void handleSubmit(formEvent)}
      className="mt-4 rounded-xl border border-teal-200 bg-white p-4"
    >
      <p className="font-semibold text-slate-900">
        {medication ? 'Edit medication' : 'New medication'}
      </p>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Medication">
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={medication?.name ?? ''}
            placeholder="e.g. Omeprazole"
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Dose">
          <input
            name="dose"
            maxLength={120}
            defaultValue={medication?.dose ?? ''}
            placeholder="e.g. 4 mg/kg"
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="How often">
          <input
            name="frequency"
            maxLength={120}
            defaultValue={medication?.frequency ?? ''}
            placeholder="e.g. Once a day"
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Start">
          <input
            name="startDate"
            type="date"
            required
            defaultValue={medication?.startDate ?? todayKey()}
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Until (empty if ongoing)">
          <input
            name="endDate"
            type="date"
            defaultValue={medication?.endDate ?? ''}
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        {medication?.stoppedOn && (
          <Field label="Stopped on (clear to restart)">
            <input
              name="stoppedOn"
              type="date"
              defaultValue={medication.stoppedOn}
              disabled={isSaving}
              className={inputStyles}
            />
          </Field>
        )}
      </div>
      <div className="mt-3">
        <Field label="Instructions (optional)">
          <textarea
            name="instructions"
            rows={2}
            maxLength={2000}
            defaultValue={medication?.instructions ?? ''}
            placeholder="e.g. Give with food"
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save medication'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100'
