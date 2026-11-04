import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Crown, Medal, Target, Users } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import { useFriendships, useProfiles, useStats } from '../data/friends'
import {
  createGroup,
  deleteGroup,
  findGroupByCode,
  forgetGroup,
  joinGroup,
  leaveGroup,
  removeMember,
  setGroupTarget,
  useGroups,
  useMembers,
  useMyGroups,
  type Group,
  type MyGroup,
} from '../data/groups'
import { lockInStreak } from '../lib/dashboard'
import { dayKey, parseDay } from '../lib/dates'
import { friendOf } from '../lib/friends'
import {
  challengeProgress,
  groupNameError,
  METRIC_LABEL,
  normalizeCode,
  rank,
  CODE_PATTERN,
  type Entry,
  type Metric,
} from '../lib/leaderboard'
import { formatMinutes } from '../lib/profile'
import { publicStats } from '../lib/social'
import { useNow } from '../lib/useNow'
import { useGame } from '../game/useGame'
import ui from '../components/ui.module.css'
import styles from './Leaderboard.module.css'

const TARGETS = [600, 1200, 2400, 4800]
const show = (metric: Metric, v: number) => (metric === 'weekFocus' ? formatMinutes(v) : `${v} XP`)

function Board({ entries, metric, today, me }: { entries: Entry[]; metric: Metric; today: string; me: string }) {
  const ranked = rank(entries, metric, today)
  if (ranked.length < 2) {
    return <p className={styles.muted}>It’s just you so far. Add friends or invite people to a group to compete.</p>
  }
  return (
    <ol className={styles.board}>
      {ranked.map((e) => (
        <li key={e.uid} className={e.uid === me ? styles.me : ''}>
          <span className={`${styles.rank} num`} aria-label={`Rank ${e.rank}`}>
            {e.rank === 1 && e.value > 0 ? <Crown size={16} aria-hidden="true" /> : e.rank}
          </span>
          <span className={styles.avatar} aria-hidden="true">
            {e.name.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <span className={styles.who}>
            <strong>{e.uid === me ? `${e.name} (you)` : e.name}</strong>
            <span>@{e.username}</span>
          </span>
          <strong className={`${styles.value} num`}>{show(metric, e.value)}</strong>
        </li>
      ))}
    </ol>
  )
}

function GroupBoard({ group, my, metric, today, me, isOwner }: { group: Group; my: MyGroup; metric: Metric; today: string; me: string; isOwner: boolean }) {
  const toast = useToast()
  const members = useMembers(group.id)
  const [confirm, setConfirm] = useState('')
  const entries: Entry[] = members.data.map((m) => ({ uid: m.uid, name: m.displayName, username: m.username, stats: m }))
  const progress = challengeProgress(entries, group.targetMinutes, today)
  const failed = () => toast('That didn’t go through. Check your connection.')

  return (
    <>
      {group.targetMinutes > 0 && (
        <div className={styles.challenge}>
          <div className={styles.challengeHead}>
            <span>
              <Target size={15} aria-hidden="true" /> Group goal this week
            </span>
            <strong className="num">
              {formatMinutes(progress.minutes)} of {formatMinutes(progress.target)}
            </strong>
          </div>
          <div className={styles.bar} role="progressbar" aria-label="Group goal" aria-valuemin={0} aria-valuemax={progress.target} aria-valuenow={progress.minutes}>
            <span style={{ width: `${progress.share * 100}%` }} />
          </div>
          {progress.done && <p className={styles.good}>Goal reached. Nice work, everyone.</p>}
        </div>
      )}
      <Board entries={entries} metric={metric} today={today} me={me} />
      <div className={styles.groupTools}>
        <button
          type="button"
          className={`${ui.button} ${ui.ghost}`}
          onClick={() =>
            navigator.clipboard
              .writeText(my.code)
              .then(() => toast(`Invite code ${my.code} copied`))
              .catch(() => toast(`Invite code: ${my.code}`))
          }
        >
          <Copy size={15} aria-hidden="true" /> Code <span className={`${styles.code} num`}>{my.code}</span>
        </button>
        {isOwner && (
          <label className={styles.targetPick}>
            Weekly goal
            <select
              id={`target-${group.id}`}
              value={TARGETS.includes(group.targetMinutes) ? group.targetMinutes : 0}
              onChange={(e) => setGroupTarget(group.id, Number(e.target.value)).catch(failed)}
            >
              <option value={0}>None</option>
              {TARGETS.map((t) => (
                <option key={t} value={t}>
                  {formatMinutes(t)} together
                </option>
              ))}
            </select>
          </label>
        )}
        {confirm === 'leave' ? (
          <span className={styles.confirm}>
            {isOwner ? 'Delete this group for everyone?' : 'Leave this group?'}
            <button
              type="button"
              className={`${ui.button} ${styles.danger}`}
              onClick={() => (isOwner ? deleteGroup(me, group) : leaveGroup(me, group.id)).catch(failed)}
            >
              {isOwner ? 'Delete' : 'Leave'}
            </button>
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirm('')}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirm('leave')}>
            {isOwner ? 'Delete group' : 'Leave group'}
          </button>
        )}
      </div>
      {isOwner && members.data.length > 1 && (
        <details className={styles.manage}>
          <summary>Manage members</summary>
          <ul>
            {members.data
              .filter((m) => m.uid !== me)
              .map((m) => (
                <li key={m.uid}>
                  <span>
                    {m.displayName} <span className={styles.muted}>@{m.username}</span>
                  </span>
                  <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => removeMember(group.id, m.uid).catch(failed)}>
                    Remove
                  </button>
                </li>
              ))}
          </ul>
        </details>
      )}
    </>
  )
}

export function LeaderboardPage() {
  const { user, profile } = useSignedIn()
  const me = user.uid
  const toast = useToast()
  const today = dayKey(useNow())
  const { ix, xp, level, badges } = useGame()

  const friendships = useFriendships(me)
  const friendIds = friendships.data.map((f) => friendOf(f, me))
  const profiles = useProfiles(friendIds)
  const stats = useStats(friendIds)
  const myGroups = useMyGroups(me)
  const groups = useGroups(myGroups.data.map((g) => g.id))

  const [scope, setScope] = useState('friends')
  const [metric, setMetric] = useState<Metric>('weekXp')
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState(1200)
  const [code, setCode] = useState('')
  const [found, setFound] = useState<{ groupId: string; name: string } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  // My own row uses numbers worked out on this device, so it's never behind.
  const mine = publicStats(ix, {
    level: level.level,
    xp: xp.total,
    badges: badges.filter((b) => b.earnedOn).map((b) => b.id),
    streak: lockInStreak(new Set(ix.lockIn), today).current,
    focusingUntil: null,
  })
  const meCard = { uid: me, username: profile.username, displayName: profile.displayName }
  const friendEntries: Entry[] = [
    { uid: me, name: profile.displayName, username: profile.username, stats: mine },
    ...friendIds.map((uid) => {
      const p = profiles.get(`profiles/${uid}`)
      return { uid, name: p?.displayName ?? 'Friend', username: p?.username ?? '', stats: stats.get(`stats/${uid}`) ?? null }
    }),
  ]
  const season = parseDay(`${today.slice(0, 7)}-01`).toLocaleDateString('en-US', { month: 'long' })
  const activeGroup = myGroups.data.find((g) => g.id === scope)
  const activeDoc = activeGroup ? groups.get(`groups/${activeGroup.id}`) : undefined

  async function create(e: FormEvent) {
    e.preventDefault()
    const problem = groupNameError(newName)
    setNote(problem)
    if (problem) return
    setBusy(true)
    try {
      const g = await createGroup(meCard, newName, newTarget, mine)
      setNewName('')
      setScope(g.id)
      toast(`Group created. Invite code: ${g.code}`)
    } catch {
      setNote('Could not create the group. Groups need a connection; try again when you’re online.')
    } finally {
      setBusy(false)
    }
  }

  async function lookUp(e: FormEvent) {
    e.preventDefault()
    const c = normalizeCode(code)
    setCode(c)
    setFound(null)
    if (!CODE_PATTERN.test(c)) {
      setNote('Invite codes are 6 letters and numbers.')
      return
    }
    setBusy(true)
    setNote('')
    try {
      const g = await findGroupByCode(c)
      if (!g) setNote('No group has that code. Check it with whoever invited you.')
      else if (myGroups.data.some((m) => m.id === g.groupId)) setNote(`You’re already in ${g.name}.`)
      else setFound(g)
    } catch {
      setNote('Looking up codes needs a connection.')
    } finally {
      setBusy(false)
    }
  }

  async function join() {
    if (!found) return
    setBusy(true)
    try {
      await joinGroup(meCard, found.groupId, code, found.name, mine)
      setScope(found.groupId)
      setFound(null)
      setCode('')
      toast(`You joined ${found.name}`)
    } catch {
      setNote('Could not join. The code may have changed; ask for a new one.')
    } finally {
      setBusy(false)
    }
  }

  if (!profile.username) {
    return (
      <section className={styles.page}>
        <h1>Leaderboard</h1>
        <div className={`${ui.card} ${styles.card}`}>
          <h2>Choose a username first</h2>
          <p className={styles.muted}>Leaderboards rank you against friends and groups by your username.</p>
          <Link to="/profile" className={`${ui.button} ${ui.primary}`}>
            Choose a username
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1>Leaderboard</h1>
        <p className={styles.muted}>Weekly boards reset every Monday; the season runs for the month.</p>
      </header>

      <div className={styles.columns}>
        <article className={`${ui.card} ${styles.card}`}>
          <div className={styles.scopes} role="group" aria-label="Board">
            <button type="button" aria-pressed={scope === 'friends'} onClick={() => setScope('friends')}>
              <Users size={14} aria-hidden="true" /> Friends
            </button>
            {myGroups.data.map((g) => (
              <button key={g.id} type="button" aria-pressed={scope === g.id} onClick={() => setScope(g.id)}>
                {g.name}
              </button>
            ))}
          </div>
          <div className={styles.metrics} role="group" aria-label="Rank by">
            {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
              <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)}>
                {m === 'seasonXp' ? `${season} season` : METRIC_LABEL[m]}
              </button>
            ))}
          </div>

          {scope === 'friends' || !activeGroup ? (
            <Board entries={friendEntries} metric={metric} today={today} me={me} />
          ) : activeDoc === null ? (
            <div className={styles.gone}>
              <p>{activeGroup.name} was deleted by its owner.</p>
              <button type="button" className={ui.button} onClick={() => forgetGroup(me, activeGroup.id).then(() => setScope('friends'))}>
                Remove from my list
              </button>
            </div>
          ) : activeDoc ? (
            <GroupBoard group={activeDoc} my={activeGroup} metric={metric} today={today} me={me} isOwner={activeDoc.ownerUid === me} />
          ) : (
            <p className={styles.muted}>Loading…</p>
          )}
        </article>

        <article className={`${ui.card} ${styles.card}`}>
          <h2>
            <Medal size={16} aria-hidden="true" /> Groups
          </h2>
          <p className={styles.muted}>Private boards for a study group, team or gym crew. People join with your invite code.</p>

          <form className={styles.form} onSubmit={lookUp} noValidate>
            <label className={ui.field}>
              <span className={ui.label}>Join with a code</span>
              <input
                id="group-code"
                className={`${ui.input} ${styles.codeInput}`}
                value={code}
                maxLength={8}
                placeholder="K7MQ2X"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button type="submit" className={ui.button} disabled={busy}>
              Find
            </button>
          </form>
          {found && (
            <div className={styles.found}>
              <span>
                Join <strong>{found.name}</strong>?
              </span>
              <button type="button" className={`${ui.button} ${ui.primary}`} disabled={busy} onClick={join}>
                Join group
              </button>
            </div>
          )}

          <form className={styles.form} onSubmit={create} noValidate>
            <label className={ui.field}>
              <span className={ui.label}>Start a group</span>
              <input
                id="group-name"
                className={ui.input}
                value={newName}
                maxLength={40}
                placeholder="DSA study crew"
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Weekly goal</span>
              <select id="group-target" className={ui.input} value={newTarget} onChange={(e) => setNewTarget(Number(e.target.value))}>
                <option value={0}>None</option>
                {TARGETS.map((t) => (
                  <option key={t} value={t}>
                    {formatMinutes(t)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={busy}>
              Create
            </button>
          </form>
          <p className={ui.error} role="alert">
            {note}
          </p>
        </article>
      </div>
    </section>
  )
}
