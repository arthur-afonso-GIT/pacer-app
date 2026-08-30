import { authCopy } from './copy'

const messages: Record<string, string> = {
  invalid_credentials: authCopy.invalidCredentials,
  email_not_confirmed: authCopy.emailNotConfirmed,
  email_exists:
    'Não foi possível usar esse e-mail. Se você já tem conta, tente entrar.',
  user_already_exists:
    'Não foi possível usar esse e-mail. Se você já tem conta, tente entrar.',
  signup_disabled:
    'O cadastro está desativado no serviço. Contate o responsável pelo app.',
  email_provider_disabled: 'O acesso por e-mail está desativado no serviço.',
  email_address_not_authorized:
    'O envio de confirmação para este e-mail não está autorizado. O responsável pelo app precisa configurar o serviço de e-mail (SMTP).',
  over_email_send_rate_limit:
    'O limite de envio de e-mails foi atingido. Aguarde antes de tentar novamente.',
  over_request_rate_limit:
    'Muitas tentativas em pouco tempo. Aguarde e tente novamente.',
  weak_password:
    'A senha não atende aos requisitos de segurança do serviço. Use uma senha mais forte.',
  email_address_invalid: 'Confira o endereço de e-mail informado.',
  unexpected_failure:
    'O serviço encontrou uma falha interna ao cadastrar. Contate o responsável pelo app.',
}

export function authErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return authCopy.genericError
  const code =
    'code' in error && typeof error.code === 'string' ? error.code : ''
  if (messages[code]) return messages[code]
  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message.toLowerCase()
      : ''
  if (message.includes('invalid login credentials'))
    return authCopy.invalidCredentials
  if (message.includes('email not confirmed')) return authCopy.emailNotConfirmed
  if (message.includes('email rate limit'))
    return 'O limite de envio de e-mails foi atingido. Aguarde antes de tentar novamente.'
  if (message.includes('database error'))
    return 'O banco recusou a criação do perfil. Contate o responsável pelo app.'
  if (message.includes('confirmation mail'))
    return 'Não foi possível enviar o e-mail de confirmação. O responsável pelo app precisa verificar o serviço de e-mail.'
  if (message.includes('fetch') || message.includes('network'))
    return 'Não foi possível conectar ao serviço. Confira sua internet e tente novamente.'
  if (message.includes('não está configurado'))
    return 'A autenticação não está configurada neste ambiente. Verifique as variáveis do Supabase na hospedagem.'
  return authCopy.genericError
}
