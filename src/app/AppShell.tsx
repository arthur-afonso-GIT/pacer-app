import {
  ArrowLeft,
  CalendarDays,
  Home,
  Plus,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { isGroupDestination, parentDestination } from './navigation'
import { Avatar, Skeleton } from '@/design-system'
import { useAuth } from '@/features/auth/auth-context'
import { useProfile } from '@/features/profiles/queries'
import { copy } from '@/shared/i18n/pt-BR'
import { applyThemePreference, type ThemePreference } from './theme'
import { NetworkStatus } from './NetworkStatus'

const items = [
  { to: '/', label: copy.nav.today, icon: Home },
  { to: '/grupo', label: copy.nav.group, icon: UsersRound },
  { to: '/habitos/criar', label: 'Publicar', icon: Plus },
  { to: '/calendario', label: copy.nav.calendar, icon: CalendarDays },
  { to: '/perfil', label: copy.nav.profile, icon: UserRound },
]

export function AppShell() {
  const { pathname } = useLocation()
  const backTo = parentDestination(pathname)
  const { user } = useAuth()
  const profile = useProfile(user?.id)
  useEffect(
    () =>
      applyThemePreference(
        (profile.data?.theme_preference as ThemePreference | undefined) ??
          'system',
      ),
    [profile.data?.theme_preference],
  )
  const displayName = profile.data?.display_name
  const fallback =
    displayName
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'P'
  return (
    <div className="bg-canvas text-primary min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        {backTo ? (
          <Link
            to={backTo}
            className="flex min-h-11 items-center gap-2 font-bold"
          >
            <ArrowLeft aria-hidden size={20} /> Voltar
          </Link>
        ) : (
          <Link
            to="/"
            className="flex min-h-11 items-center text-lg font-extrabold tracking-tight"
          >
            {copy.appName}
          </Link>
        )}
        <Link
          to="/ranking"
          aria-label="Ranking dos desafios"
          className="text-secondary mr-3 ml-auto grid size-11 place-items-center"
        >
          <Trophy aria-hidden size={21} />
        </Link>
        {profile.isLoading ? (
          <Skeleton width={104} height={32} className="rounded-full" />
        ) : (
          <NavLink
            to="/perfil"
            aria-label={
              displayName ? `Abrir perfil de ${displayName}` : 'Abrir perfil'
            }
            className="bg-accent-soft text-accent flex min-h-10 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-bold"
          >
            <Avatar
              {...(profile.data?.avatar_url
                ? { src: profile.data.avatar_url }
                : {})}
              fallback={fallback}
              size="sm"
            />
            <span className="max-w-28 truncate">
              {displayName ?? copy.nav.profile}
            </span>
          </NavLink>
        )}
      </header>
      <NetworkStatus />
      <main className="mx-auto max-w-5xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-5 md:pb-10">
        <Outlet />
      </main>
      <nav
        aria-label="Navegação principal"
        className="border-subtle bg-surface/95 fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mx-auto md:mt-8 md:max-w-2xl md:rounded-full md:border"
      >
        <ul className="grid grid-cols-5">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                aria-current={
                  to === '/grupo' && isGroupDestination(pathname)
                    ? 'page'
                    : undefined
                }
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-bold transition-colors motion-reduce:transition-none ${isActive || (to === '/grupo' && isGroupDestination(pathname)) ? 'text-accent' : 'text-secondary hover:text-primary'}`
                }
              >
                {to === '/habitos/criar' ? (
                  <span className="bg-accent text-canvas grid size-10 place-items-center rounded-full">
                    <Icon aria-hidden size={25} strokeWidth={2.5} />
                  </span>
                ) : (
                  <Icon aria-hidden size={21} strokeWidth={2.3} />
                )}
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
