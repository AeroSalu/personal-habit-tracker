import { useState, type FormEvent } from 'react'
import { AtSign, Flame, Trophy } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { Avatar } from '../components/Avatar'
import { claimUsername, setShareAchievements, UsernameTaken } from '../data/social'
import { lockInStreak } from '../lib/dashboard'
import { formatMinutes } from '../lib/profile'
import { normalizeUsername, publicStats, usernameError } from '../lib/social'
import { useGame } from '../game/useGame'
import ui from '../components/ui.module.css'
import styles from './ProfilePage.module.css'

/** Username, what friends can see, and whether achievements are shared. */
export function SocialSettings() {
  const { user, profile } = useSignedIn()
  const { ix, xp, level, badges, today } = useGame()
  const [value, setValue] = useState(profile.username)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const preview = publicStats(ix, {
    level: level.level,
    xp: xp.total,
    badges: badges.filter((b) => b.earnedOn).map((b) => b.id),
    streak: lockInStreak(new Set(ix.lockIn), today).current,
    focusingUntil: null,
    bio: profile.bio,
    pinned: profile.pinned,
  })
  const pinnedNames = preview.pinned.map((id) => badges.find((b) => b.id === id)?.name ?? id)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const name = normalizeUsername(value)
    setValue(name)
    setNotice('')
    const problem = usernameError(name)
    setError(problem)
    if (problem || name === profile.username) return
    setBusy(true)
    try {
      await claimUsername(user.uid, name, profile.username, {
        displayName: profile.displayName,
        level: level.level,
        photo: profile.photo,
      })
      setNotice(`You're @${name}.`)
    } catch (err) {
      const code = (err as { code?: string })?.code
      setError(
        err instanceof UsernameTaken || code === 'permission-denied'
          ? `@${name} is taken. Try another.`
          : 'Could not check that name. Usernames need a connection; try again when you’re online.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`${ui.card} ${styles.section}`}>
      <h2>Friends &amp; sharing</h2>
      <form className={styles.usernameForm} onSubmit={submit} noValidate>
        <label className={ui.field}>
          <span className={ui.label}>Username</span>
          <span className={styles.atInput}>
            <AtSign size={16} aria-hidden="true" />
            <input
              id="username"
              value={value}
              maxLength={21}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="choose_a_name"
              onChange={(e) => setValue(e.target.value)}
            />
          </span>
        </label>
        <button type="submit" className={ui.button} disabled={busy} aria-busy={busy}>
          {profile.username ? 'Change' : 'Claim'}
        </button>
      </form>
      <p className={ui.error} role="alert">
        {error}
      </p>
      {notice && (
        <p className={styles.status} role="status">
          {notice}
        </p>
      )}
      <p className={styles.help}>
        {profile.username
          ? 'Friends find you by this name.'
          : 'Pick a username so friends can find you. Until then, nothing about you is shared.'}{' '}
        3–20 letters, numbers or underscores.
      </p>

      <div className={styles.preview} aria-label="What friends see">
        <p className={styles.previewTitle}>What friends see</p>
        <div className={styles.previewCard}>
          <Avatar name={profile.displayName} photo={profile.photo} />
          <div className={styles.previewText}>
            <strong>{profile.displayName}</strong>
            <span>{profile.username ? `@${profile.username}` : 'No username yet'}</span>
            {preview.bio && <span className={styles.previewBio}>{preview.bio}</span>}
          </div>
        </div>
        <ul className={styles.previewStats}>
          <li>
            <Trophy size={14} aria-hidden="true" /> Level {preview.level} · {preview.badges.length} badge
            {preview.badges.length === 1 ? '' : 's'}
          </li>
          {pinnedNames.length > 0 && <li>Pinned: {pinnedNames.join(' · ')}</li>}
          <li className="num">This week: {preview.weekXp} XP, {formatMinutes(preview.weekFocusMinutes)} focus</li>
          <li>
            <Flame size={14} aria-hidden="true" /> {preview.streak}-day streak · whether you’re focusing right now
          </li>
        </ul>
        <p className={styles.help}>Never your task names, notes or habits, unless you share a specific one.</p>
      </div>

      <label className={styles.toggle}>
        <input
          id="share-achievements"
          type="checkbox"
          role="switch"
          className={ui.switch}
          checked={profile.shareAchievements}
          onChange={(e) => setShareAchievements(user.uid, e.target.checked).catch(() => setError('Could not save that setting.'))}
        />
        <span>
          <strong>Share achievements</strong>
          <small>Post new badges and level-ups to your friends’ feed.</small>
        </span>
      </label>
    </div>
  )
}
