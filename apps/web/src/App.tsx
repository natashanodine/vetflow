function App() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <section className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
        <p className="font-semibold text-teal-600">VetFlow</p>

        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Carmen's Veterinary clinic project dashboard
        </h1>

        <p className="mt-4 max-w-2xl text-slate-600">
          Manage patients, pet owners, veterinarians, and appointments.
        </p>

        <button
          type="button"
          className="mt-8 rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700"
        >
          View patients
        </button>
      </section>
    </main>
  )
}

export default App