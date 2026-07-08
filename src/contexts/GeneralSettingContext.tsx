import { useEffect, useState, type ReactNode } from 'react'
import { fetchGeneralSetting } from '../api/generalSettings'
import { getToken } from '../lib/authStorage'
import type { GeneralSetting } from '../types/generalSetting'
import { GeneralSettingContext } from './generalSettingContextBase'

export function GeneralSettingProvider({ children }: { children: ReactNode }) {
  const [generalSetting, setGeneralSetting] = useState<GeneralSetting | null>(null)

  useEffect(() => {
    if (!getToken()) return

    let cancelled = false
    void fetchGeneralSetting()
      .then((s) => { if (!cancelled) setGeneralSetting(s) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <GeneralSettingContext.Provider value={{ generalSetting, setSetting: setGeneralSetting }}>
      {children}
    </GeneralSettingContext.Provider>
  )
}
