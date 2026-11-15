import { formatMinutes } from '../lib/profile'
import type { Goal } from '../lib/missions'
import { Tick } from '../components/Tick'
import styles from './Challenges.module.css'

/** One mission or challenge with its progress bar and XP reward. */
export function GoalRow({ goal, xp }: { goal: Goal; xp: number }) {
  const show = (n: number) => (goal.unit === 'min' ? formatMinutes(n) : String(n))
  return (
    <li className={`${styles.goal} ${goal.done ? styles.goalDone : ''}`}>
      <span className={styles.goalCheck} aria-hidden="true">
        {goal.done && <Tick drawn />}
      </span>
      <div className={styles.goalBody}>
        <div className={styles.goalHead}>
          <span className={styles.goalTitle}>{goal.title}</span>
          <span className={`${styles.goalXp} num`}>+{xp} XP</span>
        </div>
        <div
          className={styles.goalBar}
          role="progressbar"
          aria-label={goal.title}
          aria-valuemin={0}
          aria-valuemax={goal.target}
          aria-valuenow={goal.current}
        >
          <span style={{ width: `${(goal.current / goal.target) * 100}%` }} />
        </div>
        <span className={`${styles.goalCount} num`}>
          {goal.done ? 'Done' : `${show(goal.current)} of ${show(goal.target)}`}
        </span>
      </div>
    </li>
  )
}
