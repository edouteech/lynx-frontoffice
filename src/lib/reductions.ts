/**
 * Réductions enregistrées (page « Remises » du back-office) utilisables dans une vente. Règles reproduites
 * de la caisse (lynx_pos_v2, classe Reduction) : le NOM sert de code promo ; une réduction « spécifique »
 * ne vise que ses produits ; elle peut avoir un créneau de validité (dates, heures, récurrence).
 * Vérifié par tests/reductions.test.ts (cas calculés avec le vrai code de la caisse).
 * La règle « mot de passe obligatoire » n'est appliquée nulle part (ni dans la caisse) : ignorée ici aussi.
 */
import type { Discount, ValidityConfig } from '../types/api.ts'

export type ReductionLike = Pick<Discount, 'id' | 'name' | 'type' | 'value' | 'scope' | 'is_active' | 'validity_slots'> & {
  products?: Array<{ id: number }>
}

const wholeNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null)

function minutes(value: string | null | undefined): number | null {
  const parts = String(value ?? '').split(':')
  if (parts.length < 2) return null
  const h = Number.parseInt(parts[0], 10)
  const m = Number.parseInt(parts[1], 10)
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m
}

function dayOf(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** La réduction est-elle valable à `now` ? Dates, plage horaire, puis récurrence (jours ISO : 1 = lundi ... 7 = dimanche). */
export function isValidityActiveNow(slots: ValidityConfig | null | undefined, now: Date = new Date()): boolean {
  if (!slots || Object.keys(slots).length === 0) return true

  const start = dayOf(slots.starts_at)
  const end = dayOf(slots.ends_at)
  if (start && now.getTime() < start.getTime()) return false
  if (end && now.getTime() > end.getTime() + (23 * 3600 + 59 * 60 + 59) * 1000) return false

  const from = minutes(slots.time_from)
  const to = minutes(slots.time_to)
  if (from !== null && to !== null) {
    const current = now.getHours() * 60 + now.getMinutes()
    if (current < from || current > to) return false
  }

  if (slots.mode === 'ponctuelle') return true

  const isoWeekday = now.getDay() === 0 ? 7 : now.getDay()
  switch (slots.frequency) {
    case 'hebdomadaire': {
      const days = (slots.days_of_week ?? []).map(wholeNumber).filter((n): n is number => n !== null)
      return days.length === 0 || days.includes(isoWeekday)
    }
    case 'mensuelle': {
      const days = (slots.days_of_month ?? []).map(wholeNumber).filter((n): n is number => n !== null)
      return days.length === 0 || days.includes(now.getDate())
    }
    case 'annuelle': {
      const dates = slots.annual_dates ?? []
      return dates.length === 0 || dates.some((a) => a.month === now.getMonth() + 1 && a.day === now.getDate())
    }
    default:
      return true
  }
}

/** Réductions proposables maintenant : actives, de type pourcentage ou montant, dans leur créneau. */
export function activeReductions<T extends ReductionLike>(all: T[], now: Date = new Date()): T[] {
  return all.filter(
    (r) => r.is_active && (r.type === 'percentage' || r.type === 'amount') && isValidityActiveNow(r.validity_slots, now),
  )
}

export const isGlobalReduction = (r: ReductionLike): boolean => r.scope !== 'specific'

export function reductionAppliesToProduct(r: ReductionLike, productId: number | null | undefined): boolean {
  return isGlobalReduction(r) || (productId != null && (r.products ?? []).some((p) => p.id === productId))
}

/** Le nom sert de code promo (insensible à la casse et aux espaces autour). */
export function findReductionByCode<T extends ReductionLike>(code: string, reductions: T[]): T | null {
  const wanted = code.trim().toLowerCase()
  if (!wanted) return null
  return reductions.find((r) => r.name.trim().toLowerCase() === wanted) ?? null
}
