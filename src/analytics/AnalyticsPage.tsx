import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Minus } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useHabitLogs, useHabits } from '../data/habits'
import { useSessions } from '../data/sessions'
import { useTasks } from '../data/tasks'
import {
  change,
  focusByBlock,
  focusByCategory,
  focusByWeekday,
  focusTrend,
  heatmapCells,
  rangeFor,
  rangeLabel,
  report,
  shiftRange,
  summarize,
  type Period,
  type Range,
} from '../lib/analytics'
import { lockInDays } from '../lib/dashboard'
import { dayKey } from '../lib/dates'
import { formatMinutes } from '../lib/profile'
import { useNow } from '../lib/useNow'
import { ColumnChart } from './charts/ColumnChart'
import { Heatmap } from './charts/Heatmap'
import { ShareBar } from './charts/ShareBar'
import ui from '../components/ui.module.css'
import styles from './Analytics.module.css'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

const pct = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`)

function Delta({ value, period }: { value: number | null; period: Period }) {
  if (value === null) return <span className={styles.deltaNone}>No earlier {period} to compare</span>
  const flat = Math.abs(value) < 0.05
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`${styles.delta} ${flat ? '' : value > 0 ? styles.up : styles.down}`}>
      <Icon size={14} aria-hidden="true" />
      <span className="num">{flat ? 'Same' : `${value > 0 ? '+' : '−'}${Math.round(Math.abs(value) * 100)}%`}</span>
      <span className={styles.deltaWord}>vs last {period}</span>
    </span>
  )
}

export function AnalyticsPage() {
  const { user } = useSignedIn()
  const uid = user.uid
  const tasks = useTasks(uid)
  const habits = useHabits(uid)
  const logs = useHabitLogs(uid)
  const sessions = useSessions(uid)
  const today = dayKey(useNow())
  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState(today)
  const loaded = tasks.loaded && habits.loaded && logs.loaded && sessions.loaded

  const range: Range = rangeFor(period, anchor)
  const isCurrent = range.start <= today && today <= range.end
  const data = useMemo(
    () => ({ tasks: tasks.data, habits: habits.data, logs: logs.data, sessions: sessions.data, today }),
    [tasks.data, habits.data, logs.data, sessions.data, today],
  )
  const now = summarize(data, range)
  const before = summarize(data, shiftRange(range, -1))
  const lines = report(data, range)

  const trend = focusTrend(sessions.data, range)
  const blocks = focusByBlock(sessions.data, range)
  const weekdays = focusByWeekday(sessions.data, range)
  const shares = focusByCategory(sessions.data, tasks.data, range)
  const heat = useMemo(() => {
    const minutes = new Map<string, number>()
    for (const s of sessions.data) minutes.set(s.dayKey, (minutes.get(s.dayKey) ?? 0) + s.minutes)
    return heatmapCells(lockInDays(sessions.data, logs.data, tasks.data), minutes, today)
  }, [sessions.data, logs.data, tasks.data, today])

  return (
    <section className={styles.page} aria-busy={!loaded}>
      <header className={styles.head}>
        <h1>Analytics</h1>
        <div className={styles.controls}>
          <div className={styles.segmented} role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={period === p.id}
                onClick={() => {
                  setPeriod(p.id)
                  setAnchor(today)
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={styles.stepper}>
            <button
              type="button"
              onClick={() => setAnchor((a) => shiftRange(rangeFor(period, a), -1).start)}
              aria-label={`Previous ${period}`}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span className={styles.rangeLabel}>{isCurrent ? `This ${period}` : rangeLabel(range)}</span>
            <button
              type="button"
              onClick={() => setAnchor((a) => shiftRange(rangeFor(period, a), 1).start)}
              aria-label={`Next ${period}`}
              disabled={isCurrent}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className={styles.tiles}>
        <div className={`${ui.card} ${styles.tile}`}>
          <span className={styles.tileLabel}>Focus time</span>
          <strong className={styles.tileValue}>{formatMinutes(now.focusMinutes)}</strong>
          <Delta value={change(now.focusMinutes, before.focusMinutes)} period={period} />
        </div>
        <div className={`${ui.card} ${styles.tile}`}>
          <span className={styles.tileLabel}>Sessions completed</span>
          <strong className={styles.tileValue}>{now.sessions}</strong>
          <span className={styles.tileNote}>
            {now.avgSession === null ? 'No sessions yet' : `Average ${formatMinutes(now.avgSession)} · ${pct(now.completionRate)} finished`}
          </span>
        </div>
        <div className={`${ui.card} ${styles.tile}`}>
          <span className={styles.tileLabel}>Tasks done</span>
          <strong className={styles.tileValue}>{now.tasksDone}</strong>
          <span className={styles.tileNote}>
            {now.onTimeRate === null ? 'None had a deadline' : `${pct(now.onTimeRate)} on time`}
          </span>
        </div>
        <div className={`${ui.card} ${styles.tile}`}>
          <span className={styles.tileLabel}>Habits done as planned</span>
          <strong className={styles.tileValue}>{pct(now.habitRate)}</strong>
          <Delta value={change(now.habitRate, before.habitRate)} period={period} />
        </div>
      </div>

      <article className={`${ui.card} ${styles.card}`}>
        <h2>{period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'} report</h2>
        <ul className={styles.report}>
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </article>

      <article className={`${ui.card} ${styles.card}`}>
        <div className={styles.cardHead}>
          <h2>Focus by day</h2>
          {period === 'day' && <span className={styles.muted}>7 days to {rangeLabel(range)}</span>}
        </div>
        <ColumnChart
          points={trend}
          label="Focus minutes by day"
          current={period === 'day' ? range.start : isCurrent ? today : undefined}
          labelEvery={period === 'month' ? 5 : 1}
        />
      </article>

      <div className={styles.pair}>
        <article className={`${ui.card} ${styles.card}`}>
          <h2>Time of day</h2>
          <p className={styles.muted}>When your sessions started</p>
          <ColumnChart points={blocks} label="Focus minutes by time of day" height={150} />
        </article>
        {period !== 'day' && (
          <article className={`${ui.card} ${styles.card}`}>
            <h2>Day of the week</h2>
            <p className={styles.muted}>Which days you focus most</p>
            <ColumnChart points={weekdays} label="Focus minutes by day of the week" height={150} />
          </article>
        )}
        <article className={`${ui.card} ${styles.card}`}>
          <h2>Time by category</h2>
          <p className={styles.muted}>From the task each session was linked to</p>
          <ShareBar shares={shares} />
        </article>
      </div>

      <article className={`${ui.card} ${styles.card}`}>
        <div className={styles.cardHead}>
          <h2>Consistency</h2>
          <span className={styles.muted}>Last 26 weeks</span>
        </div>
        <Heatmap cells={heat} />
      </article>
    </section>
  )
}
