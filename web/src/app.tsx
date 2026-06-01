import { Route, Routes } from 'react-router-dom'

import { CardFormPage } from './pages/cards/form.tsx'
import { CardsListPage } from './pages/cards/list.tsx'
import { DashboardPage } from './pages/dashboard.tsx'
import { SettingsPage } from './pages/settings.tsx'
import { SubscriptionDetailPage } from './pages/subscriptions/detail.tsx'
import { SubscriptionFormPage } from './pages/subscriptions/form.tsx'
import { SubscriptionsListPage } from './pages/subscriptions/list.tsx'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />

      <Route path="/subscriptions" element={<SubscriptionsListPage />} />
      <Route path="/subscriptions/new" element={<SubscriptionFormPage />} />
      <Route path="/subscriptions/:id" element={<SubscriptionDetailPage />} />
      <Route
        path="/subscriptions/:id/edit"
        element={<SubscriptionFormPage />}
      />

      <Route path="/cards" element={<CardsListPage />} />
      <Route path="/cards/new" element={<CardFormPage />} />
      <Route path="/cards/:id/edit" element={<CardFormPage />} />

      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  )
}
