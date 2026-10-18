import { useEffect, useState } from 'react'
import {
  createOwnerWithPatient,
  createPatient,
  getOwners,
  getPatients,
  uploadAttachment,
} from '../api/clinic'
import { createAppointment } from '../api/schedule'
import type { Owner, Patient } from '../types/clinic'
import type { Appointment } from '../types/schedule'
import { ACCEPTED_FILES, formatBytes, prepareFile } from '../utils/files'

interface AppointmentFormProps {
  initialDate?: string
  onCancel: () => void
  /** `uploadWarning` is set when the appointment was saved but a file wasn't. */
  onCreated: (appointment: Appointment, uploadWarning?: string) => void
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
      const appointment = await createAppointment({
        patientId,
        title: requiredValue(form, 'title'),
        startsAt: startsAt.toISOString(),
        durationMinutes: Number(requiredValue(form, 'durationMinutes')),
        category: requiredValue(
          form,
          'category',
        ) as 'APPOINTMENT' | 'TREATMENT' | 'REPRODUCTION',
        ...(details && { details }),
      })

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
        appointment,
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

        <div className="grid gap-4 md:grid-cols-2">
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
          <Field label="Date">
            <input
              name="appointmentDate"
              type="date"
              required
              min={localDateKey(new Date())}
              defaultValue={defaultAppointmentDate(initialDate)}
              className={inputStyles}
            />
          </Field>
          <Field label="Time">
            <input
              name="appointmentTime"
              type="time"
              required
              defaultValue={defaultAppointmentTime(initialDate)}
              className={inputStyles}
            />
          </Field>
          <Field label="Duration">
            <select
              name="durationMinutes"
              defaultValue="30"
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

        <Field label="Details">
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
          disabled={isLoadingRecords || isSubmitting}
          className="rounded-lg bg-teal-600 px-5 py-2 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (submitStep ?? 'Saving…') : 'Save appointment'}
        </button>
      </div>
    </form>
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
