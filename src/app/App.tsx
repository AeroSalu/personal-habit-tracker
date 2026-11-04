import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from '../auth/AuthPage'
import { AuthProvider } from '../auth/AuthProvider'
import { ProfileSetup } from '../auth/ProfileSetup'
import { useAuth } from '../auth/authContext'
import { ToastProvider } from '../components/ToastProvider'
import { AnalyticsPage } from '../analytics/AnalyticsPage'
import { CalendarPage } from '../calendar/CalendarPage'
import { DashboardPage } from '../dashboard/DashboardPage'
import { FocusPage } from '../focus/FocusPage'
import { FocusProvider } from '../focus/FocusProvider'
import { BadgeWatcher } from '../game/BadgeWatcher'
import { ChallengesPage } from '../game/ChallengesPage'
import { StatsPublisher } from '../game/StatsPublisher'
import { HabitsPage } from '../habits/HabitsPage'
import { TasksPage } from '../tasks/TasksPage'
import { AppLayout } from './AppLayout'
import { MorePage } from './MorePage'
import { ProfilePage } from './ProfilePage'
import { Splash } from './Splash'

function SignedInRoutes() {
  return (
    <FocusProvider>
      <BadgeWatcher />
      <StatsPublisher />
      <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="focus" element={<FocusPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      </Routes>
    </FocusProvider>
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
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
