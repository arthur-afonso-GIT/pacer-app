import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { fetchProfile, upsertProfile, validateProfileAvatar } from './api'
import { OnboardingPage } from './OnboardingPage'
import { ProfilePage } from './ProfilePage'
import { profileSchema } from './schemas'

function queryBuilder(result: unknown) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.maybeSingle.mockResolvedValue(result)
  builder.upsert.mockReturnValue(builder)
  builder.single.mockResolvedValue(result)
  return builder
}

describe('profileSchema', () => {
  it('trims names and turns an empty avatar into null', () => {
    expect(
      profileSchema.parse({ displayName: '  Ana Silva  ', avatarUrl: '' }),
    ).toEqual({
      displayName: 'Ana Silva',
      avatarUrl: null,
      themePreference: 'system',
      notificationsEnabled: true,
    })
  })
})

describe('profile avatar', () => {
  it('accepts gallery images and rejects unsupported files', () => {
    expect(() =>
      validateProfileAvatar(
        new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
      ),
    ).not.toThrow()
    expect(() =>
      validateProfileAvatar(
        new File(['text'], 'notes.txt', { type: 'text/plain' }),
      ),
    ).toThrow('Escolha uma imagem JPEG, PNG ou WebP.')
  })
})

describe('profile API', () => {
  it('returns null when the authenticated user has no profile', async () => {
    const builder = queryBuilder({ data: null, error: null })
    const client = { from: vi.fn().mockReturnValue(builder) }
    await expect(fetchProfile('user-1', client as never)).resolves.toBeNull()
    expect(builder.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('saves only the owned profile fields through the secure RPC', async () => {
    const profile = {
      id: 'user-1',
      display_name: 'Ana',
      avatar_url: null,
      theme_preference: 'system',
      notifications_enabled: true,
      created_at: '',
      updated_at: '',
    }
    const rpc = vi.fn().mockResolvedValue({ data: profile, error: null })
    const client = { rpc }
    await upsertProfile(
      'user-1',
      {
        displayName: 'Ana',
        avatarUrl: null,
        themePreference: 'dark',
        notificationsEnabled: false,
      },
      client as never,
    )
    expect(rpc).toHaveBeenCalledWith('save_profile', {
      p_display_name: 'Ana',
      p_avatar_url: '',
      p_theme_preference: 'dark',
      p_notifications_enabled: false,
    })
  })
})

describe('OnboardingPage', () => {
  it('validates and submits profile data without accessing the database', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <OnboardingPage saveProfile={save} />
      </MemoryRouter>,
    )
    await userEvent.type(
      screen.getByLabelText('Como devemos chamar você?'),
      'Ana Silva',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Concluir cadastro' }),
    )
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        displayName: 'Ana Silva',
        avatarUrl: null,
        themePreference: 'system',
        notificationsEnabled: true,
      }),
    )
  })
})

describe('ProfilePage', () => {
  const profile = {
    id: 'user-1',
    display_name: 'Ana Silva',
    avatar_url: null,
    theme_preference: 'system',
    notifications_enabled: true,
    created_at: '2026-08-01T12:00:00.000Z',
    updated_at: '2026-08-01T12:00:00.000Z',
  }

  it('loads the current data and saves edited fields', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <ProfilePage
          profile={profile}
          email="ana@example.com"
          onSave={save}
          onSignOut={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    const name = screen.getByLabelText('Como devemos chamar você?')
    await userEvent.clear(name)
    await userEvent.type(name, 'Ana Souza')
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    )

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        displayName: 'Ana Souza',
        avatarUrl: null,
        themePreference: 'system',
        notificationsEnabled: true,
      }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Perfil atualizado com sucesso.',
    )
  })

  it('saves appearance and notification preferences', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <ProfilePage profile={profile} onSave={save} onSignOut={vi.fn()} />
      </MemoryRouter>,
    )
    await userEvent.selectOptions(screen.getByLabelText('Aparência'), 'dark')
    await userEvent.click(
      screen.getByLabelText('Mostrar notificações no aplicativo'),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    )
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          themePreference: 'dark',
          notificationsEnabled: false,
        }),
      ),
    )
  })

  it('selects a profile photo from the device and stages its public URL', async () => {
    const upload = vi.fn().mockResolvedValue('https://cdn.example/avatar.jpg')
    render(
      <MemoryRouter>
        <ProfilePage
          profile={profile}
          onSave={vi.fn()}
          onSignOut={vi.fn()}
          onAvatarUpload={upload}
        />
      </MemoryRouter>,
    )
    const photo = new File(['photo'], 'avatar.jpg', { type: 'image/jpeg' })
    await userEvent.upload(
      screen.getByLabelText('Escolher foto da galeria'),
      photo,
    )
    await waitFor(() => expect(upload).toHaveBeenCalledWith(photo))
    await waitFor(() =>
      expect(screen.getByLabelText('URL da foto (opcional)')).toHaveValue(
        'https://cdn.example/avatar.jpg',
      ),
    )
  })

  it('signs out through the injected account action', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <ProfilePage profile={profile} onSave={vi.fn()} onSignOut={signOut} />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce())
  })
})
