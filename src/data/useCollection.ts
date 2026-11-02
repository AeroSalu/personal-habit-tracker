import { useEffect, useState } from 'react'
import { collection, onSnapshot, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'

type Result<T> = { data: T[]; loaded: boolean }

/**
 * Live rows of users/{uid}/{name}. `toRow` turns a stored document into a typed row,
 * filling gaps so older documents still load.
 */
export function useUserCollection<T>(
  uid: string,
  name: string,
  toRow: (id: string, data: DocumentData) => T,
): Result<T> {
  const [result, setResult] = useState<Result<T> & { key: string }>({ data: [], loaded: false, key: '' })
  const key = `${uid}/${name}`

  useEffect(() => {
    return onSnapshot(
      collection(db, 'users', uid, name),
      (snap) => setResult({ data: snap.docs.map((d) => toRow(d.id, d.data())), loaded: true, key }),
      () => setResult({ data: [], loaded: true, key }),
    )
    // toRow is a module-level mapper; re-subscribing when it changes identity is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return result.key === key ? result : { data: [], loaded: false }
}
