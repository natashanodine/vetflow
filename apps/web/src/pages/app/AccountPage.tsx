import { useState } from 'react'
import { changePassword } from '../../api/identity'
import { useAuth } from '../../auth/hooks'
import { PasswordInput } from '../../components/PasswordInput'
import { roleLabels } from '../../lib/permissions'

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100'

export default function AccountPage() {
  const { session } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [formKey, setFormKey] = useState(0)

  if (!session) return null
  const { user, clinic } = session

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)
    const currentPassword = String(form.get('currentPassword') ?? '')
    const newPassword = String(form.get('newPassword') ?? '')
    const confirmPassword = String(form.get('confirmPassword') ?? '')

    setError(null)
    setSuccess(false)
    if (newPassword.length < 12) {
      setError('The new password must have at least 12 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    setIsPending(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess(true)
      setFormKey((key) => key + 1)
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : 'Unable to change the password.',
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="font-semibold text-teal-600">Your profile</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">My account</h1>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Name', user.name],
            ['Email', user.email],
            ['Role', roleLabels[user.role]],
            ['Clinic', clinic.name],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-slate-400">{label}</dt>
              <dd className="mt-1 break-words font-semibold text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-slate-500">
          To change your name, email or role, ask a clinic admin.
        </p>
      </section>

      <form
        key={formKey}
        onSubmit={(formEvent) => void handleSubmit(formEvent)}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-slate-900">Change password</h2>
        <p className="mt-1 text-sm text-slate-500">
          You&apos;ll stay signed in here. Any other device using your old
          password will be signed out.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
            Your password was changed. Other devices have been signed out.
          </p>
        )}

        <div className="mt-5 grid max-w-xl gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Current password
            </span>
            <PasswordInput
              name="currentPassword"
              required
              autoComplete="current-password"
              disabled={isPending}
              className={inputStyles}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              New password
            </span>
            <PasswordInput
              name="newPassword"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              disabled={isPending}
              className={inputStyles}
            />
            <span className="mt-1 block text-xs text-slate-500">
              At least 12 characters. A short sentence is easy to remember and
              hard to guess.
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Confirm new password
            </span>
            <PasswordInput
              name="confirmPassword"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              disabled={isPending}
              className={inputStyles}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  )
}
