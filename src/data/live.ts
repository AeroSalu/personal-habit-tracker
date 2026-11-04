import { useEffect, useState } from 'react'
import { doc, onSnapshot, type DocumentData, type Query } from 'firebase/firestore'
import { db } from '../firebase'

type Result<T> = { data: T[]; loaded: boolean }

/** Retry delays after a refused listen, e.g. a read that raced the write that grants access. */
const RETRY_MS = [800, 2000, 5000]

/**
 * Live results of a shared-collection query. `key` identifies the query; a new key starts
 * a new listener, and null means "nothing to listen to".
 */
export function useLiveQuery<T>(key: string | null, make: () => Query, toRow: (id: string, d: DocumentData) => T): Result<T> {
  const [result, setResult] = useState<Result<T> & { key: string | null }>({ data: [], loaded: false, key: null })

  useEffect(() => {
    if (key === null) return
    let stop = () => {}
    let timer: ReturnType<typeof setTimeout> | undefined
    const listen = (attempt: number) => {
      stop = onSnapshot(
        make(),
        (snap) => setResult({ data: snap.docs.map((d) => toRow(d.id, d.data())), loaded: true, key }),
        () => {
          if (attempt < RETRY_MS.length) timer = setTimeout(() => listen(attempt + 1), RETRY_MS[attempt])
          else setResult({ data: [], loaded: true, key })
        },
      )
    }
    listen(0)
    return () => {
      clearTimeout(timer)
      stop()
    }
    // The query is described by `key`; `make` and `toRow` are rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (key === null) return { data: [], loaded: true }
  return result.key === key ? result : { data: [], loaded: false }
}

/**
 * Live copies of several documents by path. A document maps to null only once the server
 * confirms it doesn't exist (or reading keeps being refused); until then it's undefined.
 */
export function useLiveDocs<T>(paths: string[], toRow: (id: string, d: DocumentData) => T): Map<string, T | null> {
  const key = paths.join('|')
  const [docs, setDocs] = useState<Map<string, T | null>>(new Map())

  useEffect(() => {
    if (!key) {
      setDocs(new Map())
      return
    }
    const stops: (() => void)[] = []
    const timers: ReturnType<typeof setTimeout>[] = []
    const listen = (path: string, attempt: number) => {
      stops.push(
        onSnapshot(
          doc(db, path),
          { includeMetadataChanges: true },
          (snap) => {
            if (!snap.exists() && snap.metadata.fromCache) return
            setDocs((m) => new Map(m).set(path, snap.exists() ? toRow(snap.id, snap.data()) : null))
          },
          () => {
            if (attempt < RETRY_MS.length) timers.push(setTimeout(() => listen(path, attempt + 1), RETRY_MS[attempt]))
            else setDocs((m) => new Map(m).set(path, null))
          },
        ),
      )
    }
    for (const path of key.split('|')) listen(path, 0)
    return () => {
      timers.forEach(clearTimeout)
      stops.forEach((stop) => stop())
    }
    // Keyed by the joined paths; `toRow` is a module-level mapper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return docs
}
