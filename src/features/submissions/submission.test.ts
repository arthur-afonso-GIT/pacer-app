import { describe, expect, it } from 'vitest'
import { dateInTimezone } from './submission.schema'
import {
  computeEvidenceSha256,
  validateEvidenceFile,
} from './submission.repository'

describe('submission dates', () => {
  it('uses the group civil date instead of the device date', () => {
    const instant = new Date('2026-08-30T01:30:00.000Z')
    expect(dateInTimezone('America/Fortaleza', instant)).toBe('2026-08-29')
    expect(dateInTimezone('Asia/Tokyo', instant)).toBe('2026-08-30')
  })
})

describe('evidence files', () => {
  it('rejects unsupported and oversized evidence before upload', () => {
    expect(() =>
      validateEvidenceFile(
        new File(['text'], 'note.txt', { type: 'text/plain' }),
      ),
    ).toThrow('JPEG, PNG, WebP')
    const oversized = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'photo.jpg',
      {
        type: 'image/jpeg',
      },
    )
    expect(() => validateEvidenceFile(oversized)).toThrow('no máximo 10 MB')
  })

  it('accepts a non-empty supported file', () => {
    expect(() =>
      validateEvidenceFile(
        new File(['image'], 'photo.webp', { type: 'image/webp' }),
      ),
    ).not.toThrow()
  })

  it('computes a deterministic SHA-256 digest for audit metadata', async () => {
    const file = new File(['abc'], 'proof.txt', { type: 'text/plain' })
    await expect(computeEvidenceSha256(file)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
