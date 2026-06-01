import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { apiRequest } from './client.ts'
import type {
  Card,
  CardPayload,
  CreateSubscriptionPayload,
  Profile,
  Subscription,
  Summary,
  UpdateSubscriptionPayload,
} from './types.ts'

export const queryKeys = {
  subscriptions: ['subscriptions'] as const,
  subscription: (id: string) => ['subscriptions', id] as const,
  cards: ['cards'] as const,
  summary: ['summary'] as const,
  profile: ['profile'] as const,
}

/** Invalidate everything that can change when a subscription is mutated. */
function useInvalidateSubscriptions() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.subscriptions })
    void qc.invalidateQueries({ queryKey: queryKeys.summary })
  }
}

export function useSubscriptions() {
  return useQuery({
    queryKey: queryKeys.subscriptions,
    queryFn: () => apiRequest<Subscription[]>('/subscriptions'),
  })
}

export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.subscription(id) : ['subscriptions', 'none'],
    queryFn: () => apiRequest<Subscription>(`/subscriptions/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateSubscription() {
  const invalidate = useInvalidateSubscriptions()
  return useMutation({
    mutationFn: (payload: CreateSubscriptionPayload) =>
      apiRequest<Subscription>('/subscriptions', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: invalidate,
  })
}

export function useUpdateSubscription(id: string) {
  const invalidate = useInvalidateSubscriptions()
  return useMutation({
    mutationFn: (payload: UpdateSubscriptionPayload) =>
      apiRequest<Subscription>(`/subscriptions/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: invalidate,
  })
}

export function useDeleteSubscription() {
  const invalidate = useInvalidateSubscriptions()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(`/subscriptions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards,
    queryFn: () => apiRequest<Card[]>('/cards'),
  })
}

export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CardPayload) =>
      apiRequest<Card>('/cards', { method: 'POST', body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cards }),
  })
}

export function useUpdateCard(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<CardPayload>) =>
      apiRequest<Card>(`/cards/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cards }),
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ id: string }>(`/cards/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cards }),
  })
}

export function useSummary() {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: () => apiRequest<Summary>('/summary'),
  })
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => apiRequest<Profile>('/me'),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      timezone?: string
      notificationHour?: number
    }) => apiRequest<Profile>('/settings', { method: 'PATCH', body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile }),
  })
}
