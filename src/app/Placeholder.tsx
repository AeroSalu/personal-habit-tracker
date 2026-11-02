import styles from './Placeholder.module.css'

/** Stand-in for screens built in later P0 steps. */
export function Placeholder({ title, step }: { title: string; step: string }) {
  return (
    <section className={styles.page}>
      <h1>{title}</h1>
      <p className={styles.note}>This screen is built in {step}.</p>
    </section>
  )
}
