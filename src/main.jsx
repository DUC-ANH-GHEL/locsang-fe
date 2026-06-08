import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastProvider } from './components/Toast'
import { LoadingProvider } from './contexts/LoadingContext'
import { StorefrontAuthProvider } from './contexts/StorefrontAuthContext'
import App from './App'
import './assets/styles.css'

const CHUNK_RELOAD_GUARD_KEY = 'locsang_chunk_reload_guard_v1'

const isChunkLoadError = (reason) => {
  const message = String(reason?.message || reason || '').toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module')
    || message.includes('importing a module script failed')
    || message.includes('loading chunk')
    || message.includes('chunkloaderror')
  )
}

const reloadForStaleChunk = () => {
  try {
    const guard = sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY)
    if (guard === '1') {
      sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY)
      return false
    }
    sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, '1')
  } catch {
    // ignore storage errors; still try to recover by reloading once
  }

  window.location.reload()
  return true
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadForStaleChunk()
})

window.addEventListener('unhandledrejection', (event) => {
  if (!isChunkLoadError(event?.reason)) return
  event.preventDefault()
  reloadForStaleChunk()
})

window.addEventListener('load', () => {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY)
  } catch {
    // ignore storage errors
  }
})

const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

const appTree = (
  <BrowserRouter>
    <ToastProvider>
      <LoadingProvider>
        <StorefrontAuthProvider>
          <App />
        </StorefrontAuthProvider>
      </LoadingProvider>
    </ToastProvider>
  </BrowserRouter>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  googleClientId
    ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        {appTree}
      </GoogleOAuthProvider>
      )
    : appTree
)
