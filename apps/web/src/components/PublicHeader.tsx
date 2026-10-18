import { Link } from 'react-router-dom'
import { EquoraMark } from './EquoraMark'

export function PublicHeader() {
  return (
    <header className="border-b border-[#17352f]/10 bg-[#fbf8f1]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <EquoraMark />
          <span>
            <span className="font-display block text-xl font-bold leading-none">
              Equora
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#56736c]">
              Equine veterinary care
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-bold md:flex">
          <Link to="/services" className="hover:text-[#d86f52]">
            Services
          </Link>
          <Link to="/team" className="hover:text-[#d86f52]">
            Our team
          </Link>
          <Link to="/#contact" className="hover:text-[#d86f52]">
            Contact
          </Link>
        </nav>

        <Link
          to="/login"
          className="rounded-full border border-[#174f45] px-5 py-2.5 text-sm font-bold transition hover:bg-[#174f45] hover:text-white"
        >
          Staff login
        </Link>
      </div>
    </header>
  )
}
