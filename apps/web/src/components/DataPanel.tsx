import type { ReactNode } from 'react'

interface DataPanelProps {
  title: string
  children: ReactNode
}

export default function DataPanel({
  title,
  children,
}: DataPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}