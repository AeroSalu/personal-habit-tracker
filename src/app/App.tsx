import { useCallback, useState } from 'react'
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
import { FriendPage } from '../friends/FriendPage'
import { FriendsPage } from '../friends/FriendsPage'
import { LeaderboardPage } from '../friends/LeaderboardPage'
import { FocusProvider } from '../focus/FocusProvider'
import { AchievementPoster } from '../game/AchievementPoster'
import { BadgeWatcher } from '../game/BadgeWatcher'
import { ChallengesPage } from '../game/ChallengesPage'
import { StatsPublisher } from '../game/StatsPublisher'
import { HabitsPage } from '../habits/HabitsPage'
import { PlanPage } from '../plan/PlanPage'
import { ReviewPage } from '../plan/ReviewPage'
import { RoomPage } from '../rooms/RoomPage'
import { RoomPresence } from '../rooms/RoomPresence'
import { RoomsPage } from '../rooms/RoomsPage'
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
      <AchievementPoster />
      <RoomPresence />
      <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="focus" element={<FocusPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="friends/:uid" element={<FriendPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="rooms/:id" element={<RoomPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      </Routes>
    </FocusProvider>
  )
}

function Screen() {
  const state = useAuth()
  if (state.status === 'loading') return null
  if (state.status === 'signedOut') return <AuthPage />
  if (state.status === 'needsProfile') return <ProfileSetup user={state.user} />
  return <SignedInRoutes />
}

/** The app with the loading screen on top, which fades away once loading ends. */
function Gate() {
  const loading = useAuth().status === 'loading'
  const [splash, setSplash] = useState(true)
  const gone = useCallback(() => setSplash(false), [])
  return (
    <>
      <Screen />
      {splash && <Splash leaving={!loading} onGone={gone} />}
    </>
  )
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
