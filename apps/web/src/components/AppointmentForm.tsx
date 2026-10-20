import { useEffect, useState } from 'react'
import {
  createOwnerWithPatient,
  createPatient,
  getOwners,
  getPatients,
  uploadAttachment,
} from '../api/clinic'
import {
  bookTreatment,
  createAppointment,
  getScheduleRules,
  getTreatments,
  previewTreatment,
} from '../api/schedule'
import { CLOSED_DAY_MESSAGE, describeTreatment, isWeekendKey } from '../lib/clinicCalendar'
import type { Owner, Patient } from '../types/clinic'
import type {
  Appointment,
  PlannedAppointment,
  ScheduleRules,
  Treatment,
} from '../types/schedule'
import { ACCEPTED_FILES, formatBytes, prepareFile } from '../utils/files'

interface AppointmentFormProps {
  initialDate?: string
  onCancel: () => void
  /**
   * All appointments created (several for a treatment course). `uploadWarning`
   * is set when the appointments were saved but a file wasn't.
   */
  onCreated: (appointments: Appointment[], uploadWarning?: string) => void
}

type RecordMode = 'EXISTING' | 'NEW'

const speciesOptions = [
  'DOG',
  'CAT',
  'HORSE',
  'BIRD',
  'RABBIT',
  'REPTILE',
  'OTHER',
]

export default function AppointmentForm({
  initialDate,
  onCancel,
  onCreated,
}: AppointmentFormProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [patientMode, setPatientMode] = useState<RecordMode>('EXISTING')
  const [ownerMode, setOwnerMode] = useState<RecordMode>('EXISTING')
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [submitStep, setSubmitStep] = useState<string | null>(null)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [rules, setRules] = useState<ScheduleRules | null>(null)
  const [treatmentId, setTreatmentId] = useState('')
  const [dateValue, setDateValue] = useState(() => defaultAppointmentDate(initialDate))
  const [timeValue, setTimeValue] = useState(() => defaultAppointmentTime(initialDate))
  const [durationValue, setDurationValue] = useState('30')
  const [preview, setPreview] = useState<PlannedAppointment[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const selectedTreatment = treatments.find((treatment) => treatment.id === treatmentId)
  const isWeekendDate = Boolean(dateValue) && isWeekendKey(dateValue)

  useEffect(() => {
    let isActive = true
    // Optional extras: the form still works for single appointments without them.
    getTreatments()
      .then((data) => {
        if (isActive) setTreatments(data)
      })
      .catch(() => undefined)
    getScheduleRules()
      .then((data) => {
        if (isActive) setRules(data)
      })
      .catch(() => undefined)
    return () => {
      isActive = false
    }
  }, [])

  // Shows the dates a treatment course would get, whenever its inputs change.
  useEffect(() => {
    if (!treatmentId || !dateValue || !timeValue) return
    let isActive = true
    const timer = setTimeout(() => {
      if (isWeekendKey(dateValue)) {
        setPreview(null)
        setPreviewError(CLOSED_DAY_MESSAGE)
        return
      }
      const startsAt = new Date(`${dateValue}T${timeValue}:00`)
      if (Number.isNaN(startsAt.getTime())) return
      setIsPreviewing(true)
      previewTreatment(treatmentId, {
        startsAt: startsAt.toISOString(),
        durationMinutes: Number(durationValue),
      })
        .then((result) => {
          if (!isActive) return
          setPreview(result.appointments)
          setPreviewError(null)
        })
        .catch((planError: unknown) => {
          if (!isActive) return
          setPreview(null)
          setPreviewError(
            planError instanceof Error ? planError.message : 'Unable to plan the treatment dates',
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
  }, [treatmentId, dateValue, timeValue, durationValue])

  useEffect(() => {
    let isActive = true

    Promise.all([getPatients(), getOwners()])
      .then(([patientData, ownerData]) => {
        if (!isActive) return
        setPatients(patientData)
        setOwners(ownerData)
        if (patientData.length === 0) setPatientMode('NEW')
        if (ownerData.length === 0) setOwnerMode('NEW')
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load patients and owners',
        )
      })
      .finally(() => {
        if (isActive) setIsLoadingRecords(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const form = new FormData(event.currentTarget)

    try {
      const startsAt = new Date(
        `${requiredValue(form, 'appointmentDate')}T${requiredValue(form, 'appointmentTime')}:00`,
      )
      if (startsAt.getTime() < Date.now()) {
        throw new Error('Choose a date and time in the future.')
      }
      if (isWeekendKey(requiredValue(form, 'appointmentDate'))) {
        throw new Error(CLOSED_DAY_MESSAGE)
      }

      // Check and resize files first so a bad file never leaves a
      // half-created appointment behind.
      setSubmitStep(files.length > 0 ? 'Preparing files…' : null)
      const preparedFiles: File[] = []
      for (const file of files) {
        try {
          preparedFiles.push(await prepareFile(file))
        } catch (fileError) {
          throw new Error(
            `${file.name}: ${fileError instanceof Error ? fileError.message : 'This file cannot be uploaded.'}`,
            { cause: fileError },
          )
        }
      }
      setSubmitStep(null)

      let patientId = String(form.get('patientId') ?? '')

      if (patientMode === 'NEW') {
        let ownerId = String(form.get('ownerId') ?? '')
        const breed = optionalValue(form, 'patientBreed')
        const dateOfBirth = optionalValue(form, 'patientDateOfBirth')
        const color = optionalValue(form, 'patientColor')
        const microchip = optionalValue(form, 'patientMicrochip')
        const patientInput = {
          name: requiredValue(form, 'patientName'),
          species: requiredValue(form, 'patientSpecies'),
          sex: requiredValue(form, 'patientSex'),
          isNeutered:
            requiredValue(form, 'patientIsNeutered') === 'true',
          ...(breed && { breed }),
          ...(dateOfBirth && { dateOfBirth }),
          ...(color && { color }),
          ...(microchip && { microchip }),
        }
        let patient: Patient

        if (ownerMode === 'NEW') {
          const email = optionalValue(form, 'ownerEmail')
          const address = optionalValue(form, 'ownerAddress')
          const existingOwner = email
            ? owners.find(
                (owner) =>
                  owner.email?.trim().toLowerCase() === email.toLowerCase(),
              )
            : undefined

          if (existingOwner) {
            ownerId = existingOwner.id
            patient = await createPatient(ownerId, patientInput)
          } else {
            patient = await createOwnerWithPatient(
              {
                firstName: requiredValue(form, 'ownerFirstName'),
                lastName: requiredValue(form, 'ownerLastName'),
                phone: requiredValue(form, 'ownerPhone'),
                ...(email && { email }),
                ...(address && { address }),
              },
              patientInput,
            )
          }
        } else {
          if (!ownerId) {
            throw new Error('Select or create an owner')
          }
          patient = await createPatient(ownerId, patientInput)
        }

        patientId = patient.id
      }

      if (!patientId) {
        throw new Error('Select or create a patient')
      }

      const details = optionalValue(form, 'details')
      const durationMinutes = Number(requiredValue(form, 'durationMinutes'))
      let created: Appointment[]
      if (treatmentId) {
        setSubmitStep('Booking treatment…')
        const result = await bookTreatment(treatmentId, {
          patientId,
          startsAt: startsAt.toISOString(),
          durationMinutes,
          ...(details && { details }),
        })
        created = result.appointments
      } else {
        created = [
          await createAppointment({
            patientId,
            title: requiredValue(form, 'title'),
            startsAt: startsAt.toISOString(),
            durationMinutes,
            category: requiredValue(
              form,
              'category',
            ) as 'APPOINTMENT' | 'TREATMENT' | 'REPRODUCTION',
            ...(details && { details }),
          }),
        ]
      }
      // Files go with the first appointment (of a treatment course).
      const appointment = created[0]!

      const failedUploads: string[] = []
      for (const [index, file] of preparedFiles.entries()) {
        setSubmitStep(`Uploading file ${index + 1} of ${preparedFiles.length}…`)
        try {
          await uploadAttachment(patientId, {
            file,
            appointmentId: appointment.id,
          })
        } catch (uploadError) {
          failedUploads.push(
            `${file.name} (${uploadError instanceof Error ? uploadError.message : 'upload failed'})`,
          )
        }
      }

      onCreated(
        created,
        failedUploads.length > 0
          ? `The appointment was saved, but ${failedUploads.length === 1 ? 'this file was' : 'these files were'} not uploaded: ${failedUploads.join('; ')}. You can add ${failedUploads.length === 1 ? 'it' : 'them'} from the appointment details.`
          : undefined,
      )
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create appointment',
      )
    } finally {
      setIsSubmitting(false)
      setSubmitStep(null)
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-7 rounded-2xl border border-teal-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-teal-600">New calendar record</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Add event or appointment
          </h2>
          {initialDate && (
            <p className="mt-1 text-sm text-slate-500">
              Selected date: {formatSelectedDate(initialDate)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <fieldset className="space-y-4" disabled={isLoadingRecords || isSubmitting}>
        <legend className="text-lg font-bold text-slate-900">Patient</legend>
        <ModeButtons
          value={patientMode}
          onChange={setPatientMode}
          existingLabel="Existing patient"
          newLabel="New patient"
        />

        {patientMode === 'EXISTING' ? (
          <Field label="Patient">
            <select name="patientId" required className={inputStyles}>
              <option value="">Select a patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} · {formatLabel(patient.species)} ·{' '}
                  {patient.owner.firstName} {patient.owner.lastName}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="space-y-6 rounded-xl bg-slate-50 p-5">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Patient name">
                <input name="patientName" required className={inputStyles} />
              </Field>
              <Field label="Species">
                <select
                  name="patientSpecies"
                  required
                  defaultValue="HORSE"
                  className={inputStyles}
                >
                  {speciesOptions.map((species) => (
                    <option key={species} value={species}>
                      {formatLabel(species)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sex">
                <select
                  name="patientSex"
                  required
                  defaultValue="UNKNOWN"
                  className={inputStyles}
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </Field>
              <Field label="Neutered / castrated?">
                <select
                  name="patientIsNeutered"
                  required
                  defaultValue="false"
                  className={inputStyles}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </Field>
              <Field label="Breed (optional)">
                <input name="patientBreed" className={inputStyles} />
              </Field>
              <Field label="Date of birth">
                <input
                  name="patientDateOfBirth"
                  type="date"
                  className={inputStyles}
                />
              </Field>
              <Field label="Color (optional)">
                <input name="patientColor" className={inputStyles} />
              </Field>
              <Field label="Microchip (optional)">
                <input name="patientMicrochip" className={inputStyles} />
              </Field>
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-5">
              <h3 className="font-bold text-slate-900">Owner</h3>
              <ModeButtons
                value={ownerMode}
                onChange={setOwnerMode}
                existingLabel="Existing owner"
                newLabel="New owner"
              />

              {ownerMode === 'EXISTING' ? (
                <Field label="Owner">
                  <select name="ownerId" required className={inputStyles}>
                    <option value="">Select an owner</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.firstName} {owner.lastName} · {owner.phone}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="First name">
                    <input
                      name="ownerFirstName"
                      required
                      className={inputStyles}
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      name="ownerLastName"
                      required
                      className={inputStyles}
                    />
                  </Field>
                  <Field label="Phone">
                    <input name="ownerPhone" required className={inputStyles} />
                  </Field>
                  <Field label="Email">
                    <input
                      name="ownerEmail"
                      type="email"
                      className={inputStyles}
                    />
                  </Field>
                  <Field label="Address">
                    <input name="ownerAddress" className={inputStyles} />
                  </Field>
                </div>
              )}
            </div>
          </div>
        )}
      </fieldset>

      <fieldset
        className="space-y-4 border-t border-slate-200 pt-6"
        disabled={isLoadingRecords || isSubmitting}
      >
        <legend className="text-lg font-bold text-slate-900">
          Calendar details
        </legend>

        {treatments.length > 0 && (
          <Field label="Treatment plan">
            <select
              name="treatmentId"
              value={treatmentId}
              onChange={(event) => {
                setTreatmentId(event.target.value)
                setPreview(null)
                setPreviewError(null)
              }}
              className={inputStyles}
            >
              <option value="">No treatment: a single appointment</option>
              {treatments.map((treatment) => (
                <option key={treatment.id} value={treatment.id}>
                  {treatment.name} · {describeTreatment(treatment)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {!selectedTreatment && (
          <>
          <Field label="Title">
            <input
              name="title"
              required
              placeholder="e.g. Reproductive ultrasound"
              className={inputStyles}
            />
          </Field>
          <Field label="Type">
            <select
              name="category"
              required
              defaultValue="APPOINTMENT"
              className={inputStyles}
            >
              <option value="APPOINTMENT">Appointment</option>
              <option value="TREATMENT">Treatment</option>
              <option value="REPRODUCTION">Reproduction</option>
            </select>
          </Field>
          </>
          )}
          <Field label={selectedTreatment ? 'First appointment date' : 'Date'}>
            <input
              name="appointmentDate"
              type="date"
              required
              min={localDateKey(new Date())}
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              aria-invalid={isWeekendDate || undefined}
              className={`${inputStyles} ${isWeekendDate ? 'border-amber-400' : ''}`}
            />
            {isWeekendDate && (
              <span className="block text-sm font-medium text-amber-700">
                {CLOSED_DAY_MESSAGE}
              </span>
            )}
          </Field>
          <Field label={selectedTreatment ? 'First appointment time' : 'Time'}>
            <input
              name="appointmentTime"
              type="time"
              required
              value={timeValue}
              onChange={(event) => setTimeValue(event.target.value)}
              {...(selectedTreatment && rules && { min: rules.opensAt, max: rules.closesAt })}
              className={inputStyles}
            />
            {selectedTreatment && rules && (
              <span className="block text-xs text-slate-500">
                Opening hours {rules.opensAt}–{rules.closesAt}, Monday to Friday.
              </span>
            )}
          </Field>
          <Field label={selectedTreatment ? 'Length of each appointment' : 'Duration'}>
            <select
              name="durationMinutes"
              value={durationValue}
              onChange={(event) => setDurationValue(event.target.value)}
              className={inputStyles}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1 hour 30 minutes</option>
              <option value="120">2 hours</option>
            </select>
          </Field>
        </div>

        {selectedTreatment && (
          <TreatmentPreview
            treatment={selectedTreatment}
            preview={preview}
            error={previewError}
            isLoading={isPreviewing}
          />
        )}

        <Field label={selectedTreatment ? 'Notes for the first appointment' : 'Details'}>
          <textarea
            name="details"
            rows={3}
            placeholder="Reason, preparation, location or other relevant information"
            className={inputStyles}
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            Files <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:border-teal-400 hover:bg-teal-50/40">
            <span className="rounded-md bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              Add files
            </span>
            <span>
              Lab results, X-rays or photos. They will be saved to the
              patient&apos;s documents and linked to this appointment.
            </span>
            <input
              type="file"
              multiple
              accept={ACCEPTED_FILES}
              className="sr-only"
              onChange={(changeEvent) => {
                const selected = Array.from(changeEvent.target.files ?? [])
                setFiles((current) => [...current, ...selected])
                changeEvent.target.value = ''
              }}
            />
          </label>

          {files.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-slate-700">
                    {file.name}{' '}
                    <span className="text-slate-400">
                      · {formatBytes(file.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                    aria-label={`Remove ${file.name}`}
                    className="text-xs font-semibold text-slate-500 hover:text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
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
          disabled={
            isLoadingRecords ||
            isSubmitting ||
            (Boolean(selectedTreatment) && (!preview || isPreviewing))
          }
          className="rounded-lg bg-teal-600 px-5 py-2 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? (submitStep ?? 'Saving…')
            : selectedTreatment
              ? `Book ${selectedTreatment.steps.length} ${selectedTreatment.steps.length === 1 ? 'appointment' : 'appointments'}`
              : 'Save appointment'}
        </button>
      </div>
    </form>
  )
}

function TreatmentPreview({
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
                  {item.movedBecause === 'weekend'
                    ? `Moved from ${formatDate(item.plannedFor)} (weekend)`
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

function ModeButtons({
  value,
  onChange,
  existingLabel,
  newLabel,
}: {
  value: RecordMode
  onChange: (value: RecordMode) => void
  existingLabel: string
  newLabel: string
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {([
        ['EXISTING', existingLabel],
        ['NEW', newLabel],
      ] as const).map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            value === mode
              ? 'bg-teal-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5 text-left">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function requiredValue(form: FormData, name: string) {
  const value = String(form.get(name) ?? '').trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function optionalValue(form: FormData, name: string) {
  return String(form.get(name) ?? '').trim()
}

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function defaultAppointmentDate(initialDate?: string) {
  if (initialDate) return initialDate

  const date = new Date()
  date.setHours(date.getHours() + 1, 0, 0, 0)
  return localDateKey(date)
}

function defaultAppointmentTime(initialDate?: string) {
  const date = new Date()
  date.setHours(date.getHours() + 1, 0, 0, 0)

  if (initialDate) {
    const todayKey = localDateKey(new Date())
    return initialDate === todayKey
      ? `${String(date.getHours()).padStart(2, '0')}:00`
      : '09:00'
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSelectedDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
