import { Check, X } from 'lucide-react'

export function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  label?: string
}) {
  return (
    <label
      className={`relative inline-flex h-6 w-11 shrink-0 items-center ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      }`}
      title={label}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-[#22C55E]" />
      <span className="pointer-events-none absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition peer-checked:translate-x-5">
        {checked ? (
          <Check className="h-3 w-3 text-[#22C55E]" strokeWidth={3} />
        ) : (
          <X className="h-3 w-3 text-gray-400" strokeWidth={3} />
        )}
      </span>
    </label>
  )
}
