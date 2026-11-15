import { createContext, useContext } from 'react'

/** An optional button in the message, such as Undo. */
export type ToastAction = { label: string; run: () => void }

export const ToastContext = createContext<(message: string, action?: ToastAction) => void>(() => {})

/** Shows a short message above the bottom bar for a few seconds, optionally with one action. */
export const useToast = () => useContext(ToastContext)
