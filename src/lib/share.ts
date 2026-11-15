// Text and links shared into the app from other apps (the web share target).

const URL_IN_TEXT = /https?:\/\/\S+/i

/** What another app shared, split into words for quick add and a link kept in the description. */
export function sharedParts(params: URLSearchParams) {
  const title = (params.get('title') ?? '').trim()
  let text = (params.get('text') ?? '').trim()
  let url = (params.get('url') ?? '').trim()
  // Many Android apps put the link inside the text instead of the url field.
  const found = text.match(URL_IN_TEXT)
  if (!url && found) url = found[0]
  if (found) text = text.replace(found[0], '').trim()
  const words = [title, text].filter(Boolean).join(' — ').replace(/\s+/g, ' ').slice(0, 200)
  return { words, url: url.slice(0, 500) }
}
