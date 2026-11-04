import { useEffect, useState } from 'react'
import { doc, onSnapshot, type DocumentData, type Query } from 'firebase/firestore'
import { db } from '../firebase'

type Result<T> = { data: T[]; loaded: boolean }

/**
 * Live results of a shared-collection query. `key` identifies the query; a new key starts
 * a new listener, and null means "nothing to listen to".
 */
export function useLiveQuery<T>(key: string | null, make: () => Query, toRow: (id: string, d: DocumentData) => T): Result<T> {
  const [result, setResult] = useState<Result<T> & { key: string | null }>({ data: [], loaded: false, key: null })

  useEffect(() => {
    if (key === null) return
    return onSnapshot(
      make(),
      (snap) => setResult({ data: snap.docs.map((d) => toRow(d.id, d.data())), loaded: true, key }),
      () => setResult({ data: [], loaded: true, key }),
    )
    // The query is described by `key`; `make` and `toRow` are rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (key === null) return { data: [], loaded: true }
  return result.key === key ? result : { data: [], loaded: false }
}

/** Live copies of several documents by path. Missing or unreadable ones map to null. */
export function useLiveDocs<T>(paths: string[], toRow: (id: string, d: DocumentData) => T): Map<string, T | null> {
  const key = paths.join('|')
  const [docs, setDocs] = useState<Map<string, T | null>>(new Map())

  useEffect(() => {
    if (!key) {
      setDocs(new Map())
      return
    }
    const stops = key.split('|').map((path) =>
      onSnapshot(
        doc(db, path),
        (snap) =>
          setDocs((m) => new Map(m).set(path, snap.exists() ? toRow(snap.id, snap.data()) : null)),
        () => setDocs((m) => new Map(m).set(path, null)),
      ),
    )
    return () => stops.forEach((stop) => stop())
    // Keyed by the joined paths; `toRow` is a module-level mapper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return docs
}
