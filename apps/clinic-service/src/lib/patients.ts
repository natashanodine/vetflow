import {
  Owner,
  Patient,
  serializeOwner,
  serializePatient,
  type PatientDoc,
} from '../models/index.js'
import { getUserDirectory } from './services.js'

/**
 * Patients as the API returns them: with their owner and the responsible
 * vet's name (stored in identity-service).
 */
export async function presentPatients(patients: PatientDoc[]) {
  const ownerIds = [...new Set(patients.map((patient) => patient.ownerId))]
  const owners = await Owner.find({ _id: { $in: ownerIds } }).lean()
  const ownersById = new Map(owners.map((owner) => [owner._id, serializeOwner(owner)]))

  const needsNames = patients.some((patient) => patient.responsibleVetId)
  const directory = needsNames ? await getUserDirectory() : new Map<string, string>()

  return patients.map((patient) => ({
    ...serializePatient(patient),
    owner: ownersById.get(patient.ownerId) ?? null,
    responsibleVet: patient.responsibleVetId
      ? {
          id: patient.responsibleVetId,
          name: directory.get(patient.responsibleVetId) ?? 'Former team member',
        }
      : null,
  }))
}

export async function presentPatient(patient: PatientDoc) {
  const [result] = await presentPatients([patient])
  return result!
}

export async function patientExists(patientId: string) {
  return (await Patient.exists({ _id: patientId })) !== null
}
