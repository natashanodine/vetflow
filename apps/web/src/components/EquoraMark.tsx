/** Equora logo mark: a horseshoe inside a circle. */
export function EquoraMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-[#174f45] text-white ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[58%] w-[58%]">
        <path
          d="M6.5 20.5c-1.6-2.1-2.5-4.7-2.5-7.5C4 8 7.6 4 12 4s8 4 8 9c0 2.8-.9 5.4-2.5 7.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="6.9" cy="11.2" r="0.95" fill="#174f45" />
        <circle cx="9" cy="7.4" r="0.95" fill="#174f45" />
        <circle cx="15" cy="7.4" r="0.95" fill="#174f45" />
        <circle cx="17.1" cy="11.2" r="0.95" fill="#174f45" />
      </svg>
    </span>
  )
}
