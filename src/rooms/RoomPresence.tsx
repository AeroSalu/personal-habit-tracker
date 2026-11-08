import { useEffect } from 'react'
import { useSignedIn } from '../auth/authContext'
import { heartbeat, useMyRooms } from '../data/rooms'
import { HEARTBEAT_MS, type RoomState } from '../lib/rooms'
import { useFocus } from '../focus/focusContext'
import { useViewingRoom } from './viewing'

/**
 * Sends a heartbeat for the room this device is in: the one a focus session was joined from,
 * or else the room page that's open. Only the state is sent, never what you're working on.
 */
export function RoomPresence() {
  const { user } = useSignedIn()
  const focus = useFocus()
  const viewing = useViewingRoom()
  const myRooms = useMyRooms(user.uid)

  const fromSession = focus.state?.plan.roomId ?? null
  const roomId = fromSession ?? viewing
  const phase = focus.state?.phase
  const state: RoomState =
    fromSession && phase === 'focus' && focus.state?.phase === 'focus' && focus.state.pausedAt === null
      ? 'focusing'
      : fromSession && (phase === 'break' || phase === 'summary' || phase === 'breakOver')
        ? 'break'
        : 'idle'
  const member = Boolean(roomId && myRooms.data.some((r) => r.id === roomId))

  useEffect(() => {
    if (!roomId || !member) return
    const beat = () => heartbeat(roomId, user.uid, state).catch(() => {})
    beat()
    const timer = setInterval(beat, HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [roomId, member, state, user.uid])

  return null
}
