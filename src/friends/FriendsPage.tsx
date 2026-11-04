import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, Flame, Repeat, Search, TrendingUp, UserMinus } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { useToast } from '../components/toast'
import {
  acceptRequest,
  declineRequest,
  findByUsername,
  sendRequest,
  unfriend,
  useActivityOf,
  useFriendships,
  useIncomingRequests,
  useOutgoingRequests,
  useProfiles,
  useStats,
  withdrawRequest,
  type PublicProfile,
} from '../data/friends'
import { dayKey } from '../lib/dates'
import { activityVerb, friendOf, mergeFeed, relation, timeAgo, type Activity } from '../lib/friends'
import { formatMinutes } from '../lib/profile'
import { currentWeekMinutes, currentWeekXp, isFocusingNow, normalizeUsername, usernameError } from '../lib/social'
import { useNow } from '../lib/useNow'
import ui from '../components/ui.module.css'
import styles from './Friends.module.css'

const ICONS = { task: CheckCircle2, habit: Repeat, badge: Award, level: TrendingUp }

/** One activity listener per person, reporting up; the rules only allow per-person queries. */
function ActivitySource({ uid, onData }: { uid: string; onData: (uid: string, items: Activity[]) => void }) {
  const { data, loaded } = useActivityOf(uid)
  const key = data.map((d) => d.id + d.at).join()
  useEffect(() => {
    if (loaded) onData(uid, data)
    // Reports when the list's contents change, which `key` captures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, key, uid, onData])
  return null
}

function Avatar({ name }: { name: string }) {
  return (
    <span className={styles.avatar} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

export function FriendsPage() {
  const { user, profile } = useSignedIn()
  const me = user.uid
  const toast = useToast()
  const now = useNow()
  const today = dayKey(now)

  const friendships = useFriendships(me)
  const incoming = useIncomingRequests(me)
  const outgoing = useOutgoingRequests(me)
  const friendIds = friendships.data.map((f) => friendOf(f, me))
  const profiles = useProfiles(friendIds)
  const stats = useStats(friendIds)

  const [term, setTerm] = useState('')
  const [found, setFound] = useState<PublicProfile | null>(null)
  const [searchNote, setSearchNote] = useState('')
  const [searching, setSearching] = useState(false)
  const [confirmUnfriend, setConfirmUnfriend] = useState('')
  const [feeds, setFeeds] = useState<Record<string, Activity[]>>({})

  const onData = useCallback((uid: string, items: Activity[]) => {
    setFeeds((f) => {
      const before = f[uid]
      if (before && before.length === items.length && before.every((a, i) => a.id === items[i].id && a.at === items[i].at)) return f
      return { ...f, [uid]: items }
    })
  }, [])

  const failed = () => toast('That didn’t go through. Check your connection.')
  const pendingIn = incoming.data.filter((r) => r.status === 'pending')
  const state = { friends: friendIds, incoming: incoming.data, outgoing: outgoing.data }
  const nameOf = (uid: string) => (uid === me ? 'You' : profiles.get(`profiles/${uid}`)?.displayName ?? 'A friend')
  const feed = mergeFeed(
    [me, ...friendIds].map((uid) => feeds[uid] ?? []),
    40,
  )

  async function search(e: FormEvent) {
    e.preventDefault()
    const name = normalizeUsername(term)
    setFound(null)
    const problem = usernameError(name)
    if (problem) {
      setSearchNote(problem)
      return
    }
    setSearching(true)
    setSearchNote('')
    try {
      const result = await findByUsername(name)
      if (result) setFound(result)
      else setSearchNote(`Nobody is @${name} yet.`)
    } catch {
      setSearchNote('Search needs a connection. Try again when you’re online.')
    } finally {
      setSearching(false)
    }
  }

  if (!profile.username) {
    return (
      <section className={styles.page}>
        <h1>Friends</h1>
        <div className={`${ui.card} ${styles.card}`}>
          <h2>Choose a username first</h2>
          <p className={styles.muted}>Friends find you by your username. Until you have one, nothing about you is shared.</p>
          <Link to="/profile" className={`${ui.button} ${ui.primary}`}>
            Choose a username
          </Link>
        </div>
      </section>
    )
  }

  const rel = found ? relation(me, found.uid, state) : 'none'
  const incomingFromFound = found ? pendingIn.find((r) => r.from === found.uid) : undefined

  return (
    <section className={styles.page}>
      {[me, ...friendIds].map((uid) => (
        <ActivitySource key={uid} uid={uid} onData={onData} />
      ))}

      <header className={styles.head}>
        <div>
          <h1>Friends</h1>
          <p className={styles.muted}>You’re @{profile.username}</p>
        </div>
      </header>

      <div className={styles.columns}>
        <div className={styles.side}>
          <article className={`${ui.card} ${styles.card}`}>
            <h2>Add a friend</h2>
            <form className={styles.search} onSubmit={search} noValidate>
              <label className={styles.searchField}>
                <Search size={16} aria-hidden="true" />
                <input
                  id="friend-search"
                  value={term}
                  placeholder="@username"
                  aria-label="Username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setTerm(e.target.value)}
                />
              </label>
              <button type="submit" className={ui.button} disabled={searching}>
                Find
              </button>
            </form>
            {searchNote && <p className={styles.muted}>{searchNote}</p>}
            {found && (
              <div className={styles.person}>
                <Avatar name={found.displayName} />
                <div className={styles.personText}>
                  <strong>{found.displayName}</strong>
                  <span>
                    @{found.username} · Level {found.level}
                  </span>
                </div>
                {rel === 'self' && <span className={styles.muted}>That’s you</span>}
                {rel === 'friend' && <span className={styles.tag}>Friends</span>}
                {(rel === 'outgoing' || rel === 'declined') && <span className={styles.tag}>Request sent</span>}
                {rel === 'incoming' && incomingFromFound && (
                  <button
                    type="button"
                    className={`${ui.button} ${ui.primary}`}
                    onClick={() => acceptRequest(me, incomingFromFound).catch(failed)}
                  >
                    Accept
                  </button>
                )}
                {rel === 'none' && (
                  <button
                    type="button"
                    className={`${ui.button} ${ui.primary}`}
                    onClick={() => {
                      sendRequest({ uid: me, username: profile.username, displayName: profile.displayName }, found).catch(failed)
                      toast(`Request sent to @${found.username}`)
                    }}
                  >
                    Add friend
                  </button>
                )}
              </div>
            )}
          </article>

          {(pendingIn.length > 0 || outgoing.data.length > 0) && (
            <article className={`${ui.card} ${styles.card}`}>
              <h2>Requests</h2>
              <ul className={styles.list}>
                {pendingIn.map((r) => (
                  <li key={r.id} className={styles.person}>
                    <Avatar name={r.fromName} />
                    <div className={styles.personText}>
                      <strong>{r.fromName}</strong>
                      <span>@{r.fromUsername} wants to be friends</span>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${ui.button} ${ui.primary}`}
                        onClick={() => acceptRequest(me, r, outgoing.data.find((o) => o.to === r.from)).catch(failed)}
                      >
                        Accept
                      </button>
                      <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => declineRequest(r).catch(failed)}>
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
                {outgoing.data.map((r) => (
                  <li key={r.id} className={styles.person}>
                    <Avatar name={r.toUsername} />
                    <div className={styles.personText}>
                      <strong>@{r.toUsername}</strong>
                      <span>Request sent</span>
                    </div>
                    <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => withdrawRequest(r).catch(failed)}>
                      Withdraw
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          )}

          <article className={`${ui.card} ${styles.card}`}>
            <h2>
              Your friends <span className={`${styles.count} num`}>{friendIds.length}</span>
            </h2>
            {!friendIds.length ? (
              <p className={styles.muted}>Search for a friend’s @username to add them. They’ll see your level, streak and weekly focus.</p>
            ) : (
              <ul className={styles.list}>
                {friendIds.map((uid) => {
                  const p = profiles.get(`profiles/${uid}`)
                  const s = stats.get(`stats/${uid}`)
                  const focusing = s ? isFocusingNow(s, now.getTime()) : false
                  return (
                    <li key={uid} className={styles.friend}>
                      <div className={styles.person}>
                        <span className={styles.avatarWrap}>
                          <Avatar name={p?.displayName ?? '?'} />
                          {focusing && <span className={styles.live} title="Focusing now" />}
                        </span>
                        <div className={styles.personText}>
                          <strong>{p?.displayName ?? 'Loading…'}</strong>
                          <span>
                            {p ? `@${p.username}` : ''}
                            {focusing ? ' · focusing now' : ''}
                          </span>
                        </div>
                        {confirmUnfriend === uid ? (
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={`${ui.button} ${styles.danger}`}
                              onClick={() => {
                                unfriend(me, uid).catch(failed)
                                setConfirmUnfriend('')
                              }}
                            >
                              Remove
                            </button>
                            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setConfirmUnfriend('')}>
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={styles.iconButton}
                            aria-label={`Remove ${p?.displayName ?? 'friend'}`}
                            onClick={() => setConfirmUnfriend(uid)}
                          >
                            <UserMinus size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {s ? (
                        <dl className={styles.friendStats}>
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
                      ) : (
                        <p className={styles.muted}>No stats yet.</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </article>
        </div>

        <article className={`${ui.card} ${styles.card} ${styles.feedCard}`}>
          <h2>Activity</h2>
          {!feed.length ? (
            <p className={styles.muted}>
              When you or your friends finish shared tasks and habits, or earn badges, they show up here. Turn on “Share with
              friends” on a task or habit to add yours.
            </p>
          ) : (
            <ul className={styles.feed}>
              {feed.map((a) => {
                const Icon = ICONS[a.kind]
                return (
                  <li key={a.id}>
                    <span className={`${styles.feedIcon} ${styles[a.kind]}`} aria-hidden="true">
                      <Icon size={15} />
                    </span>
                    <p>
                      <strong>{nameOf(a.uid)}</strong> {activityVerb(a)} <strong>{a.title}</strong>
                      {a.kind === 'badge' ? ' badge' : ''}
                    </p>
                    <time className={styles.when} dateTime={a.at}>
                      {timeAgo(a.at, now.getTime())}
                    </time>
                  </li>
                )
              })}
            </ul>
          )}
        </article>
      </div>
    </section>
  )
}
