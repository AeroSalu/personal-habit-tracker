import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './styles/global.css'
import './firebase'
import { App } from './app/App'
import { applyTheme, loadTheme, watchSystemTheme } from './app/theme'

applyTheme(loadTheme())
watchSystemTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
