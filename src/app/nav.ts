import {
  CalendarDays,
  ChartColumn,
  DoorOpen,
  LayoutDashboard,
  ListTodo,
  Repeat,
  Settings,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  icon: LucideIcon
  /** Absent for modules planned in later phases; they show as "Soon". */
  path?: string
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
      { label: 'Tasks', icon: ListTodo, path: '/tasks' },
      { label: 'Focus Mode', icon: Timer, path: '/focus' },
      { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
      { label: 'Habits', icon: Repeat, path: '/habits' },
      { label: 'Analytics', icon: ChartColumn, path: '/analytics' },
    ],
  },
  {
    title: 'Community',
    items: [
      { label: 'Friends', icon: Users },
      { label: 'Leaderboard', icon: Trophy },
      { label: 'Focus Rooms', icon: DoorOpen },
      { label: 'Challenges', icon: Target, path: '/challenges' },
    ],
  },
  {
    title: 'Personal',
    items: [
      { label: 'AI Coach', icon: Sparkles },
      { label: 'Profile & Settings', icon: Settings, path: '/profile' },
    ],
  },
]

/** The phone bottom bar; everything else is reached from More. */
export const BOTTOM_BAR: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Tasks', icon: ListTodo, path: '/tasks' },
  { label: 'Focus', icon: Timer, path: '/focus' },
  { label: 'Habits', icon: Repeat, path: '/habits' },
]
