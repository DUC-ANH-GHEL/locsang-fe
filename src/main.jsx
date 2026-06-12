import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastProvider } from './components/Toast'
import { LoadingProvider } from './contexts/LoadingContext'
import { StorefrontAuthProvider } from './contexts/StorefrontAuthContext'
import { registerLocSangServiceWorker } from './services/serviceWorkerRegistration'
import App from './App'
import './assets/styles.css'

const CHUNK_RELOAD_GUARD_KEY = 'locsang_chunk_reload_guard_v1'
const BUILD_VERSION_KEY = 'locsang_build_version_v1'
const BUILD_RELOAD_GUARD_KEY = 'locsang_build_reload_guard_v1'
const APP_BUILD_VERSION =
  typeof __APP_BUILD_VERSION__ !== 'undefined' ? String(__APP_BUILD_VERSION__) : 'dev'

const syncAppBuildVersion = () => {
  try {
    const previousVersion = localStorage.getItem(BUILD_VERSION_KEY)
    if (previousVersion && previousVersion !== APP_BUILD_VERSION) {
      const guard = sessionStorage.getItem(BUILD_RELOAD_GUARD_KEY)
      localStorage.setItem(BUILD_VERSION_KEY, APP_BUILD_VERSION)
      if (guard !== APP_BUILD_VERSION) {
        sessionStorage.setItem(BUILD_RELOAD_GUARD_KEY, APP_BUILD_VERSION)
        window.location.reload()
        return false
      }
    }

    localStorage.setItem(BUILD_VERSION_KEY, APP_BUILD_VERSION)
    sessionStorage.removeItem(BUILD_RELOAD_GUARD_KEY)
  } catch {
    // ignore storage errors; app can continue normally
  }

  return true
}

const canBootApp = syncAppBuildVersion()

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

if (canBootApp) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    googleClientId
      ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          {appTree}
        </GoogleOAuthProvider>
        )
      : appTree
  )
}

registerLocSangServiceWorker()
