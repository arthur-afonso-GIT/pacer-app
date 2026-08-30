export function parentDestination(pathname: string): string | null {
  if (['/', '/grupo', '/calendario', '/perfil'].includes(pathname)) return null
  if (pathname === '/habitos/criar' || pathname === '/ranking') return '/'
  if (pathname === '/grupo/criar' || pathname === '/grupo/entrar')
    return '/grupo'
  const group = /^\/grupo\/([^/]+)(?:\/(.+))?$/.exec(pathname)
  if (group) return group[2] ? `/grupo/${group[1]}` : '/grupo'
  const challenge = /^\/desafio\/([^/]+)(?:\/(.+))?$/.exec(pathname)
  if (challenge) {
    if (challenge[2]?.startsWith('revisoes/'))
      return `/desafio/${challenge[1]}/revisoes`
    return challenge[2] ? `/desafio/${challenge[1]}` : '/grupo'
  }
  return '/'
}

export function isGroupDestination(pathname: string) {
  return (
    pathname === '/grupo' ||
    pathname.startsWith('/grupo/') ||
    pathname.startsWith('/desafio/')
  )
}
