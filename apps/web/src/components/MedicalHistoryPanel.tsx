import { useEffect, useState } from 'react'
import {
  createMedicalRecord,
  deleteMedicalRecord,
  getMedicalRecords,
  updateMedicalRecord,
} from '../api/clinic'
import type {
  MedicalRecord,
  MedicalRecordInput,
  MedicalRecordType,
} from '../types/clinic'
import type { Appointment } from '../types/schedule'
import { useCan } from './ViewerProvider'

const recordTypes: { value: MedicalRecordType; label: string }[] = [
  { value: 'EXAMINATION', label: 'Examination' },
  { value: 'DIAGNOSIS', label: 'Diagnosis' },
  { value: 'TREATMENT', label: 'Treatment' },
  { value: 'VACCINATION', label: 'Vaccination' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'LAB_RESULT', label: 'Lab result' },
  { value: 'NOTE', label: 'Note' },
]

const typeStyles: Record<MedicalRecordType, { badge: string; dot: string }> = {
  EXAMINATION: { badge: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500' },
  DIAGNOSIS: { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  TREATMENT: { badge: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500' },
  VACCINATION: { badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  PROCEDURE: { badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500' },
  LAB_RESULT: { badge: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500' },
  NOTE: { badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
}

interface MedicalHistoryPanelProps {
  patientId: string
  appointments?: Appointment[]
}

type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; record: MedicalRecord }

export default function MedicalHistoryPanel({
  patientId,
  appointments = [],
}: MedicalHistoryPanelProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })
  const [typeFilter, setTypeFilter] = useState<MedicalRecordType | 'ALL'>('ALL')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const canEdit = useCan('editRecords')

  useEffect(() => {
    let isActive = true

    getMedicalRecords(patientId)
      .then((data) => {
        if (isActive) setRecords(data)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load the medical history',
        )
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [patientId])

  function upsertRecord(saved: MedicalRecord) {
    setRecords((current) =>
      [saved, ...current.filter((record) => record.id !== saved.id)].sort(
        (left, right) =>
          right.recordedAt.localeCompare(left.recordedAt) ||
          right.createdAt.localeCompare(left.createdAt),
      ),
    )
    setEditor({ mode: 'closed' })
  }

  async function handleDelete(recordId: string) {
    setError(null)
    try {
      await deleteMedicalRecord(recordId)
      setRecords((current) => current.filter((record) => record.id !== recordId))
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete the entry',
      )
    } finally {
      setPendingDeleteId(null)
    }
  }

  const appointmentsById = new Map(
    appointments.map((appointment) => [appointment.id, appointment]),
  )

  const visibleRecords =
    typeFilter === 'ALL'
      ? records
      : records.filter((record) => record.type === typeFilter)
  const latestWeight = records.find((record) => record.weightKg !== null)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Medical history</h2>
          <p className="mt-1 text-sm text-slate-500">
            Examinations, diagnoses, treatments, vaccinations and notes.
            {latestWeight?.weightKg != null &&
              ` Last recorded weight: ${formatNumber(latestWeight.weightKg)} kg (${formatDate(latestWeight.recordedAt)}).`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {records.length > 0 && (
            <label>
              <span className="sr-only">Filter by type</span>
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as MedicalRecordType | 'ALL')
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="ALL">All entries</option>
                {recordTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setError(null)
                setEditor((current) =>
                  current.mode === 'new' ? { mode: 'closed' } : { mode: 'new' },
                )
              }}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {editor.mode === 'new' ? 'Cancel' : 'Add entry'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {editor.mode === 'new' && (
        <RecordForm
          appointments={appointments}
          onCancel={() => setEditor({ mode: 'closed' })}
          onSubmit={async (input) => {
            upsertRecord(await createMedicalRecord(patientId, input))
          }}
        />
      )}

      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading medical history…</p>
        ) : records.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            No medical history recorded yet.
            {canEdit &&
              ' Use “Add entry” after each examination, treatment or vaccination.'}
          </p>
        ) : visibleRecords.length === 0 ? (
          <p className="text-sm text-slate-500">No entries of this type.</p>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
            {visibleRecords.map((record) =>
              editor.mode === 'edit' && editor.record.id === record.id ? (
                <li key={record.id}>
                  <RecordForm
                    record={record}
                    appointments={appointments}
                    onCancel={() => setEditor({ mode: 'closed' })}
                    onSubmit={async (input) => {
                      upsertRecord(await updateMedicalRecord(record.id, input))
                    }}
                  />
                </li>
              ) : (
                <li key={record.id} className="relative">
                  <span
                    className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${typeStyles[record.type].dot}`}
                  />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-teal-700">
                        {formatDate(record.recordedAt)}
                      </p>
                      <h3 className="mt-0.5 font-bold text-slate-900">
                        {record.title}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeStyles[record.type].badge}`}
                    >
                      {typeLabel(record.type)}
                    </span>
                  </div>

                  {(record.weightKg !== null || record.temperatureC !== null) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      {record.weightKg !== null && (
                        <span className="rounded-md bg-slate-100 px-2 py-1">
                          Weight {formatNumber(record.weightKg)} kg
                        </span>
                      )}
                      {record.temperatureC !== null && (
                        <span className="rounded-md bg-slate-100 px-2 py-1">
                          Temp {formatNumber(record.temperatureC)} °C
                        </span>
                      )}
                    </div>
                  )}

                  {record.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {record.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {record.authorName && <span>By {record.authorName}</span>}
                    {record.appointmentId &&
                      appointmentsById.has(record.appointmentId) && (
                        <span className="font-medium text-teal-700">
                          {formatDate(
                            appointmentsById.get(record.appointmentId)!.startsAt,
                          )}{' '}
                          · {appointmentsById.get(record.appointmentId)!.title}
                        </span>
                      )}
                    {!canEdit ? null : pendingDeleteId === record.id ? (
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="text-slate-600">Delete this entry?</span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(record.id)}
                          className="text-red-700 hover:underline"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="hover:underline"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null)
                            setEditor({ mode: 'edit', record })
                          }}
                          className="text-teal-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(record.id)}
                          className="hover:text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ),
            )}
          </ol>
        )}
      </div>
    </section>
  )
}

function RecordForm({
  record,
  appointments,
  onCancel,
  onSubmit,
}: {
  record?: MedicalRecord
  appointments: Appointment[]
  onCancel: () => void
  onSubmit: (input: MedicalRecordInput) => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)
    setIsSaving(true)
    setError(null)

    try {
      await onSubmit({
        type: String(form.get('type')) as MedicalRecordType,
        recordedAt: String(form.get('recordedAt')),
        title: String(form.get('title') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        weightKg: optionalNumber(form, 'weightKg'),
        temperatureC: optionalNumber(form, 'temperatureC'),
        appointmentId: String(form.get('appointmentId') ?? '') || null,
      })
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Unable to save the entry',
      )
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={(formEvent) => void handleSubmit(formEvent)}
      className="mt-4 grid gap-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4 md:grid-cols-4"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:col-span-4">
          {error}
        </div>
      )}

      <Field label="Type">
        <select
          name="type"
          defaultValue={record?.type ?? 'EXAMINATION'}
          disabled={isSaving}
          className={inputStyles}
        >
          {recordTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input
          name="recordedAt"
          type="date"
          required
          max={todayKey()}
          defaultValue={record?.recordedAt ?? todayKey()}
          disabled={isSaving}
          className={inputStyles}
        />
      </Field>
      <Field label="Title" className="md:col-span-2">
        <input
          name="title"
          required
          maxLength={160}
          placeholder="e.g. Annual check-up, Rabies vaccine, Lameness exam"
          defaultValue={record?.title}
          disabled={isSaving}
          className={inputStyles}
        />
      </Field>
      <Field label="Weight (kg)" optional>
        <input
          name="weightKg"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={record?.weightKg ?? ''}
          disabled={isSaving}
          className={inputStyles}
        />
      </Field>
      <Field label="Temperature (°C)" optional>
        <input
          name="temperatureC"
          type="number"
          step="0.1"
          min="20"
          max="50"
          defaultValue={record?.temperatureC ?? ''}
          disabled={isSaving}
          className={inputStyles}
        />
      </Field>
      <Field label="Related appointment" optional className="md:col-span-2">
        <select
          name="appointmentId"
          defaultValue={record?.appointmentId ?? ''}
          disabled={isSaving}
          className={inputStyles}
        >
          <option value="">None</option>
          {appointments.map((appointment) => (
            <option key={appointment.id} value={appointment.id}>
              {formatDate(appointment.startsAt)} · {appointment.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Findings, diagnosis or treatment plan" optional className="md:col-span-4">
        <textarea
          name="description"
          rows={4}
          defaultValue={record?.description ?? ''}
          disabled={isSaving}
          placeholder="Clinical findings, medication and dosage, follow-up instructions…"
          className={inputStyles}
        />
      </Field>

      <div className="flex justify-end gap-3 md:col-span-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : record ? 'Save changes' : 'Add to history'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  optional = false,
  className = '',
  children,
}: {
  label: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {optional && <span className="font-normal text-slate-400"> (optional)</span>}
      </span>
      {children}
    </label>
  )
}

function optionalNumber(form: FormData, name: string) {
  const value = String(form.get(name) ?? '').trim()
  return value === '' ? null : Number(value)
}

function typeLabel(type: MedicalRecordType) {
  return recordTypes.find((item) => item.value === type)?.label ?? type
}

function todayKey() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function formatDate(value: string) {
  // Plain dates (YYYY-MM-DD) are calendar days, so don't shift them by time zone.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(isDateOnly && { timeZone: 'UTC' }),
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100'
