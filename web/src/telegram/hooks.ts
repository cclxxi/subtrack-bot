import { useEffect } from 'react'

import { getBackButton, getMainButton } from './webapp.ts'

interface MainButtonOptions {
  text: string
  onClick: () => void
  visible?: boolean
  enabled?: boolean
  loading?: boolean
}

/**
 * Drives the native Telegram MainButton for the lifetime of a screen.
 * Hides the button on unmount so screens never leak each other's buttons.
 */
export function useMainButton({
  text,
  onClick,
  visible = true,
  enabled = true,
  loading = false,
}: MainButtonOptions): void {
  useEffect(() => {
    const button = getMainButton()
    if (!button) return

    button.setText(text)
    button.onClick(onClick)
    if (visible) button.show()
    else button.hide()
    if (enabled) button.enable()
    else button.disable()
    if (loading) button.showProgress()
    else button.hideProgress()

    return () => {
      button.offClick(onClick)
      button.hideProgress()
      button.hide()
    }
  }, [text, onClick, visible, enabled, loading])
}

/**
 * Shows the native BackButton and routes its tap to `onClick` while mounted.
 */
export function useBackButton(onClick: () => void): void {
  useEffect(() => {
    const button = getBackButton()
    if (!button) return

    button.onClick(onClick)
    button.show()

    return () => {
      button.offClick(onClick)
      button.hide()
    }
  }, [onClick])
}
