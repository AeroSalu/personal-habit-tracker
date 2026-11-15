import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Award, Flame, UserMinus } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { Avatar } from '../components/Avatar'
import { useToast } from '../components/toast'
import { cheer, uncheer, useCheersOf } from '../data/cheers'
import { unfriend, useActivityOf, useFriendships, useProfiles, useStats } from '../data/friends'
import { BADGES } from '../lib/achievements'
import { dayKey } from '../lib/dates'
import { cheerSummary, friendOf } from '../lib/friends'
import { formatMinutes } from '../lib/profile'
import { currentWeekMinutes, currentWeekXp, isFocusingNow, weekColumns } from '../lib/social'
import { useNow } from '../lib/useNow'
import { ColumnChart } from '../analytics/charts/ColumnChart'
import { FeedRow } from './FeedRow'
import ui from '../components/ui.module.css'
import { PageSkeleton } from '../components/Skeleton'
import styles from './Friends.module.css'

/** A friend's profile: how their week is going, what they've pinned and shared, and cheers. */
export function FriendPage() {
  const { uid = '' } = useParams()
  const { user } = useSignedIn()
  const me = user.uid
  const navigate = useNavigate()
  const toast = useToast()
  const now = useNow()
  const today = dayKey(now)
  const [confirm, setConfirm] = useState(false)

  const friendships = useFriendships(me)
  const isFriend = friendships.data.some((f) => friendOf(f, me) === uid)
  const cards = useProfiles(uid ? [uid] : [])
  const statsDocs = useStats(isFriend ? [uid] : [])
  const activity = useActivityOf(isFriend ? uid : null)
  const cheers = useCheersOf(isFriend ? uid : null)

  if (uid === me) return <Navigate to="/profile" replace />

  const p = cards.get(`profiles/${uid}`)
  const s = statsDocs.get(`stats/${uid}`)
  const name = p?.displayName ?? 'Your friend'
  const first = name.trim().split(/\s+/)[0]
  const failed = () => toast('That didn’t go through. Check your connection.')

  const back = (
    <Link to="/friends" className={styles.back}>
      <ArrowLeft size={16} aria-hidden="true" /> Friends
    </Link>
  )

  if (!friendships.loaded || p === undefined) {
    return (
      <section className={styles.page} aria-busy="true">
        <PageSkeleton />
      </section>
    )
  }

  if (!isFriend || !p) {
    return (
      <section className={styles.page}>
        {back}
        <div className={`${ui.card} ${styles.card}`}>
          <h2>Not a friend</h2>
          <p className={styles.muted}>You can see someone’s profile once you’re friends. Find them by @username on the Friends page.</p>
        </div>
      </section>
    )
  }

  const focusing = s ? isFocusingNow(s, now.getTime()) : false
  const pinned = (s?.pinned ?? []).map((id) => BADGES.find((b) => b.id === id)).filter((b) => b !== undefined)
  const summary = cheerSummary(cheers.data, me)
  const nameOf = (id: string) => (id === me ? 'You' : id === uid ? first : 'Someone')

  return (
    <section className={`${styles.page} ${styles.friendPage}`}>
      {back}

      <article className={`${ui.card} ${styles.card} ${styles.profileHead}`}>
        <span className={styles.avatarWrap}>
          <Avatar name={name} photo={p.photo} size={88} />
          {focusing && <span className={`${styles.live} ${styles.liveBig}`} title="Focusing now" />}
        </span>
        <div className={styles.profileText}>
          <h1>{name}</h1>
          <p className={styles.muted}>
            @{p.username}
            {focusing ? ' · focusing now' : ''}
          </p>
          {s?.bio && <p className={styles.bio}>{s.bio}</p>}
        </div>
        {s && (
          <dl className={`${styles.friendStats} ${styles.profileStats}`}>
            <div>
              <dt>Level</dt>
              <dd className="num">{s.level}</dd>
            </div>
            <div>
              <dt>Streak</dt>
              <dd className="num">
                <Flame size={13} aria-hidden="true" /> {s.streak}
              </dd>
            </div>
            <div>
              <dt>This week</dt>
              <dd className="num">{formatMinutes(currentWeekMinutes(s, today))}</dd>
            </div>
            <div>
              <dt>Week XP</dt>
              <dd className="num">{currentWeekXp(s, today)}</dd>
            </div>
          </dl>
        )}
      </article>

      {pinned.length > 0 && (
        <article className={`${ui.card} ${styles.card}`}>
          <h2>Pinned badges</h2>
          <ul className={styles.pinnedList}>
            {pinned.map((b) => (
              <li key={b.id}>
                <span className={styles.pinIcon} aria-hidden="true">
                  <Award size={18} />
                </span>
                <span>
                  <strong>{b.name}</strong>
                  <small>{b.description}</small>
                </span>
              </li>
            ))}
          </ul>
        </article>
      )}

      {s && (
        <article className={`${ui.card} ${styles.card}`}>
          <h2>Focus this week</h2>
          <ColumnChart points={weekColumns(s, today)} label={`${first}’s focus minutes by day this week`} current={today} height={160} />
        </article>
      )}

      <article className={`${ui.card} ${styles.card}`}>
        <h2>Recently shared</h2>
        {activity.data.length ? (
          <ul className={styles.feed}>
            {activity.data.map((a, i) => (
              <FeedRow
                key={a.id}
                item={a}
                who={first}
                mine={false}
                index={i}
                now={now.getTime()}
                summary={summary.get(a.id)}
                nameOf={nameOf}
                onCheer={(e) => (e ? cheer(me, a, e) : uncheer(me, a.id)).catch(failed)}
              />
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>{first} hasn’t shared any tasks, habits or badges yet.</p>
        )}
      </article>

      <div className={styles.unfriend}>
        {confirm ? (
          <>
            <span>Remove {first} from your friends?</span>
            <button
              type="button"
              className={`${ui.button} ${styles.danger}`}
              onClick={() => {
                unfriend(me, uid).catch(failed)
                navigate('/friends')
              }}
            >
              Remove
            </button>
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirm(false)}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirm(true)}>
            <UserMinus size={16} aria-hidden="true" /> Remove friend
          </button>
        )}
      </div>
    </section>
  )
}
