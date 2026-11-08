import { useSyncExternalStore } from 'react'

// Which room's page is open on this device, so presence can report "in the room" for it.
let viewing: string | null = null
const listeners = new Set<() => void>()

export function setViewingRoom(roomId: string | null) {
  viewing = roomId
  listeners.forEach((l) => l())
}

export function useViewingRoom(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => viewing,
  )
}
