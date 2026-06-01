/**
 * Thin, typed wrapper over the official `window.Telegram.WebApp` global
 * (loaded via telegram-web-app.js). Only the surface we actually use is typed.
 * Outside Telegram (local browser dev) we degrade gracefully and read a
 * developer-supplied initData from VITE_DEV_INIT_DATA.
 */

type ColorScheme = 'light' | 'dark'

interface MainButton {
  setText(text: string): void
  show(): void
  hide(): void
  enable(): void
  disable(): void
  showProgress(leaveActive?: boolean): void
  hideProgress(): void
  onClick(cb: () => void): void
  offClick(cb: () => void): void
}

interface BackButton {
  show(): void
  hide(): void
  onClick(cb: () => void): void
  offClick(cb: () => void): void
}

type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
type NotificationType = 'error' | 'success' | 'warning'

interface HapticFeedback {
  impactOccurred(style: HapticStyle): void
  notificationOccurred(type: NotificationType): void
  selectionChanged(): void
}

interface TelegramWebApp {
  initData: string
  colorScheme: ColorScheme
  themeParams: Record<string, string>
  MainButton: MainButton
  BackButton: BackButton
  HapticFeedback: HapticFeedback
  ready(): void
  expand(): void
  platform: string
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

function getWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

let cachedInitData: string | null = null

/**
 * The raw initData string sent to the API as `Authorization: tma <initData>`.
 * Falls back to VITE_DEV_INIT_DATA for browser-only development.
 */
export function getInitDataRaw(): string {
  if (cachedInitData !== null) return cachedInitData

  const fromTelegram = getWebApp()?.initData
  if (fromTelegram && fromTelegram.length > 0) {
    cachedInitData = fromTelegram
    return cachedInitData
  }

  const devInitData = import.meta.env.VITE_DEV_INIT_DATA
  cachedInitData = typeof devInitData === 'string' ? devInitData : ''
  return cachedInitData
}

export function isInsideTelegram(): boolean {
  return getWebApp() !== null
}

export function getColorScheme(): ColorScheme {
  return getWebApp()?.colorScheme ?? 'light'
}

export function getPlatform(): string {
  return getWebApp()?.platform ?? 'unknown'
}

/** Signal readiness and request full height. Safe to call outside Telegram. */
export function initWebApp(): void {
  const wa = getWebApp()
  if (!wa) return
  wa.ready()
  wa.expand()
}

export function haptic(style: HapticStyle = 'light'): void {
  getWebApp()?.HapticFeedback.impactOccurred(style)
}

export function hapticNotify(type: NotificationType): void {
  getWebApp()?.HapticFeedback.notificationOccurred(type)
}

export function getMainButton(): MainButton | null {
  return getWebApp()?.MainButton ?? null
}

export function getBackButton(): BackButton | null {
  return getWebApp()?.BackButton ?? null
}
