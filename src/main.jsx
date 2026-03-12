import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register service worker with update prompt
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Show a subtle notification that an update is available
    console.log('New version available! Reloading...');
    
    // Auto-reload after a short delay to apply updates
    setTimeout(() => {
      updateSW(true);
      window.location.reload();
    }, 1000);
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegistered(registration) {
    // Check for updates every 60 seconds
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 60000);
    }
  },
  onRegisterError(error) {
    console.error('SW registration error:', error);
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
