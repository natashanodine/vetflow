import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LanguageProvider } from '../i18n/LanguageProvider'
import { PublicFooter } from './PublicFooter'
import { PublicHeader } from './PublicHeader'

/**
 * Links like "/#contact" scroll to that section (also from another page);
 * other page changes start at the top.
 */
function ScrollToSection() {
  const { pathname, hash, key } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    // Wait a moment for the new page to render.
    const timer = setTimeout(() => {
      document
        .getElementById(decodeURIComponent(hash.slice(1)))
        ?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
    return () => clearTimeout(timer)
  }, [pathname, hash, key])
  return null
}

export default function PublicLayout() {
  return (
    <LanguageProvider>
      <div className="public-site">
        <ScrollToSection />
        <PublicHeader />
        <main>
          <Outlet />
        </main>
        <PublicFooter />
      </div>
    </LanguageProvider>
  )
}
