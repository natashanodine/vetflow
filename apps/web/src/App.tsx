import { useCallback, useEffect, useState } from 'react'
import { getOwners, getPets } from './api/clinic'
import type { Owner, Pet } from './types/clinic'

function App() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [ownerData, petData] = await Promise.all([
        getOwners(),
        getPets(),
      ])

      setOwners(ownerData)
      setPets(petData)
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load clinic data'

      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="font-semibold text-teal-600">VetFlow</p>
            <h1 className="text-2xl font-bold">Carmen's Clinic dashboard</h1>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isLoading}
            className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Dashboard could not be loaded</p>
            <p className="mt-1 text-sm">{error}</p>
          </section>
        )}

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Pet owners" value={owners.length} />
          <StatCard label="Patients" value={pets.length} />
          <StatCard
            label="Species represented"
            value={new Set(pets.map((pet) => pet.species)).size}
          />
        </section>

        <section className="grid gap-8 xl:grid-cols-2">
          <DataPanel title="Patients">
            {isLoading ? (
              <LoadingMessage />
            ) : pets.length === 0 ? (
              <EmptyMessage message="No patients have been registered." />
            ) : (
              <div className="divide-y divide-slate-100">
                {pets.map((pet) => (
                  <article
                    key={pet.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div>
                      <h3 className="font-semibold">{pet.name}</h3>
                      <p className="text-sm text-slate-500">
                        {formatSpecies(pet.species)}
                        {pet.breed ? ` · ${pet.breed}` : ''}
                      </p>
                    </div>

                    <div className="text-right text-sm">
                      <p className="font-medium">
                        {pet.owner.firstName} {pet.owner.lastName}
                      </p>
                      <p className="text-slate-500">Owner</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </DataPanel>

          <DataPanel title="Pet owners">
            {isLoading ? (
              <LoadingMessage />
            ) : owners.length === 0 ? (
              <EmptyMessage message="No owners have been registered." />
            ) : (
              <div className="divide-y divide-slate-100">
                {owners.map((owner) => (
                  <article key={owner.id} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">
                          {owner.firstName} {owner.lastName}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {owner.email ?? 'No email'}
                        </p>
                      </div>

                      <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
                        {owner.pets.length}{' '}
                        {owner.pets.length === 1 ? 'pet' : 'pets'}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      {owner.phone}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </DataPanel>
        </section>
      </main>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
    </article>
  )
}

interface DataPanelProps {
  title: string
  children: React.ReactNode
}

function DataPanel({ title, children }: DataPanelProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function LoadingMessage() {
  return <p className="py-6 text-slate-500">Loading clinic data…</p>
}

function EmptyMessage({ message }: { message: string }) {
  return <p className="py-6 text-slate-500">{message}</p>
}

function formatSpecies(species: string) {
  return species.charAt(0) + species.slice(1).toLowerCase()
}

export default App