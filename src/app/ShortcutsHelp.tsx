import { Dialog } from '../components/Dialog'
import { SHORTCUTS } from './useShortcuts'
import styles from './CommandPalette.module.css'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose}>
      <dl className={styles.keys}>
        {SHORTCUTS.map((s) => (
          <div key={s.keys}>
            <dt>
              {s.keys.split(' ').map((k) => (
                <kbd key={k}>{k === 'Ctrl' && IS_MAC ? '⌘' : k}</kbd>
              ))}
            </dt>
            <dd>{s.does}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>Quick add reads dates, times, #categories, !priority, repeats like “every Mon” and lengths like “45m”.</p>
    </Dialog>
  )
}
