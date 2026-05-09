import { useState, useRef, useEffect } from 'react'
import { Clock, Search } from 'lucide-react'
import { timezoneIana } from '../lib/timezone'
import { timeZones, type TimeZone } from '../data/timeZonesData'

function findTimeZoneByValue(value: string | undefined): TimeZone | undefined {
  if (!value?.trim()) return undefined
  const iana = timezoneIana(value)
  return timeZones.find(
    (tz) => timezoneIana(tz.timezone) === iana || tz.timezone === value.trim()
  )
}

export type TimeZoneSelectProps = {
  value?: string
  /** Identifiant IANA (ex. `Africa/Porto-Novo`), ou chaîne vide si effacé. */
  onChange: (iana: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowClear?: boolean
  /** Icône horloge à gauche du déclencheur */
  showIcon?: boolean
  id?: string
  ariaLabel?: string
}

export function TimeZoneSelect({
  value,
  onChange,
  placeholder = 'Sélectionner un fuseau horaire',
  className = '',
  disabled = false,
  allowClear = true,
  showIcon = false,
  id,
  ariaLabel = 'Choisir un fuseau horaire',
}: TimeZoneSelectProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selected = findTimeZoneByValue(value)
  const displayIana = value?.trim() ? timezoneIana(value) : ''
  const labelText = selected
    ? `${selected.name} (${displayIana})`
    : displayIana || ''

  const filteredTimeZones = timeZones.filter((tz) => {
    const q = searchTerm.toLowerCase()
    const iana = timezoneIana(tz.timezone)
    return (
      tz.timezone.toLowerCase().includes(q) ||
      tz.code.toLowerCase().includes(q) ||
      tz.name.toLowerCase().includes(q) ||
      iana.toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    if (!dropdownOpen) return
    const t = requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => cancelAnimationFrame(t)
  }, [dropdownOpen])

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearchTerm('')
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setSearchTerm('')
      }
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [dropdownOpen])

  const handleSelect = (iana: string) => {
    onChange(iana)
    setTimeout(() => {
      setDropdownOpen(false)
      setSearchTerm('')
    }, 0)
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setDropdownOpen((o) => !o)
            setSearchTerm('')
          }
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-700 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25 disabled:opacity-50 ${
          showIcon ? 'relative pl-10' : ''
        }`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
      >
        <span className="sr-only">
          {dropdownOpen ? 'Menu fuseau ouvert.' : 'Menu fuseau fermé.'}
        </span>
        {showIcon && (
          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        )}
        <span className={`min-w-0 flex-1 truncate ${labelText ? '' : 'text-gray-400'}`}>
          {labelText || placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-full min-w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Rechercher un fuseau…"
                title="Rechercher un fuseau horaire"
                className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/25"
                aria-label="Rechercher un fuseau horaire"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {allowClear && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect('')
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${!displayIana ? 'bg-blue-50 text-[#3B82F6]' : 'text-gray-500'}`}
              >
                — Aucun —
              </button>
            )}
            {filteredTimeZones.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Aucun fuseau trouvé</div>
            ) : (
              filteredTimeZones.map((tz, index) => {
                const iana = timezoneIana(tz.timezone)
                const isSelected = iana === displayIana
                return (
                  <button
                    key={`${tz.code}-${index}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelect(iana)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50 text-[#3B82F6]' : 'text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{tz.name}</div>
                    <div className="text-xs text-gray-500">{iana}</div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeZoneSelect
