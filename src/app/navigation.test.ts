import { describe, it, expect } from 'vitest'
import { isGroupDestination, parentDestination } from './navigation'

describe('mobile navigation', () => {
  it.each([
    ['/habitos/criar', '/'],
    ['/grupo/criar', '/grupo'],
    ['/grupo/entrar', '/grupo'],
    ['/grupo/abc', '/grupo'],
    ['/grupo/abc/convidar', '/grupo/abc'],
    ['/grupo/abc/desafios/criar', '/grupo/abc'],
    ['/desafio/abc/registrar', '/desafio/abc'],
    ['/desafio/abc/revisoes/post', '/desafio/abc/revisoes'],
    ['/desafio/abc', '/grupo'],
  ])('provides a safe parent for direct access to %s', (path, parent) => {
    expect(parentDestination(path)).toBe(parent)
  })
  it.each(['/', '/grupo', '/calendario', '/perfil'])(
    'does not add back to main destination %s',
    (path) => {
      expect(parentDestination(path)).toBeNull()
    },
  )
  it('keeps group context highlighted in challenges', () => {
    expect(isGroupDestination('/desafio/abc/registrar')).toBe(true)
    expect(isGroupDestination('/habitos/criar')).toBe(false)
  })
})
