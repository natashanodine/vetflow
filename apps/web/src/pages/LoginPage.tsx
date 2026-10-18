import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { login } from '../api/identity'
import { useAuth } from '../auth/hooks'
import { EquoraMark } from '../components/EquoraMark'
import { PasswordInput } from '../components/PasswordInput'

const reasonMessages: Record<string, string> = {
  'password-changed':
    'Your password was changed, so you were signed out on this device. Sign in with the new password.',
  removed:
    'Your account is no longer active. Contact a clinic administrator if you think this is a mistake.',
  'signed-out': 'Your session has ended. Please sign in again.',
}

const inputStyles =
  'w-full rounded-xl border border-[#17352f]/20 bg-white px-4 py-3 outline-none transition focus:border-[#174f45] focus:ring-4 focus:ring-[#dce9df]'

export default function LoginPage() {
  const { session, isLoading, isWaking, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const from = (location.state as { from?: string } | null)?.from
  const reason = searchParams.get('reason')

  if (!isLoading && session) {
    return <Navigate to={from ?? '/app/dashboard'} replace />
  }

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)
    setIsPending(true)
    setError(null)

    try {
      await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''))
      await refresh()
      navigate(from ?? '/app/dashboard', { replace: true })
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Unable to sign in right now.',
      )
      setIsPending(false)
    }
  }

  return (
    <main className="public-site paper-grid grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-[#17352f]/10 bg-[#fbf8f1] p-7 shadow-2xl shadow-[#17352f]/10 md:p-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#56736c]">
          ← Return to clinic website
        </Link>
        <div className="mt-10">
          <EquoraMark className="h-12 w-12" />
          <p className="eyebrow mt-7 text-[#d86f52]">Private clinic workspace</p>
          <h1 className="mt-3 text-4xl font-semibold">Welcome back.</h1>
          <p className="mt-3 text-sm leading-6 text-[#56736c]">
            Sign in to Equora to manage horses, owners, appointments and clinic work.
          </p>
        </div>

        {reason && reasonMessages[reason] && !error && (
          <p
            role="status"
            className="mt-6 rounded-xl bg-[#dce9df] px-4 py-3 text-sm font-semibold text-[#174f45]"
          >
            {reasonMessages[reason]}
          </p>
        )}

        {isWaking && (
          <p
            role="status"
            className="mt-6 rounded-xl bg-[#efe7d9] px-4 py-3 text-sm font-semibold text-[#56736c]"
          >
            Starting up the clinic system. After a quiet period this can take up to a minute.
          </p>
        )}

        <form onSubmit={(formEvent) => void handleSubmit(formEvent)} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-[#274940]">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`mt-2 ${inputStyles}`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-[#274940]">Password</span>
            <div className="mt-2">
              <PasswordInput
                name="password"
                autoComplete="current-password"
                required
                className={inputStyles}
              />
            </div>
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || isWaking}
            className="w-full rounded-xl bg-[#174f45] px-5 py-3.5 font-bold text-white transition hover:bg-[#103e36] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? 'Signing in…' : isWaking ? 'Starting up…' : 'Sign in securely'}
          </button>
        </form>
      </div>
    </main>
  )
}
