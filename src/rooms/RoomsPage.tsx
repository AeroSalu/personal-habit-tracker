import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, DoorOpen } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { createRoom, findRoomByCode, joinRoom, useMyRooms } from '../data/rooms'
import { CODE_PATTERN, normalizeCode } from '../lib/leaderboard'
import { formatMinutes } from '../lib/profile'
import { roomNameError } from '../lib/rooms'
import ui from '../components/ui.module.css'
import styles from './Rooms.module.css'

const GOALS = [60, 120, 240, 480]

export function RoomsPage() {
  const { user, profile } = useSignedIn()
  const navigate = useNavigate()
  const rooms = useMyRooms(user.uid)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState(120)
  const [code, setCode] = useState('')
  const [found, setFound] = useState<{ roomId: string; name: string } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const me = { uid: user.uid, username: profile.username, displayName: profile.displayName }

  async function create(e: FormEvent) {
    e.preventDefault()
    const problem = roomNameError(name)
    setNote(problem)
    if (problem) return
    setBusy(true)
    try {
      const room = await createRoom(me, name, goal)
      navigate(`/rooms/${room.id}`)
    } catch {
      setNote('Could not open the room. Rooms need a connection; try again when you’re online.')
      setBusy(false)
    }
  }

  async function lookUp(e: FormEvent) {
    e.preventDefault()
    const c = normalizeCode(code)
    setCode(c)
    setFound(null)
    if (!CODE_PATTERN.test(c)) {
      setNote('Room codes are 6 letters and numbers.')
      return
    }
    setBusy(true)
    setNote('')
    try {
      const room = await findRoomByCode(c)
      if (!room) setNote('No room has that code. Check it with whoever invited you.')
      else if (rooms.data.some((r) => r.id === room.roomId)) navigate(`/rooms/${room.roomId}`)
      else setFound(room)
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
      await joinRoom(me, found.roomId, code, found.name)
      navigate(`/rooms/${found.roomId}`)
    } catch {
      setNote('Could not join. The room may have closed; ask for a new code.')
      setBusy(false)
    }
  }

  if (!profile.username) {
    return (
      <section className={styles.page}>
        <h1>Focus Rooms</h1>
        <div className={`${ui.card} ${styles.card}`}>
          <h2>Choose a username first</h2>
          <p className={styles.muted}>Others in a room see your name and username.</p>
          <Link to="/profile" className={`${ui.button} ${ui.primary}`}>
            Choose a username
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <header>
        <h1>Focus Rooms</h1>
        <p className={styles.muted}>
          Lock in together. Everyone sees who’s focusing, never what they’re working on.
        </p>
      </header>

      <div className={styles.columns}>
        <article className={`${ui.card} ${styles.card}`}>
          <h2>Your rooms</h2>
          {rooms.data.length ? (
            <ul className={styles.roomList}>
              {rooms.data.map((r) => (
                <li key={r.id}>
                  <Link to={`/rooms/${r.id}`} className={styles.roomLink}>
                    <DoorOpen size={18} aria-hidden="true" />
                    <span>
                      <strong>{r.name}</strong>
                      <span className={`${styles.muted} num`}>Code {r.code}</span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Open a room and share its code, or join one with a code from a friend.</p>
          )}
        </article>

        <article className={`${ui.card} ${styles.card}`}>
          <form className={styles.form} onSubmit={lookUp} noValidate>
            <label className={ui.field}>
              <span className={ui.label}>Join with a code</span>
              <input
                id="room-code"
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
                Join room
              </button>
            </div>
          )}

          <form className={styles.form} onSubmit={create} noValidate>
            <label className={ui.field}>
              <span className={ui.label}>Open a room</span>
              <input
                id="room-name"
                className={ui.input}
                value={name}
                maxLength={40}
                placeholder="DSA Lock-in"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Shared goal</span>
              <select id="room-goal" className={ui.input} value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
                <option value={0}>None</option>
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {formatMinutes(g)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={`${ui.button} ${ui.primary}`} disabled={busy}>
              Open
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
