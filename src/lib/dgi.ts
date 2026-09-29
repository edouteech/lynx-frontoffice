/**
 * Le pays de l'organisation choisi via CountrySelect est un libellé ("Bénin"), pas
 * toujours un code ISO ("BJ") — on accepte les deux, en ignorant casse et accents,
 * pour rester cohérent avec ce qu'acceptait le backend avant le passage aux routes
 * dédiées (POST /sales/dgi vs POST /sales, cf. SaleController::applyDgiNormalization).
 */
export function isBeninCountry(country: string | null | undefined): boolean {
  const normalized = (country ?? '').trim().toLowerCase()
  return normalized === 'bj' || normalized === 'benin' || normalized === 'bénin'
}
