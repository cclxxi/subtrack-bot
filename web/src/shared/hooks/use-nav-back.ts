import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useBackButton } from '../../telegram/hooks.ts'

/**
 * Wires the native Telegram BackButton to navigate to `to` (default: parent
 * route) while the screen is mounted.
 */
export function useNavBack(to = -1 as number | string): void {
  const navigate = useNavigate()
  const onBack = useCallback(() => {
    if (typeof to === 'number') navigate(to)
    else navigate(to)
  }, [navigate, to])

  useBackButton(onBack)
}
