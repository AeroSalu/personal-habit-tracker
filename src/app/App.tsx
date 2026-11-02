import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { MorePage } from './MorePage'
import { Placeholder } from './Placeholder'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Placeholder title="Dashboard" step="step 6" />} />
          <Route path="tasks" element={<Placeholder title="Tasks" step="step 4" />} />
          <Route path="focus" element={<Placeholder title="Focus Mode" step="step 5" />} />
          <Route path="calendar" element={<Placeholder title="Calendar" step="step 4" />} />
          <Route path="habits" element={<Placeholder title="Habits" step="step 3" />} />
          <Route path="profile" element={<Placeholder title="Profile & Settings" step="step 2" />} />
          <Route path="more" element={<MorePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
