import { useRef, useState, type FormEvent } from 'react'
import { Camera, Pin } from 'lucide-react'
import { useSignedIn } from '../auth/authContext'
import { Avatar } from '../components/Avatar'
import { useToast } from '../components/toast'
import { setPersonal } from '../data/social'
import { MAX_BIO, MAX_PINNED } from '../lib/profile'
import { useGame } from '../game/useGame'
import { PhotoPicker } from './PhotoPicker'
import ui from '../components/ui.module.css'
import styles from './ProfilePage.module.css'

/** Google account photos, the only links the rules accept besides an uploaded image. */
const GOOGLE_PHOTO = /^https:\/\/lh3\.googleusercontent\.com\/[^ "<>]+$/

/** Photo, bio and pinned badges: how you appear to friends. */
export function PersonalSettings() {
  const { user, profile } = useSignedIn()
  const { badges } = useGame()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [bio, setBio] = useState(profile.bio)
  const input = useRef<HTMLInputElement>(null)
  const failed = () => toast('That change could not be saved. Check your connection.')

  const googlePhoto = user.providerData.find((p) => p.providerId === 'google.com')?.photoURL ?? ''
  const canUseGoogle = GOOGLE_PHOTO.test(googlePhoto) && googlePhoto !== profile.photo
  const earned = badges.filter((b) => b.earnedOn)
  const pinned = profile.pinned.filter((id) => earned.some((b) => b.id === id))

  const savePhoto = (photo: string) => {
    setPersonal(user.uid, { photo }).catch(failed)
    setFile(null)
    toast(photo ? 'Photo updated' : 'Photo removed')
  }

  function saveBio(e: FormEvent) {
    e.preventDefault()
    const next = bio.trim().slice(0, MAX_BIO)
    setBio(next)
    if (next === profile.bio) return
    setPersonal(user.uid, { bio: next }).catch(failed)
    toast('Bio saved')
  }

  function togglePin(id: string) {
    if (pinned.includes(id)) {
      setPersonal(user.uid, { pinned: pinned.filter((p) => p !== id) }).catch(failed)
    } else if (pinned.length >= MAX_PINNED) {
      toast(`You can pin ${MAX_PINNED} badges. Unpin one first.`)
    } else {
      setPersonal(user.uid, { pinned: [...pinned, id] }).catch(failed)
    }
  }

  return (
    <div className={`${ui.card} ${styles.section}`}>
      <h2>How friends see you</h2>

      <div className={styles.photoRow}>
        <Avatar name={profile.displayName} photo={profile.photo} size={72} />
        <div className={styles.photoActions}>
          <button type="button" className={ui.button} onClick={() => input.current?.click()}>
            <Camera size={16} aria-hidden="true" />
            {profile.photo ? 'Change photo' : 'Add a photo'}
          </button>
          {canUseGoogle && (
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => savePhoto(googlePhoto)}>
              Use my Google photo
            </button>
          )}
          {profile.photo && (
            <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => savePhoto('')}>
              Remove
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const picked = e.target.files?.[0]
            if (picked) setFile(picked)
            e.target.value = ''
          }}
        />
      </div>
      <p className={styles.help}>Your photo shows to anyone who finds your username. It’s shrunk to a small copy on this device.</p>

      <form className={styles.bioForm} onSubmit={saveBio}>
        <label className={ui.field}>
          <span className={ui.label}>
            Bio <span className="num">{bio.length}/{MAX_BIO}</span>
          </span>
          <input
            id="bio"
            className={ui.input}
            value={bio}
            maxLength={MAX_BIO}
            placeholder="Prepping for GATE · deep work till 6"
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
        <button type="submit" className={ui.button} disabled={bio.trim() === profile.bio}>
          Save
        </button>
      </form>

      <div className={styles.pins}>
        <p className={ui.label}>
          Pinned badges <span className="num">{pinned.length}/{MAX_PINNED}</span>
        </p>
        {earned.length ? (
          <div className={ui.chips} role="group" aria-label="Pin badges to your profile">
            {earned.map((b) => (
              <button key={b.id} type="button" className={ui.chip} aria-pressed={pinned.includes(b.id)} onClick={() => togglePin(b.id)}>
                {pinned.includes(b.id) && <Pin size={13} aria-hidden="true" />} {b.name}
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.help}>Earn a badge on the Challenges page and you can pin it here.</p>
        )}
      </div>
      <p className={styles.help}>Your bio and pinned badges show to friends only.</p>

      {file && <PhotoPicker file={file} onSave={savePhoto} onClose={() => setFile(null)} />}
    </div>
  )
}
