# PLANO — Migração de auth para BFF com cookie httpOnly (Expo web server output na Vercel)

> **Este documento é o único entregável do agente de planejamento.** O agente que
> executar NÃO tem acesso à conversa que gerou este plano. Tudo que ele precisa
> está aqui. Não há "conforme discutido".
>
> **REGRA HERDADA:** os furos de RLS descritos aqui são exploráveis em produção
> hoje. As migrations estão prontas para revisão, mas **nenhuma roda sem revisão
> humana e sem backup**. Ver Etapa 1.

---

## 1. Contexto e objetivo

### Stack e versões exatas (confirmadas via `package-lock.json` e registry npm)

| Item | Versão |
|---|---|
| Expo SDK | 53.0.27 |
| expo-router | 5.1.11 |
| @supabase/supabase-js | 2.103.0 (tem `getClaims()`, disponível desde 2.44) |
| @supabase/auth-js | 2.103.0 |
| react-native-web / RN / React | 0.20.0 / 0.79.6 / 19.0.0 |
| Gerenciador de pacotes | **npm** (`package-lock.json` presente) |
| Node na Vercel | 24.x |
| **Adapter de server a fixar** | **`@expo/server@0.6.3`** (ver justificativa abaixo) |
| **`@supabase/ssr` a fixar** | última estável — registry reporta `0.12.4` em ago/2026 (`npm view @supabase/ssr version`). API `getAll/setAll` estável desde 0.4. **[VERIFICAR]** confirmar a versão no momento da execução e que expõe `createServerClient` com adaptador `cookies: { getAll, setAll }`. |

**Por que `@expo/server@0.6.3` e não `0.7.5`:** a versão fixada pelo próprio SDK 53
é a `0.6.3` — confirmado lendo `packages/@expo/server/package.json` no branch
`sdk-53` do repo `expo/expo` (`version: "0.6.3"`). A linha 0.7.x acompanha SDK 54+.
Como a lib `expo-server` (nomenclatura nova) só existe do SDK 54 em diante, aqui é
`@expo/server`, import `@expo/server/adapter/vercel`. A `0.6.3` já está muito acima
da `0.5.1` que corrigiu o `FUNCTION_INVOCATION_TIMEOUT` em POST (issue expo/expo
#35763). **Fixar exato `0.6.3`, sem range (`^`/`~`)** — range nesta dependência é
causa conhecida de quebra entre export local e build da cloud.

### Estado atual

- `web.output: "static"` em `app.json` → export estático, sem servidor. Hospedado
  na Vercel (projeto `flutu-conta`, team `luirp70s-projects`, prod
  `flutu-conta.vercel.app`).
- Sessão web em localStorage; nativo em AsyncStorage (data) + SecureStore
  (credenciais). Client Supabase único em `services/supabase/client.ts`.
- `vercel.json` hoje: `buildCommand: "npx expo export -p web"`, `outputDirectory:
  "dist"`, rewrite SPA `"/(.*)" → "/"`, headers nosniff/X-Frame-Options/Referrer.

### O que muda

1. `web.output` passa a `"server"`. O client web continua SPA (sem SSR de HTML);
   só ganhamos API routes (`app/**+api.ts`) servidas por function na Vercel via
   `@expo/server/adapter/vercel`.
2. A sessão web migra de localStorage para **cookie httpOnly** setado pelo BFF,
   usando `@supabase/ssr` (`createServerClient`) nos endpoints.
3. A publishable key deixa de ser `EXPO_PUBLIC_*` no web e passa a variável só de
   server. Nativo continua com token em SecureStore e `Authorization: Bearer`.

---

## 2. Modelo de ameaça (o que protege e o que NÃO protege)

Esta migração tira os tokens de sessão do alcance de JavaScript no navegador
(cookie httpOnly), então um XSS no bundle web deixa de conseguir roubar a sessão do
usuário — esse é o ganho real. O que ela **NÃO** protege: a *publishable key* do
Supabase continua embutida no APK nativo em produção (ela é pública por design — a
barreira de acesso a dados é o RLS, não o segredo da key); portanto qualquer pessoa
com o APK tem a key, e qualquer falha de RLS é explorável independentemente do BFF.
Consequência para o executor: **se você bater num 403/401 no proxy, a resposta certa
quase nunca é "usar uma key mais poderosa" — é corrigir o RLS ou o token do
request.** Trocar a publishable key por `service_role` no proxy "para resolver o
403" transforma o proxy em acesso irrestrito ao banco, sem RLS, para qualquer
request que chegue nele. Esse é o modo de falha mais provável desta arquitetura no
longo prazo.

---

## 3. Decisões de arquitetura e alternativas descartadas

Estas decisões já foram tomadas. Estão aqui com o motivo para o executor **não
"melhorar" de volta** para a opção rejeitada.

1. **Ordem: hotfix de RLS ANTES do BFF, como entrega isolada.**
   Motivo: são falhas exploráveis hoje em produção com a key que já está no APK. O
   BFF protege contra XSS hipotético; o RLS quebrado é real e imediato.
   *Descartado:* fazer tudo junto no BFF. Rejeitado porque atrasa a correção de uma
   falha ativa e acopla um fix urgente a uma migração grande e arriscada.

2. **Camada de dados do web: proxy endurecido, não reescrita dos 113 call sites.**
   Um proxy catch-all endurecido (allowlist tabela+método) mantém os ~113 call
   sites intactos; o web aponta o client supabase-js para o proxy.
   *Migração para endpoints dedicados fica reservada ao que é sensível:* tudo de
   `familia_membros` (papéis, convites, remoção), operações destrutivas em massa, e
   Storage de avatar. O resto (catálogos, leitura de transações) fica no proxy
   indefinidamente, coberto por RLS.
   *Descartado (a):* reescrever os 113 call sites em endpoints REST próprios — muito
   trabalho, alto risco de regressão, sem ganho de segurança sobre "RLS + proxy
   endurecido" para os recursos não-sensíveis.
   *Descartado (c):* deixar o web falando direto com o Supabase e só mover a auth —
   rejeitado porque, com o token só em cookie httpOnly, o supabase-js do browser
   perde acesso ao token e as chamadas diretas param de funcionar autenticadas.

3. **`service_role` NUNCA atende request de usuário.** O client do BFF é criado por
   request com o token daquele usuário (cookie no web, `Bearer` no nativo). RLS
   continua sendo a barreira. O proxy injeta a *publishable* key como `apikey`, e o
   token do usuário como `Authorization`.

4. **Sem server rendering de HTML** (é alpha no Expo). Só API routes; o client
   segue SPA. Não habilitar SSR de rota.
   *Descartado:* usar SSR para proteger rotas no servidor — rejeitado por ser alpha
   e fora de escopo; a proteção de rota continua no client (`(auth)/_layout.js`),
   agora alimentada por `GET /auth/me` validado no servidor (Etapa 6).

5. **Remover `service_role`/secret/vars órfãs da Vercel ANTES do server output.**
   Hoje são inertes (site estático); no instante em que existir runtime de
   function, ficam legíveis por qualquer código que rode ali. Ver Etapa 2.

### Levantamentos que embasam a arquitetura (resolvidos nesta fase)

- **Schemas expostos na API do Supabase:** apenas `public` e `graphql_public`. O
  schema `private` **NÃO** está exposto — confirmado: `GET /rest/v1/pessoa` com
  `Accept-Profile: private` retorna `PGRST106 "Invalid schema: private. Only the
  following schemas are exposed: public, graphql_public"`. Isso reduz (mas não
  elimina) o risco do header `Accept-Profile` no proxy: mesmo assim o proxy DEVE
  fixar `Accept-Profile`/`Content-Profile` no servidor, porque (i) expor `private`
  é uma mudança de uma linha no dashboard que reabriria o buraco silenciosamente, e
  (ii) `is_familia_member()` (SECURITY DEFINER) vive em `private`.
- **Funções SECURITY DEFINER:** `private.fill_user_id_on_insert`,
  `private.is_familia_member(bigint)`, `private.preserve_user_id_on_update` — todas
  no schema `private` (não exposto ao PostgREST, portanto não chamáveis via
  `/rpc/`). Em `public`, só `set_updated_at` (NÃO é SECURITY DEFINER). **Nenhuma
  função SECURITY DEFINER é exposta via PostgREST.**
- **RPC usado pelo web:** o código chama `supabase.rpc("get_family_snapshot")`
  (`familyRepository.ts:56`), mas essa função **não existe no banco** — o app trata
  o erro `PGRST202/42883` e cai no fallback com `.from(...)`. Portanto **o
  allowlist de `/rpc/` no proxy pode começar vazio (deny-all)** sem quebrar nada.

---

## 4. Etapas numeradas e independentes

Cada etapa tem: pré-requisitos, arquivos, o que fazer, verificação, reversão. As
etapas 1 e 2 são pré-BFF e independentes entre si.

---

### Etapa 1 — Hotfix de RLS (independente do BFF) 🔴 **EXIGE APROVAÇÃO HUMANA**

**Pré-requisitos:** nenhum (é a primeira coisa). **Antes de rodar:** backup do
banco (Supabase Dashboard → Database → Backups, ou `pg_dump`). **Rodar via SQL
Editor do Supabase revisando statement a statement — NÃO** rodar o `schema_supabase.sql`
inteiro (ele tem seeds que duplicam; restrição já conhecida do projeto).

**Arquivos a criar:**
- `sql/migrations/2026xxxx_rls_hotfix.up.sql` (conteúdo na Seção 5.1)
- `sql/migrations/2026xxxx_rls_hotfix.down.sql` (conteúdo na Seção 5.1)

**O que fazer:** aplicar a migration 5.1. Ela corrige o furo de `familia_membros` e
adiciona `WITH CHECK` a todos os UPDATEs das tabelas de dados. `tipo_imobilizado`
fica **fora** do hotfix (decisão pendente — ver item 3 abaixo).

1. **`familia_membros` — auto-promoção a `owner`.** Hoje o UPDATE não tem
   `WITH CHECK` nem restrição de coluna; um membro pode `UPDATE ... SET role='owner'`
   no próprio registro. E o INSERT via convite não restringe `role`, então um
   convidado pode se inserir já como `owner`.
   **Cuidado crítico (por isso a migration é feita como está):** o app
   *legitimamente* troca papéis em `transferOwnership()`
   (`familyRepository.ts:251-275`): demote do owner atual a `member` e promove o
   alvo a `owner`, e essas duas operações rodam com o token do **owner atual**.
   Também insere `role:'owner'` ao criar família (`createFamily`,
   `familyRepository.ts:171-178`, token do criador = futuro owner) e `role:'member'`
   ao aceitar convite (`familyRepository.ts:368-369`). Logo a policy nova precisa:
   - permitir a um **owner da família** alterar `role` de qualquer membro daquela
     família (mantém `transferOwnership`);
   - permitir a um membro alterar **apenas seu próprio `status`** para sair (não o
     `role`);
   - no INSERT, permitir `role='owner'` só se `user_id = auth.uid()` e ele for o
     `owner_user_id` da família (criação); e `role='member'` no aceite de convite.

2. **`WITH CHECK` ausente em todos os UPDATEs das tabelas de dados.** Hoje as
   policies de UPDATE só têm `USING` (avaliado nas linhas **antigas**), sem
   `WITH CHECK` (avaliado nas linhas **novas**). Sem `WITH CHECK`, um usuário pode
   dar `UPDATE` numa linha dele trocando o `user_id` para o de outra pessoa — mesma
   classe de bug da auto-promoção a `owner`, replicada. Os triggers
   `private.preserve_user_id_on_update` mitigam nas 6 tabelas de dados (banco,
   cartao_faturas, imobilizado, pessoa, recorrencias, transacoes), mas **não** cobrem
   `familias`/`familia_convites`/`profiles`, e trigger não é a barreira de
   autorização — RLS é. A migration 5.1 recria cada `*_update` espelhando o `USING`
   atual no `WITH CHECK`, mantendo `auth.uid()` direto (a troca por
   `(select auth.uid())` é da 5.2, pós-BFF). Sem efeito no app: os fluxos legítimos
   já atendem o predicado.

3. **`tipo_imobilizado` — FORA do hotfix (decisão pendente do dono).** INSERT/UPDATE
   hoje liberados a qualquer `authenticated`, sem coluna de dono (colunas:
   `id_tipo_imobilizado`, `nome`, `created_at`, `updated_at`, `deleted` — sem
   `user_id`). Levantamento concluído (ver "Questões em aberto"): o `nome` é sempre a
   constante `"Geral"` (não é dado do usuário → não é vazamento, é integridade); e o
   sync nativo faz INSERT+UPDATE+DELETE no código, mas só INSERT dispara na prática.
   A migration 5.1 **não** toca em `tipo_imobilizado`; o fix parcial recomendado
   (revogar UPDATE/DELETE, manter SELECT+INSERT) está na 5.1 **como bloco separado
   que não roda por padrão**. **Confirmar com o dono antes de aplicar.**

**Como verificar:**
- Conferir `WITH CHECK` presente em todas as tabelas de dados:
  ```
  supabase db query --linked "select tablename, policyname, coalesce(with_check,'') from pg_policies where schemaname='public' and cmd='UPDATE' order by 1,2"
  ```
  Nenhum `with_check` vazio nas tabelas de dados/familia/profiles.
- Teste negativo (JWT de membro não-owner — obter via login de teste):
  `UPDATE familia_membros SET role='owner' WHERE id=<meu_id>` → 0 linhas / 403.
- Teste negativo user_id-swap: `UPDATE transacoes SET user_id='<outro>' WHERE
  id_transacao=<minha>` → 0 linhas afetadas (rejeitado pelo `WITH CHECK`).
- Teste positivo: criar família, convidar, aceitar, transferir ownership e sair
  continua funcionando (web e nativo em staging); editar uma transação/pessoa/banco
  do próprio usuário continua OK.

**Como reverter:** aplicar `...hotfix.down.sql` (Seção 5.1), que restaura as
policies antigas exatamente como estão hoje. Guardar o texto atual das policies
(já documentado na Seção 5.1) para reversão fiel.

---

### Etapa 2 — Limpeza de env vars na Vercel (independente do BFF) 🔴 **EXIGE APROVAÇÃO HUMANA**

**Pré-requisitos:** nenhum. Fazer **antes** da Etapa 4 (server output), enquanto o
site ainda é estático e as vars são inertes.

**O que fazer:** no projeto `flutu-conta` da Vercel, **remover** as variáveis que
não são usadas e que ficariam legíveis pelo runtime de function:
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `POSTGRES_URL`,
`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_USER`,
`POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Manter** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`
  (serão usadas server-side pelo BFF).
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY`: **manter por enquanto**
  (o nativo ainda depende, e o web depende até a Etapa 7). Elas saem do web só na
  Etapa 7. Ver "Fora de escopo" sobre o nativo.
- `SUPABASE_JWT_SECRET`: **[VERIFICAR]** manter só se algo realmente usar. Com
  `getClaims()` validando a assinatura contra as chaves públicas publicadas do
  projeto (JWKS), o BFF **não** precisa do JWT secret. Recomendação: remover, a
  menos que o executor encontre uso concreto. Confirmar com busca no código antes.

Comandos (nomes só; valores nunca aparecem no terminal):
```
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env rm SUPABASE_SECRET_KEY production
# ... idem para cada POSTGRES_* e NEXT_PUBLIC_*
```

**Como verificar:** `vercel env ls` não lista mais as removidas. Após deploy de
teste, um endpoint de debug temporário que faça `Object.keys(process.env).filter(k
=> /SUPABASE|POSTGRES|SERVICE|SECRET/.test(k))` retorna só o conjunto mantido.
**Remover esse endpoint de debug antes de prod.**

**Como reverter:** re-adicionar as vars via `vercel env add` (guardar os valores
antes de remover, num cofre — não no repo). Como hoje são inertes, o risco de
reversão é baixo.

---

### Etapa 3 — Instalar dependências e fixar versões

**Pré-requisitos:** nenhum (mas é o começo do trilho BFF; fazer em branch).

**Arquivos a alterar:** `package.json`, `package-lock.json`.

**O que fazer:**
```
npm install --save-exact @expo/server@0.6.3 @supabase/ssr@<versão-confirmada>
```
Fixar **exato** (`--save-exact`, sem `^`/`~`) ambos. Verificar que `@expo/server`
ficou `"0.6.3"` no `package.json` sem prefixo.

**Como verificar:** `npm ls @expo/server @supabase/ssr` mostra as versões exatas;
`git diff package.json` não tem `^`/`~` nessas linhas.

**Como reverter:** `git checkout package.json package-lock.json && npm ci`.

---

### Etapa 4 — Server output + health check (sem tocar em auth)

**Pré-requisitos:** Etapa 3 concluída. Etapa 2 concluída (vars perigosas já fora).

**Arquivos a criar/alterar:**
- `app.json` — trocar `web.output` para `"server"`.
- `api/index.js` (entry da Vercel para o adapter) — **na raiz**, não em `app/`.
- `app/health+api.ts` (rota trivial de health check).
- `vercel.json` — buildCommand, outputDirectory, functions/includeFiles, rewrite.

**`app.json`** — alterar só esta chave:
```json
"web": {
  "output": "server",
  "favicon": "./assets/images/favicon.png",
  "bundler": "metro"
}
```

**`api/index.js`** (adapter Vercel; forma exata importa — usar CommonJS, ver
armadilha ESM na Seção 6):
```js
const { createRequestHandler } = require('@expo/server/adapter/vercel');

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
```

**`app/health+api.ts`** (rota de teste GET e POST):
```ts
export function GET() {
  return Response.json({ ok: true, method: 'GET', ts: Date.now() });
}

export function POST(request: Request) {
  return Response.json({ ok: true, method: 'POST' });
}
```

**`vercel.json`** (substituir o conteúdo; manter os headers que já existiam e serão
reforçados na Etapa 9). Estrutura para `@expo/server` (SDK 53, `dist/server` +
`dist/client`):
```json
{
  "buildCommand": "npx expo export -p web",
  "outputDirectory": "dist/client",
  "framework": null,
  "functions": {
    "api/index.js": {
      "includeFiles": "dist/server/**"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/api/index" }
  ]
}
```
> Notas: com `web.output: "server"`, o `expo export -p web` passa a emitir
> `dist/client` (assets estáticos) **e** `dist/server` (bundle das API routes +
> roteador). O `outputDirectory` muda de `dist` para **`dist/client`**. O rewrite
> manda tudo para o handler, que serve tanto os `+api` quanto o SPA. **Remover** o
> rewrite antigo `"/(.*)" → "/"`.
> **[VERIFICAR]** confirmar na doc atual do Expo se, nesta combinação de versões, o
> handler serve os assets estáticos ou se é preciso um rewrite que exclua
> `/_expo/static/*` e `/assets/*` do catch-all. Se assets 404, adicionar antes do
> catch-all: `{ "source": "/_expo/(.*)", "destination": "/_expo/$1" }` e similar
> para `/assets`. Testar no preview.

**O que fazer:** buildar **localmente** (`npx expo export -p web`) e conferir que
`dist/server` e `dist/client` foram gerados. Depois `vercel deploy` (preview).

**Como verificar (não prosseguir sem isto):**
```
curl -i https://<preview-url>/health            # GET → 200 {"ok":true,"method":"GET",...}
curl -i -X POST https://<preview-url>/health    # POST → 200 {"ok":true,"method":"POST"}
```
POST **precisa** responder 200 em deploy real (não só local). Se POST der
`FUNCTION_INVOCATION_TIMEOUT`, ver Seção 6.

**Como reverter:** `git revert` do commit da etapa; `web.output` volta a `"static"`,
`vercel.json` volta ao original (rewrite SPA `"/"`, output `dist`). Deploy.

---

### Etapa 5 — Helper único de client Supabase por request + endpoints de auth

**Pré-requisitos:** Etapa 4 verificada (POST funcionando em preview).

**Arquivos a criar:**
- `server/supabaseServer.ts` — helper único (cookie OU `Authorization: Bearer`).
- `app/auth/login+api.ts`
- `app/auth/signup+api.ts`
- `app/auth/callback+api.ts`
- `app/auth/me+api.ts`
- `app/auth/logout+api.ts`

**Helper `server/supabaseServer.ts`** — cria o client por request. Web usa cookie
via `@supabase/ssr`; nativo manda `Authorization: Bearer` e o helper cai num client
"stateless" sem cookies. Forma exata (`getAll`/`setAll` é a API atual do
`@supabase/ssr`):
```ts
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

type ParsedCookie = { name: string; value: string };

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

function parseCookies(header: string | null): ParsedCookie[] {
  if (!header) return [];
  return header.split(';').map((p) => {
    const idx = p.indexOf('=');
    const name = p.slice(0, idx).trim();
    const value = decodeURIComponent(p.slice(idx + 1).trim());
    return { name, value };
  }).filter((c) => c.name);
}

function serializeCookie(name: string, value: string, opts = COOKIE_OPTS) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path}`,
    `SameSite=${opts.sameSite}`];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

// Cria client por request. Retorna também os Set-Cookie acumulados pelo supabase.
export function createSupabaseForRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const initial = parseCookies(cookieHeader);
  const setCookieHeaders: string[] = [];

  const bearer = request.headers.get('authorization'); // nativo

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return initial;
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookieHeaders.push(serializeCookie(name, value, { ...COOKIE_OPTS, ...options }));
        }
      },
    },
    // Se veio Bearer (nativo), injeta como header global — o token vem do SecureStore.
    global: bearer ? { headers: { Authorization: bearer } } : undefined,
  });

  return { supabase, setCookieHeaders };
}

// Helper de resposta que anexa os Set-Cookie acumulados.
export function withCookies(body: BodyInit | null, init: ResponseInit,
    setCookieHeaders: string[]) {
  const headers = new Headers(init.headers);
  for (const c of setCookieHeaders) headers.append('Set-Cookie', c);
  return new Response(body, { ...init, headers });
}
```
> **[VERIFICAR]** o formato exato de `options` em `setAll` (o `@supabase/ssr` passa
> `CookieOptions` — `maxAge`, `expires`, `domain`, etc.). Mapear para o serializer.
> Garantir que **todo** cookie de sessão sai com `HttpOnly; Secure; SameSite=Lax;
> Path=/`. Considerar prefixo `__Host-` **apenas** se o `@supabase/ssr` permitir
> renomear os cookies `sb-*` (provavelmente não sem quebrar o parsing dele) —
> tratar como melhoria opcional, não bloquear a etapa por isso.

**Endpoints** (todos devem validar de verdade com `getUser()`/`getClaims()`, nunca
`getSession()` para decisão de auth — o próprio Supabase avisa: *"Never trust
getSession() inside server code... Always use getClaims() to protect pages and user
data"*):

- **`POST /auth/login`** — lê `{ email, senha }`, checa `Origin` (ver Etapa 8),
  `supabase.auth.signInWithPassword(...)`, e responde `withCookies(null, {status:204},
  setCookieHeaders)`.
- **`POST /auth/signup`** — `supabase.auth.signUp(...)`, idem.
- **`GET /auth/callback`** — troca o `code` do PKCE por sessão:
  `supabase.auth.exchangeCodeForSession(code)` (code vem de `?code=`), seta cookies,
  redireciona para a rota web apropriada (`/` ou `/nova-senha` conforme o fluxo).
- **`GET /auth/me`** — `const { data, error } = await supabase.auth.getUser();`
  (revalida no servidor). 200 com `{ user }` ou **401** se `error`/sem user.
- **`POST /auth/logout`** — `supabase.auth.signOut()`, e responde limpando os
  cookies (setar `sb-*` com `Max-Age=0`). Checar `Origin`.

**Como verificar:**
```
curl -i -X POST https://<preview>/auth/login -H 'content-type: application/json' \
  -H 'origin: https://<preview>' -d '{"email":"...","senha":"..."}'
# → 204 com vários Set-Cookie sb-*; HttpOnly; Secure; SameSite=Lax
curl -i https://<preview>/auth/me --cookie "<cookies do passo anterior>"   # → 200 {user}
curl -i https://<preview>/auth/me                                          # sem cookie → 401
curl -i -X POST https://<preview>/auth/logout --cookie "<...>" -H 'origin: https://<preview>'
```
No navegador: DevTools → Application → Cookies → conferir `sb-*` com HttpOnly e
Secure marcados.

**Como reverter:** remover os arquivos de endpoint e o helper; `git revert`. A auth
web continua no client como antes (localStorage) até a Etapa 7 amarrar o front.

---

### Etapa 6 — Proxy de dados endurecido (Fase 2.5)

**Pré-requisitos:** Etapa 5 verificada.

**Arquivo a criar:** `app/db/[...path]+api.ts` (proxy REST) e, se necessário,
`app/storage/[...path]+api.ts` (Storage — ver Etapa de avatar abaixo).

**Comentário obrigatório no topo do arquivo do proxy (caixa alta):**
```ts
// ============================================================================
// ATENÇÃO / SECURITY-CRITICAL
// Este proxy usa a PUBLISHABLE key + o token do usuário. A barreira de acesso é
// o RLS. NUNCA troque a publishable key por SERVICE_ROLE / SECRET key aqui para
// "resolver um 403": isso desliga o RLS e transforma este endpoint em acesso
// IRRESTRITO ao banco para qualquer request. Um 403/401 aqui = corrigir RLS ou
// o token do usuário, NUNCA elevar privilégio do proxy.
// ============================================================================
```

**Requisitos de segurança (cada um com o porquê — não simplificar):**

1. **Allowlist explícita de tabela + método HTTP.** Nada de catch-all cru.
   ```ts
   const TABLE_ALLOWLIST: Record<string, Set<string>> = {
     banco: new Set(['GET', 'POST', 'PATCH', 'DELETE']),
     banco_catalogo: new Set(['GET']),
     categoria_catalogo: new Set(['GET']),
     cartao_faturas: new Set(['GET', 'POST', 'PATCH', 'DELETE']),
     imobilizado: new Set(['GET', 'POST', 'PATCH', 'DELETE']),
     tipo_imobilizado: new Set(['GET']),           // web só lê pelo proxy; nativo escreve direto (não passa aqui)
     pessoa: new Set(['GET', 'POST', 'PATCH', 'DELETE']),
     transacoes: new Set(['GET', 'POST', 'PATCH', 'DELETE']),
     recorrencias: new Set(['GET', 'POST', 'PATCH', 'DELETE']),
     recorrencia_transacoes: new Set(['GET', 'POST', 'DELETE']),
     familias: new Set(['GET', 'POST', 'PATCH', 'DELETE']),         // RLS é a barreira (Etapa 1)
     familia_membros: new Set(['GET', 'POST', 'PATCH', 'DELETE']),  // RLS é a barreira (Etapa 1)
     familia_convites: new Set(['GET', 'POST', 'PATCH', 'DELETE']), // RLS é a barreira (Etapa 1)
     profiles: new Set(['GET', 'PATCH']),
   };
   ```
   *Por quê:* sem allowlist, o proxy vira PostgREST aberto para qualquer tabela do
   schema (limitado só por RLS). A allowlist é defesa em profundidade e documenta a
   superfície. `familia_*` é **gravável** pelo proxy no 1º corte (decisão do dono): o
   hotfix de RLS da Etapa 1 (incl. `WITH CHECK` e o fix de auto-promoção) é o
   controle principal; endpoints dedicados de família seriam só defesa em
   profundidade e ficaram para depois (ver "Fora de escopo").

2. **Request reconstruída do zero no servidor.** `apikey`, `Authorization`,
   `Accept-Profile` e `Content-Profile` SEMPRE setados pelo servidor, **nunca**
   herdados do client.
   ```ts
   const upstreamHeaders = new Headers();
   upstreamHeaders.set('apikey', SUPABASE_PUBLISHABLE_KEY);      // server-only
   upstreamHeaders.set('Authorization', `Bearer ${accessToken}`); // do cookie/bearer
   upstreamHeaders.set('Accept-Profile', 'public');   // FIXO. nunca do client
   upstreamHeaders.set('Content-Profile', 'public');  // FIXO. nunca do client
   upstreamHeaders.set('Accept', 'application/json');
   ```
   *Por quê:* `Accept-Profile`/`Content-Profile` trocam o schema alvo do PostgREST.
   Este projeto tem o schema `private` (onde vive `is_familia_member()`,
   SECURITY DEFINER). Hoje `private` não está exposto (confirmado: `PGRST106`), mas
   expor é uma mudança de uma linha no dashboard; fixar no servidor fecha o vetor de
   forma permanente. Herdar qualquer um desses headers do client é o bug clássico
   de confused deputy.

3. **`Prefer` com allowlist de valores.** Repassar `Prefer` do client só se ∈
   `{'return=representation', 'return=minimal', 'count=exact', 'resolution=merge-duplicates'}`
   (combinações separadas por vírgula, validar cada token). Descartar o resto.
   *Por quê:* `Prefer` controla upsert/retorno; valores arbitrários podem mudar
   semântica de escrita.

4. **`/rpc/*` bloqueado por padrão.** Allowlist nominal **vazia** hoje (deny-all):
   nenhuma função SECURITY DEFINER é exposta via PostgREST, e o único `rpc()` do
   código (`get_family_snapshot`) nem existe no banco (usa fallback). Se no futuro
   criarem um RPC para o web, adicionar nominalmente aqui, decidindo caso a caso se
   é SECURITY DEFINER (nesse caso, revisão extra: ele roda com privilégio do dono e
   pode furar RLS).
   ```ts
   const RPC_ALLOWLIST = new Set<string>([]); // deny-all por padrão
   ```

5. **Checagem de `Origin` em todo método mutante** (POST/PATCH/PUT/DELETE).
   Complemento ao `SameSite=Lax`. Ver Etapa 8 para a lista de origens.
   *Por quê:* SameSite=Lax não cobre todos os casos de CSRF (ex.: navegação
   top-level POST em alguns browsers); checar `Origin` fecha a folga.

6. **Rate limit e timeout.** Timeout no `fetch` upstream (ex.: `AbortController`
   com 10 s). Rate limit por IP/usuário (simples: contador em memória por instância
   com janela deslizante). **Decisão do dono:** rate limit é **best-effort em
   memória por instância** — SEM dependência externa (nada de Upstash/Redis) neste
   corte. Deixar claro no comentário do arquivo que, como as functions da Vercel são
   efêmeras e escalam horizontalmente, o contador não é compartilhado entre
   instâncias: protege contra abuso trivial de uma única origem, não contra ataque
   distribuído. O timeout do `fetch` upstream (AbortController) é obrigatório
   independentemente do rate limit.

7. **Passagem só dos query params** (`?select=...&id=eq.1...`) — repassar a
   querystring como veio, mas o **path** é validado contra a allowlist (primeiro
   segmento = tabela). Corpo repassado como-está para POST/PATCH.

**Família — escrita fica no PROXY (não há endpoints dedicados no 1º corte).**
Decisão do dono: com o `WITH CHECK` correto no banco (Etapa 1) + o hotfix de
`familia_membros`, um endpoint dedicado de família seria **defesa em profundidade**,
não o controle principal — não vale inchar o primeiro corte. Portanto, para o web
funcionar, a escrita de família **passa pelo proxy** com allowlist ajustada:
`familias`, `familia_membros`, `familia_convites` recebem os métodos que
`familyRepository.ts` usa (`GET/POST/PATCH/DELETE` conforme cada um), e o RLS
endurecido é a barreira. Os endpoints dedicados de família ficam registrados em
"Fora de escopo — para depois". (Isto substitui a versão anterior deste plano, que
mantinha `familia_*` read-only no proxy — agora são graváveis via proxy, protegidos
pelo RLS da Etapa 1.) Atualizar a allowlist da Etapa 6:
```ts
familias: new Set(['GET', 'POST', 'PATCH', 'DELETE']),
familia_membros: new Set(['GET', 'POST', 'PATCH', 'DELETE']),
familia_convites: new Set(['GET', 'POST', 'PATCH', 'DELETE']),
```

**Avatar — 1º corte, via signed upload URL (NÃO pelo proxy).** Uma função da Vercel
tem limite de **4,5 MB** de corpo de request (413 `FUNCTION_PAYLOAD_TOO_LARGE` —
[Vercel Functions Limits](https://vercel.com/docs/functions/limitations)); mandar a
imagem pela função arrisca estourar isso. Fluxo correto: o arquivo vai **direto do
browser para o Storage**, sem trafegar pela função.
- Criar `app/avatar/sign-upload+api.ts` (`POST`): cria client por request (helper),
  checa `Origin`, revalida usuário com `getUser()`, deriva o path
  `${user.id}.${ext}` (o mesmo padrão de hoje em `AuthContext.tsx:265`), e chama
  `supabase.storage.from('avatars').createSignedUploadUrl(path)`; retorna
  `{ signedUrl, token, path }` ao browser.
- O browser faz o upload direto via `supabase.storage.from('avatars')
  .uploadToSignedUrl(path, token, file)` (ou PUT no `signedUrl`). Nada de bytes
  passando pela função.
- Remoção: `app/avatar/remove+api.ts` (`POST`) — payload pequeno (só o path), pode
  passar pela função; usa o token do usuário e chama `storage.remove`.
- Leitura continua via **URL pública** (bucket `avatars.public = true`, confirmado).
- **[VERIFICAR]** que as 4 policies do bucket `avatars` (todas `to authenticated`,
  amarradas a `split_part(name,'.',1) = auth.uid()`) continuam válidas neste fluxo: o
  `createSignedUploadUrl` roda com o token do usuário server-side, então a policy de
  INSERT é avaliada na criação da URL assinada e o `path` precisa começar com o
  `auth.uid()` — o padrão `${user.id}.${ext}` satisfaz. Confirmar a assinatura exata
  de `createSignedUploadUrl`/`uploadToSignedUrl` no supabase-js 2.103.

**Como verificar:**
- `GET /db/transacoes?select=*&limit=1` autenticado (cookie) → 200 com dados só do
  usuário. Sem cookie → 401.
- `GET /db/familia_membros` → 200 (read). `PATCH /db/familia_membros?id=eq.X` de um
  membro não-owner → **403 do RLS** (a allowlist permite o método; o RLS barra).
- `GET /db/banco_catalogo` com `POST` → 405 (método fora da allowlist).
- `POST /db/pessoa` sem header `Origin` válido → 403.
- Tentar `Accept-Profile: private` no request do client não muda nada (o servidor
  sobrescreve) — confirmar via log que o upstream recebeu `public`.
- `POST /rpc/qualquer_coisa` → 403 (deny-all).

**Como reverter:** remover os arquivos de proxy/endpoints; o web volta a falar
direto com o Supabase (enquanto `EXPO_PUBLIC_*` ainda existir no web, pré-Etapa 7).

---

### Etapa 7 — Amarrar o front web ao BFF + corrigir bootstrap de sessão

**Pré-requisitos:** Etapas 5 e 6 verificadas.

**Arquivos a alterar:**
- `services/supabase/client.ts` — no **web**, apontar o client para o proxy e tirar
  a dependência de `EXPO_PUBLIC_*`. No nativo, **nada muda**.
- `state/AuthContext.tsx` — reescrever o bootstrap (linhas 380-421) e os fluxos
  `logIn`/`logOut` no web para usar os endpoints do BFF.
- `services/auth/passwordRecovery.ts` — no web, migrar para PKCE via
  `/auth/callback`; no nativo, manter implicit flow.
- Camada de fetch: criar `services/http/apiFetch.ts` com tratamento **centralizado**
  de 401 (redireciona para login uma vez, sem loop).

**Client web apontando para o proxy** (`client.ts`):
```ts
// Só no web. baseUrl = mesma origem (o BFF), key dummy (a real fica no server).
const isWeb = Platform.OS === 'web';
const url = isWeb ? `${window.location.origin}/db` : process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = isWeb ? 'proxy' /* placeholder, ignorado pelo proxy */ : process.env.EXPO_PUBLIC_SUPABASE_KEY;
```
> **[VERIFICAR]** o supabase-js monta URLs como `${url}/rest/v1/<tabela>`. O proxy
> deve aceitar o path que o supabase-js gera. Duas opções: (a) apontar o client web
> para `${origin}` e o proxy responder em `/rest/v1/[...path]`; ou (b) apontar para
> `${origin}/db` e reescrever. Preferir (a): criar o proxy em
> `app/rest/v1/[...path]+api.ts` para casar exatamente com o que o supabase-js
> emite, evitando reescrever `select`/filtros. Ajustar a Etapa 6 conforme o executor
> confirmar o formato de URL do supabase-js nesta versão (2.103). **Storage NÃO
> precisa de proxy:** avatar sobe via signed upload URL (Etapa 6) e a leitura é por
> URL pública direta do bucket — não roteie `storage/v1` pela função. **auth**: o
> supabase-js do web NÃO deve mais gerenciar sessão — usar `persistSession:false` no
> web e chamar os endpoints `/auth/*` diretamente via `apiFetch`.

**Bootstrap novo (exigências da Fase 3, todas obrigatórias):**
- Estado inicial de auth é **`loading`**, nunca `authenticated`.
- No boot, o **web chama `GET /auth/me`** e só então decide. Nada de renderizar rota
  protegida com base em token persistido no client.
- Splash/skeleton durante o loading — sem flash de tela autenticada. Hoje
  `(auth)/_layout.js:89-102` já mostra loader enquanto `!isReady`; a diferença é que
  `isReady` no web só vira `true` **depois** da resposta do `/auth/me`.
- Falha de refresh → **401 do `/auth/me`** (web) ou evento `SIGNED_OUT`/erro de
  refresh (nativo) limpa o storage local e manda pro login **sem loop de redirect**.
- **401 tratado na camada de fetch** (`apiFetch.ts`), não espalhado por tela: um 401
  dispara logout + redirect único (guardar flag para não reentrar).

**AuthContext — esboço do novo `init()` no web:**
```ts
async function init() {
  setIsReady(false); // loading
  if (Platform.OS === 'web') {
    try {
      const res = await apiFetch('/auth/me');       // valida no servidor
      if (res.ok) {
        const { user } = await res.json();
        setUser(mapClaimsToUser(user));
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
    } finally {
      setIsReady(true);
    }
    return;
  }
  // Nativo: mantém getSession() do storage, MAS valida antes de marcar logado (Etapa 8)
  ...
}
```
> **Importante:** no nativo, o `onAuthStateChange` continua existindo (o supabase-js
> gerencia refresh). No web, como `persistSession:false`, não haverá
> `onAuthStateChange` útil — a fonte da verdade é `/auth/me` + os cookies. Não
> registrar o listener no web para evitar o `SIGNED_OUT` espúrio que causa o bug
> atual.

**Recuperação de senha no web (PKCE):** `resetPasswordForEmail` com `redirectTo`
apontando para `/auth/callback` (que troca o `code` e seta cookies), depois
redireciona para `/nova-senha`. `passwordRecovery.ts:64-90` (parsing de
`access_token` da URL + `setSession`) fica **só no nativo**.

**Como verificar (inclui o critério da tarefa):**
- **Cenário-chave:** logar no web, esperar/forçar expiração da sessão (ou apagar o
  refresh no servidor), **abrir o app dias depois** → deve cair **direto no login,
  sem piscar tela logada**. Testar de fato: setar `JWT expiry` curto em staging,
  logar, esperar expirar, recarregar. Não pode haver flash autenticado.
- Login → refresh de página (F5) → continua logado (cookie httpOnly sobrevive).
- Logout → `/auth/me` passa a dar 401, redireciona para login, sem loop.
- Re-login funciona.
- DevTools: nenhum token em localStorage/sessionStorage no web.

**Como reverter:** `git revert` da etapa. O client web volta a `EXPO_PUBLIC_*` +
localStorage. (Enquanto `EXPO_PUBLIC_*` ainda existir na Vercel — só remover na
Etapa 10.)

---

### Etapa 8 — Nativo: validar antes de renderizar + `origin` do config plugin

**Pré-requisitos:** Etapa 7 (front web) verificada; nativo ainda intacto até aqui.

**Arquivos a alterar:**
- `app.json` — adicionar `origin` no config do `expo-router` apontando para a URL de
  produção.
- `state/AuthContext.tsx` — bootstrap nativo valida a sessão antes de marcar
  `isLoggedIn=true`.

**`app.json` — `origin`** (senão `fetch` relativo quebra no build nativo de prod):
```json
"plugins": [
  ["expo-router", { "origin": "https://flutu-conta.vercel.app" }],
  "expo-secure-store",
  ["expo-notifications", {}]
]
```
> **[VERIFICAR]** a forma de passar `origin` ao `expo-router` nesta versão (5.1.11):
> confirmar na doc do Expo SDK 53 se é via plugin `["expo-router", { origin }]` ou
> via `extra`/env. Sem `origin`, `fetch('/auth/me')` no APK de produção não resolve
> host.

**Bootstrap nativo:** hoje o nativo usa `getSession()` do storage e marca logado na
hora — mesmo bug de fundo do web. Corrigir: após `getSession()`, chamar
`supabase.auth.getUser()` (revalida no servidor) **antes** de `setIsLoggedIn(true)`;
se `getUser()` falhar, limpar storage e ir para login. O `onAuthStateChange` do
nativo continua, mas o estado inicial nunca é `authenticated` sem validação.
- Nativo continua mandando `Authorization: Bearer` (token do SecureStore) para os
  endpoints do BFF que usar; para acesso direto ao Supabase (sync SQLite), **nada
  muda** — continua com `EXPO_PUBLIC_*` e token do supabase-js.

**Origin allowlist (para a checagem de `Origin` das Etapas 5/6):** origens válidas =
`https://flutu-conta.vercel.app` (prod) + os domínios de preview da Vercel do
projeto. **Não** usar wildcard aberto. Para nativo, não há `Origin` (requests
não-browser); a checagem de `Origin` aplica-se só quando o header existe — requests
sem `Origin` mas com `Authorization: Bearer` válido são do nativo e passam. Documentar
essa regra no helper.

**Como verificar:**
- Build nativo (Gradle local — o projeto **nunca** usa `eas build`; ver CLAUDE.md) e
  smoke test: login, sync, operações de família continuam funcionando idênticas ao
  atual.
- Cenário de sessão expirada no nativo: abrir após expiração → login, sem flash
  logado.
- Confirmar que o nativo não regrediu em nada (é o critério "app nativo funcionando
  igual a antes").

**Como reverter:** `git revert`; remover `origin` do `app.json`.

---

### Etapa 9 — Headers de segurança (CSP em Report-Only primeiro)

**Pré-requisitos:** Etapa 4+ (server output no ar em preview).

**Arquivo a alterar:** `vercel.json` (bloco `headers`).

**O que fazer:** manter os headers atuais (nosniff, Referrer-Policy) e adicionar
HSTS, Permissions-Policy, `frame-ancestors 'none'`, e CSP. **Subir a CSP primeiro
como `Content-Security-Policy-Report-Only`**, coletar as violações reais do bundle
do Expo (que injeta scripts/estilos inline e pode precisar de `wasm-unsafe-eval`
etc.), ajustar, e só então converter para `Content-Security-Policy` (enforce).
- `X-Frame-Options: DENY` já existe; adicionar `frame-ancestors 'none'` na CSP.
- HSTS: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `Permissions-Policy`: desabilitar o que o app não usa (camera/mic só se avatar por
  foto no web — **[VERIFICAR]** o web usa `expo-image-picker`? Se não, negar tudo).

**Como verificar:** em Report-Only, DevTools → Console mostra violações; ajustar até
zerar sem quebrar o app. Depois enforce e reconfirmar que login/dados funcionam.
`securityheaders.com` na URL de prod para nota final.

**Como reverter:** `git revert` do bloco de headers.

---

### Etapa 10 — Tirar a publishable key do bundle web + configs do Supabase

**Pré-requisitos:** Etapa 7 verificada (web 100% no BFF, não usa mais
`EXPO_PUBLIC_*`).

**O que fazer:**
- Na Vercel, remover `EXPO_PUBLIC_SUPABASE_URL`/`KEY` **do ambiente que builda o
  web** — mas o nativo ainda precisa delas para o build local (Gradle) e para o sync
  direto. Como o build web e o build nativo são processos diferentes (Vercel vs
  Gradle local), remover da Vercel não afeta o nativo. **[VERIFICAR]** confirmar que
  nenhum código web remanescente lê `EXPO_PUBLIC_*` (grep em `dist/client`).
- Configs do Supabase (via Dashboard → Authentication; **[VERIFICAR]** se há acesso
  à Management API com `SUPABASE_ACCESS_TOKEN` exportado, pode-se automatizar):
  - JWT expiry para **30 min**.
  - Refresh token rotation **ON**.
  - Redirect URLs **explícitas** (prod + previews nomeados), sem wildcard aberto.
  - **Leaked password protection ON** (advisor hoje: OFF — `auth_leaked_password_protection`).

**Como verificar (critério de aceite):**
```
# Zero ocorrências de trecho da key no bundle client:
grep -r "sb_publishable_" dist/client/ ; echo "exit=$?"   # deve não achar nada
```
DevTools no web de prod: nenhum token nem key Supabase em Network (a não ser
chamadas ao próprio BFF) nem em Sources.

**Como reverter:** re-adicionar `EXPO_PUBLIC_*` no ambiente web da Vercel; reverter
o commit de `client.ts` que tirou o fallback.

---

## 5. Migrations SQL

> Rodar no SQL Editor do Supabase, **revisando statement a statement**, com backup
> feito. **NÃO** rodar `sql/schema_supabase.sql` inteiro (seeds duplicam — restrição
> conhecida do projeto). As policies atuais (estado antes do fix) estão citadas nos
> `down` para reversão fiel.

### 5.1 — Hotfix de RLS (Etapa 1)

**`sql/migrations/2026xxxx_rls_hotfix.up.sql`:**
```sql
begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) familia_membros: impedir auto-promoção a owner e restringir INSERT
-- ─────────────────────────────────────────────────────────────────────────

-- UPDATE: separa dois casos legítimos.
--  (a) OWNER da família pode alterar qualquer membro (mantém transferOwnership).
--  (b) o próprio membro só pode mexer no PRÓPRIO registro E sem trocar de papel
--      (permite sair: status -> 'removed'; NÃO permite role -> 'owner').
drop policy if exists "familia_membros_update" on public.familia_membros;

create policy "familia_membros_update_owner" on public.familia_membros
  for update
  using (
    exists (
      select 1 from public.familias f
      where f.id = familia_membros.family_id
        and f.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.familias f
      where f.id = familia_membros.family_id
        and f.owner_user_id = (select auth.uid())
    )
  );

create policy "familia_membros_update_self" on public.familia_membros
  for update
  using ( user_id = (select auth.uid()) )
  with check (
    user_id = (select auth.uid())
    -- impede escalonamento: o papel não pode virar 'owner' por auto-update.
    and role <> 'owner'
  );

-- INSERT: dois casos legítimos.
--  (a) criação de família: o criador se insere como owner do PRÓPRIO user_id,
--      e ele é o owner_user_id da família recém-criada.
--  (b) aceite de convite: o convidado se insere como 'member' (nunca 'owner'),
--      e precisa ter um convite pendente para aquele email/família.
drop policy if exists "familia_membros_insert" on public.familia_membros;

create policy "familia_membros_insert" on public.familia_membros
  for insert
  with check (
    -- (a) owner se auto-inserindo na própria família
    (
      user_id = (select auth.uid())
      and role = 'owner'
      and exists (
        select 1 from public.familias f
        where f.id = familia_membros.family_id
          and f.owner_user_id = (select auth.uid())
      )
    )
    or
    -- (b) convidado aceitando convite, sempre como member
    (
      user_id = (select auth.uid())
      and role = 'member'
      and exists (
        select 1 from public.familia_convites c
        where c.family_id = familia_membros.family_id
          and c.status = 'pending'
          and lower(c.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2) WITH CHECK em TODOS os UPDATEs das tabelas de dados.
--    Motivo: sem WITH CHECK, o predicado da policy só é avaliado nas linhas
--    ANTIGAS (USING), não nas NOVAS. Um usuário pode dar UPDATE numa linha dele
--    trocando user_id para o de outra pessoa (mesma classe da auto-promoção a
--    owner). Os triggers private.preserve_user_id_on_update mitigam nas 6 tabelas
--    de dados, mas (i) não cobrem familias/familia_convites/profiles, e (ii)
--    trigger não é a barreira de autorização — RLS é. WITH CHECK é o guard certo.
--    Recriamos cada *_update espelhando o USING atual no WITH CHECK. Mantemos
--    auth.uid() direto (a troca por (select auth.uid()) é 5.2, pós-BFF).
-- ─────────────────────────────────────────────────────────────────────────

-- padrão "dono OU família compartilhada" (banco, cartao_faturas, imobilizado,
-- pessoa, recorrencias, transacoes)
drop policy if exists "banco_update" on public.banco;
create policy "banco_update" on public.banco for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "cartao_faturas_update" on public.cartao_faturas;
create policy "cartao_faturas_update" on public.cartao_faturas for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "imobilizado_update" on public.imobilizado;
create policy "imobilizado_update" on public.imobilizado for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "pessoa_update" on public.pessoa;
create policy "pessoa_update" on public.pessoa for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "recorrencias_update" on public.recorrencias;
create policy "recorrencias_update" on public.recorrencias for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "transacoes_update" on public.transacoes;
create policy "transacoes_update" on public.transacoes for update
  using      ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)))
  with check ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

-- familias: só o owner
drop policy if exists "familias_update" on public.familias;
create policy "familias_update" on public.familias for update
  using      (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- familia_convites: membro da família (o *_update_invited já tem with check próprio)
drop policy if exists "familia_convites_update" on public.familia_convites;
create policy "familia_convites_update" on public.familia_convites for update
  using      (private.is_familia_member(family_id))
  with check (private.is_familia_member(family_id));

-- profiles: só o próprio
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using      (id = auth.uid())
  with check (id = auth.uid());

-- Observações:
--  * recorrencia_transacoes NÃO tem policy de UPDATE (só select/insert/delete) → nada a fazer.
--  * banco_catalogo / categoria_catalogo só têm SELECT → nada a fazer.
--  * familia_membros já recebeu WITH CHECK no item 1.
--  * tipo_imobilizado: FORA do hotfix. Ver item 2 da Etapa 1 e a seção
--    "Questões em aberto". Decisão do dono entre (A) adicionar user_id + escopar e
--    (C) aceitar o risco. Bloco recomendado (revogar UPDATE/DELETE) NÃO roda aqui.

commit;
```

**`sql/migrations/2026xxxx_rls_hotfix.down.sql`** (restaura o estado atual exato):
```sql
begin;

-- 1) familia_membros: restaura policies originais (sem os splits owner/self)
drop policy if exists "familia_membros_update_owner" on public.familia_membros;
drop policy if exists "familia_membros_update_self"  on public.familia_membros;
drop policy if exists "familia_membros_insert"       on public.familia_membros;

create policy "familia_membros_update" on public.familia_membros
  for update
  using (
    (user_id = auth.uid())
    or exists (
      select 1 from familias
      where familias.id = familia_membros.family_id
        and familias.owner_user_id = auth.uid()
    )
  );

create policy "familia_membros_insert" on public.familia_membros
  for insert
  with check (
    (exists (
      select 1 from familias
      where familias.id = familia_membros.family_id
        and familias.owner_user_id = auth.uid()
    ))
    or (
      (user_id = auth.uid())
      and exists (
        select 1 from familia_convites c
        where c.family_id = familia_membros.family_id
          and c.status = 'pending'
          and lower(c.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
      )
    )
  );

-- 2) remove o WITH CHECK dos UPDATEs (recria cada policy só com USING, como hoje)
drop policy if exists "banco_update" on public.banco;
create policy "banco_update" on public.banco for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "cartao_faturas_update" on public.cartao_faturas;
create policy "cartao_faturas_update" on public.cartao_faturas for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "imobilizado_update" on public.imobilizado;
create policy "imobilizado_update" on public.imobilizado for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "pessoa_update" on public.pessoa;
create policy "pessoa_update" on public.pessoa for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "recorrencias_update" on public.recorrencias;
create policy "recorrencias_update" on public.recorrencias for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "transacoes_update" on public.transacoes;
create policy "transacoes_update" on public.transacoes for update
  using ((user_id = auth.uid()) or (is_family_shared = 1 and family_id is not null and private.is_familia_member(family_id)));

drop policy if exists "familias_update" on public.familias;
create policy "familias_update" on public.familias for update
  using (owner_user_id = auth.uid());

drop policy if exists "familia_convites_update" on public.familia_convites;
create policy "familia_convites_update" on public.familia_convites for update
  using (private.is_familia_member(family_id));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid());

commit;
```
> **Notas de revisão:**
> - Os predicados de `USING` acima são cópia fiel do estado auditado. Conferir com
>   `select policyname, cmd, qual, with_check from pg_policies where schemaname='public'`
>   antes e depois.
> - Colunas confirmadas de `tipo_imobilizado`: `id_tipo_imobilizado` (PK), `nome`,
>   `created_at`, `updated_at`, `deleted` — sem `user_id`.
> - **Fix parcial recomendado para `tipo_imobilizado` (NÃO incluído no `up`; rodar só
>   se o dono aprovar a opção parcial):**
>   ```sql
>   -- Fecha vandalismo cruzado sem adicionar coluna: bloqueia UPDATE/DELETE de
>   -- qualquer cliente (mantém SELECT + INSERT, que é o único caminho usado na
>   -- prática). Os caminhos de UPDATE/DELETE do sync nativo (sem gatilho de UI)
>   -- passam a dar erro de sync capturado, não corrompem dados.
>   begin;
>   drop policy if exists "tipo_imobilizado_update" on public.tipo_imobilizado;
>   revoke update, delete on table public.tipo_imobilizado from authenticated, anon;
>   commit;
>   -- down:
>   -- begin;
>   -- grant update, delete on table public.tipo_imobilizado to authenticated;
>   -- create policy "tipo_imobilizado_update" on public.tipo_imobilizado
>   --   for update using (auth.role() = 'authenticated');
>   -- commit;
>   ```

### 5.2 — Endurecimento de RLS (Etapa opcional, pós-BFF) 🔴 **APROVAÇÃO HUMANA**

Melhorias que o advisor pede e o plano original listou. **Não** são urgentes como o
5.1; entram depois do BFF estável. Aplicar tabela a tabela, testando o app entre
cada uma (mudanças em RLS quebram o app silenciosamente com 403).

```sql
begin;

-- 1) auth_rls_initplan: trocar auth.uid() por (select auth.uid()) nas policies.
--    Fazer tabela a tabela recriando cada policy. Exemplo para transacoes.select:
drop policy if exists "transacoes_select" on public.transacoes;
create policy "transacoes_select" on public.transacoes
  for select to authenticated
  using (
    (user_id = (select auth.uid()))
    or (is_family_shared = 1 and family_id is not null
        and private.is_familia_member(family_id))
  );
-- ... repetir o padrão para banco, cartao_faturas, imobilizado, pessoa,
--     recorrencias, recorrencia_transacoes, familias, familia_membros,
--     familia_convites, profiles (SELECT/INSERT/UPDATE/DELETE conforme cada uma).

-- 2) roles {public} -> authenticated: adicionar "to authenticated" em cada policy
--    recriada (feito no exemplo acima). Impede avaliação para o papel anon.

-- 3) user_id NOT NULL + default auth.uid() nas tabelas de dados.
--    ATENÇÃO: só após garantir que não há linhas com user_id nulo.
--    Os triggers private.fill_user_id_on_insert já preenchem user_id no insert,
--    então default é redundante mas ajuda como defesa. Exemplo:
-- alter table public.transacoes alter column user_id set default auth.uid();
-- alter table public.transacoes alter column user_id set not null;
--    Repetir para banco, cartao_faturas, imobilizado, pessoa, recorrencias.

commit;
```
> **`WITH CHECK` NÃO está mais aqui** — foi promovido para o hotfix (5.1, item 2) a
> pedido do dono, por ser a mesma classe de bug da auto-promoção.
> Este bloco 5.2 é um **template**: cada policy recriada precisa espelhar o predicado
> atual exato (ver a auditoria — todas seguem `user_id = auth.uid() OR
> (is_family_shared=1 AND family_id IS NOT NULL AND
> private.is_familia_member(family_id))`, exceto `familia_*`, `profiles` e os
> catálogos, que têm predicados próprios já documentados). O executor gera o
> `up`/`down` completo tabela a tabela a partir do estado auditado **e submete para
> revisão humana** antes de rodar. O `down` de cada uma é recriar a policy sem
> `(select ...)`, sem `to authenticated`, e sem o `not null`/`default` adicionados.
> (O `WITH CHECK` já terá sido aplicado na 5.1; a 5.2 apenas o mantém ao recriar.)

---

## 6. Armadilhas conhecidas (sintoma → o que fazer)

1. **`ERR_REQUIRE_ESM` no `dist/server`.**
   *Sintoma:* build/deploy falha ao carregar `dist/server` com `Error [ERR_REQUIRE_ESM]`.
   *Causa:* conflito de módulos — geralmente um `"type": "module"` no `package.json`
   (raiz ou gerado) fazendo o Node tratar `.js` como ESM enquanto o adapter usa
   `require`. *O que fazer:* garantir que o `package.json` da raiz **não** tem
   `"type": "module"`; o `api/index.js` usa CommonJS (`require`/`module.exports`,
   como no snippet da Etapa 4). Se o Expo emitir um `package.json` em `dist/server`,
   conferir que ele não força ESM.

2. **`FUNCTION_INVOCATION_TIMEOUT` em POST.**
   *Sintoma:* GET funciona, POST em API route pendura e retorna timeout na Vercel
   (às vezes com `JSON Parse error: Unexpected character: A`). *Causa:* versão do
   `@expo/server` (bug histórico, issue expo/expo #35763, corrigido em 0.5.1).
   *O que fazer:* garantir `@expo/server@0.6.3` **exato** (Etapa 3). Se ainda
   ocorrer, testar ler o corpo com `await request.text()`/`request.json()` cedo no
   handler e conferir `runtime` do function na Vercel. Não "resolver" aumentando
   timeout — é bug de versão.

3. **Hash dos JS divergindo entre export local e build na cloud.**
   *Sintoma:* assets 404 / mismatch entre o que o HTML referencia e o que existe em
   `dist/client` quando a Vercel builda. *Causa:* diferença de ambiente de build.
   *O que fazer:* **buildar localmente** (`npx expo export -p web`) e conferir o
   conteúdo de `dist/`; se necessário, buildar local e subir o `dist` pronto em vez
   de deixar a Vercel rodar o `expo export`. Fixar versões exatas (Etapa 3) reduz a
   divergência.

4. **Assets estáticos caindo no catch-all do rewrite.**
   *Sintoma:* app carrega em branco, `/_expo/static/*.js` retorna o HTML do SPA em
   vez do JS. *O que fazer:* ver a nota `[VERIFICAR]` no `vercel.json` da Etapa 4 —
   adicionar rewrites explícitos que preservem `/_expo/*` e `/assets/*` antes do
   catch-all.

5. **`persistSession` no web ainda gravando token.**
   *Sintoma:* após migrar, ainda aparece `sb-*` em localStorage no web. *Causa:*
   client web sem `persistSession:false`. *O que fazer:* no web, `persistSession:
   false` e não registrar `onAuthStateChange` (Etapa 7) — a sessão vive só no cookie.

---

## 7. Ponto de não-retorno e plano B

**Gatilho objetivo do plano B:** se, após a Etapa 4 executada com honestidade
(versão `@expo/server@0.6.3` fixa, `package.json` sem `type:module`, build local,
rewrites de assets ajustados), **o POST no `/health` não responder 200 em deploy
real da Vercel** depois de **2 tentativas** de correção guiadas pela Seção 6 —
parar e acionar o plano B. Não improvisar gambiarra para "fazer passar".

**Plano B:** mover as API routes para funções nativas da Vercel numa pasta `api/`
(runtime `@vercel/node`), mantendo o **export estático** do Expo (`web.output:
"static"`, `vercel.json` como hoje com `outputDirectory: dist`). Os endpoints
`/auth/*`, `/rest/v1/*` (proxy) e `/avatar/*` viram arquivos
`api/auth/login.ts`, `api/rest/v1/[...path].ts` etc., usando `@supabase/ssr` do
mesmo jeito (a lógica dos helpers/endpoints é idêntica; muda só o formato do
handler: `export default function handler(req, res)` do `@vercel/node` em vez do
`+api` do Expo). O front web chama os mesmos paths. Custo: perde-se a integração do
roteador do Expo, mas ganha-se um runtime de function comprovadamente estável na
Vercel. **Este é o fallback preferível a um build frágil.**

---

## 8. Critérios de aceite finais (checklist verificável)

- [ ] **Hotfix RLS aplicado:** membro não-owner não consegue `UPDATE role='owner'`
      (403/0 linhas); `UPDATE` trocando `user_id` para outro rejeitado pelo
      `WITH CHECK` em todas as tabelas de dados; fluxos de família
      (criar/convidar/aceitar/transferir/sair) funcionando no web e no nativo.
      (`tipo_imobilizado` fica fora do hotfix — decisão pendente com o dono.)
- [ ] **Vars perigosas removidas** da Vercel (`SERVICE_ROLE`, `SECRET`, `POSTGRES_*`,
      `NEXT_PUBLIC_*`); endpoint de debug de env removido.
- [ ] **POST em API route funcionando em produção** (`/health` POST → 200 em prod).
- [ ] **DevTools → Application → Cookies:** cookies `sb-*` com **HttpOnly** e
      **Secure** marcados; `SameSite=Lax`.
- [ ] **Busca por trecho da key no bundle client:** `grep -r "sb_publishable_"
      dist/client/` retorna **zero** ocorrências.
- [ ] **Sessão expirada há dias:** abrir o app → cai **direto no login, sem flash
      logado** (web e nativo).
- [ ] **Login, refresh de página (F5), logout e re-login** funcionando no web via
      cookie.
- [ ] **App nativo funcionando igual a antes** (login, sync SQLite↔Supabase,
      família, avatar) — build via **Gradle local** (nunca `eas build`).
- [ ] **Proxy endurecido:** allowlist de tabela+método ativa; `Accept-Profile`
      forçado a `public` no servidor; `/rpc/*` deny-all; `Origin` checado em
      mutações; `Prefer` com allowlist de valores; timeout no upstream.
- [ ] **Avatar:** upload no web via signed upload URL (arquivo não passa pela
      função); leitura por URL pública; policies do bucket `avatars` intactas.
- [ ] **Nenhuma tabela do `public` sem RLS** (mantido — hoje já são 14/14).
- [ ] **Headers:** CSP em enforce sem quebrar o app; HSTS, nosniff,
      `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy presentes.
- [ ] **Config Supabase:** JWT expiry 30 min, refresh rotation ON, redirect URLs
      explícitas (sem wildcard), leaked password protection ON.

---

## 9. Questões em aberto (`[VERIFICAR]`)

Levantamentos do início da tarefa — **resolvidos**:
- ✅ **Versão do `@expo/server`:** `0.6.3` exato (fixada pelo SDK 53; confirmado no
  branch `sdk-53` do repo expo/expo). Inclui os fixes de Vercel (> 0.5.1).
- ✅ **Schema `private` exposto na API?** Não. Só `public` e `graphql_public`
  (confirmado via `PGRST106`). Mesmo assim o proxy fixa `Accept-Profile` no servidor
  (defesa em profundidade).
- ✅ **Funções SECURITY DEFINER:** `private.is_familia_member`,
  `private.fill_user_id_on_insert`, `private.preserve_user_id_on_update` (todas em
  `private`, não expostas). Em `public`, nenhuma. `/rpc/` allowlist começa vazio.

`[VERIFICAR]` que sobraram para o executor (com o que checar):
1. **`@supabase/ssr` versão exata** — registry reporta `0.12.4` (ago/2026);
   confirmar no momento da execução (`npm view @supabase/ssr version`) e que
   `createServerClient` aceita `cookies: { getAll, setAll }` e que o `setAll` passa
   `{name, value, options}`.
2. **Formato de `CookieOptions` do `@supabase/ssr`** — mapear `maxAge`/`expires`/
   `domain` no serializer; garantir `HttpOnly; Secure; SameSite=Lax; Path=/` em
   todos os `sb-*`.
3. **Layout de `dist/` com `web.output:"server"`** — confirmar que o `expo export`
   emite `dist/client` + `dist/server` e se o handler serve os assets ou se precisa
   de rewrites explícitos para `/_expo/*` e `/assets/*`.
4. **Formato de URL do supabase-js 2.103** — confirmar se o proxy deve viver em
   `app/rest/v1/[...path]+api.ts` (casando o que o client emite) vs `/db`. Preferir
   casar o path nativo do supabase-js.
5. **`origin` no `expo-router` 5.1.11** — forma exata de configurar no `app.json`
   para o `fetch` relativo funcionar no APK de produção.
6. **`SUPABASE_JWT_SECRET`** — confirmar por grep que nada usa antes de remover;
   `getClaims()` valida por JWKS, não precisa do secret.
7. **Assinatura de `createSignedUploadUrl`/`uploadToSignedUrl`** no supabase-js
   2.103 — confirmar o formato de retorno (`{ signedUrl, token, path }`) e que a
   policy de INSERT do bucket `avatars` é satisfeita pelo path `${user.id}.${ext}`.
8. **Management API do Supabase** — se houver `SUPABASE_ACCESS_TOKEN`, as configs de
   auth da Etapa 10 podem ser automatizadas; senão, via Dashboard.

**Decisão do dono pendente (não é `[VERIFICAR]` — requer escolha, não checagem):**
- **`tipo_imobilizado`** — o `nome` é sempre a constante "Geral" (não é dado pessoal,
  logo **não há vazamento entre contas**; é integridade/vandalismo). O sync nativo faz
  INSERT+UPDATE+DELETE no código, mas só INSERT dispara na prática. Não há coluna
  `user_id`. Opções:
  - **(A)** adicionar `user_id` a `tipo_imobilizado` (local + remoto) e escopar
    escrita por dono. Corrige de verdade, mas mexe em schema + sync nativo.
  - **(C)** aceitar o risco (catálogo trivial, sem dado pessoal).
  - **Recomendação:** um meio-termo barato — **revogar UPDATE/DELETE de
    `authenticated`/`anon`, mantendo SELECT+INSERT** (bloco pronto na 5.1, não roda
    por padrão). Fecha o vandalismo cruzado (inclusive alguém apagar um "Geral"
    referenciado pela FK `NOT NULL` de `imobilizado` de outro usuário) sem coluna
    nova e sem quebrar o INSERT (único caminho real). Os UPDATE/DELETE mortos do sync
    viram erro capturado. Deixar (A) para quando/se houver tipos nomeados pelo
    usuário. **Aguardando o OK do dono para incluir esse bloco na Etapa 1.**

---

## 10. Riscos e o que pode quebrar o app nativo

- **Achado próprio — `get_family_snapshot` não existe no banco (código morto em
  produção hoje).** Call site: `services/supabase/familyRepository.ts:56` —
  `supabase.rpc("get_family_snapshot")`. A função **não existe** no schema (nenhum
  match em `pg_proc`; confirmado). O que acontece em runtime: toda vez que o app
  carrega a família (web e nativo), o supabase-js faz um round-trip que o PostgREST
  responde com `PGRST202`/404 ("function not found"); o código em
  `familyRepository.ts:67` trata `42883`/`PGRST202` como "cair no fallback" e executa
  as queries manuais com `.from(...)` (linhas 71-119). **Efeito prático:** a feature
  *funciona* (via fallback), mas **cada carregamento de família paga um request
  falho extra** e há um caminho de código que nunca teve o RPC entregue —
  provavelmente uma otimização server-side planejada e não deployada. **Não é bug de
  segurança**, mas é dívida real. *Recomendação (fora do escopo do hotfix):* ou criar
  a função `get_family_snapshot` no banco (SECURITY DEFINER, retornando o snapshot
  num round-trip só — e então adicioná-la ao allowlist de `/rpc/` do proxy), ou
  remover a chamada RPC e deixar só o fallback. Registrar como item separado.
- **Migração de RLS (5.1) quebra fluxo de família se a policy estiver errada.** O
  `transferOwnership` faz demote+promote com o token do owner; a policy
  `familia_membros_update_owner` precisa cobrir isso. Testar os 4 fluxos (criar,
  convidar/aceitar, transferir, sair) no nativo **e** no web em staging antes de
  prod. *Mitigação:* `down.sql` pronto.
- **`tipo_imobilizado`:** o nativo escreve na tabela no sync (INSERT+UPDATE+DELETE no
  código; só INSERT dispara na prática) e o web insere "Geral". O `nome` é sempre a
  constante "Geral" (não é dado pessoal). Se o dono aprovar o fix parcial (revogar
  UPDATE/DELETE — bloco em 5.1), os caminhos mortos de UPDATE/DELETE do sync nativo
  passariam a dar erro de sync **capturado** (`transacoesSync.ts:797`), sem corromper
  dados e sem travar o sync das outras tabelas — mas testar em staging para confirmar
  que nenhum tipo fica preso em estado `error` de forma visível ao usuário. Opção A
  (adicionar `user_id`) evita isso mas mexe no schema e no sync.
- **Remover `EXPO_PUBLIC_*` da Vercel** não afeta o nativo (build é Gradle local),
  **desde que** o build nativo tenha suas próprias vars. Confirmar que o `.env` local
  usado no Gradle mantém `EXPO_PUBLIC_SUPABASE_URL/KEY`. Não remover do `.env` local.
- **`origin` errado no `app.json`** quebra todo `fetch` relativo no APK de produção
  (auth e qualquer endpoint BFF que o nativo use). Testar num build de release, não
  só em dev.
- **`web.output:"server"`** muda a natureza do deploy web; se o adapter falhar, o
  **web** cai (o nativo não, pois é app instalado). *Mitigação:* fazer tudo em
  preview antes de promover a prod; plano B (Seção 7) mantém o web no ar via
  export estático + funções `api/`.
- **CSP em enforce cedo demais** pode quebrar o bundle do Expo (scripts/estilos
  inline). *Mitigação:* Report-Only primeiro (Etapa 9).

---

## 11. Fora de escopo — para depois

- **Endpoints dedicados de FAMÍLIA** (`POST /family/create`, `/family/invite`,
  `/family/transfer`, etc.) — ficam para o **segundo corte**. Justificativa (decisão
  do dono): com o `WITH CHECK` correto e o fix de auto-promoção no banco (Etapa 1), a
  escrita de família via proxy já está protegida pelo RLS; um endpoint dedicado seria
  **defesa em profundidade**, não o controle principal, e não vale inchar o primeiro
  corte. No 1º corte, `familia_*` é gravável pelo proxy (allowlist ajustada). Avatar
  **NÃO** está aqui — entra no 1º corte via signed upload URL (Etapa 6).
- **Endurecimento completo de RLS (5.2)** — `(select auth.uid())`, `to
  authenticated`, `NOT NULL`/`default`. Melhoria de performance/robustez, não urgência
  de segurança. (O `WITH CHECK` **saiu** desta lista — subiu para o hotfix 5.1.)
- **`get_family_snapshot`** — criar a função no banco (round-trip único) e liberar no
  `/rpc/` do proxy, ou remover a chamada RPC morta. Ver seção 10.
- **`tipo_imobilizado` — solução completa (opção A)** — adicionar `user_id` + escopar
  escrita, se o dono preferir A ao fix parcial de revogar UPDATE/DELETE.
- **Credenciais em texto no SecureStore (nativo)** — `deviceCredentials.ts` guarda
  email+senha em claro (gate biométrico). Fora do escopo desta migração, mas vale um
  item futuro: guardar refresh token em vez de senha.
- **Prefixo `__Host-` nos cookies** — só se o `@supabase/ssr` permitir renomear os
  `sb-*` sem quebrar; tratar como melhoria.
- **Rate limit distribuído** (Upstash ou similar) se o best-effort não bastar.
