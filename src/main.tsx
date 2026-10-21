import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import AuthProvider from './components/AuthProvider.tsx'
import '@fontsource-variable/archivo/wdth.css' // Archivo with weight AND width axes, self-hosted
import './index.css'
import './lib/installPrompt' // start listening for Android's install prompt right away

// Holds the cache for all server data (brews, beans, ...) fetched with React Query.
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
