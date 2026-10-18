import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createTeamMember,
  deleteTeamMember,
  getTeam,
  updateClinicName,
  updateTeamMember,
} from '../../api/identity'
import { useAuth, useViewer } from '../../auth/hooks'
import type { ClinicRole, TeamMember } from '../../types/clinic'
import { PasswordInput } from '../../components/PasswordInput'
import { roleLabels } from '../../lib/permissions'

const roleDescriptions: Record<ClinicRole, string> = {
  ADMIN: 'Everything, including managing users',
  VETERINARIAN:
    'Edit patients and owners, write medical history, book appointments',
  STAFF: 'Book appointments, add patients and upload files',
}

const roleStyles: Record<ClinicRole, string> = {
  ADMIN: 'bg-teal-100 text-teal-800',
  VETERINARIAN: 'bg-sky-100 text-sky-800',
  STAFF: 'bg-slate-100 text-slate-700',
}

const roles: ClinicRole[] = ['ADMIN', 'VETERINARIAN', 'STAFF']

export default function TeamPage({ clinicName }: { clinicName: string }) {
  const viewer = useViewer()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    getTeam()
      .then((data) => {
        if (isActive) setMembers(data)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setError(
          loadError instanceof Error ? loadError.message : 'Unable to load users',
        )
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  function replaceMember(updated: TeamMember) {
    setMembers((current) =>
      current.map((member) =>
        member.userId === updated.userId ? updated : member,
      ),
    )
  }

  async function handleDelete(member: TeamMember) {
    setError(null)
    setNotice(null)
    try {
      await deleteTeamMember(member.userId)
      setMembers((current) =>
        current.filter((item) => item.userId !== member.userId),
      )
      setNotice(`${member.name} was removed.`)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to remove the user',
      )
    } finally {
      setPendingDeleteId(null)
    }
  }

  const activeCount = members.filter((member) => member.isActive).length

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-teal-600">Clinic administration</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Team</h1>
          <p className="mt-2 text-slate-500">
            Add the people who use Equora and choose what each of them can do.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null)
            setNotice(null)
            setEditingId(null)
            setIsAdding((current) => !current)
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
        >
          {isAdding ? 'Close form' : 'Add user'}
        </button>
      </section>

      <ClinicNameCard initialName={clinicName} />

      <section className="grid gap-3 md:grid-cols-3">
        {roles.map((role) => (
          <div
            key={role}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleStyles[role]}`}
            >
              {roleLabels[role]}
            </span>
            <p className="mt-2 text-sm text-slate-600">
              {roleDescriptions[role]}
            </p>
          </div>
        ))}
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
          {notice}
        </div>
      )}

      {isAdding && (
        <MemberForm
          onCancel={() => setIsAdding(false)}
          onSubmit={async (input) => {
            const created = await createTeamMember({
              name: input.name!,
              email: input.email!,
              password: input.password!,
              role: input.role!,
              isVeterinarian: input.isVeterinarian,
            })
            setMembers((current) => [...current, created])
            setIsAdding(false)
            setNotice(
              `${created.name} can now sign in with ${created.email} and the password you set. Share it with them privately.`,
            )
          }}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Users</h2>
          {!isLoading && (
            <p className="text-sm text-slate-500">
              {activeCount} active · {members.length} total
            </p>
          )}
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading users…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((member) => {
              const isSelf = member.userId === viewer?.userId

              if (editingId === member.userId) {
                return (
                  <li key={member.userId} className="p-4">
                    <MemberForm
                      member={member}
                      isSelf={isSelf}
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (input) => {
                        replaceMember(await updateTeamMember(member.userId, input))
                        setEditingId(null)
                        setNotice(
                          input.password
                            ? `${member.name}'s details and password were updated. They have been signed out everywhere and must use the new password.`
                            : `${member.name}'s details were updated.`,
                        )
                      }}
                    />
                  </li>
                )
              }

              return (
                <li
                  key={member.userId}
                  className={`flex flex-wrap items-center gap-4 px-6 py-4 ${
                    member.isActive ? '' : 'bg-slate-50'
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${
                      member.isActive
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {initials(member.name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {member.name}
                      {isSelf && (
                        <span className="ml-2 text-xs font-medium text-slate-400">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {member.email}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleStyles[member.role]}`}
                  >
                    {roleLabels[member.role]}
                  </span>
                  {member.role === 'ADMIN' && member.isVeterinarian && (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                      Vet
                    </span>
                  )}
                  {!member.isActive && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      Deactivated
                    </span>
                  )}

                  {pendingDeleteId === member.userId ? (
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <span className="text-slate-600">
                        Remove {member.name}?
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(member)}
                        className="text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="text-slate-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null)
                          setNotice(null)
                          setIsAdding(false)
                          setEditingId(member.userId)
                        }}
                        className="text-teal-700 hover:underline"
                      >
                        Edit
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(member.userId)}
                          className="text-slate-500 hover:text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function ClinicNameCard({ initialName }: { initialName: string }) {
  const { refresh } = useAuth()
  const [name, setName] = useState(initialName)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const value = String(new FormData(formEvent.currentTarget).get('name') ?? '').trim()
    setIsSaving(true)
    setError(null)
    try {
      const clinic = await updateClinicName(value)
      setName(clinic.name)
      setIsEditing(false)
      // Refresh the header, which shows the clinic name.
      void refresh()
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Unable to save the name',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {isEditing ? (
        <form
          onSubmit={(formEvent) => void handleSubmit(formEvent)}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="block min-w-64 flex-1">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Clinic name
            </span>
            <input
              name="name"
              required
              maxLength={160}
              defaultValue={name}
              disabled={isSaving}
              className={inputStyles}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setIsEditing(false)
            }}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          {error && <p className="w-full text-sm text-red-700">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Clinic name</p>
            <p className="font-semibold text-slate-900">{name}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm font-semibold text-teal-700 hover:underline"
          >
            Edit
          </button>
        </div>
      )}
    </section>
  )
}

interface MemberFormInput {
  name?: string
  email?: string
  password?: string
  role?: ClinicRole
  isActive?: boolean
  isVeterinarian?: boolean
}

function MemberForm({
  member,
  isSelf = false,
  onCancel,
  onSubmit,
}: {
  member?: TeamMember
  isSelf?: boolean
  onCancel: () => void
  onSubmit: (input: MemberFormInput) => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<ClinicRole>(member?.role ?? 'STAFF')
  const isEditing = Boolean(member)

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '').trim()
    const password = String(form.get('password') ?? '')

    if (password && password !== String(form.get('confirmPassword') ?? '')) {
      setError('The passwords do not match.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSubmit({
        name: text('name'),
        email: text('email'),
        ...(password && { password }),
        ...(!isSelf && {
          role: text('role') as ClinicRole,
          ...(isEditing && { isActive: text('isActive') === 'true' }),
        }),
        // Only admins carry a separate "also a vet" flag.
        isVeterinarian: role === 'ADMIN' && form.get('isVeterinarian') === 'on',
      })
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Unable to save the user',
      )
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={(formEvent) => void handleSubmit(formEvent)}
      className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm"
    >
      <p className="font-semibold text-teal-600">
        {isEditing ? 'Edit user' : 'New user'}
      </p>
      <h2 className="mt-1 text-xl font-bold text-slate-900">
        {member?.name ?? 'Add someone to the clinic'}
      </h2>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Full name">
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={member?.name}
            autoComplete="off"
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Email (used to sign in)">
          <input
            name="email"
            type="email"
            required
            maxLength={255}
            defaultValue={member?.email}
            autoComplete="off"
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>

        <Field label="Role">
          <select
            name="role"
            value={role}
            onChange={(changeEvent) =>
              setRole(changeEvent.target.value as ClinicRole)
            }
            disabled={isSaving || isSelf}
            className={inputStyles}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]} — {roleDescriptions[role]}
              </option>
            ))}
          </select>
          {isSelf && (
            <span className="mt-1 block text-xs text-slate-500">
              You can&apos;t change your own role.
            </span>
          )}
          {role === 'ADMIN' && (
            <span className="mt-3 flex items-start gap-2">
              <input
                id={`vet-${member?.userId ?? 'new'}`}
                name="isVeterinarian"
                type="checkbox"
                defaultChecked={member?.isVeterinarian ?? false}
                disabled={isSaving}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-700">
                Also a practising veterinarian
                <span className="block text-xs text-slate-500">
                  Can be chosen as the responsible vet for patients.
                </span>
              </span>
            </span>
          )}
        </Field>

        {isEditing && (
          <Field label="Status">
            <select
              name="isActive"
              defaultValue={String(member?.isActive ?? true)}
              disabled={isSaving || isSelf}
              className={inputStyles}
            >
              <option value="true">Active — can sign in</option>
              <option value="false">Deactivated — cannot sign in</option>
            </select>
          </Field>
        )}

        {isSelf ? (
          <p className="self-end text-sm text-slate-500 md:col-span-2">
            To change your own password, use{' '}
            <Link to="/app/account" className="font-semibold text-teal-700 hover:underline">
              My account
            </Link>
            .
          </p>
        ) : (
          <>
          <Field label={isEditing ? 'New password (leave blank to keep)' : 'Password'}>
            <PasswordInput
              name="password"
              required={!isEditing}
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              disabled={isSaving}
              className={inputStyles}
            />
            <span className="mt-1 block text-xs text-slate-500">
              At least 12 characters.
            </span>
          </Field>
          <Field label="Confirm password">
            <PasswordInput
              name="confirmPassword"
              required={!isEditing}
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              disabled={isSaving}
              className={inputStyles}
            />
          </Field>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
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
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add user'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-500'
