import { Attachment, MedicalRecord, Medication, Patient } from '../models/index.js'
import { deletePatientAppointments } from './services.js'
import { deleteFile } from './storage.js'

/**
 * Deletes a patient and everything about it: appointments (scheduling-service),
 * stored files, medical history and medications.
 *
 * Appointments go first: if scheduling-service fails this throws before
 * anything in this service has been deleted, so it can simply be retried.
 */
export async function deletePatientCompletely(patientId: string) {
  await deletePatientAppointments(patientId)

  // Stored files (R2 or disk), then their records, so the space is freed.
  const attachments = await Attachment.find({ patientId }).lean()
  for (const attachment of attachments) {
    await deleteFile(attachment.storageKey)
  }
  await Attachment.deleteMany({ patientId })
  await MedicalRecord.deleteMany({ patientId })
  await Medication.deleteMany({ patientId })
  await Patient.deleteOne({ _id: patientId })
}
