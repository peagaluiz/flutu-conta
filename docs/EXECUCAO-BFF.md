# EXECUÇÃO — Migração de auth para BFF (status e pendências)

> Companion do `docs/PLANO-BFF.md` (o plano original). Este documento registra o
> que foi **de fato executado**, onde a execução **desviou do plano** e o que
> **ainda falta** para promover a migração a produção. Branch:
> `feat/bff-auth-migration` (10 commits sobre `master`, nenhum merge feito).

---

## 1. Resumo do que foi feito

Todas as etapas do plano original (1 a 10) foram trabalhadas nesta branch,
com uma mudança de arquitetura no meio do caminho (Seção 2). Nada foi
promovido a produção — a Vercel de produção (`flutu-conta.vercel.app`) ainda
roda o código anterior (export estático, sessão web em localStorage).

### Etapa 1 — Hotfix de RLS ✅ aplicado em produção
- `familia_membros`: corrigida auto-promoção a `owner` (policy `UPDATE`
  dividida em `_update_owner`/`_update_self`; `INSERT` restrito a
  owner-criando-família ou convidado-aceitando-como-member).
- `WITH CHECK` adicionado em todos os `UPDATE` das tabelas de dados
  (`banco`, `cartao_faturas`, `imobilizado`, `pessoa`, `recorrencias`,
  `transacoes`, `familias`, `familia_convites`, `profiles`).
- **Desvio do plano:** `tipo_imobilizado` — o plano deixava de fora do
  hotfix, com um fix parcial (revogar UPDATE/DELETE) como recomendação. O
  dono escolheu a solução completa (opção A): coluna `user_id` + RLS por
  dono. Auditoria antes de migrar confirmou 0 linhas em `imobilizado` e 1
  linha órfã em `tipo_imobilizado` sem nenhum vínculo — sem backfill
  ambíguo a resolver. Código nativo (`initializeSQLite.ts`,
  `manageRepository.ts`, `transacoesSync.ts`) atualizado para gravar/ler
  `user_id`.
- Migrations em `sql/migrations/` (up/down, aplicadas via
  `apply_migration`). `sql/schema_supabase.sql` atualizado para refletir o
  estado novo (fonte idempotente para reinstalação do zero).
- Verificado: `pg_policies` sem nenhum `with_check` vazio nas tabelas de
  dados; `get_advisors` sem novos warnings.

### Etapa 2 — Limpeza de env vars na Vercel ✅ feito
- Removidas 13 vars órfãs/perigosas de Production:
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`,
  `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`,
  `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`,
  `POSTGRES_DATABASE`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Mantidas: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`
  (server-side do BFF), `EXPO_PUBLIC_SUPABASE_URL`/`KEY` (ainda usadas —
  ver Etapa 10, item pendente).

### Etapa 3 — Dependências fixadas ✅ feito
- `@expo/server@0.6.3`, `@supabase/ssr@0.12.4`, `cookie@1.1.1` — todas
  com `--save-exact`, sem `^`/`~`.
- **Desvio:** `@expo/server` acabou não sendo usado em produção (ver
  Seção 2 — Pivot). Ficou como dependência transitiva do `expo-router`
  (dev server local), não mais pinado direto no `package.json`.

### Etapas 4, 5, 6 — ver Seção 2 (Pivot para Plano B)

### Etapa 7 — Front web amarrado ao BFF ✅ código pronto, teste real pendente
- `services/supabase/client.ts`: no web, aponta para `${origin}/db`
  (o proxy) com key placeholder; `persistSession:false`,
  `autoRefreshToken:false`; `global.fetch` usa o novo `apiFetch`.
- `services/http/apiFetch.js` (novo): `credentials:'include'` + redirect
  único para `/login` em 401 (guard evita loop), com escape-hatch
  `suppressAuthRedirect` para os casos onde 401 é esperado.
- `state/AuthContext.tsx`: bootstrap web chama `GET /auth/me` antes de
  renderizar qualquer rota protegida; login/logout/update de perfil/senha/
  avatar passam pelos endpoints do BFF; sem `onAuthStateChange` no web.
- `services/auth/currentUserCache.js` (novo): **achado durante a
  execução, não previsto no plano original.** Seis arquivos
  (`bancoRepository`, `faturaRepository`, `manageRepository`,
  `recurrenceService`, `transacoesRepository`, `familyRepository`) usavam
  `supabase.auth.getSession()/getUser()` como fallback de `userId`/
  `familyId`/`email` quando o caller não passava esses parâmetros
  explicitamente. No web, com `persistSession:false`, isso sempre
  retornaria `null` — quebraria silenciosamente qualquer tela que não
  passasse `userId` explícito (achei pelo menos um call site real:
  `BancoCatalogoSheet.js`). Corrigido com um cache em memória que o
  `AuthContext` mantém sincronizado com o usuário atual.
- `api/auth/update-user.js` e `api/auth/reset-password.js` (novos,
  **não estavam na lista de endpoints da Etapa 5 do plano original**):
  necessários porque `updateUserProfile`, `updateUserAvatar`,
  `removeUserAvatar` e `requestPasswordReset`/`updatePassword` chamavam
  `supabase.auth.updateUser()`/`resetPasswordForEmail()` direto no client
  — que deixa de ter sessão no web.
- `app/nova-senha.js`: fluxo de recuperação no web migrado para PKCE via
  cookie (o `/api/auth/callback` já troca o `code` antes do usuário cair
  na tela — sem parsing de token de URL).
- `api/db.js`: resposta de RPC negado imita o formato real do erro
  `PGRST202` do PostgREST, para o fallback já existente em
  `familyRepository.ts` (`get_family_snapshot`, RPC morta) continuar
  funcionando sem mudança de código.
- Validado: `tsc --noEmit` limpo, `expo export -p web` local ok, deploy
  preview real com todos os endpoints respondendo os status esperados.
- **Pendente:** teste manual de login com credencial real no navegador
  (login → F5 mantém logado → cookies HttpOnly+Secure → logout). Não crio
  contas de teste na tabela `auth.users` de produção sem autorização, e o
  domínio de e-mail de teste (`example.com`) é rejeitado pelo Supabase.

### Etapa 8 — Nativo valida sessão + `origin` ✅ código pronto, teste em device pendente
- `app.json`: plugin `expo-router` ganha
  `{ "origin": "https://flutu-conta.vercel.app" }` (opção documentada em
  `plugin/options.json` da lib).
- `state/AuthContext.tsx` (nativo): bootstrap agora chama
  `supabase.auth.getUser()` para revalidar no servidor antes de marcar
  `isLoggedIn=true` — mesma classe de bug que o web tinha. Só desloga de
  fato se o erro for real (`AuthApiError` etc.); erro de rede
  (`AuthRetryableFetchError`) cai no fallback do usuário local, porque o
  app é offline-first e não pode expulsar quem está sem internet.
- `onAuthStateChange` agora ignora o evento `INITIAL_SESSION` (que carrega
  a sessão local sem revalidar) — sem isso ele venceria a corrida contra o
  `init()` revalidado e a tela autenticada piscaria antes da checagem
  terminar.
- **Pendente:** build via Gradle local e teste em device/emulador real —
  não há ambiente Android nesta sessão de execução.

### Etapa 9 — Headers de segurança ✅ código pronto, CSP em Report-Only
- `vercel.json`: adiciona `Strict-Transport-Security`, `Permissions-Policy`
  (nega camera/microphone/geolocation/payment/usb — confirmado que o
  avatar no web usa só `launchImageLibraryAsync`, sem câmera) e
  `Content-Security-Policy-Report-Only` (propositalmente **não** em
  enforce ainda).
- Verificado: os 6 headers presentes e bem formados na resposta do preview.
- **Pendente:** abrir o preview no navegador, checar o Console por
  violações do CSP Report-Only, ajustar a policy se necessário, e só então
  trocar `Content-Security-Policy-Report-Only` por `Content-Security-Policy`
  (enforce). Isso exige inspeção visual em browser real.

### Etapa 10 — Publishable key fora do bundle + configs Supabase — parcial
- Confirmado: o bundle web gerado (`dist/`) não contém o valor de
  `EXPO_PUBLIC_SUPABASE_KEY` em lugar nenhum (grep no build local).
- **Pendente (ver Seção 3):** remover `EXPO_PUBLIC_SUPABASE_URL`/`KEY` da
  Vercel; configs de Auth do Supabase (JWT expiry, refresh rotation,
  redirect URLs, leaked password protection).

---

## 2. Pivot para Plano B (desvio principal do plano original)

As Etapas 4 e 5 originais (Expo Router `+api` com `web.output:"server"` via
`@expo/server/adapter/vercel`) foram implementadas, deployadas em preview
real e bateram num bug reproduzível: **qualquer handler de POST que lê o
body da request (`request.json()`) e depois faz um `fetch()` de saída trava
indefinidamente** (não é timeout — é hang mesmo, 0 bytes recebidos após
20s+). Isolado com uma sequência de deploys de diagnóstico:

| Cenário | Resultado |
|---|---|
| GET + `fetch()` de saída (a Supabase) | funciona, 362ms |
| POST **sem** ler o body + `fetch()` de saída | funciona, 68ms |
| POST **lendo** o body + `fetch()` de saída (a Supabase OU a um serviço genérico sem relação nenhuma) | trava sempre |

Ou seja: bug do adapter/runtime do `@expo/server` na Vercel, não do nosso
código — e fatal para essa arquitetura, porque todo endpoint do BFF precisa
ler body de POST **e** chamar o Supabase.

Isso ativou o "ponto de não-retorno" da Seção 7 do `PLANO-BFF.md`: reverti
`web.output` para `"static"` e reimplementei os endpoints como **Vercel
Functions nativas** em `api/` (`export default function handler(req, res)`,
runtime `@vercel/node`), que usam o parser de body próprio da Vercel em vez
de um `Request` do Fetch API — sidesteps o bug por completo (confirmado:
mesmo endpoint, mesmo padrão POST+body+fetch, responde em ~1s).

Consequências práticas dessa mudança, além do formato do handler:

- **Rotas dinâmicas com colchete (`[...path].js`) não funcionam nesta
  configuração.** A Vercel resolve funções de nome fixo *antes* dos
  `rewrites` customizados, mas rotas dinâmicas por colchete são resolvidas
  *depois* — um `rewrite` apontando para uma delas nunca "acha" a function
  (cai sempre no fallback da SPA). Confirmado com `vercel inspect`
  mostrando a function corretamente buildada, porém nunca roteada. Por
  isso o proxy de dados (Etapa 6) é uma function de nome fixo (`api/db.js`)
  com o path da tabela vindo via query string
  (`/db/rest/v1/(.*) → /api/db?__path=$1`), não uma rota `[...path]`.
- `api/index.js` (adapter antigo) e as rotas `app/**+api.js` (Expo Router)
  foram removidas.
- `.vercelignore` precisou ser adicionado (sem ele, `vercel deploy` tentava
  subir `node_modules`/`android`, estourando o limite de 100MB por
  arquivo). Atenção documentada no arquivo: padrões sem `/` na frente
  casam em qualquer profundidade — `supabase` sem barra também casava
  `services/supabase/` e quebrava o build.

---

## 3. Pendências — o que falta antes de promover a produção

### 3.1 Testes que exigem ambiente real (não executáveis nesta sessão)

- [ ] **Login real no navegador** no preview mais recente da branch —
  login, F5 mantém logado, `DevTools → Application → Cookies` mostrando
  `sb-*` com `HttpOnly`+`Secure`, logout funcionando.
- [ ] **Console do navegador** no mesmo preview — checar violações do CSP
  Report-Only antes de virar enforce.
- [ ] **Build nativo via Gradle local** (`cd android && ./gradlew
  assembleRelease` — nunca `eas build`, ver `CLAUDE.md`) e smoke test em
  device/emulador: login, sessão expirada não pisca tela logada, sync
  SQLite↔Supabase, família, avatar.

### 3.2 Configuração manual na Vercel

- [ ] Remover `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_KEY` do
  ambiente Production **e** Preview (Vercel Dashboard → projeto
  `flutu-conta` → Settings → Environment Variables). Confirmado que o
  client web não lê mais essas vars e elas não aparecem no bundle
  gerado — a remoção é segura e não afeta o nativo (Gradle local lê do
  `.env`, não da Vercel).

### 3.3 Configuração manual no Supabase (Authentication → Settings)

Nenhuma tool disponível nesta sessão alcança a API de configuração de Auth
do Supabase (é uma API de projeto/GoTrue, não SQL — `execute_sql`/
`apply_migration` não chegam lá). Precisa ser feito via Dashboard
(`supabase.com/dashboard/project/tygsdhwkndubgthjyurj/auth/providers` e
`.../auth/url-configuration`):

- [ ] **JWT expiry → 30 minutos.** Authentication → Settings → em
  "Access token (JWT) expiry time", trocar para `1800` segundos. Hoje
  provavelmente está no default (1h = 3600s). Reduz a janela de uso de um
  access token vazado/roubado. Como o BFF sempre revalida com
  `getUser()`/`getClaims()` (nunca confia em `getSession()` sozinho), essa
  troca não deveria quebrar nada — só faz o refresh automático do
  supabase-js acontecer com mais frequência.
- [ ] **Refresh token rotation → ON.** Mesma tela, "Refresh token
  rotation". Quando ligado, cada uso de refresh token invalida o anterior
  e emite um novo — se alguém roubar um refresh token antigo (ex.: de um
  cookie vazado), o uso dele por um dos dois lados (atacante ou usuário
  legítimo) invalida o do outro, o que pelo menos torna o roubo
  detectável (o lado legítimo passa a levar erro de refresh e é forçado a
  logar de novo).
- [ ] **Redirect URLs explícitas, sem wildcard.** Authentication → URL
  Configuration → "Redirect URLs". É a allowlist que o Supabase usa para
  validar o parâmetro `redirectTo` de `resetPasswordForEmail()`/
  `signInWithOAuth()` etc. — se a URL que a gente manda não estiver nessa
  lista, o Supabase rejeita ou ignora o redirect. Meu
  `api/auth/reset-password.js` monta `redirectTo` dinamicamente como
  `https://<host>/api/auth/callback?next=/nova-senha`, então essa lista
  precisa incluir pelo menos `https://flutu-conta.vercel.app/api/auth/**`
  e, se quiser testar recuperação de senha em previews, o padrão de
  preview da Vercel também (`https://flutu-conta-*-luirp70s-projects.
  vercel.app/api/auth/**` — o Supabase aceita wildcard `*` dentro de uma
  URL individual da lista, só não use uma entrada tipo `*` sozinha
  cobrindo qualquer coisa). **Sem isso, o fluxo de "esqueci minha senha"
  no web quebra silenciosamente** (o e-mail chega, mas o link não
  redireciona pro nosso callback).
- [ ] **Leaked password protection → ON.** Mesma tela de Settings de senha.
  Liga a checagem de senha comprometida (via k-anonymity contra a base do
  HaveIBeenPwned, o Supabase não manda a senha em texto claro) no
  signup/troca de senha. Esse item já aparecia nos advisors do projeto
  antes desta migração (`auth_leaked_password_protection`, nível WARN) —
  não é novo, só ainda não foi resolvido.

### 3.4 Decisão do dono ainda em aberto

- Nenhuma — a decisão pendente do plano original (`tipo_imobilizado`,
  opção A vs. fix parcial) já foi tomada e aplicada (Seção 1, Etapa 1).

### 3.5 Depois de tudo isso

- [ ] `vercel deploy --prod` (promover a branch a produção) — só depois
  dos itens 3.1–3.3.
- [ ] Merge de `feat/bff-auth-migration` para `master`.
- [ ] Revogar o "Protection Bypass for Automation" secret criado nesta
  sessão no projeto Vercel (`Up292AlrJpq2gGaAxeBlQdazCCGF0p9C`), se não for
  mais necessário para automação/CI — hoje ele permite acesso anônimo aos
  previews via header, o que é aceitável mas vale reavaliar.
