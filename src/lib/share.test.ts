import { describe, expect, it } from 'vitest'
import { sharedParts } from './share'

const p = (q: Record<string, string>) => sharedParts(new URLSearchParams(q))

describe('sharedParts', () => {
  it('joins the title and text and keeps the link apart', () => {
    expect(p({ title: 'Graph algorithms', text: 'Read this tomorrow', url: 'https://ex.com/a' })).toEqual({
      words: 'Graph algorithms — Read this tomorrow',
      url: 'https://ex.com/a',
    })
  })

  it('pulls a link out of the text when the url field is empty', () => {
    expect(p({ text: 'Watch later https://youtu.be/xyz' })).toEqual({ words: 'Watch later', url: 'https://youtu.be/xyz' })
  })

  it('handles a bare link or nothing at all', () => {
    expect(p({ url: 'https://ex.com' })).toEqual({ words: '', url: 'https://ex.com' })
    expect(p({})).toEqual({ words: '', url: '' })
  })
})
