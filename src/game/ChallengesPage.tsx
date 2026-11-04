import { Flame, ListChecks, Lock, Repeat, Share2, Timer, Trophy, type LucideIcon } from 'lucide-react'
import { addDays, parseDay, weekStart } from '../lib/dates'
import type { BadgeGroup } from '../lib/achievements'
import { ALL_MISSIONS_BONUS, CHALLENGE_XP, MISSION_XP } from '../lib/missions'
import { formatMinutes } from '../lib/profile'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { GoalRow } from './GoalRow'
import { shareBadge } from './shareCard'
import { useGame } from './useGame'
import ui from '../components/ui.module.css'
import styles from './Challenges.module.css'

const GROUPS: { id: BadgeGroup; label: string; icon: LucideIcon }[] = [
  { id: 'streaks', label: 'Consistency', icon: Flame },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'habits', label: 'Habits', icon: Repeat },
]

const shortDate = (key: string) => parseDay(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function ChallengesPage() {
  const { loaded, today, xp, level, badges, missions, challenge, bests } = useGame()
  const { profile } = useSignedIn()
  const toast = useToast()
  const missionsDone = missions.filter((m) => m.done).length
  const daysLeft = 6 - Math.round((parseDay(today).getTime() - parseDay(weekStart(today)).getTime()) / 86_400_000)
  const earnedCount = badges.filter((b) => b.earnedOn).length

  return (
    <section className={styles.page} aria-busy={!loaded}>
      <header className={styles.head}>
        <div>
          <h1>Challenges</h1>
          <p className={styles.muted}>Earn XP by doing the work, not by leaving a timer running.</p>
        </div>
        <div className={styles.level}>
          <Trophy size={20} aria-hidden="true" />
          <div>
            <strong className="num">Level {level.level}</strong>
            <span className="num">
              {xp.total} XP · {level.needed - level.into} to next
            </span>
          </div>
        </div>
      </header>

      <div className={styles.columns}>
        <article className={`${ui.card} ${styles.card}`}>
          <div className={styles.cardHead}>
            <h2>Today’s missions</h2>
            <span className={`${styles.muted} num`}>
              {missionsDone} of {missions.length}
            </span>
          </div>
          <ul className={styles.goals}>
            {missions.map((m) => (
              <GoalRow key={m.id} goal={m} xp={MISSION_XP} />
            ))}
          </ul>
          <p className={styles.footnote}>
            {missionsDone === missions.length
              ? `All three done: +${ALL_MISSIONS_BONUS} XP bonus earned.`
              : `Finish all three for a +${ALL_MISSIONS_BONUS} XP bonus. New missions every day.`}
          </p>
        </article>

        <article className={`${ui.card} ${styles.card}`}>
          <div className={styles.cardHead}>
            <h2>Weekly challenge</h2>
            <span className={styles.muted}>
              {challenge.done ? 'Complete' : daysLeft === 0 ? 'Last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
            </span>
          </div>
          <ul className={styles.goals}>
            <GoalRow goal={challenge} xp={CHALLENGE_XP} />
          </ul>
          <p className={styles.footnote}>
            Runs {shortDate(weekStart(today))} to {shortDate(addDays(weekStart(today), 6))}.
          </p>
        </article>
      </div>

      <article className={`${ui.card} ${styles.card}`}>
        <h2>Personal bests</h2>
        <dl className={styles.bests}>
          <div>
            <dt>Longest session</dt>
            <dd className="num">{bests.longestSession ? formatMinutes(bests.longestSession.minutes) : '–'}</dd>
            {bests.longestSession && <span>{shortDate(bests.longestSession.day)}</span>}
          </div>
          <div>
            <dt>Best focus day</dt>
            <dd className="num">{bests.bestDay ? formatMinutes(bests.bestDay.minutes) : '–'}</dd>
            {bests.bestDay && <span>{shortDate(bests.bestDay.day)}</span>}
          </div>
          <div>
            <dt>Best week</dt>
            <dd className="num">{bests.bestWeek ? formatMinutes(bests.bestWeek.minutes) : '–'}</dd>
            {bests.bestWeek && <span>Week of {shortDate(bests.bestWeek.weekOf)}</span>}
          </div>
          <div>
            <dt>Most tasks in a day</dt>
            <dd className="num">{bests.mostTasks ? bests.mostTasks.count : '–'}</dd>
            {bests.mostTasks && <span>{shortDate(bests.mostTasks.day)}</span>}
          </div>
        </dl>
      </article>

      <div className={styles.badges}>
        <div className={styles.cardHead}>
          <h2>Badges</h2>
          <span className={`${styles.muted} num`}>
            {earnedCount} of {badges.length} earned
          </span>
        </div>
        {GROUPS.map((g) => {
          const Icon = g.icon
          return (
            <div key={g.id} className={styles.badgeGroup}>
              <h3 className={styles.groupTitle}>{g.label}</h3>
              <ul className={styles.badgeGrid}>
                {badges
                  .filter((b) => b.group === g.id)
                  .map((b) => (
                    <li key={b.id} className={`${styles.badge} ${b.earnedOn ? styles.earned : ''}`}>
                      <span className={styles.badgeIcon} aria-hidden="true">
                        {b.earnedOn ? <Icon size={20} /> : <Lock size={16} />}
                      </span>
                      <span className={styles.badgeName}>{b.name}</span>
                      <span className={styles.badgeText}>{b.description}</span>
                      <span className={`${styles.badgeStatus} num`}>
                        {b.earnedOn ? `Earned ${shortDate(b.earnedOn)}` : `${Math.min(b.current, b.target)} / ${b.target}`}
                        {b.earnedOn && (
                          <button
                            type="button"
                            className={styles.share}
                            aria-label={`Share ${b.name}`}
                            onClick={() =>
                              shareBadge(b, { name: profile.displayName, username: profile.username || 'lockin' })
                                .then((how) => how === 'downloaded' && toast('Badge image saved. Share it from your downloads.'))
                                .catch(() => toast('Could not make the badge image.'))
                            }
                          >
                            <Share2 size={13} aria-hidden="true" />
                            Share
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
