import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import AuthProvider from './components/AuthProvider.tsx'
import '@fontsource-variable/archivo/wdth.css' // Archivo with weight AND width axes, self-hosted
import './index.css'
import './lib/installPrompt' // start listening for Android's install prompt right away
import { persistOptions, queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Like QueryClientProvider, but first restores the cache saved on this device. */}
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
