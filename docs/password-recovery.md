# Recuperação de senha em produção

O login oferece “Esqueci minha senha”. `/recuperar-senha` envia o e-mail via Supabase; `/redefinir-senha` recebe a sessão do link e permite salvar a nova senha com confirmação.

Antes de testar em produção:

1. Publique as alterações do código, incluindo `vercel.json` (rotas da SPA).
2. Em Supabase → Authentication → URL Configuration, configure Site URL como `https://pacer-app-lemon.vercel.app`.
3. Adicione `https://pacer-app-lemon.vercel.app/redefinir-senha` a Redirect URLs. Para desenvolvimento, adicione `http://localhost:5173/redefinir-senha` se essa for a porta utilizada.
4. O template de recuperação deve manter o link de confirmação fornecido pelo Supabase (`{{ .ConfirmationURL }}`). Não substitua pelo endereço direto do app: o link precisa validar o token primeiro.
5. Verifique a configuração de envio de e-mail/SMTP e os limites do Supabase.

Teste manual com uma conta sua: solicitar recuperação, abrir o e-mail mais recente, definir duas senhas iguais e confirmar o login com a nova senha. Testar também link expirado/usado, ausência de sessão e reabertura direta da rota. Os testes automatizados usam serviços simulados; não comprovam entrega real de e-mail.

Documentação: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
