# ADR-0002: Next.js como camada de backend (sem API separada)

## Status
Aceito — 2026-09-07

## Contexto
Precisamos de uma camada que valide entrada, aplique regra de negócio (TDEE,
agregação financeira, reordenação de Kanban) e fale com o Postgres/Supabase.
Isso pode viver num serviço HTTP separado ou dentro do próprio Next.js.

## Decisão
Toda a lógica de servidor vive dentro do projeto Next.js: Server Components
para leitura, Server Actions para escrita, ambos chamando um `repository`
Drizzle por módulo. Não existe um serviço de API separado nem uma API
REST/GraphQL versionada publicamente.

## Consequências
- **Positivo:** um único deploy, um único lugar para aplicar autenticação e
  validação, sem duplicação de tipos entre "backend" e "frontend" (o mesmo
  arquivo de schema Zod/tipo Drizzle é usado nos dois lados).
- **Positivo:** menos superfície exposta publicamente — não há endpoint de API
  genérico aceitando request de qualquer origem, só as rotas do próprio app.
- **Negativo:** acopla a lógica de negócio ao ciclo de vida do Next.js. Se um
  dia for necessário consumir os mesmos dados por um cliente externo (app
  mobile, integração de terceiro), será preciso extrair route handlers HTTP
  formais a partir dos repositories existentes — o desenho em fatias verticais
  (schema/repository/actions) já deixa essa extração localizada, módulo por
  módulo, sem reescrever tudo de uma vez.
- Superseded-by: nenhum (decisão vigente).
