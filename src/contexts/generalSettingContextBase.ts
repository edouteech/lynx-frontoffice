import { createContext } from 'react'
import type { GeneralSetting } from '../types/generalSetting'

export interface GeneralSettingState {
  generalSetting: GeneralSetting | null
  setSetting: (setting: GeneralSetting) => void
}

export const GeneralSettingContext = createContext<GeneralSettingState | null>(null)
