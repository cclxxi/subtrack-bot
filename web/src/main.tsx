import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRoot } from '@telegram-apps/telegram-ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import '@telegram-apps/telegram-ui/dist/styles.css'
import './index.css'

import { App } from './app.tsx'
import { getColorScheme, getPlatform, initWebApp } from './telegram/webapp.ts'

initWebApp()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

const platform = getPlatform() === 'ios' ? 'ios' : 'base'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRoot appearance={getColorScheme()} platform={platform}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppRoot>
    </QueryClientProvider>
  </StrictMode>,
)
