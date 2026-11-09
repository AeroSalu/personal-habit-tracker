import {
  CalendarDays,
  ChartColumn,
  DoorOpen,
  House,
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

/** The everyday screens, always visible in the sidebar. */
export const PRIMARY: NavItem[] = [
  { label: 'Today', icon: House, path: '/' },
  { label: 'Tasks', icon: ListTodo, path: '/tasks' },
  { label: 'Focus', icon: Timer, path: '/focus' },
  { label: 'Habits', icon: Repeat, path: '/habits' },
  { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
  { label: 'Friends', icon: Users, path: '/friends' },
]

/** Everything else, folded under "More" so the sidebar stays short. */
export const SECONDARY: NavItem[] = [
  { label: 'Analytics', icon: ChartColumn, path: '/analytics' },
  { label: 'Focus Rooms', icon: DoorOpen, path: '/rooms' },
  { label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
  { label: 'Challenges', icon: Target, path: '/challenges' },
  { label: 'AI Coach', icon: Sparkles },
]

/** Reached from your name in the sidebar, and listed on the phone's More page. */
export const SETTINGS: NavItem = { label: 'Settings', icon: Settings, path: '/profile' }

/** The phone bottom bar; everything else is reached from More. */
export const BOTTOM_BAR: NavItem[] = PRIMARY.slice(0, 4)
