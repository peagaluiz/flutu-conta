# flutu-conta

App financeiro pessoal/familiar com suporte offline-first. React Native + Expo Router, banco local SQLite sincronizado com Supabase.

## Rodar e buildar

```bash
# Desenvolvimento (Android)
npx expo run:android

# Build APK local (usar Gradle local, NUNCA EAS cloud)
cd android && ./gradlew assembleRelease
# ou via Expo sem EAS:
npx expo build:android --type apk   # legado, apenas se necessário
```

> **Nunca usar `eas build`** para APK — o build deve sempre ser feito via Gradle local (`android/`).

## Preferências de código

- **Extensão `.js`** — não criar arquivos `.ts` / `.tsx` novos. O projeto mistura os dois por legado, mas novos arquivos devem ser `.js`
- **Componentes separados e reutilizáveis** — evitar arquivos grandes. Extrair subcomponentes quando fizer sentido; não extrair se for trivial demais (um `<View>` com dois filhos não precisa de arquivo próprio)
- **Sem comentários óbvios** — só comentar o que não fica claro pelo nome

## Stack

| Camada | Lib |
|---|---|
| Framework | Expo 53, React 19, React Native 0.79 |
| Roteamento | Expo Router v5 (file-based) |
| UI | Gluestack UI v3 + NativeWind v4 (Tailwind CSS) |
| Ícones | Lucide React Native |
| Animações | Reanimated v3, Lottie, Legend Motion |
| Backend | Supabase (auth + storage + banco remoto) |
| Banco local | Expo SQLite v15 (offline-first, sync com Supabase) |
| Formulários | React Hook Form + Yup |
| State | React Context API (sem Redux/Zustand) |
| HTTP | Axios |

## Estrutura de pastas

```
app/                  # Rotas Expo Router
  _layout.js          # Root: AuthProvider, ThemeProvider, splash
  login.js            # Rota pública
  recuperar-senha.js
  nova-senha.js
  (auth)/             # Grupo protegido (requer login)
    _layout.js        # Verifica sessão, dispara sync
    (tabs)/           # Navegação por abas (home, finance, insert, launches, family)
    (stack)/          # Navegação em pilha
    (drawer)/         # Navegação com drawer

components/
  ui/                 # Primitivos Gluestack (Box, Text, Button, Input, Modal…)
  auth/               # Componentes de login/auth
  finance/            # Dashboard, home, insert, charts
  header/             # Header, modais de perfil e família

services/
  supabase/           # Client Supabase (client.ts) — usa EXPO_PUBLIC_SUPABASE_URL/KEY
  database/           # SQLite: init, schema, repositories, fila de operações
  family/             # FamilyRepository (Supabase)

state/                # Context providers (AuthContext, ThemeProvider, InsertInterceptContext)
hooks/                # Custom hooks de app (login animation, flow)
utils/                # Formatadores, validadores (auth, finance)
constants/            # Cores e temas (getThemeColors)
assets/               # Imagens, ícones, animações Lottie
```

## Banco de dados

### Arquitetura offline-first

O app usa **SQLite local** como fonte primária e sincroniza com **Supabase** em background:

- `services/database/db.ts` — wrapper do expo-sqlite com fila serializada de operações
- `services/database/transacoesSync.ts` — sync bidirecional de transações
- `services/database/recurrenceService.ts` — lógica de recorrências

### Schema Supabase (tabelas principais)

```
profiles          — dados de perfil (criado automaticamente via trigger on_auth_user_created)
familias          — grupos familiares (owner_user_id)
familia_membros   — membros da família (role: owner | member, status: active | removed)
familia_convites  — convites por email (status: pending | accepted | cancelled)
pessoa            — pessoas vinculadas a transações
tipo_imobilizado  — tipos de ativo imobilizado
imobilizado       — ativos (veículo, imóvel etc.)
transacoes        — lançamentos financeiros (tipo: pagar | receber, status: pendente | pago)
recorrencias      — regras de recorrência (frequency: mensal | semanal | anual | dias)
recorrencia_transacoes — vínculo recorrência ↔ transação gerada
```

Todas as tabelas com `user_id` e `family_id` têm RLS ativo. Dados compartilhados exigem `is_family_shared = 1` + membro ativo na família.

Script completo em `sql/schema_supabase.sql` — idempotente, pode rodar direto no SQL Editor do Supabase para subir tudo do zero.

### Variáveis de ambiente

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=
```

## Auth

- Login: email + senha via `supabase.auth.signInWithPassword()`
- Credenciais salvas no dispositivo com `expo-secure-store` (desbloqueio biométrico opcional)
- Perfil criado automaticamente no signup via trigger `on_auth_user_created` no Supabase
- Recuperação e reset de senha implementados em `recuperar-senha.js` / `nova-senha.js`

## Temas

`constants/colors.js` exporta `getThemeColors(theme)` — retorna paleta por modo (`'dark'` | `'light'`). ThemeProvider encapsula a app; todos os componentes devem consumir via hook de tema, nunca hardcodar cores.

## Formulários

- `react-hook-form` + `yup` em todos os formulários
- Componentes prontos: `MaskedFormInput`, `MaskedFormTextArea`, `FormRadioGroup`
- Schemas de validação em `utils/validators/`
- `InsertInterceptContext` — estado do formulário de inserção compartilhado entre screens
