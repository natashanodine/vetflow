/** Equora logo mark: the horse head (same image as the browser tab icon). */
export function EquoraMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      aria-hidden="true"
      className={`shrink-0 rounded-full ${className}`}
    />
  )
}
