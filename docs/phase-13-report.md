# Fase 13 — Visibilidade e confirmação de senha

Branch: `feat/senha-visivel` (a partir de `main`); sem push.

## Arquivos

- `src/components/ui/password-input.tsx`: campo baseado em `Input`, com botão de 44 × 44 px, estados acessíveis e alternância de visibilidade.
- `src/app/(auth)/login/login-form.tsx`, `src/app/(auth)/cadastro/sign-up-form.tsx`, `src/app/redefinir-senha/update-password-form.tsx` e `src/components/conta/account-settings.tsx`: uso do componente em todos os campos de senha; cadastro inclui confirmação e erro inline.
- `src/lib/auth/schema.ts` e `src/lib/auth/schema.test.ts`: confirmação obrigatória no servidor e cinco testes de validação. `src/lib/auth/actions.ts` continua enviando ao Supabase somente e-mail, senha e metadados.

## Evidências

- `npx.cmd tsc --noEmit`: passou.
- `npx.cmd eslint src`: passou.
- `npm.cmd test`: 13 arquivos e 109 testes passaram.
- `npx.cmd next build`: passou no Next.js 16.3.4.
- Busca literal `type="password"` em `src`: nenhuma ocorrência; o tipo inicial é definido dinamicamente no `PasswordInput`.
- `npx.cmd next dev -p 3200`: `/cadastro` retornou HTTP 200, com dois botões `aria-label="Mostrar senha"` e `name="confirm_password"`; `/login` retornou HTTP 200, com um botão `aria-label="Mostrar senha"`. O processo da porta 3200 foi encerrado e a porta ficou livre.
