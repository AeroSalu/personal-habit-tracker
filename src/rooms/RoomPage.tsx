import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Lock, Target } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { Avatar } from '../components/Avatar'
import { useProfiles } from '../data/friends'
import { useToast } from '../components/toast'
import { closeRoom, forgetRoom, leaveRoom, removeRoomMember, setRoomSession, useMyRooms, useRoomMembers, useRooms } from '../data/rooms'
import { timerText } from '../lib/focus'
import { formatMinutes } from '../lib/profile'
import {
  newSession,
  presenceOf,
  PRESENCE_LABEL,
  ROOM_SESSION_LENGTHS,
  roomProgress,
  sessionRemaining,
  sortMembers,
} from '../lib/rooms'
import { useFocus } from '../focus/focusContext'
import { loadPrefs, planFromPrefs } from '../focus/prefs'
import { setViewingRoom } from './viewing'
import ui from '../components/ui.module.css'
import styles from './Rooms.module.css'

/** A clock that ticks every second while the page is open, for the shared countdown. */
function useSecondClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function RoomPage() {
  const { id = '' } = useParams()
  const { user } = useSignedIn()
  const me = user.uid
  const navigate = useNavigate()
  const toast = useToast()
  const focus = useFocus()
  const now = useSecondClock()
  const myRooms = useMyRooms(me)
  const mine = myRooms.data.find((r) => r.id === id)
  const room = useRooms(mine ? [id] : []).get(`rooms/${id}`)
  const members = useRoomMembers(mine ? id : null)
  const cards = useProfiles(members.data.map((m) => m.uid))
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    setViewingRoom(id)
    return () => setViewingRoom(null)
  }, [id])

  const failed = () => toast('That didn’t go through. Check your connection.')

  if (!myRooms.loaded) return <section className={styles.page} aria-busy="true" />
  if (!mine) {
    return (
      <section className={styles.page}>
        <p className={styles.muted}>You’re not in this room. Join it with its code.</p>
        <Link to="/rooms" className={ui.button}>
          Back to rooms
        </Link>
      </section>
    )
  }
  if (room === null) {
    return (
      <section className={styles.page}>
        <h1>{mine.name}</h1>
        <p className={styles.muted}>This room was closed by its host.</p>
        <button type="button" className={ui.button} onClick={() => forgetRoom(me, id).then(() => navigate('/rooms'))}>
          Remove from my rooms
        </button>
      </section>
    )
  }
  if (!room) return <section className={styles.page} aria-busy="true" />

  const isHost = room.hostUid === me
  const left = sessionRemaining(room.session, now)
  const live = left > 0
  const inSession = focus.state?.plan.roomId === id
  const progress = roomProgress(members.data, room.goalMinutes)
  const people = sortMembers(members.data, now)
  const focusingCount = people.filter((m) => presenceOf(m, now) === 'focusing').length

  /** Starts my own timer for this room, ending with the shared session if there is one. */
  function lockIn(endsAt?: number) {
    const base = planFromPrefs(loadPrefs(), null)
    const minutes = endsAt ? Math.max(1, Math.round((endsAt - Date.now()) / 60_000)) : base.focusMinutes
    focus.start({ ...base, focusMinutes: minutes, roomId: id }, endsAt)
  }

  function startShared(minutes: number) {
    const session = newSession(minutes, Date.now())
    setRoomSession(id, session).catch(failed)
    lockIn(new Date(session.endsAt).getTime())
  }

  return (
    <section className={styles.page}>
      <Link to="/rooms" className={styles.back}>
        <ArrowLeft size={15} aria-hidden="true" /> Focus Rooms
      </Link>
      <header className={styles.roomHead}>
        <div>
          <h1>{room.name}</h1>
          <p className={`${styles.muted} num`}>
            {people.length} {people.length === 1 ? 'person' : 'people'} · {focusingCount} focusing now
          </p>
        </div>
        <button
          type="button"
          className={`${ui.button} ${ui.ghost}`}
          onClick={() =>
            navigator.clipboard
              .writeText(room.code)
              .then(() => toast(`Room code ${room.code} copied`))
              .catch(() => toast(`Room code: ${room.code}`))
          }
        >
          <Copy size={15} aria-hidden="true" /> <span className={`${styles.code} num`}>{room.code}</span>
        </button>
      </header>

      <div className={styles.columns}>
        <article className={`${ui.card} ${styles.card} ${styles.sessionCard}`}>
          {live ? (
            <>
              <p className={styles.eyebrow}>Shared session</p>
              <p className={`${styles.clock} num`}>{timerText(left)}</p>
              <p className={styles.muted}>Everyone who joins finishes together.</p>
              {inSession ? (
                <p className={styles.good}>You’re in the session.</p>
              ) : (
                <button type="button" className={`${ui.button} ${ui.primary} ${styles.big}`} onClick={() => lockIn(new Date(room.session!.endsAt).getTime())}>
                  <Lock size={17} aria-hidden="true" /> Join the session
                </button>
              )}
              {isHost && (
                <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setRoomSession(id, null).catch(failed)}>
                  End shared session
                </button>
              )}
            </>
          ) : (
            <>
              <p className={styles.eyebrow}>{isHost ? 'Start a shared session' : 'No shared session yet'}</p>
              {isHost ? (
                <div className={styles.lengths}>
                  {ROOM_SESSION_LENGTHS.map((m) => (
                    <button key={m} type="button" className={`${ui.button} ${ui.primary}`} onClick={() => startShared(m)}>
                      {m} min
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>When the host starts one, you can join and finish together.</p>
              )}
              {!inSession && (
                <button type="button" className={`${ui.button} ${styles.big}`} onClick={() => lockIn()}>
                  <Lock size={17} aria-hidden="true" /> Focus here on my own
                </button>
              )}
            </>
          )}

          {room.goalMinutes > 0 && (
            <div className={styles.goal}>
              <div className={styles.goalHead}>
                <span>
                  <Target size={15} aria-hidden="true" /> Room goal
                </span>
                <strong className="num">
                  {formatMinutes(progress.minutes)} of {formatMinutes(progress.goal)}
                </strong>
              </div>
              <div className={styles.bar} role="progressbar" aria-label="Room goal" aria-valuemin={0} aria-valuemax={progress.goal} aria-valuenow={progress.minutes}>
                <span style={{ width: `${progress.share * 100}%` }} />
              </div>
              {progress.done && <p className={styles.good}>Goal reached together.</p>}
            </div>
          )}
        </article>

        <article className={`${ui.card} ${styles.card}`}>
          <h2>In the room</h2>
          <ul className={styles.people}>
            {people.map((m) => {
              const p = presenceOf(m, now)
              return (
                <li key={m.uid}>
                  <Avatar name={m.displayName} photo={cards.get(`profiles/${m.uid}`)?.photo} size={34} />
                  <span className={`${styles.dot} ${styles[p]}`} aria-hidden="true" />
                  <span className={styles.who}>
                    <strong>
                      {m.uid === me ? `${m.displayName} (you)` : m.displayName}
                      {m.uid === room.hostUid && <span className={styles.host}>host</span>}
                    </strong>
                    <span className={`${styles.muted} num`}>
                      {PRESENCE_LABEL[p]}
                      {m.minutes ? ` · ${formatMinutes(m.minutes)} here` : ''}
                    </span>
                  </span>
                  {isHost && m.uid !== me && (
                    <button type="button" className={`${ui.button} ${ui.ghost} ${styles.small}`} onClick={() => removeRoomMember(id, m.uid).catch(failed)}>
                      Remove
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <div className={styles.leave}>
            {confirm ? (
              <span className={styles.confirm}>
                {isHost ? 'Close this room for everyone?' : 'Leave this room?'}
                <button
                  type="button"
                  className={`${ui.button} ${styles.danger}`}
                  onClick={() =>
                    (isHost ? closeRoom(me, room) : leaveRoom(me, id)).then(() => navigate('/rooms')).catch(failed)
                  }
                >
                  {isHost ? 'Close' : 'Leave'}
                </button>
                <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirm('')}>
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirm('yes')}>
                {isHost ? 'Close room' : 'Leave room'}
              </button>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
