import { Input, List, Section, Select } from '@telegram-apps/telegram-ui'
import { useEffect, useMemo, useState } from 'react'

import { useProfile, useUpdateSettings } from '../api/hooks.ts'
import { useNavBack } from '../shared/hooks/use-nav-back.ts'
import { ErrorState, LoadingState } from '../shared/ui/states.tsx'
import { useMainButton } from '../telegram/hooks.ts'
import { hapticNotify } from '../telegram/webapp.ts'

const HOURS = Array.from({ length: 24 }, (_, h) => h)

export function SettingsPage() {
  useNavBack('/')

  const { data: profile, isLoading, isError, error, refetch } = useProfile()
  const updateSettings = useUpdateSettings()

  const [timezone, setTimezone] = useState('')
  const [hour, setHour] = useState(9)

  useEffect(() => {
    if (profile) {
      setTimezone(profile.timezone)
      setHour(profile.notificationHour)
    }
  }, [profile])

  const isValid = useMemo(() => timezone.trim().length > 0, [timezone])

  const handleSubmit = () => {
    if (!isValid) return
    updateSettings.mutate(
      { timezone: timezone.trim(), notificationHour: hour },
      { onSuccess: () => hapticNotify('success') },
    )
  }

  useMainButton({
    text: 'Сохранить',
    onClick: handleSubmit,
    enabled: isValid && !updateSettings.isPending,
    loading: updateSettings.isPending,
  })

  if (isLoading) return <LoadingState />
  if (isError || !profile) {
    return (
      <ErrorState
        message={(error as Error)?.message}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <List className="page-bottom-pad">
      <Section
        header="Уведомления"
        footer="Часовой пояс в формате IANA, например Europe/Moscow. Уведомления приходят в выбранный час по этому поясу."
      >
        <Input
          header="Часовой пояс"
          placeholder="Europe/Moscow"
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
        />
        <Select
          header="Час уведомлений"
          value={String(hour)}
          onChange={e => setHour(Number(e.target.value))}
        >
          {HOURS.map(h => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')}:00
            </option>
          ))}
        </Select>
      </Section>

      {updateSettings.isError && (
        <ErrorState message={(updateSettings.error as Error).message} />
      )}
    </List>
  )
}
