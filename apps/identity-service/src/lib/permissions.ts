export type ClinicRole = 'ADMIN' | 'VETERINARIAN' | 'STAFF'

const rules = {
  /** Add, edit and remove clinic users; rename the clinic. */
  manageTeam: ['ADMIN'],
  /** Edit patients and owners, write medical history, delete files. */
  editRecords: ['ADMIN', 'VETERINARIAN'],
} as const satisfies Record<string, readonly ClinicRole[]>

export type Permission = keyof typeof rules

export function can(role: string | undefined, permission: Permission) {
  return Boolean(role) && (rules[permission] as readonly string[]).includes(role!)
}
