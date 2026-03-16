import { Link, useLocation } from 'react-router-dom'

export default function Header({ subtitle, hideNav = false }) {
  const location = useLocation()

  const navLinks = [
    { to: '/', label: 'יצירת לומדה' },
    { to: '/admin', label: 'ניהול לומדות' },
  ]

  return (
    <header className="bg-dark text-white shadow-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <img
            src="https://images.cdn-files-a.com/uploads/1453047/400_5d6dfa0fc100d.png"
            alt="SafetyOn"
            className="h-9 object-contain"
            onError={e => {
              e.target.style.display = 'none'
            }}
          />
          <div>
            <div className="text-base font-bold leading-tight">מערכת לומדות</div>
            {subtitle && (
              <div className="text-xs text-gray-400 leading-tight">{subtitle}</div>
            )}
          </div>
        </div>

        {/* Navigation */}
        {!hideNav && (
          <nav className="flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
