# ADR-0003: Autenticação via Supabase Auth, sem cadastro público

## Status
Aceito — 2026-09-07

## Contexto
O app tem exatamente um usuário legítimo (Vinnicius). Precisamos de login
privado que proteja dado sensível (saúde, finanças), sem construir um sistema
de autenticação próprio.

## Decisão
Usar Supabase Auth (e-mail/senha) como provedor de identidade, integrado ao
Next.js via `@supabase/ssr` (sessão em cookie httpOnly). A UI expõe **somente**
tela de login — não existe rota de cadastro (`/signup`) nem qualquer forma de
criar conta a partir de uma request externa. A única conta é criada uma vez,
manualmente, via Supabase Studio ou script local com a service-role key.

## Alternativas consideradas
- **Auth customizado (tabela própria de usuários + hash de senha):** rejeitado
  — reimplementar autenticação é a superfície mais arriscada de errar em
  segurança, sem ganho algum já que o Supabase resolve isso nativamente e
  integra direto com a RLS do Postgres (`auth.uid()`).
- **Provedor OAuth externo (Google, GitHub) via Supabase:** considerado, mas
  e-mail/senha foi preferido para manter o acesso independente de uma conta de
  terceiro e simplificar a v1; pode ser adicionado depois sem mudança de
  schema (Supabase Auth suporta múltiplos provedores para a mesma conta).

## Consequências
- Superfície de auth mínima: sem endpoint de cadastro para atacar, sem lógica
  de reset de senha própria (usa o fluxo nativo do Supabase, se necessário).
- Onboarding de um eventual segundo usuário exige ação manual (criar a conta
  no painel) — aceitável dado o escopo de usuário único; documentado como
  limitação consciente, não esquecimento.
