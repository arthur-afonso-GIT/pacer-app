import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { TodayRoute } from '@/features/today'
import { CalendarRoute } from '@/features/calendar'
import { RouteErrorPage } from './RouteErrorPage'

type FeatureRouteName =
  | 'GroupsRoute'
  | 'CreateGroupRoute'
  | 'JoinGroupRoute'
  | 'CreateInviteRoute'
  | 'GroupOverviewRoute'
  | 'CreateChallengeRoute'
  | 'ChallengeHomeRoute'
  | 'CreateHabitRoute'
  | 'CreateGlobalHabitRoute'
  | 'SubmissionRoute'
  | 'ReviewQueueRoute'
  | 'EvidenceReviewRoute'
  | 'RankingRoute'
  | 'RankingHubRoute'
  | 'LedgerRoute'

const feature = async (name: FeatureRouteName) => {
  const routes = await import('@/pages/FeatureRoutes')
  return { Component: routes[name] }
}

const router = createBrowserRouter([
  {
    path: '/recuperar-senha',
    errorElement: <RouteErrorPage />,
    lazy: async () => {
      const { ForgotPasswordPage } =
        await import('@/features/auth/PasswordRecovery')
      return { Component: ForgotPasswordPage }
    },
  },
  {
    path: '/redefinir-senha',
    errorElement: <RouteErrorPage />,
    lazy: async () => {
      const { ResetPasswordPage } =
        await import('@/features/auth/PasswordRecovery')
      return { Component: ResetPasswordPage }
    },
  },
  {
    path: '/entrar',
    errorElement: <RouteErrorPage />,
    lazy: async () => {
      const { AuthPage } = await import('@/features/auth/AuthPage')
      return { Component: AuthPage }
    },
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: '/onboarding',
        lazy: async () => {
          const { OnboardingRoute } =
            await import('@/features/profiles/OnboardingPage')
          return { Component: OnboardingRoute }
        },
      },
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <TodayRoute /> },
          {
            path: 'habitos/criar',
            lazy: () => feature('CreateGlobalHabitRoute'),
          },
          { path: 'grupo', lazy: () => feature('GroupsRoute') },
          { path: 'grupo/criar', lazy: () => feature('CreateGroupRoute') },
          { path: 'grupo/entrar', lazy: () => feature('JoinGroupRoute') },
          { path: 'grupo/:groupId', lazy: () => feature('GroupOverviewRoute') },
          {
            path: 'grupo/:groupId/convidar',
            lazy: () => feature('CreateInviteRoute'),
          },
          {
            path: 'grupo/:groupId/desafios/criar',
            lazy: () => feature('CreateChallengeRoute'),
          },
          {
            path: 'desafio/:challengeId',
            lazy: () => feature('ChallengeHomeRoute'),
          },
          {
            path: 'desafio/:challengeId/habitos/criar',
            lazy: () => feature('CreateHabitRoute'),
          },
          {
            path: 'desafio/:challengeId/registrar',
            lazy: () => feature('SubmissionRoute'),
          },
          {
            path: 'desafio/:challengeId/revisoes',
            lazy: () => feature('ReviewQueueRoute'),
          },
          {
            path: 'desafio/:challengeId/revisoes/:submissionId',
            lazy: () => feature('EvidenceReviewRoute'),
          },
          {
            path: 'desafio/:challengeId/ranking',
            lazy: () => feature('RankingRoute'),
          },
          {
            path: 'desafio/:challengeId/lancamentos',
            lazy: () => feature('LedgerRoute'),
          },
          {
            path: 'ranking',
            lazy: () => feature('RankingHubRoute'),
          },
          {
            path: 'calendario',
            element: <CalendarRoute />,
          },
          {
            path: 'perfil',
            lazy: async () => {
              const { ProfileRoute } =
                await import('@/features/profiles/ProfilePage')
              return { Component: ProfileRoute }
            },
          },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
