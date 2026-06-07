# Flutu Conta

**Gerenciador financeiro pessoal e familiar com suporte offline.**  
Registre receitas e despesas, organize lançamentos recorrentes, compartilhe dados com sua família e acesse tudo mesmo sem internet — o app sincroniza quando a conexão volta.

---

## Funcionalidades

- Controle de receitas e despesas com categorias e pessoas vinculadas
- Lançamentos recorrentes (mensal, semanal, anual, por dias)
- Modo família — compartilhe dados com membros via convite por e-mail
- Baixa de lançamentos e filtro por data de pagamento
- Funciona offline — banco local SQLite sincronizado com Supabase em background
- Autenticação segura com armazenamento biométrico opcional

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Expo 53, React 19, React Native 0.79 |
| Roteamento | Expo Router v5 |
| UI | Gluestack UI v3 + NativeWind v4 (Tailwind CSS) |
| Banco local | Expo SQLite v15 |
| Backend | Supabase (auth, banco remoto, storage) |
| Formulários | React Hook Form + Yup |
| Estado | React Context API |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Android Studio](https://developer.android.com/studio) com SDK e emulador configurados (ou dispositivo físico)
- Conta no [Supabase](https://supabase.com/) (plano gratuito é suficiente)
- Java 17+ (necessário para o Gradle)

---

## 1. Configurar o Supabase

### 1.1 Criar o projeto

1. Acesse [supabase.com](https://supabase.com/) e crie uma conta (ou faça login)
2. Clique em **New project**, preencha nome e senha do banco e aguarde a criação

### 1.2 Aplicar o schema do banco

O arquivo `sql/schema_supabase.sql` contém todo o schema do banco — tabelas, triggers, RLS e políticas. Ele é **idempotente**, então pode ser rodado em um projeto novo ou re-executado sem problemas.

#### Opção A — Via painel do Supabase (mais fácil)

1. No painel do seu projeto, vá em **SQL Editor** (menu lateral)
2. Clique em **New query**
3. Copie o conteúdo de `sql/schema_supabase.sql` e cole no editor
4. Clique em **Run** (ou `Ctrl+Enter`)

#### Opção B — Via Supabase CLI (recomendado para automação)

```bash
# Instalar a CLI do Supabase
npm install -g supabase

# Fazer login
supabase login

# Aplicar o schema direto no banco remoto
# Substitua <DB_URL> pela connection string do seu projeto
# (Supabase > Project Settings > Database > Connection string > URI)
psql "<DB_URL>" -f sql/schema_supabase.sql
```

> A connection string tem o formato:  
> `postgresql://postgres:<senha>@db.<project-ref>.supabase.co:5432/postgres`  
> Você encontra em **Project Settings → Database → Connection string**.

---

### 1.3 Criar o usuário de acesso

O app usa o sistema de autenticação do Supabase. Para conseguir fazer login, você precisa criar um usuário manualmente:

1. No painel do seu projeto, vá em **Authentication → Users** (menu lateral)
2. Clique em **Add user → Create new user**
3. Preencha o e-mail e a senha que vai usar para entrar no app:

| Campo | Exemplo |
|---|---|
| **Email** | `joao@exemplo.com` |
| **Password** | `minhasenha123` |

4. Clique em **Create user**

> Esse é o usuário com o qual você fará login no app. Pode criar quantos quiser para outros membros da família.

---

### 1.4 Adicionar bancos ao catálogo

O app exibe uma lista de bancos para o usuário escolher ao criar uma conta. Essa lista vem da tabela `banco_catalogo`.

O schema já insere automaticamente os bancos brasileiros mais comuns (Nubank, Itaú, Bradesco, etc.). Caso queira adicionar um banco que não está na lista, rode o SQL abaixo no **SQL Editor** do Supabase:

```sql
INSERT INTO public.banco_catalogo (nome, cor_hex) VALUES
    ('Banco do Zé',   '#4F46E5'),
    ('Fintech da Ana', '#10B981');
```

> - `nome` — nome que aparece na lista do app
> - `cor_hex` — cor em hexadecimal usada para identificar o banco visualmente

Para ver os bancos já cadastrados:

```sql
SELECT id, nome, cor_hex, ativo FROM public.banco_catalogo ORDER BY nome;
```

---

### 1.5 Obter as credenciais

No painel do Supabase, vá em **Project Settings → API** e copie:

- **Project URL** → valor de `EXPO_PUBLIC_SUPABASE_URL`
- **anon public key** → valor de `EXPO_PUBLIC_SUPABASE_KEY`

---

## 2. Configurar o projeto

### 2.1 Clonar e instalar dependências

```bash
git clone https://github.com/seu-usuario/flutu-conta.git
cd flutu-conta
npm install
```

### 2.2 Criar o arquivo de ambiente

Crie um arquivo `.env` na raiz do projeto com as credenciais do Supabase:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<sua-anon-key>
```

---

## 3. Rodar em desenvolvimento

```bash
# Abre o app em um emulador Android ou dispositivo físico
npx expo run:android

# Ou use o atalho do package.json
npm run android
```

---

## 4. Gerar APK para distribuição

### Opção A — Gradle local (recomendado)

Não exige conta no EAS e roda completamente na sua máquina.

```bash
cd android
./gradlew assembleRelease
```

O APK gerado ficará em:

```
android/app/build/outputs/apk/release/app-release.apk
```

> **Windows:** use `.\gradlew.bat assembleRelease` no PowerShell, ou `./gradlew assembleRelease` no Git Bash.

### Opção B — EAS Build (Expo Application Services)

Faz o build na nuvem da Expo. Requer conta no [expo.dev](https://expo.dev/) e a CLI do EAS instalada.

```bash
# Instalar a CLI do EAS (apenas na primeira vez)
npm install -g eas-cli

# Fazer login na sua conta Expo
eas login

# Gerar APK
eas build -p android --profile apk
```

> Após o build, o link para download do APK aparece no terminal e também fica disponível no painel do [expo.dev](https://expo.dev/).

---

## Estrutura de pastas

```
app/              # Rotas Expo Router (login, tabs, stack, drawer)
components/       # Componentes reutilizáveis (ui, auth, finance, header)
services/
  supabase/       # Client Supabase
  database/       # SQLite local (init, schema, sync, recorrências)
  family/         # Repositório de família (Supabase)
state/            # Context providers (Auth, Theme, InsertIntercept)
hooks/            # Custom hooks
utils/            # Formatadores e validadores
constants/        # Cores e temas
sql/              # Scripts SQL (schema Supabase e SQLite)
assets/           # Imagens, ícones e animações Lottie
```

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_KEY` | Chave anon pública do Supabase |

---

## Licença

Uso pessoal. Sem licença de distribuição definida.
