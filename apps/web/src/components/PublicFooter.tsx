import { Link } from 'react-router-dom'

export function PublicFooter() {
  return (
    <footer id="contact" className="bg-[#17352f] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-display text-2xl font-bold">Equora</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
            Equine veterinary care and reproduction for mares, stallions and
            foals.
          </p>
        </div>
        <div>
          <p className="eyebrow text-[#b8d3c5]">Explore</p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-white/80">
            <Link to="/services">Services</Link>
            <Link to="/team">Our team</Link>
            <Link to="/login">Staff login</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow text-[#b8d3c5]">Contact</p>
          <p className="mt-4 text-sm leading-7 text-white/80">
            Phone and email to be added
            <br />
            Clinic address to be added
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Equora. All rights reserved.
      </div>
    </footer>
  )
}
