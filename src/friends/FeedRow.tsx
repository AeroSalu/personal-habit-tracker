import type { CSSProperties } from 'react'
import { Award, CheckCircle2, Repeat, TrendingUp } from 'lucide-react'
import { activityVerb, CHEERS, namesLine, timeAgo, type Activity, type cheerSummary, type CheerEmoji } from '../lib/friends'
import styles from './Friends.module.css'

const ICONS = { task: CheckCircle2, habit: Repeat, badge: Award, level: TrendingUp }

type Summary = ReturnType<typeof cheerSummary> extends Map<string, infer S> ? S : never

/**
 * One activity item. On a friend's item you can cheer with one emoji (tap it again to take it
 * back); on your own you see the counts and who cheered.
 */
export function FeedRow({
  item,
  who,
  mine,
  index,
  now,
  summary,
  nameOf,
  onCheer,
}: {
  item: Activity
  who: string
  mine: boolean
  index: number
  now: number
  summary: Summary | undefined
  nameOf: (uid: string) => string
  onCheer: (emoji: CheerEmoji | null) => void
}) {
  const Icon = ICONS[item.kind]
  const countOf = (e: CheerEmoji) => summary?.counts.find((c) => c.emoji === e)?.count ?? 0

  return (
    <li className="enter" style={{ '--i': index } as CSSProperties}>
      <span className={`${styles.feedIcon} ${styles[item.kind]}`} aria-hidden="true">
        <Icon size={15} />
      </span>
      <div className={styles.feedBody}>
        <p>
          <strong>{who}</strong> {activityVerb(item)} <strong>{item.title}</strong>
          {item.kind === 'badge' ? ' badge' : ''}
        </p>
        {mine ? (
          summary && (
            <p className={styles.cheeredBy}>
              {summary.counts.map((c) => `${c.emoji} ${c.count}`).join('  ')}
              <span> · from {namesLine(summary.from.map(nameOf))}</span>
            </p>
          )
        ) : (
          <div className={styles.cheers} role="group" aria-label={`Cheer ${who}`}>
            {CHEERS.map((e) => {
              const on = summary?.mine === e
              const n = countOf(e)
              return (
                <button
                  key={e}
                  type="button"
                  className={`${styles.cheer} ${on ? styles.cheerOn : ''}`}
                  aria-pressed={on}
                  aria-label={`${e} ${n ? `(${n})` : ''}`}
                  onClick={() => onCheer(on ? null : e)}
                >
                  <span aria-hidden="true">{e}</span>
                  {n > 0 && <span className="num">{n}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <time className={styles.when} dateTime={item.at}>
        {timeAgo(item.at, now)}
      </time>
    </li>
  )
}
