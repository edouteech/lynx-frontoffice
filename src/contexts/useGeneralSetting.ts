import { useContext } from 'react'
import { GeneralSettingContext } from './generalSettingContextBase'

export function useGeneralSetting() {
  const ctx = useContext(GeneralSettingContext)
  if (!ctx) throw new Error('useGeneralSetting must be used within GeneralSettingProvider')
  return ctx
}
