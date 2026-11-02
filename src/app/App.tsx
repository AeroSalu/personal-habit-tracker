import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from '../auth/AuthPage'
import { AuthProvider } from '../auth/AuthProvider'
import { ProfileSetup } from '../auth/ProfileSetup'
import { useAuth } from '../auth/authContext'
import { AppLayout } from './AppLayout'
import { MorePage } from './MorePage'
import { Placeholder } from './Placeholder'
import { ProfilePage } from './ProfilePage'
import { Splash } from './Splash'

function SignedInRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Placeholder title="Dashboard" step="step 6" />} />
        <Route path="tasks" element={<Placeholder title="Tasks" step="step 4" />} />
        <Route path="focus" element={<Placeholder title="Focus Mode" step="step 5" />} />
        <Route path="calendar" element={<Placeholder title="Calendar" step="step 4" />} />
        <Route path="habits" element={<Placeholder title="Habits" step="step 3" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Gate() {
  const state = useAuth()
  if (state.status === 'loading') return <Splash />
  if (state.status === 'signedOut') return <AuthPage />
  if (state.status === 'needsProfile') return <ProfileSetup user={state.user} />
  return <SignedInRoutes />
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}
