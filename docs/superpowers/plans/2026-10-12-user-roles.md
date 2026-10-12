# Perfis de usuário, gestão de usuários e perfil: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar os perfis Admin e Básico, aplicados na API e refletidos no front, com uma área de gestão de usuários para o admin, uma página de perfil e a troca obrigatória da senha temporária.

**Architecture:** O `isAuthenticated` passa a ler o usuário do banco a cada requisição (`role`, `active`, `mustChangePassword`), e um `requireAdmin` protege as rotas exclusivas de admin. A senha temporária é gerada pela API e mostrada uma única vez. No front, a sessão do next-auth carrega `role` e `mustChangePassword`. Os layouts redirecionam para a troca de senha, e os interceptors do axios tratam a senha redefinida com a sessão aberta.

**Tech Stack:** API: Express 4, TypeScript 5, Prisma 5.16 (PostgreSQL), Zod 4, bcryptjs, jsonwebtoken. Front: Next.js 14 (App Router), next-auth 4.24 (credentials + JWT), react-hook-form, Zod 3, shadcn/ui, react-toastify.

**Spec:** `docs/superpowers/specs/2026-10-12-user-roles-design.md`

**Repositórios:**
- API: `D:\Work\apiwerk` (Git Bash: `/d/Work/apiwerk`). Tarefas 1 a 4.
- Front: `D:\Projetos\werk-app` (Git Bash: `/d/Projetos/werk-app`). Tarefas 5 a 9.

## Global Constraints

- Perfis: enum Prisma `Role { ADMIN BASICO }`. Campos novos em `User`: `role Role @default(BASICO)`, `active Boolean @default(true)`, `mustChangePassword Boolean @default(false)`.
- Regra de senha nova: de 8 a 72 caracteres, com `/[A-Za-z]/` e `/\d/`. Ela vale para `PUT /me/password`. **O login não aplica essa regra**: ele exige só a senha preenchida.
- Senha temporária: 10 caracteres sorteados com `crypto.randomInt`, sem `0 O 1 l I`, com pelo menos uma letra e um número. Nunca é gravada em texto puro nem escrita em log.
- Hash: `bcryptjs`, custo 8.
- Nenhuma resposta da API contém o campo `password`.
- **Toda mensagem que pode aparecer na tela fica em PT-BR**, inclusive as do domínio de usuário e auth. Identificadores, nomes de campo (`name`, `role`, `mustChangePassword`), logs e mensagens de commit ficam em inglês.
- API: Zod v4 (`{ error: "..." }`), controllers sem `try/catch`, `AppError(mensagem, status)` nos services, `return res.status(...).json(...)`.
- Front: Zod v3 (`.min(8, "mensagem")`). Componentes novos ficam em `src/app/components/<feature>/`. Não usar `npx shadcn add` e não instalar dependências.
- API: depois de qualquer mudança em `src/` ou `prisma/seed.ts`, rodar `npm run build` e commitar o `dist/` regenerado junto com o código-fonte.
- **`prisma migrate`, `db seed` e os scripts de reset só rodam com `DATABASE_URL` apontando para `localhost:5433`.**
- Commits: na branch atual, mensagem Conventional Commits em inglês, **sem** `Co-Authored-By` nem outra linha de atribuição, arquivos adicionados pelo nome e **sem push**.

## Review Focus

1. **Token válido apontando para um usuário inexistente, ou sem `sub`:** a API deve responder 401 "Não autorizado", nunca 500. O teste está na Tarefa 2, passo 8.
2. **E-mail com maiúsculas ou espaços:** cadastrar " Maria@Werk.com " e depois "maria@werk.com" deve dar 409, e o login deve aceitar o e-mail em qualquer caixa. Os testes estão na Tarefa 2, passo 8, e na Tarefa 3, passo 9.
3. **Diálogo da senha temporária fechado por acidente:** clicar fora ou apertar Esc não pode fechar o diálogo, porque a senha não é exibida de novo. O teste está na Tarefa 8, passo 6.
4. **Usuário com troca pendente digitando outra URL**, inclusive páginas renderizadas no servidor (`/customers`, `/perfil`, `/usuarios`), depois de o admin redefinir a senha dele com a sessão aberta: ele deve cair em `/alterar-senha`, não numa página de erro. O teste está na Tarefa 6, passo 9.
5. **Entradas no limite:** um nome só com espaços (`"   "`) dá 400 "Nome deve ter no mínimo 2 caracteres", e uma senha com mais de 72 caracteres dá 400 "A senha deve ter no máximo 72 caracteres". Os testes estão na Tarefa 2, passo 8, e na Tarefa 4, passo 4.

---

## Ambiente de verificação

Nenhum dos dois projetos tem framework de testes, e este plano não cria um. Os "testes" da API são roteiros com `curl` no Git Bash. Os do front são roteiros no navegador, com o Playwright MCP. Cada tarefa diz o resultado esperado de cada chamada.

**Preparação (uma vez por sessão):**

```bash
cd /d/Work/apiwerk
# 1. O banco TEM que ser o local. Deve imprimir: localhost:5433
sed -n 's/^DATABASE_URL=.*@\([^/]*\)\/.*/\1/p' .env
# 2. Docker Desktop aberto, depois:
docker compose up -d
# 3. API em segundo plano (porta 3333). Reinicie depois de mudar o schema do Prisma.
npm run dev
```

**Helpers do Git Bash.** Cole no início de cada bloco de verificação da API e rode a partir de `/d/Work/apiwerk`:

```bash
API=http://localhost:3333
# Lê JSON da entrada e imprime uma expressão: echo '{"a":1}' | json .a
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=new Function("o","return o"+process.argv[1])(JSON.parse(s));console.log(typeof v==="string"?v:JSON.stringify(v))})' "$1"; }
login() { curl -s -X POST "$API/session" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}"; }
# req MÉTODO CAMINHO TOKEN [CORPO]: imprime o corpo e, na linha seguinte, o status HTTP
req() { curl -s -w '\n%{http_code}\n' -X "$1" "$API$2" -H "Authorization: Bearer $3" -H 'Content-Type: application/json' ${4:+-d "$4"}; }
# reset_admin SENHA true|false: redefine o admin LOCAL (só a partir da Tarefa 1)
reset_admin() {
  node -e "
    const b=require('bcryptjs');const p=new (require('@prisma/client').PrismaClient)();
    b.hash(process.argv[1],8)
      .then(h=>p.user.update({where:{email:'admin@werk.com.br'},data:{password:h,mustChangePassword:process.argv[2]==='true',active:true,role:'ADMIN'}}))
      .then(u=>console.log('admin',u.role,'mustChangePassword',u.mustChangePassword))
      .finally(()=>p.\$disconnect())" "$1" "$2"
}
```

**Front:**

```bash
cd /d/Projetos/werk-app
# Tem que imprimir http://localhost:3333/ (o .env tem duas linhas NEXT_PUBLIC_API; vale a última)
node -e "const {loadEnvConfig}=require('@next/env');console.log(loadEnvConfig(process.cwd()).combinedEnv.NEXT_PUBLIC_API)"
npm run dev   # http://localhost:3000, em segundo plano
```

Se o comando acima imprimir a URL da Vercel, **pare**: os testes do front não podem rodar contra a produção.

---

## Estrutura de arquivos

**API (`apiwerk`)**

| Arquivo | Ação | Responsabilidade |
| --- | --- | --- |
| `prisma/schema.prisma` | Alterar | Enum `Role` e campos novos em `User` |
| `prisma/migrations/<timestamp>_add_user_roles/migration.sql` | Criar | Colunas com `DEFAULT` e promoção do `admin@werk.com.br` |
| `prisma/seed.ts` | Alterar | Admin nasce `ADMIN`; troca obrigatória enquanto a senha for `123456` |
| `src/@types/express/index.d.ts` | Alterar | `req.user_role` |
| `src/middlewares/isAuthenticated.ts` | Alterar | `isAuthenticated` e `isAuthenticatedPendingPassword`, com leitura do banco |
| `src/middlewares/requireAdmin.ts` | Criar | 403 para quem não é admin |
| `src/schemas/common.ts` | Alterar | `uuidParamSchema` |
| `src/schemas/user.ts` | Alterar | Schemas de usuário, regra de senha e mensagens em PT-BR |
| `src/utils/generateTemporaryPassword.ts` | Criar | Senha temporária |
| `src/services/user/userSelect.ts` | Criar | `profileSelect` e `userSelect` (campos públicos) |
| `src/services/user/authUserService.ts` | Alterar | Login: caixa do e-mail, usuário inativo, `role` e `mustChangePassword` |
| `src/services/user/detailUserService.ts` | Alterar | `GET /me` com 404 |
| `src/services/user/createUserServices.ts` | Alterar | Cadastro com senha temporária |
| `src/services/user/listUsersService.ts` | Criar | `GET /users` |
| `src/services/user/updateUserService.ts` | Criar | `PUT /users/:id` |
| `src/services/user/resetUserPasswordService.ts` | Criar | `POST /users/:id/reset-password` |
| `src/services/user/changePasswordService.ts` | Criar | `PUT /me/password` |
| `src/services/user/updateProfileService.ts` | Criar | `PUT /me` |
| `src/controllers/user/listUsersController.ts` | Criar | |
| `src/controllers/user/updateUserController.ts` | Criar | |
| `src/controllers/user/resetUserPasswordController.ts` | Criar | |
| `src/controllers/user/changePasswordController.ts` | Criar | |
| `src/controllers/user/updateProfileController.ts` | Criar | |
| `src/routers.ts` | Alterar | Rotas novas, `requireAdmin` e middleware de senha pendente |
| `README.md`, `CLAUDE.md`, `.claude/rules/arquitetura.md` | Alterar | Documentação e regra de idioma |

**Front (`werk-app`)**

| Arquivo | Ação | Responsabilidade |
| --- | --- | --- |
| `src/types/user.ts` | Criar | `UserRole`, `User`, `roleLabels` |
| `src/types/next-auth.d.ts` | Alterar | `role` e `mustChangePassword` na sessão |
| `src/lib/authOptions.ts` | Alterar | Login sem interceptors, mensagem da API, campos novos e `update()` |
| `src/app/login/page.tsx` | Alterar | Mostra a mensagem da API |
| `src/app/components/profile/change-password-form.tsx` | Criar | Formulário de troca de senha com a regra ao vivo |
| `src/app/components/profile/forced-password-change.tsx` | Criar | Troca obrigatória: formulário, atualização da sessão e "Sair" |
| `src/app/alterar-senha/page.tsx` | Criar | Página da troca obrigatória, sem menu |
| `src/app/(auth-routes)/layout.tsx` | Alterar | Redireciona para `/alterar-senha` |
| `src/services/api/api.ts` | Alterar | 403 com troca pendente leva para `/alterar-senha` |
| `src/services/api/serverApi.ts` | Alterar | Idem, nas páginas renderizadas no servidor |
| `src/app/components/profile/profile.tsx` | Criar | Cartões Dados e Trocar senha |
| `src/app/(auth-routes)/perfil/page.tsx` | Criar | Página de perfil |
| `src/components/sidebar-nav.tsx` | Alterar | Itens "Meu perfil" e "Usuários" (este só para admin) |
| `src/app/components/confirmation-modal.tsx` | Alterar | `loadingText` opcional |
| `src/app/components/users/users.tsx` | Criar | Contêiner da página de usuários |
| `src/app/components/users/user-card.tsx` | Criar | Lista em cartões |
| `src/app/components/users/user-modal.tsx` | Criar | Cadastro e edição |
| `src/app/components/users/temporary-password-dialog.tsx` | Criar | Exibe a senha temporária uma vez |
| `src/app/(auth-routes)/usuarios/page.tsx` | Criar | Página de usuários (só admin) |
| `src/app/components/customers/customer-modal.tsx` | Alterar | "Excluir" só para admin |
| `src/app/components/serviceOrder/serviceorder-modal.tsx` | Alterar | "Excluir" só para admin |
| `CLAUDE.md` | Alterar | Documentação |

---

### Tarefa 1: Banco: enum `Role`, campos novos, migration e seed

**Repositório:** `apiwerk`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_user_roles/migration.sql` (gerado e depois editado)
- Modify: `prisma/seed.ts`
- Regenerate: `dist/prisma/seed.js`

**Interfaces:**
- Produces: o enum `Role` (`"ADMIN" | "BASICO"`), exportado por `@prisma/client`, e os campos `User.role`, `User.active` e `User.mustChangePassword`, que as tarefas seguintes usam.

- [ ] **Passo 1: Rodar a verificação e ver que falha**

Confira antes que o banco é `localhost:5433` (veja "Ambiente de verificação").

```bash
cd /d/Work/apiwerk
node -e "const p=new (require('@prisma/client').PrismaClient)();p.user.findUnique({where:{email:'admin@werk.com.br'},select:{role:true,active:true,mustChangePassword:true}}).then(u=>console.log(JSON.stringify(u))).catch(e=>console.log('FAIL',e.message.split('\n').pop())).finally(()=>p.\$disconnect())"
```

Esperado: `FAIL ...`, com um erro de campo desconhecido (`role`).

- [ ] **Passo 2: Alterar o schema**

Em `prisma/schema.prisma`, logo depois do bloco `enum TipoServico { ... }`, adicione:

```prisma
enum Role {
  ADMIN
  BASICO
}
```

No `model User`, troque o modelo inteiro por:

```prisma
model User {
  id String @id @default(uuid())
  name String @db.VarChar(255) 
  email String @db.VarChar(255) @unique
  password String @db.VarChar(255)
  role Role @default(BASICO)
  active Boolean @default(true)
  mustChangePassword Boolean @default(false)
  created_at DateTime? @default(now())
  update_at DateTime?  @updatedAt

  @@map("users")
}
```

- [ ] **Passo 3: Gerar a migration sem aplicar**

```bash
npx prisma migrate dev --create-only --name add_user_roles
```

Abra o `migration.sql` gerado em `prisma/migrations/<timestamp>_add_user_roles/`. Ele deve conter o `CREATE TYPE "Role" AS ENUM ('ADMIN', 'BASICO');` e um `ALTER TABLE "users"` com as três colunas, cada uma com `DEFAULT` (`true`, `false` e `'BASICO'`). Se alguma coluna vier sem `DEFAULT`, pare e corrija o schema. No fim do arquivo, acrescente:

```sql

-- O administrador do seed vira ADMIN. Os demais usuários existentes ficam BASICO
-- e são promovidos pela tela de usuários.
UPDATE "users" SET "role" = 'ADMIN' WHERE "email" = 'admin@werk.com.br' AND "role" <> 'ADMIN';
```

- [ ] **Passo 4: Aplicar a migration**

```bash
npx prisma migrate dev
```

Esperado: a migration `add_user_roles` é aplicada e o Prisma Client é gerado. Se a API estiver rodando com `npm run dev`, reinicie-a.

- [ ] **Passo 5: Alterar o seed**

Substitua `prisma/seed.ts` inteiro por:

```ts
import { compare, hash } from "bcryptjs";
import prismaClient from "../src/prisma";

const ADMIN_EMAIL = "admin@werk.com.br";
const SEED_PASSWORD = "123456";

async function seed() {
  const passwordHash = await hash(SEED_PASSWORD, 8);

  // O update vazio preserva perfil e situação definidos pela tela de usuários
  const admin = await prismaClient.user.upsert({
    where: {
      email: ADMIN_EMAIL,
    },
    update: {},
    create: {
      id: "56d5910d-71d8-4a29-92b3-edfd624960a6",
      name: "Sergio Botelho",
      email: ADMIN_EMAIL,
      password: passwordHash,
      role: "ADMIN",
    },
  });

  // A senha do seed é pública no repositório: obriga a troca enquanto ela não mudar
  if (
    !admin.mustChangePassword &&
    (await compare(SEED_PASSWORD, admin.password))
  ) {
    await prismaClient.user.update({
      where: { id: admin.id },
      data: { mustChangePassword: true },
    });
  }

  console.log("Database seeded!");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
```

- [ ] **Passo 6: Compilar e verificar o seed nos dois casos**

```bash
npm run build
# (cole os helpers do "Ambiente de verificação")
CHECK="const p=new (require('@prisma/client').PrismaClient)();p.user.findUnique({where:{email:'admin@werk.com.br'},select:{role:true,active:true,mustChangePassword:true}}).then(u=>console.log(JSON.stringify(u))).finally(()=>p.\$disconnect())"

reset_admin 123456 false && npx prisma db seed && node -e "$CHECK"
# Esperado: {"role":"ADMIN","active":true,"mustChangePassword":true}

reset_admin Outra1234 false && npx prisma db seed && node -e "$CHECK"
# Esperado: {"role":"ADMIN","active":true,"mustChangePassword":false}
```

O `npm run build` deve terminar sem erros.

- [ ] **Passo 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/*_add_user_roles/migration.sql prisma/seed.ts dist/prisma/seed.js
git commit -F - <<'EOF'
feat(user): add role, active and mustChangePassword to users

Existing users become BASICO and admin@werk.com.br becomes ADMIN. The seed
forces a password change while the admin still uses the public seed password.
EOF
```

---

### Tarefa 2: Autenticação: leitura do banco, login, `GET /me` e `PUT /me/password`

**Repositório:** `apiwerk`

**Files:**
- Modify: `src/@types/express/index.d.ts`
- Modify: `src/schemas/user.ts`
- Create: `src/services/user/userSelect.ts`
- Modify: `src/middlewares/isAuthenticated.ts`
- Modify: `src/services/user/authUserService.ts`
- Modify: `src/services/user/detailUserService.ts`
- Create: `src/services/user/changePasswordService.ts`
- Create: `src/controllers/user/changePasswordController.ts`
- Modify: `src/routers.ts`
- Regenerate: `dist/` dos arquivos acima

**Interfaces:**
- Consumes: `Role` e os campos novos de `User` (Tarefa 1).
- Produces:
  - `isAuthenticated(req, res, next)` e `isAuthenticatedPendingPassword(req, res, next)`, exportados de `src/middlewares/isAuthenticated.ts`. Os dois preenchem `req.user_id: string` e `req.user_role: Role`.
  - `passwordSchema`, `authUserSchema`, `changePasswordSchema` e `createUserSchema` (este ainda com `password`), mais os tipos `AuthUserInput`, `ChangePasswordInput` e `CreateUserInput`, em `src/schemas/user.ts`. Também os helpers internos `emailSchema` e `nameSchema`, usados nas Tarefas 3 e 4.
  - `profileSelect`, em `src/services/user/userSelect.ts`.
  - O `POST /session` responde `{ id, name, email, role, mustChangePassword, token }`.

- [ ] **Passo 1: Rodar a verificação e ver que falha**

```bash
cd /d/Work/apiwerk
# (cole os helpers; API rodando)
reset_admin 123456 true
login admin@werk.com.br 123456; echo
```

Esperado agora: a resposta **não** contém `"role"` nem `"mustChangePassword"`.

- [ ] **Passo 2: Tipar `req.user_role`**

Substitua `src/@types/express/index.d.ts` por:

```ts
declare namespace Express {
  export interface Request {
    user_id: string;
    user_role: import("@prisma/client").Role;
  }
}
```

- [ ] **Passo 3: Schemas de usuário**

Substitua `src/schemas/user.ts` por:

```ts
import { z } from "zod";

// trim e toLowerCase antes do formato: " Maria@Werk.com " vira "maria@werk.com"
export const emailSchema = z
  .string({ error: "E-mail é obrigatório" })
  .trim()
  .toLowerCase()
  .min(1, { error: "E-mail é obrigatório" })
  .pipe(z.email({ error: "E-mail inválido" }));

export const nameSchema = z
  .string({ error: "Nome é obrigatório" })
  .trim()
  .min(2, { error: "Nome deve ter no mínimo 2 caracteres" });

// Regra para senhas novas. O login não usa esta regra, para que as senhas
// antigas (mínimo de 6 caracteres) continuem entrando.
export const passwordSchema = z
  .string({ error: "Senha é obrigatória" })
  .min(8, { error: "A senha deve ter no mínimo 8 caracteres" })
  .max(72, { error: "A senha deve ter no máximo 72 caracteres" })
  .regex(/[A-Za-z]/, { error: "A senha deve conter pelo menos uma letra" })
  .regex(/\d/, { error: "A senha deve conter pelo menos um número" });

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z
    .string({ error: "Senha é obrigatória" })
    .min(6, { error: "A senha deve ter no mínimo 6 caracteres" }),
});

export const authUserSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Senha é obrigatória" })
    .min(1, { error: "Senha é obrigatória" }),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: "Senha atual é obrigatória" })
    .min(1, { error: "Senha atual é obrigatória" }),
  newPassword: passwordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type AuthUserInput = z.infer<typeof authUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

(Na Tarefa 3, o `createUserSchema` perde o campo `password`.)

- [ ] **Passo 4: Campos públicos do usuário**

Crie `src/services/user/userSelect.ts`:

```ts
import { Prisma } from "@prisma/client";

// Campos devolvidos em GET /me e PUT /me
export const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  mustChangePassword: true,
} satisfies Prisma.UserSelect;
```

- [ ] **Passo 5: Middlewares de autenticação**

Substitua `src/middlewares/isAuthenticated.ts` por:

```ts
import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import prismaClient from "../prisma";
import AppError from "../utils/appError";

interface Payload {
  sub: string;
}

// Lê o usuário do banco a cada requisição, para que desativação, mudança de
// perfil e senha temporária valham na hora, sem esperar o token vencer.
async function authenticate(req: Request, allowPendingPassword: boolean) {
  const authToken = req.headers.authorization;

  if (!authToken) {
    throw new AppError("Não autorizado", 401);
  }

  const [, token] = authToken.split(" ");

  let userId: string;

  try {
    const { sub } = verify(token, process.env.JWT_SECRET) as Payload;
    userId = sub;
  } catch {
    throw new AppError("Não autorizado", 401);
  }

  if (!userId) {
    throw new AppError("Não autorizado", 401);
  }

  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true, mustChangePassword: true },
  });

  if (!user || !user.active) {
    throw new AppError("Não autorizado", 401);
  }

  if (user.mustChangePassword && !allowPendingPassword) {
    throw new AppError("Troca de senha obrigatória", 403);
  }

  req.user_id = user.id;
  req.user_role = user.role;
}

export async function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await authenticate(req, false);

  return next();
}

// Só para GET /me e PUT /me/password: deixa passar quem ainda precisa trocar a senha temporária
export async function isAuthenticatedPendingPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await authenticate(req, true);

  return next();
}
```

Os erros dos middlewares assíncronos chegam ao `errorHandler` pelo `express-async-errors`, que já é importado primeiro em `server.ts`.

- [ ] **Passo 6: Login, `GET /me` e troca de senha**

Substitua `src/services/user/authUserService.ts` por:

```ts
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import prismaClient from "../../prisma";
import { AuthUserInput } from "../../schemas/user";
import AppError from "../../utils/appError";

export class AuthUserService {
  async execute({ email, password }: AuthUserInput) {
    // Sem diferenciar maiúsculas: e-mails antigos podem ter sido gravados com maiúsculas
    const user = await prismaClient.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (!user) {
      throw new AppError("E-mail ou senha incorretos", 401);
    }

    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError("E-mail ou senha incorretos", 401);
    }

    if (!user.active) {
      throw new AppError("Usuário desativado. Fale com o administrador.", 403);
    }

    const token = sign(
      {
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: "30d",
      }
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      token: token,
    };
  }
}
```

Substitua `src/services/user/detailUserService.ts` por:

```ts
import prismaClient from "../../prisma";
import AppError from "../../utils/appError";
import { profileSelect } from "./userSelect";

export class DetailUserService {
  async execute(user_id: string) {
    const user = await prismaClient.user.findUnique({
      where: {
        id: user_id,
      },
      select: profileSelect,
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    return user;
  }
}
```

Crie `src/services/user/changePasswordService.ts`:

```ts
import { compare, hash } from "bcryptjs";
import prismaClient from "../../prisma";
import { ChangePasswordInput } from "../../schemas/user";
import AppError from "../../utils/appError";

interface ChangePasswordRequest extends ChangePasswordInput {
  userId: string;
}

export class ChangePasswordService {
  async execute({ userId, currentPassword, newPassword }: ChangePasswordRequest) {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const currentPasswordMatches = await compare(currentPassword, user.password);

    if (!currentPasswordMatches) {
      throw new AppError("Senha atual incorreta", 400);
    }

    if (currentPassword === newPassword) {
      throw new AppError("A nova senha deve ser diferente da atual", 400);
    }

    const passwordHash = await hash(newPassword, 8);

    await prismaClient.user.update({
      where: { id: userId },
      data: { password: passwordHash, mustChangePassword: false },
    });

    return { message: "Senha alterada com sucesso" };
  }
}
```

Crie `src/controllers/user/changePasswordController.ts`:

```ts
import { Request, Response } from "express";
import { changePasswordSchema } from "../../schemas/user";
import { ChangePasswordService } from "../../services/user/changePasswordService";

export class ChangePasswordController {
  async handle(req: Request, res: Response) {
    const data = await changePasswordSchema.parseAsync(req.body);

    const changePasswordService = new ChangePasswordService();
    const result = await changePasswordService.execute({
      userId: req.user_id,
      ...data,
    });

    return res.status(200).json(result);
  }
}
```

- [ ] **Passo 7: Rotas**

Em `src/routers.ts`:

1. Acrescente aos imports:
   ```ts
   import { ChangePasswordController } from "./controllers/user/changePasswordController";
   ```
   e troque o import do middleware por:
   ```ts
   import {
     isAuthenticated,
     isAuthenticatedPendingPassword,
   } from "./middlewares/isAuthenticated";
   ```
2. Troque a linha `router.get("/me", isAuthenticated, new detailUserController().handle);` por:
   ```ts
   router.get(
     "/me",
     isAuthenticatedPendingPassword,
     new detailUserController().handle,
   );
   router.put(
     "/me/password",
     isAuthenticatedPendingPassword,
     new ChangePasswordController().handle,
   );
   ```

- [ ] **Passo 8: Compilar e verificar**

```bash
npm run build   # sem erros
# reinicie o npm run dev; cole os helpers
reset_admin 123456 true

# Login antigo (6 caracteres) entra e traz os campos novos
R=$(login admin@werk.com.br 123456); echo "$R"
# Esperado: ... "role":"ADMIN","mustChangePassword":true,"token":"..."
T=$(echo "$R" | json .token); ADMIN_ID=$(echo "$R" | json .id)

# E-mail em outra caixa e com espaços também entra
login '  ADMIN@Werk.com.br ' 123456 | json .role          # ADMIN

# Senha pendente: só /me e /me/password funcionam
req GET /customers "$T"            # {"message":"Troca de senha obrigatória"} 403
req GET /me "$T"                   # {... "mustChangePassword":true} 200

# Regras da troca
req PUT /me/password "$T" '{"currentPassword":"errada","newPassword":"Nova12345"}'   # Senha atual incorreta / 400
req PUT /me/password "$T" '{"currentPassword":"123456","newPassword":"abcdefgh"}'    # A senha deve conter pelo menos um número / 400
req PUT /me/password "$T" '{"currentPassword":"123456","newPassword":"12345678"}'    # A senha deve conter pelo menos uma letra / 400
req PUT /me/password "$T" '{"currentPassword":"123456","newPassword":"abc123"}'      # A senha deve ter no mínimo 8 caracteres / 400
LONG=$(printf 'a1%.0s' {1..37})   # 74 caracteres
req PUT /me/password "$T" "{\"currentPassword\":\"123456\",\"newPassword\":\"$LONG\"}"   # A senha deve ter no máximo 72 caracteres / 400
req PUT /me/password "$T" '{"currentPassword":"123456","newPassword":"Admin1234"}'   # {"message":"Senha alterada com sucesso"} 200

# Mesmo token, acesso liberado na hora
req GET /customers "$T" | tail -1  # 200
req PUT /me/password "$T" '{"currentPassword":"Admin1234","newPassword":"Admin1234"}'  # A nova senha deve ser diferente da atual / 400

# Login: erros
login admin@werk.com.br errada; echo        # {"message":"E-mail ou senha incorretos"}
login admin@werk.com.br ''; echo            # {"message":"Senha é obrigatória"}

# Tokens inválidos dão 401, nunca 500 (Review Focus 1)
req GET /me "token-invalido" | tail -1      # 401
GHOST=$(node -e "require('dotenv').config();console.log(require('jsonwebtoken').sign({},process.env.JWT_SECRET,{subject:'00000000-0000-4000-8000-000000000000'}))")
req GET /me "$GHOST"                        # {"message":"Não autorizado"} 401
NOSUB=$(node -e "require('dotenv').config();console.log(require('jsonwebtoken').sign({},process.env.JWT_SECRET))")
req GET /me "$NOSUB"                        # {"message":"Não autorizado"} 401
```

Todas as linhas devem bater com o esperado. Se alguma der 500, veja o log da API e corrija antes de seguir.

- [ ] **Passo 9: Commit**

```bash
git add src/@types/express/index.d.ts src/schemas/user.ts src/services/user/userSelect.ts src/middlewares/isAuthenticated.ts src/services/user/authUserService.ts src/services/user/detailUserService.ts src/services/user/changePasswordService.ts src/controllers/user/changePasswordController.ts src/routers.ts dist/src/schemas/user.js dist/src/services/user/userSelect.js dist/src/middlewares/isAuthenticated.js dist/src/services/user/authUserService.js dist/src/services/user/detailUserService.js dist/src/services/user/changePasswordService.js dist/src/controllers/user/changePasswordController.js dist/src/routers.js
git status --short   # não deve sobrar nada desta tarefa fora do commit
git commit -F - <<'EOF'
feat(auth): load user state on every request and add password change

isAuthenticated now reads role, active and mustChangePassword from the
database, so deactivation and temporary passwords take effect immediately.
Adds PUT /me/password and returns role and mustChangePassword on login.
User-facing messages are now in Portuguese.
EOF
```

---

### Tarefa 3: Gestão de usuários pelo admin e exclusões só para admin

**Repositório:** `apiwerk`

**Files:**
- Create: `src/middlewares/requireAdmin.ts`
- Modify: `src/schemas/common.ts`
- Modify: `src/schemas/user.ts`
- Create: `src/utils/generateTemporaryPassword.ts`
- Modify: `src/services/user/userSelect.ts`
- Modify: `src/services/user/createUserServices.ts`
- Create: `src/services/user/listUsersService.ts`, `src/services/user/updateUserService.ts`, `src/services/user/resetUserPasswordService.ts`
- Create: `src/controllers/user/listUsersController.ts`, `src/controllers/user/updateUserController.ts`, `src/controllers/user/resetUserPasswordController.ts`
- Modify: `src/routers.ts`
- Regenerate: `dist/` dos arquivos acima

**Interfaces:**
- Consumes: `isAuthenticated`, `req.user_id`, `req.user_role`, `emailSchema`, `nameSchema`, `passwordSchema` e `profileSelect` (Tarefa 2).
- Produces:
  - `requireAdmin(req, res, next)`.
  - `uuidParamSchema`.
  - `generateTemporaryPassword(): string`.
  - `userSelect`.
  - `createUserSchema` (`{ name, email, role }`) e `updateUserSchema` (`{ name?, role?, active? }`).
  - Rotas: `GET /users` → `{ users, count }`; `POST /users` → 201 `{ user, temporaryPassword }`; `PUT /users/:id` → o usuário; `POST /users/:id/reset-password` → `{ temporaryPassword }`. Cada usuário tem `{ id, name, email, role, mustChangePassword, active, created_at }`.

- [ ] **Passo 1: Rodar a verificação e ver que falha**

```bash
cd /d/Work/apiwerk
# cole os helpers
reset_admin Admin1234 false
TA=$(login admin@werk.com.br Admin1234 | json .token)
req GET /users "$TA" | tail -1     # Esperado agora: 404 (a rota ainda não existe)
```

- [ ] **Passo 2: `requireAdmin` e `uuidParamSchema`**

Crie `src/middlewares/requireAdmin.ts`:

```ts
import { NextFunction, Request, Response } from "express";
import AppError from "../utils/appError";

// Sempre depois de isAuthenticated, que preenche req.user_role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user_role !== "ADMIN") {
    throw new AppError("Acesso negado", 403);
  }

  return next();
}
```

No fim de `src/schemas/common.ts`, acrescente:

```ts

export const uuidParamSchema = z.uuid({ error: "Id inválido" });
```

- [ ] **Passo 3: Senha temporária**

Crie `src/utils/generateTemporaryPassword.ts`:

```ts
import { randomInt } from "crypto";

// Sem caracteres ambíguos ao ditar ou ler a senha: 0, O, 1, l, I
const LETTERS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALL = LETTERS + DIGITS;
const LENGTH = 10;

function pick(chars: string) {
  return chars[randomInt(chars.length)];
}

// Senha aleatória que já atende ao passwordSchema: 10 caracteres, com pelo
// menos uma letra e um número.
export function generateTemporaryPassword() {
  const chars = [pick(LETTERS), pick(DIGITS)];

  while (chars.length < LENGTH) {
    chars.push(pick(ALL));
  }

  // Embaralha (Fisher-Yates) para a letra e o número garantidos não ficarem sempre no início
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
```

- [ ] **Passo 4: Schemas de cadastro e edição**

Em `src/schemas/user.ts`:

1. Na primeira linha, troque `import { z } from "zod";` por:
   ```ts
   import { Role } from "@prisma/client";
   import { z } from "zod";
   ```
2. Substitua o bloco `export const createUserSchema = z.object({ ... });` inteiro (o que tem `password`) por:
   ```ts
   const roleSchema = z.enum(Role, { error: "Perfil inválido" });

   // A senha é gerada pela API (senha temporária), não vem no corpo
   export const createUserSchema = z.object({
     name: nameSchema,
     email: emailSchema,
     role: roleSchema,
   });

   export const updateUserSchema = z
     .object({
       name: nameSchema.optional(),
       role: roleSchema.optional(),
       active: z.boolean({ error: "Situação inválida" }).optional(),
     })
     .refine((data) => Object.values(data).some((value) => value !== undefined), {
       error: "Informe ao menos um campo para alterar",
     });
   ```
3. Depois de `export type CreateUserInput = ...`, acrescente:
   ```ts
   export type UpdateUserInput = z.infer<typeof updateUserSchema>;
   ```

- [ ] **Passo 5: Services**

Em `src/services/user/userSelect.ts`, acrescente no fim:

```ts

// Campos devolvidos na gestão de usuários (admin)
export const userSelect = {
  ...profileSelect,
  active: true,
  created_at: true,
} satisfies Prisma.UserSelect;
```

Substitua `src/services/user/createUserServices.ts` por:

```ts
import { hash } from "bcryptjs";
import prismaClient from "../../prisma";
import { CreateUserInput } from "../../schemas/user";
import AppError from "../../utils/appError";
import { generateTemporaryPassword } from "../../utils/generateTemporaryPassword";
import { userSelect } from "./userSelect";

export class CreateUserService {
  async execute({ name, email, role }: CreateUserInput) {
    // Sem diferenciar maiúsculas: e-mails antigos podem ter sido gravados com maiúsculas
    const userAlreadyExists = await prismaClient.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (userAlreadyExists) {
      throw new AppError("E-mail já cadastrado", 409);
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hash(temporaryPassword, 8);

    const user = await prismaClient.user.create({
      data: {
        name,
        email,
        role,
        password: passwordHash,
        mustChangePassword: true,
      },
      select: userSelect,
    });

    // A senha temporária só existe nesta resposta: o banco guarda o hash
    return { user, temporaryPassword };
  }
}
```

Crie `src/services/user/listUsersService.ts`:

```ts
import prismaClient from "../../prisma";
import { userSelect } from "./userSelect";

export class ListUsersService {
  async execute() {
    const users = await prismaClient.user.findMany({
      select: userSelect,
      orderBy: { name: "asc" },
    });

    return { users, count: users.length };
  }
}
```

Crie `src/services/user/updateUserService.ts`:

```ts
import prismaClient from "../../prisma";
import { UpdateUserInput } from "../../schemas/user";
import AppError from "../../utils/appError";
import { userSelect } from "./userSelect";

type UpdateUserRequest = UpdateUserInput & {
  id: string;
  actorId: string;
};

export class UpdateUserService {
  async execute({ id, actorId, ...data }: UpdateUserRequest) {
    const user = await prismaClient.user.findUnique({
      where: { id },
      select: { id: true, role: true, active: true },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    // Garante que sempre reste um admin ativo: quem age é um admin ativo e
    // nunca muda o próprio perfil ou situação.
    const changesOwnAccess =
      id === actorId &&
      ((data.role !== undefined && data.role !== user.role) ||
        (data.active !== undefined && data.active !== user.active));

    if (changesOwnAccess) {
      throw new AppError(
        "Você não pode alterar seu próprio perfil ou situação",
        400
      );
    }

    return prismaClient.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }
}
```

Crie `src/services/user/resetUserPasswordService.ts`:

```ts
import { hash } from "bcryptjs";
import prismaClient from "../../prisma";
import AppError from "../../utils/appError";
import { generateTemporaryPassword } from "../../utils/generateTemporaryPassword";

interface ResetUserPasswordRequest {
  id: string;
}

export class ResetUserPasswordService {
  async execute({ id }: ResetUserPasswordRequest) {
    const user = await prismaClient.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hash(temporaryPassword, 8);

    await prismaClient.user.update({
      where: { id },
      data: { password: passwordHash, mustChangePassword: true },
    });

    return { temporaryPassword };
  }
}
```

- [ ] **Passo 6: Controllers**

Crie `src/controllers/user/listUsersController.ts`:

```ts
import { Request, Response } from "express";
import { ListUsersService } from "../../services/user/listUsersService";

export class ListUsersController {
  async handle(req: Request, res: Response) {
    const listUsersService = new ListUsersService();
    const result = await listUsersService.execute();

    return res.status(200).json(result);
  }
}
```

Crie `src/controllers/user/updateUserController.ts`:

```ts
import { Request, Response } from "express";
import { uuidParamSchema } from "../../schemas/common";
import { updateUserSchema } from "../../schemas/user";
import { UpdateUserService } from "../../services/user/updateUserService";

export class UpdateUserController {
  async handle(req: Request, res: Response) {
    const id = await uuidParamSchema.parseAsync(req.params.id);
    const data = await updateUserSchema.parseAsync(req.body);

    const updateUserService = new UpdateUserService();
    const user = await updateUserService.execute({
      id,
      actorId: req.user_id,
      ...data,
    });

    return res.status(200).json(user);
  }
}
```

Crie `src/controllers/user/resetUserPasswordController.ts`:

```ts
import { Request, Response } from "express";
import { uuidParamSchema } from "../../schemas/common";
import { ResetUserPasswordService } from "../../services/user/resetUserPasswordService";

export class ResetUserPasswordController {
  async handle(req: Request, res: Response) {
    const id = await uuidParamSchema.parseAsync(req.params.id);

    const resetUserPasswordService = new ResetUserPasswordService();
    const result = await resetUserPasswordService.execute({ id });

    return res.status(200).json(result);
  }
}
```

O `CreateUserController` (`src/controllers/user/createUserControllers.ts`) não muda: ele já valida com `createUserSchema` e devolve 201 com o retorno do service.

- [ ] **Passo 7: Rotas**

Em `src/routers.ts`:

1. Acrescente aos imports:
   ```ts
   import { ListUsersController } from "./controllers/user/listUsersController";
   import { ResetUserPasswordController } from "./controllers/user/resetUserPasswordController";
   import { UpdateUserController } from "./controllers/user/updateUserController";
   import { requireAdmin } from "./middlewares/requireAdmin";
   ```
2. Troque `router.post("/users", isAuthenticated, new CreateUserController().handle);` por:
   ```ts
   router.get(
     "/users",
     isAuthenticated,
     requireAdmin,
     new ListUsersController().handle,
   );
   router.post(
     "/users",
     isAuthenticated,
     requireAdmin,
     new CreateUserController().handle,
   );
   router.put(
     "/users/:id",
     isAuthenticated,
     requireAdmin,
     new UpdateUserController().handle,
   );
   router.post(
     "/users/:id/reset-password",
     isAuthenticated,
     requireAdmin,
     new ResetUserPasswordController().handle,
   );
   ```
3. Na rota `DELETE /customer/:id`, insira `requireAdmin,` entre `isAuthenticated,` e `new DeleteCustomerController().handle`.
4. Troque `router.delete("/os/:id", isAuthenticated, new DeleteOsController().handle);` por:
   ```ts
   router.delete(
     "/os/:id",
     isAuthenticated,
     requireAdmin,
     new DeleteOsController().handle,
   );
   ```

- [ ] **Passo 8: Compilar e verificar o gerador**

```bash
npm run build   # sem erros
node -e "const {generateTemporaryPassword:g}=require('./dist/src/utils/generateTemporaryPassword');const {passwordSchema:s}=require('./dist/src/schemas/user');const seen=new Set();for(let i=0;i<2000;i++){const p=g();seen.add(p);if(p.length!==10||!s.safeParse(p).success||/[0O1lI]/.test(p)){console.log('FAIL',p);process.exit(1)}}console.log('OK',seen.size)"
```

Esperado: `OK 2000`, ou seja, todas válidas e todas diferentes.

- [ ] **Passo 9: Verificar as rotas**

```bash
# reinicie o npm run dev; cole os helpers
reset_admin Admin1234 false
R=$(login admin@werk.com.br Admin1234); TA=$(echo "$R" | json .token); ADMIN_ID=$(echo "$R" | json .id)
STAMP=$(date +%s)

# Cadastro
C=$(req POST /users "$TA" "{\"name\":\"Basico Teste\",\"email\":\" Basico.$STAMP@Werk.local \",\"role\":\"BASICO\"}"); echo "$C"
# Esperado: 201; "email":"basico.<stamp>@werk.local"; "mustChangePassword":true; "temporaryPassword":"<10 caracteres>"; sem "password"
BODY=$(echo "$C" | head -1); B_ID=$(echo "$BODY" | json .user.id); B_TMP=$(echo "$BODY" | json .temporaryPassword)
req POST /users "$TA" "{\"name\":\"Outro\",\"email\":\"BASICO.$STAMP@werk.local\",\"role\":\"BASICO\"}"   # E-mail já cadastrado / 409
req POST /users "$TA" '{"name":"Outro","email":"x@werk.local","role":"GERENTE"}'                       # Perfil inválido / 400
req POST /users "$TA" '{"name":"   ","email":"y@werk.local","role":"BASICO"}'                          # Nome deve ter no mínimo 2 caracteres / 400

# O Básico troca a senha temporária
TB=$(login "basico.$STAMP@werk.local" "$B_TMP" | json .token)
req PUT /me/password "$TB" "{\"currentPassword\":\"$B_TMP\",\"newPassword\":\"Basico123\"}" | tail -1   # 200

# Permissões do Básico
req GET /customers "$TB" | tail -1          # 200
req GET /users "$TB"                        # Acesso negado / 403
req DELETE /customer/999999 "$TB"           # Acesso negado / 403 (a guarda vem antes da busca)
req DELETE /os/999999 "$TB"                 # Acesso negado / 403
req POST /users/$ADMIN_ID/reset-password "$TB" | tail -1   # 403

# Admin passa pela guarda
req DELETE /os/999999 "$TA" | tail -1       # 404
L=$(req GET /users "$TA"); echo "$L" | tail -1             # 200
echo "$L" | head -1 | json '.count > 0'                    # true
echo "$L" | head -1 | grep -c '"password"'                 # 0

# Edição
req PUT /users/$ADMIN_ID "$TA" '{"role":"BASICO"}'         # Você não pode alterar seu próprio perfil ou situação / 400
req PUT /users/$ADMIN_ID "$TA" '{"active":false}'          # mesma mensagem / 400
req PUT /users/$ADMIN_ID "$TA" '{"role":"ADMIN"}' | tail -1   # 200 (sem mudança real)
req PUT /users/$B_ID "$TA" '{}'                            # Informe ao menos um campo para alterar / 400
req PUT /users/nao-e-uuid "$TA" '{"name":"Xy"}'            # Id inválido / 400
req PUT /users/00000000-0000-4000-8000-000000000000 "$TA" '{"name":"Xy"}'   # Usuário não encontrado / 404

# Desativar vale na hora
req PUT /users/$B_ID "$TA" '{"active":false}' | tail -1    # 200
req GET /customers "$TB"                                   # Não autorizado / 401
login "basico.$STAMP@werk.local" Basico123; echo           # {"message":"Usuário desativado. Fale com o administrador."}
req PUT /users/$B_ID "$TA" '{"active":true}' | tail -1     # 200
TB=$(login "basico.$STAMP@werk.local" Basico123 | json .token); req GET /customers "$TB" | tail -1   # 200

# Redefinir senha com a sessão aberta
NEW_TMP=$(req POST /users/$B_ID/reset-password "$TA" | head -1 | json .temporaryPassword); echo "$NEW_TMP"   # 10 caracteres
req GET /customers "$TB"                                   # Troca de senha obrigatória / 403
login "basico.$STAMP@werk.local" Basico123; echo           # E-mail ou senha incorretos
login "basico.$STAMP@werk.local" "$NEW_TMP" | json .mustChangePassword   # true

# Promover vale na hora
TB=$(login "basico.$STAMP@werk.local" "$NEW_TMP" | json .token)
req PUT /me/password "$TB" "{\"currentPassword\":\"$NEW_TMP\",\"newPassword\":\"Basico456\"}" | tail -1   # 200
req PUT /users/$B_ID "$TA" '{"role":"ADMIN"}' | tail -1    # 200
req GET /users "$TB" | tail -1                             # 200
req PUT /users/$B_ID "$TA" '{"role":"BASICO"}' | tail -1   # 200 (volta ao estado de teste)
```

- [ ] **Passo 10: Commit**

```bash
git add src/middlewares/requireAdmin.ts src/schemas/common.ts src/schemas/user.ts src/utils/generateTemporaryPassword.ts src/services/user/userSelect.ts src/services/user/createUserServices.ts src/services/user/listUsersService.ts src/services/user/updateUserService.ts src/services/user/resetUserPasswordService.ts src/controllers/user/listUsersController.ts src/controllers/user/updateUserController.ts src/controllers/user/resetUserPasswordController.ts src/routers.ts dist/src/middlewares/requireAdmin.js dist/src/schemas/common.js dist/src/schemas/user.js dist/src/utils/generateTemporaryPassword.js dist/src/services/user/userSelect.js dist/src/services/user/createUserServices.js dist/src/services/user/listUsersService.js dist/src/services/user/updateUserService.js dist/src/services/user/resetUserPasswordService.js dist/src/controllers/user/listUsersController.js dist/src/controllers/user/updateUserController.js dist/src/controllers/user/resetUserPasswordController.js dist/src/routers.js
git status --short
git commit -F - <<'EOF'
feat(user): add admin user management and restrict deletes to admins

Adds GET /users, PUT /users/:id and POST /users/:id/reset-password.
POST /users now generates a temporary password that must be changed on
first login. Deleting customers and service orders requires ADMIN.
EOF
```

---

### Tarefa 4: `PUT /me` (nome do perfil) e documentação da API

**Repositório:** `apiwerk`

**Files:**
- Modify: `src/schemas/user.ts`
- Create: `src/services/user/updateProfileService.ts`
- Create: `src/controllers/user/updateProfileController.ts`
- Modify: `src/routers.ts`
- Modify: `README.md`, `CLAUDE.md`, `.claude/rules/arquitetura.md`
- Regenerate: `dist/` dos arquivos acima

**Interfaces:**
- Consumes: `nameSchema`, `profileSelect` e `isAuthenticated` (Tarefa 2).
- Produces: `PUT /me` com `{ name }`, que devolve `{ id, name, email, role, mustChangePassword }`.

- [ ] **Passo 1: Rodar a verificação e ver que falha**

```bash
cd /d/Work/apiwerk
# cole os helpers
reset_admin Admin1234 false
TA=$(login admin@werk.com.br Admin1234 | json .token)
req PUT /me "$TA" '{"name":"Sergio Botelho"}' | tail -1    # Esperado agora: 404
```

- [ ] **Passo 2: Schema, service, controller e rota**

Em `src/schemas/user.ts`, antes dos `export type`, acrescente:

```ts
export const updateProfileSchema = z.object({
  name: nameSchema,
});
```

e, junto dos tipos:

```ts
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

Crie `src/services/user/updateProfileService.ts`:

```ts
import prismaClient from "../../prisma";
import { UpdateProfileInput } from "../../schemas/user";
import { profileSelect } from "./userSelect";

interface UpdateProfileRequest extends UpdateProfileInput {
  userId: string;
}

export class UpdateProfileService {
  async execute({ userId, name }: UpdateProfileRequest) {
    // O usuário existe: o isAuthenticated acabou de buscá-lo
    return prismaClient.user.update({
      where: { id: userId },
      data: { name },
      select: profileSelect,
    });
  }
}
```

Crie `src/controllers/user/updateProfileController.ts`:

```ts
import { Request, Response } from "express";
import { updateProfileSchema } from "../../schemas/user";
import { UpdateProfileService } from "../../services/user/updateProfileService";

export class UpdateProfileController {
  async handle(req: Request, res: Response) {
    const data = await updateProfileSchema.parseAsync(req.body);

    const updateProfileService = new UpdateProfileService();
    const user = await updateProfileService.execute({
      userId: req.user_id,
      ...data,
    });

    return res.status(200).json(user);
  }
}
```

Em `src/routers.ts`, importe o controller:

```ts
import { UpdateProfileController } from "./controllers/user/updateProfileController";
```

e, logo depois do bloco `router.get("/me", ...)`, acrescente:

```ts
router.put("/me", isAuthenticated, new UpdateProfileController().handle);
```

- [ ] **Passo 3: Compilar**

```bash
npm run build   # sem erros
```

- [ ] **Passo 4: Verificar**

```bash
# reinicie o npm run dev; cole os helpers
reset_admin Admin1234 false
TA=$(login admin@werk.com.br Admin1234 | json .token)
req PUT /me "$TA" '{"name":"   "}'                     # Nome deve ter no mínimo 2 caracteres / 400 (Review Focus 5)
req PUT /me "$TA" '{}'                                 # Nome é obrigatório / 400
req PUT /me "$TA" '{"name":"  Sergio Botelho  "}'      # {"id":...,"name":"Sergio Botelho",...,"role":"ADMIN","mustChangePassword":false} 200
reset_admin 123456 true
TP=$(login admin@werk.com.br 123456 | json .token)
req PUT /me "$TP" '{"name":"Sergio Botelho"}'          # Troca de senha obrigatória / 403
reset_admin Admin1234 false
```

- [ ] **Passo 5: Documentação da API**

`README.md`:

1. Em **Funcionalidades → Usuários**, troque os três itens por:
   ```markdown
   - Perfis **Admin** e **Básico**. O Básico cadastra e edita clientes e OS; só o Admin exclui clientes e OS e gerencia usuários
   - Cadastro de usuários pelo admin, com senha temporária gerada pelo sistema e troca obrigatória no primeiro acesso
   - Edição de nome e perfil, desativação e redefinição de senha pelo admin
   - Perfil do usuário: alteração do próprio nome e da própria senha (mínimo de 8 caracteres, com letra e número)
   - Login com emissão de token JWT (validade de 30 dias)
   ```
2. Troque o parágrafo "O seed cria o usuário inicial abaixo. Use-o para obter o primeiro token, já que o cadastro de novos usuários também exige autenticação." por:
   ```markdown
   O seed cria o administrador inicial abaixo. Só um admin cadastra usuários, então use-o para o primeiro acesso. Enquanto a senha dele for `123456`, o sistema obriga a troca no login.
   ```
   e apague a linha `> Troque a senha do administrador antes de usar o sistema em produção.`
3. Na seção **Autenticação**, troque "Todas as rotas, exceto `POST /session`, exigem um token JWT no cabeçalho:" por:
   ```markdown
   Todas as rotas, exceto `POST /session`, exigem um token JWT no cabeçalho. A API consulta o usuário a cada requisição: um usuário desativado recebe 401 na hora, e quem tem a troca de senha pendente só acessa `GET /me` e `PUT /me/password` (as demais rotas respondem 403).
   ```
   e, no JSON da **Resposta `200`**, acrescente as linhas `"role": "ADMIN",` e `"mustChangePassword": false,` antes de `"token"`.
4. Troque a tabela **Endpoints → Usuários** por:
   ```markdown
   | Método | Rota                         | Acesso | Descrição |
   | ------ | ---------------------------- | ------ | --------- |
   | POST   | `/session`                   | público | Autentica e retorna o token JWT |
   | GET    | `/me`                        | logado | Dados do usuário logado (`role`, `mustChangePassword`) |
   | PUT    | `/me`                        | logado | Altera o próprio nome |
   | PUT    | `/me/password`               | logado | Troca a própria senha (`currentPassword`, `newPassword`) |
   | GET    | `/users`                     | admin  | Lista os usuários: `{ users, count }` |
   | POST   | `/users`                     | admin  | Cadastra (`name`, `email`, `role`) e devolve `{ user, temporaryPassword }` |
   | PUT    | `/users/:id`                 | admin  | Altera `name`, `role` e `active` |
   | POST   | `/users/:id/reset-password`  | admin  | Gera nova senha temporária: `{ temporaryPassword }` |
   ```
5. Nas tabelas de **Clientes** e **Ordens de Serviço**, acrescente " (somente admin)" ao fim da descrição dos dois `DELETE`.
6. Na tabela de **Erros**, entre as linhas 401 e 404, acrescente:
   ```markdown
   | 403    | Ação exclusiva de admin, troca de senha pendente ou login de usuário desativado |
   ```
7. Em **Arquitetura**, troque o fluxo `rota → isAuthenticated → controller → service → Prisma → PostgreSQL` por `rota → isAuthenticated → requireAdmin (rotas de admin) → controller → service → Prisma → PostgreSQL`.
8. No **Roadmap**, troque `- [ ] Perfis de acesso e permissões` por `- [x] Perfis de acesso e permissões` e acrescente `- [ ] Backup e restauração do banco (somente admin)`.

`CLAUDE.md`:

1. Troque "Keep new code consistent with that. The user/auth code is the exception: its Zod and error messages are in English." por:
   ```markdown
   Keep new code consistent with that. Every message that can reach the screen (Zod and `AppError` messages, in every domain including user/auth) is in Brazilian Portuguese. The user domain keeps English identifiers and field names (`name`, `role`, `mustChangePassword`), and logs and commit messages stay in English.
   ```
2. Na tabela de respostas, troque `| `POST /users` | `{ user }` (201) |` por `| `POST /users` | `{ user, temporaryPassword }` (201) |`, troque `| `POST /session` | `{ id, name, email, token }` |` por `| `POST /session` | `{ id, name, email, role, mustChangePassword, token }` |`, e acrescente antes de `| `DELETE` routes | ...`:
   ```markdown
   | `GET /me`, `PUT /me` | `{ id, name, email, role, mustChangePassword }` |
   | `PUT /me/password` | `{ message }` |
   | `GET /users` | `{ users: [...], count }`, each without `password` |
   | `PUT /users/:id` | the updated user |
   | `POST /users/:id/reset-password` | `{ temporaryPassword }` |
   ```
3. Substitua o parágrafo da seção **Auth** inteiro por:
   ```markdown
   `POST /session` returns a JWT (30-day expiry, `sub` = user id), plus `role` and `mustChangePassword`. Email lookup at login is case-insensitive, and the login does not apply the new password rule, so old 6-character passwords still work.

   `isAuthenticated` expects `Authorization: Bearer <token>` and reads the user from the database on every request (`role`, `active`, `mustChangePassword`). A missing or inactive user gets 401, and a user with `mustChangePassword` gets 403 "Troca de senha obrigatória". It sets `req.user_id` and `req.user_role`, typed through `src/@types/express/index.d.ts` (`typeRoots` in tsconfig). `isAuthenticatedPendingPassword` is the same but lets a pending user through; only `GET /me` and `PUT /me/password` use it. `requireAdmin` goes after `isAuthenticated` and returns 403 "Acesso negado" for non-admins.

   Roles (`Role` enum): `ADMIN` can do everything. `BASICO` can read everything and create and edit customers and OS, but cannot delete customers or OS or manage users. Admins create users with `POST /users`, which generates a temporary password (`src/utils/generateTemporaryPassword.ts`) returned once and sets `mustChangePassword`. `POST /users/:id/reset-password` does the same for an existing user. An admin cannot change their own `role` or `active`, which guarantees at least one active admin. Users are deactivated, never deleted. The first admin comes from the seed: `admin@werk.com.br` / `123456`, and the seed forces a password change while that password is unchanged. New passwords need 8–72 characters with at least one letter and one digit (`passwordSchema`).
   ```
4. Em **Data model**, depois de "- `User` uses UUID ids. `Client` and `Os` use autoincrement ints.", acrescente:
   ```markdown
   - `User.role` (`ADMIN` | `BASICO`, default `BASICO`), `User.active` (default `true`) and `User.mustChangePassword` (default `false`).
   ```

`.claude/rules/arquitetura.md`:

1. Na tabela **Camadas**, troque a célula "Registra método, caminho, `isAuthenticated` e `new XController().handle`" por "Registra método, caminho, `isAuthenticated` (mais `requireAdmin` nas rotas só de admin) e `new XController().handle`".
2. Troque "Um controller e um service por caso de uso. Toda rota, exceto `/session`, usa `isAuthenticated`." por:
   ```markdown
   Um controller e um service por caso de uso. Toda rota, exceto `/session`, usa `isAuthenticated`. Rotas exclusivas de admin acrescentam `requireAdmin` logo depois. Só `GET /me` e `PUT /me/password` usam `isAuthenticatedPendingPassword`, que deixa passar quem ainda precisa trocar a senha temporária.
   ```
3. Troque o item "- Pasta por domínio em inglês (`customer`, `os`, `user`). Campos e mensagens seguem o domínio em português (`nome`, `telefone`, "Cliente não encontrado"), exceto o domínio de usuário/auth, que é em inglês." por:
   ```markdown
   - Pasta por domínio em inglês (`customer`, `os`, `user`). Os campos seguem o domínio: português em cliente e OS (`nome`, `telefone`) e inglês em usuário/auth (`name`, `role`).
   - Toda mensagem que pode chegar à tela (Zod e `AppError`) é em PT-BR, em todos os domínios, inclusive usuário/auth. Logs, identificadores e commits ficam em inglês.
   ```
4. Troque "- Zod v4 (`{ error: "..." }`), com mensagens no idioma do domínio." por "- Zod v4 (`{ error: "..." }`), com mensagens em PT-BR."

- [ ] **Passo 6: Commit**

```bash
git add src/schemas/user.ts src/services/user/updateProfileService.ts src/controllers/user/updateProfileController.ts src/routers.ts dist/src/schemas/user.js dist/src/services/user/updateProfileService.js dist/src/controllers/user/updateProfileController.js dist/src/routers.js README.md CLAUDE.md .claude/rules/arquitetura.md
git status --short
git commit -F - <<'EOF'
feat(user): add PUT /me and document roles and user management

Lets users change their own name. Documents the roles, the new endpoints
and the rule that every user-facing message is in Portuguese.
EOF
```

---

### Tarefa 5: Front: sessão com perfil e mensagens de login

**Repositório:** `werk-app` (a API das Tarefas 1 a 4 rodando em `localhost:3333`)

**Files:**
- Create: `src/types/user.ts`
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/lib/authOptions.ts`
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `POST /session` → `{ id, name, email, role, mustChangePassword, token }`.
- Produces:
  - `session.user.role: UserRole` e `session.user.mustChangePassword: boolean`.
  - `update({ name?: string, mustChangePassword?: boolean })` do `useSession()`, que atualiza esses dois campos na sessão.
  - Os tipos `UserRole`, `User` e `roleLabels` em `@/types/user`.

- [ ] **Passo 1: Rodar a verificação e ver que falha**

Com a API e o front rodando (veja "Ambiente de verificação"), rode `reset_admin Admin1234 false` na API. Pelo Playwright MCP:

1. Abra `http://localhost:3000/login`, entre com `admin@werk.com.br` / `Admin1234`.
2. Rode no navegador `await (await fetch('/api/auth/session')).json()`.

Esperado agora: `user` **não** tem `role` nem `mustChangePassword`.

- [ ] **Passo 2: Tipos**

Crie `src/types/user.ts`:

```ts
export type UserRole = "ADMIN" | "BASICO";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  created_at: string;
}

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  BASICO: "Básico",
};
```

Substitua `src/types/next-auth.d.ts` por:

```ts
import NextAuth from "next-auth";
import { UserRole } from "./user";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      token: string;
      name?: string;
      email?: string;
      role: UserRole;
      mustChangePassword: boolean;
    };
  }
}
```

- [ ] **Passo 3: `authOptions`**

Substitua `src/lib/authOptions.ts` por:

```ts
import { UserRole } from "@/types/user";
import axios, { isAxiosError } from "axios";
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

interface SessionResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  token: string;
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "crendencials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // axios puro: os interceptors do `api` (signOut no 401, troca de senha
          // no 403) são para o navegador e não fazem sentido no login
          const response = await axios.post<SessionResponse>(
            "/session",
            { email: credentials?.email, password: credentials?.password },
            { baseURL: process.env.NEXT_PUBLIC_API },
          );

          return response.data ?? null;
        } catch (error) {
          // A mensagem vira `result.error` no signIn (ex.: "Usuário desativado...")
          const message = isAxiosError(error)
            ? error.response?.data?.message
            : undefined;
          throw new Error(message ?? "Erro ao entrar. Tente novamente.");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },

  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        const apiUser = user as unknown as SessionResponse;

        return {
          ...token,
          token: apiUser.token,
          role: apiUser.role,
          mustChangePassword: apiUser.mustChangePassword,
        };
      }

      // update() do useSession: aceita só o que o próprio usuário pode mudar.
      // O perfil nunca vem do cliente.
      if (trigger === "update" && session) {
        return {
          ...token,
          ...(typeof session.name === "string" && { name: session.name }),
          ...(typeof session.mustChangePassword === "boolean" && {
            mustChangePassword: session.mustChangePassword,
          }),
        };
      }

      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.sub as string;
      session.user.token = token.token as string;
      session.user.role = token.role as UserRole;
      session.user.mustChangePassword = token.mustChangePassword as boolean;
      return session;
    },
  },
};
// Handler do NextAuth
const handler = NextAuth(authOptions);

// Exporta o handler como GET e POST
export { handler as GET, handler as POST };

// Exporta as opções de autenticação separadamente (caso necessário em outro lugar)
export { authOptions };
```

- [ ] **Passo 4: Mensagem no login**

Em `src/app/login/page.tsx`, troque o bloco:

```tsx
      toast.error(
        result.status === 401
          ? "Usuário ou senha inválida"
          : "Internal server error",
        {
          autoClose: 2000,
        },
      );
```

por:

```tsx
      // `error` traz a mensagem da API lançada no authorize (authOptions)
      toast.error(
        result.error === "CredentialsSignin"
          ? "E-mail ou senha incorretos"
          : result.error,
        {
          autoClose: 4000,
        },
      );
```

- [ ] **Passo 5: Compilar**

```bash
cd /d/Projetos/werk-app
npm run build   # sem erros de tipo
```

- [ ] **Passo 6: Verificar no navegador**

Reinicie o `npm run dev` do front. Na API, rode `reset_admin Admin1234 false`. Pelo Playwright MCP:

1. Saia, se houver sessão, e entre com `admin@werk.com.br` / `Admin1234`. A página `/` deve carregar.
2. `await (await fetch('/api/auth/session')).json()` deve trazer `user.role === "ADMIN"` e `user.mustChangePassword === false`.
3. Saia. Entre com uma senha errada: o toast diz "E-mail ou senha incorretos".
4. Na API, crie um Básico e desative-o (comandos da Tarefa 3, passo 9). Entre com ele: o toast diz "Usuário desativado. Fale com o administrador."

- [ ] **Passo 7: Commit**

```bash
git add src/types/user.ts src/types/next-auth.d.ts src/lib/authOptions.ts src/app/login/page.tsx
git status --short
git commit -F - <<'EOF'
feat(auth): keep role and password-change flag in the session

The session now carries role and mustChangePassword from POST /session,
supports update() for name and the flag, and the login shows the API
error message (e.g. deactivated user).
EOF
```

---

### Tarefa 6: Front: troca obrigatória de senha

**Repositório:** `werk-app`

**Files:**
- Create: `src/app/components/profile/change-password-form.tsx`
- Create: `src/app/components/profile/forced-password-change.tsx`
- Create: `src/app/alterar-senha/page.tsx`
- Modify: `src/app/(auth-routes)/layout.tsx`
- Modify: `src/services/api/api.ts`
- Modify: `src/services/api/serverApi.ts`

**Interfaces:**
- Consumes: `session.user.mustChangePassword` e `update()` (Tarefa 5); `PUT /me/password`; `GET /me`.
- Produces: `ChangePasswordForm({ currentPasswordLabel?: string; onSuccess: () => Promise<void> | void })`, usado também na Tarefa 7.

- [ ] **Passo 1: Rodar a verificação e ver que falha**

Na API: `reset_admin 123456 true`. No navegador, entre com `admin@werk.com.br` / `123456`. Esperado agora: o app abre `/`, e a lista de OS falha com o toast ou erro "Troca de senha obrigatória". Não há tela de troca.

- [ ] **Passo 2: Formulário de troca de senha**

Crie `src/app/components/profile/change-password-form.tsx`:

```tsx
"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/services/api/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";

// Mesma regra da API (passwordSchema em apiwerk/src/schemas/user.ts)
const passwordRules = [
  {
    label: "Mínimo de 8 caracteres",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "Pelo menos uma letra",
    test: (value: string) => /[A-Za-z]/.test(value),
  },
  { label: "Pelo menos um número", test: (value: string) => /\d/.test(value) },
];

const schema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z
      .string()
      .min(8, "A senha deve ter no mínimo 8 caracteres")
      .max(72, "A senha deve ter no máximo 72 caracteres")
      .regex(/[A-Za-z]/, "A senha deve conter pelo menos uma letra")
      .regex(/\d/, "A senha deve conter pelo menos um número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "A nova senha deve ser diferente da atual",
    path: ["newPassword"],
  });

type FormData = z.infer<typeof schema>;

interface ChangePasswordFormProps {
  currentPasswordLabel?: string;
  onSuccess: () => Promise<void> | void;
}

export function ChangePasswordForm({
  currentPasswordLabel = "Senha atual",
  onSuccess,
}: ChangePasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPassword = watch("newPassword") ?? "";

  const onSubmit = async ({ currentPassword, newPassword }: FormData) => {
    setLoading(true);
    try {
      await api.put("/me/password", { currentPassword, newPassword });
      reset();
      toast.success("Senha alterada com sucesso.");
      await onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message ?? "Erro ao alterar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-1">
        <Label htmlFor="currentPassword">{currentPasswordLabel}</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
          className={errors.currentPassword ? "border-red-500" : ""}
        />
        {errors.currentPassword && (
          <p className="text-xs text-red-500">
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="newPassword">Nova senha</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
          className={errors.newPassword ? "border-red-500" : ""}
        />
        {errors.newPassword && (
          <p className="text-xs text-red-500">{errors.newPassword.message}</p>
        )}
      </div>

      <ul className="space-y-1 text-sm">
        {passwordRules.map((rule) => {
          const ok = rule.test(newPassword);
          return (
            <li
              key={rule.label}
              className={cn(
                "flex items-center gap-2",
                ok ? "text-green-600" : "text-muted-foreground",
              )}
            >
              {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {rule.label}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-1">
        <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
          className={errors.confirmPassword ? "border-red-500" : ""}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-500">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
```

- [ ] **Passo 3: Página `/alterar-senha`**

Crie `src/app/components/profile/forced-password-change.tsx`:

```tsx
"use client";

import { Button } from "@/app/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChangePasswordForm } from "./change-password-form";

export function ForcedPasswordChange() {
  const { update } = useSession();
  const router = useRouter();

  const handleSuccess = async () => {
    await update({ mustChangePassword: false });
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <ChangePasswordForm
        currentPasswordLabel="Senha temporária"
        onSuccess={handleSuccess}
      />
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sair
      </Button>
    </div>
  );
}
```

Crie `src/app/alterar-senha/page.tsx`:

```tsx
import { ForcedPasswordChange } from "@/app/components/profile/forced-password-change";
import { Card } from "@/app/components/ui/card";
import { authOptions } from "@/lib/authOptions";
import { getServerApi } from "@/services/api/serverApi";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

// Fica fora de (auth-routes): sem menu lateral, o usuário não navega antes de trocar a senha
export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Consulta a API, não a sessão: o admin pode ter redefinido a senha depois do login
  let mustChangePassword = false;
  try {
    const apiServer = await getServerApi();
    const { data } = await apiServer.get("me");
    mustChangePassword = data.mustChangePassword === true;
  } catch (error) {
    console.error(error);
  }

  if (!mustChangePassword) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-hero">
      <Card className="w-full max-w-md p-6 space-y-4 bg-card-gradient">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Crie sua senha</h1>
          <p className="text-sm text-muted-foreground">
            Você entrou com uma senha temporária. Para continuar, crie uma senha
            só sua.
          </p>
        </div>
        <ForcedPasswordChange />
      </Card>
    </div>
  );
}
```

- [ ] **Passo 4: Redirecionar no layout**

Em `src/app/(auth-routes)/layout.tsx`, troque:

```tsx
  if (!session) {
    redirect("/login");
  }
```

por:

```tsx
  if (!session) {
    redirect("/login");
  }

  if (session.user.mustChangePassword) {
    redirect("/alterar-senha");
  }
```

- [ ] **Passo 5: Interceptor do navegador**

Em `src/services/api/api.ts`:

1. Logo depois de `let accessToken: string | null = null; // Armazenar o token em memória`, acrescente:
   ```ts

   // Confere na API se o 403 veio de uma senha redefinida pelo admin com a sessão aberta.
   // Usa axios puro para não passar de novo por este interceptor.
   async function mustChangePassword() {
     try {
       const { data } = await axios.get("/me", {
         baseURL: process.env.NEXT_PUBLIC_API,
         headers: { Authorization: `Bearer ${accessToken}` },
       });
       return data.mustChangePassword === true;
     } catch {
       return false;
     }
   }
   ```
2. No interceptor de resposta, logo depois do bloco `if (error.response?.status === 401) { ... }`, acrescente:
   ```ts

    if (
      error.response?.status === 403 &&
      accessToken &&
      (await mustChangePassword())
    ) {
      // A página /alterar-senha confere o /me no servidor e mostra o formulário
      window.location.assign("/alterar-senha");
    }
   ```

- [ ] **Passo 6: Interceptor do servidor**

Substitua `src/services/api/serverApi.ts` por:

```ts
"use server";

import { authOptions } from "@/lib/authOptions";
import axios from "axios";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function getServerApi() {
  const session = await getServerSession(authOptions);
  const authorization = session?.user?.token
    ? `Bearer ${session.user.token}`
    : "";

  const instance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API,
    headers: {
      Authorization: authorization,
    },
  });

  instance.interceptors.response.use(undefined, async (error) => {
    // Senha redefinida pelo admin com a sessão aberta: a página renderizada no
    // servidor manda para a troca, em vez de cair numa página de erro
    if (error.response?.status === 403 && authorization) {
      const me = await axios
        .get("me", {
          baseURL: process.env.NEXT_PUBLIC_API,
          headers: { Authorization: authorization },
        })
        .then((response) => response.data)
        .catch(() => null);

      if (me?.mustChangePassword) {
        redirect("/alterar-senha");
      }
    }

    return Promise.reject(error);
  });

  return instance;
}
```

- [ ] **Passo 7: Compilar**

```bash
npm run build   # sem erros
```

- [ ] **Passo 8: Verificar o primeiro acesso**

Reinicie o front. Na API: `reset_admin 123456 true`. Pelo Playwright MCP:

1. Entre com `admin@werk.com.br` / `123456`. A página vai para `/alterar-senha` (sem menu lateral).
2. Navegue para `http://localhost:3000/customers`: volta para `/alterar-senha`.
3. Digite `abc` na nova senha: só "Pelo menos uma letra" fica verde. Digite `abc12345`: os três ficam verdes.
4. Confirme com `abc12346` e envie: aparece "As senhas não conferem".
5. Senha temporária `errada`, nova `Admin1234` e confirmação `Admin1234`: o toast mostra "Senha atual incorreta".
6. Senha temporária `123456`, nova `Admin1234` e confirmação `Admin1234`: o toast mostra "Senha alterada com sucesso.", e a página vai para `/`, com a lista de OS carregando.
7. `await (await fetch('/api/auth/session')).json()` mostra `user.mustChangePassword === false`.
8. Navegue para `/alterar-senha`: volta para `/`.

- [ ] **Passo 9: Verificar a redefinição com a sessão aberta (Review Focus 4)**

Na API, crie um Básico, troque a senha dele para `Basico123` (comandos da Tarefa 3, passo 9) e anote `B_ID` e `TA`. No navegador, saia e entre como esse Básico, com `Basico123`. A página `/` carrega.

1. **Página renderizada no servidor.** Na API: `req POST /users/$B_ID/reset-password "$TA"` e anote a senha temporária. No navegador, clique em "Clientes" no menu. `/customers` deve levar a `/alterar-senha`, não a uma página de erro. Termine a troca no navegador com a senha temporária e a nova senha `Basico456`. A página volta para `/`.
2. **Página buscada no cliente.** Na API, redefina de novo: `req POST /users/$B_ID/reset-password "$TA"`. No navegador, já em `/`, recarregue a página. A lista de OS recebe 403, e o navegador vai para `/alterar-senha`.
3. Ainda com a troca pendente, digite na barra de endereço `http://localhost:3000/perfil`: a página também leva a `/alterar-senha`.

- [ ] **Passo 10: Commit**

```bash
git add src/app/components/profile/change-password-form.tsx src/app/components/profile/forced-password-change.tsx src/app/alterar-senha/page.tsx "src/app/(auth-routes)/layout.tsx" src/services/api/api.ts src/services/api/serverApi.ts
git status --short
git commit -F - <<'EOF'
feat(auth): force password change after a temporary password

Users with a pending password change are sent to /alterar-senha, a page
without navigation, until they create their own password. Both axios
clients send the user there when the admin resets the password while
the session is open.
EOF
```

---

### Tarefa 7: Front: página de perfil e menu

**Repositório:** `werk-app`

**Files:**
- Create: `src/app/components/profile/profile.tsx`
- Create: `src/app/(auth-routes)/perfil/page.tsx`
- Modify: `src/components/sidebar-nav.tsx`

**Interfaces:**
- Consumes: `ChangePasswordForm` (Tarefa 6); `update()` e `session.user.role` (Tarefa 5); `GET /me` e `PUT /me`; `roleLabels` e `UserRole` (Tarefa 5).
- Produces: a rota `/perfil` e a lista `items` do menu, que a Tarefa 8 estende com "Usuários".

- [ ] **Passo 1: Rodar a verificação e ver que falha**

Logado como admin, abra `http://localhost:3000/perfil`. Esperado agora: 404.

- [ ] **Passo 2: Componente de perfil**

Crie `src/app/components/profile/profile.tsx`:

```tsx
"use client";

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { api } from "@/services/api/api";
import { roleLabels, UserRole } from "@/types/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";
import { ChangePasswordForm } from "./change-password-form";

const schema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

type FormData = z.infer<typeof schema>;

interface ProfileProps {
  me: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export function Profile({ me }: ProfileProps) {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: me.name },
  });

  const onSubmit = async ({ name }: FormData) => {
    setLoading(true);
    try {
      const { data } = await api.put("/me", { name });
      await update({ name: data.name });
      router.refresh();
      toast.success("Nome alterado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message ?? "Erro ao salvar o nome.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4 py-4 sm:px-6 md:px-8 lg:px-10 space-y-4 md:space-y-8 max-w-3xl mx-auto mt-4 md:mt-0">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Meu perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Altere seu nome e sua senha.
        </p>
      </header>

      <Card className="p-4 sm:p-6 space-y-4 bg-card-gradient">
        <h2 className="text-lg font-semibold">Dados</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-1">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              {...register("name")}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={me.email} disabled />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="role">Perfil</Label>
            <Input id="role" value={roleLabels[me.role]} disabled />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-4 sm:p-6 space-y-4 bg-card-gradient">
        <h2 className="text-lg font-semibold">Trocar senha</h2>
        <ChangePasswordForm onSuccess={() => undefined} />
      </Card>
    </div>
  );
}
```

Crie `src/app/(auth-routes)/perfil/page.tsx`:

```tsx
import { Profile } from "@/app/components/profile/profile";
import { getServerApi } from "@/services/api/serverApi";

export default async function ProfilePage() {
  const apiServer = await getServerApi();
  const { data: me } = await apiServer.get("me");

  return (
    <div className="max-w-6xl mx-auto w-full">
      <Profile me={me} />
    </div>
  );
}
```

- [ ] **Passo 3: Menu lateral**

Em `src/components/sidebar-nav.tsx`:

1. Troque o import do lucide por:
   ```tsx
   import {
     CircleUser,
     LayoutDashboard,
     LogOut,
     Menu,
     Users2Icon,
     X,
   } from "lucide-react";
   ```
2. Troque `import { signOut } from "next-auth/react";` por `import { signOut, useSession } from "next-auth/react";`.
3. Depois da constante `nav`, acrescente:
   ```tsx
   const profileNav = { to: "/perfil", label: "Meu perfil", icon: CircleUser };
   ```
4. Dentro de `SidebarNav`, depois de `const route = useRouter();`, acrescente:
   ```tsx
   const { data: session } = useSession();
   const items = [...nav, profileNav];
   ```
5. Troque `{nav.map((item, idx) => {` por `{items.map((item, idx) => {`.

- [ ] **Passo 4: Compilar**

```bash
npm run build   # sem erros
```

(Se o build reclamar de `session` sem uso, ele é usado na Tarefa 8. Com `strict: false` e sem regra de lint, não deve reclamar.)

- [ ] **Passo 5: Verificar no navegador**

Na API: `reset_admin Admin1234 false`. Pelo Playwright MCP, logado como admin:

1. O menu mostra "Meu perfil". Clique: `/perfil` mostra o nome editável e o e-mail e o perfil ("Admin") desabilitados.
2. Troque o nome para `Sergio B` e salve: o toast diz "Nome alterado com sucesso.", e `await (await fetch('/api/auth/session')).json()` traz `user.name === "Sergio B"` sem novo login.
3. Nome `" "` e salvar: aparece "Nome deve ter no mínimo 2 caracteres".
4. Trocar senha: atual `Admin1234`, nova `Admin5678` e confirmação `Admin5678`: o toast diz "Senha alterada com sucesso.". Saia e entre com `Admin5678`.
5. Volte o nome para `Sergio Botelho`.

- [ ] **Passo 6: Commit**

```bash
git add src/app/components/profile/profile.tsx "src/app/(auth-routes)/perfil/page.tsx" src/components/sidebar-nav.tsx
git status --short
git commit -F - <<'EOF'
feat(profile): add profile page to change name and password
EOF
```

---

### Tarefa 8: Front: página de usuários (só admin)

**Repositório:** `werk-app`

**Files:**
- Modify: `src/app/components/confirmation-modal.tsx`
- Create: `src/app/components/users/temporary-password-dialog.tsx`
- Create: `src/app/components/users/user-modal.tsx`
- Create: `src/app/components/users/user-card.tsx`
- Create: `src/app/components/users/users.tsx`
- Create: `src/app/(auth-routes)/usuarios/page.tsx`
- Modify: `src/components/sidebar-nav.tsx`

**Interfaces:**
- Consumes: `User`, `UserRole` e `roleLabels` (Tarefa 5); `session.user.role` e `session.user.id`; `GET /users`, `POST /users`, `PUT /users/:id` e `POST /users/:id/reset-password` (Tarefa 3); `items` e `session` no `sidebar-nav` (Tarefa 7).
- Produces: a rota `/usuarios`, e uma nova prop opcional `loadingText` em `ConfirmationDialog`.

- [ ] **Passo 1: Rodar a verificação e ver que falha**

Logado como admin, abra `http://localhost:3000/usuarios`. Esperado agora: 404.

- [ ] **Passo 2: Texto de carregamento configurável no `ConfirmationDialog`**

Em `src/app/components/confirmation-modal.tsx`:

1. Em `ConfirmationDialogProps`, depois de `description: string;`, acrescente `loadingText?: string;`.
2. Na desestruturação dos props, acrescente `loadingText = "Excluindo...",`.
3. Troque `{loading ? "Excluindo..." : "Sim"}` por `{loading ? loadingText : "Sim"}`.

- [ ] **Passo 3: Diálogo da senha temporária**

Crie `src/app/components/users/temporary-password-dialog.tsx`:

```tsx
"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";

interface TemporaryPasswordDialogProps {
  name: string;
  password: string;
  onClose: VoidFunction;
}

export function TemporaryPasswordDialog({
  name,
  password,
  onClose,
}: TemporaryPasswordDialogProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Senha copiada.");
    } catch {
      toast.error("Não foi possível copiar. Selecione a senha e copie.");
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="w-[95%] sm:max-w-md"
        // Fecha só pelo botão: clicar fora ou apertar Esc perderia a senha, que não é exibida de novo
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Senha temporária</DialogTitle>
          <DialogDescription>Senha de acesso de {name}.</DialogDescription>
        </DialogHeader>
        <code className="block rounded-md border bg-muted px-4 py-3 text-center font-mono text-xl tracking-widest select-all">
          {password}
        </code>
        <p className="text-sm text-muted-foreground">
          Esta senha não será exibida novamente. Repasse ao usuário; ele deverá
          criar uma nova no primeiro acesso.
        </p>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </Button>
          <Button type="button" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Passo 4: Modal de cadastro e edição**

Crie `src/app/components/users/user-modal.tsx`:

```tsx
"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { api } from "@/services/api/api";
import { roleLabels, User } from "@/types/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { SquareX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z
    .string()
    .trim()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido"),
  role: z.enum(["ADMIN", "BASICO"], { required_error: "Selecione o perfil" }),
  active: z.enum(["true", "false"]),
});

type FormData = z.infer<typeof schema>;

interface UserModalProps {
  user: User | null; // null = cadastro
  isSelf: boolean;
  onClose: VoidFunction;
  onCreated: (name: string, temporaryPassword: string) => void;
}

export function UserModal({ user, isSelf, onClose, onCreated }: UserModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEditing = user !== null;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "BASICO",
      active: user?.active === false ? "false" : "true",
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      if (isEditing) {
        // O próprio admin só altera o nome: a API recusa mudar o próprio perfil ou situação
        const body = isSelf
          ? { name: data.name }
          : { name: data.name, role: data.role, active: data.active === "true" };
        await api.put(`/users/${user.id}`, body);
        toast.success("Usuário alterado com sucesso.");
        router.refresh();
        onClose();
      } else {
        const response = await api.post("/users", {
          name: data.name,
          email: data.email,
          role: data.role,
        });
        router.refresh();
        onClose();
        onCreated(response.data.user.name, response.data.temporaryPassword);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message ?? "Erro ao salvar o usuário.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="w-[95%] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {isEditing ? "Editar usuário" : "Novo usuário"}
          </DialogTitle>
          <DialogTrigger
            asChild
            className="absolute right-2 top-1 cursor-pointer"
          >
            <SquareX size={30} />
          </DialogTrigger>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSelf}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BASICO">{roleLabels.BASICO}</SelectItem>
                      <SelectItem value="ADMIN">{roleLabels.ADMIN}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEditing && (
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSelf}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Ativo</SelectItem>
                        <SelectItem value="false">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                Você não pode alterar seu próprio perfil ou situação.
              </p>
            )}
            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Passo 5: Lista, contêiner e página**

Crie `src/app/components/users/user-card.tsx`:

```tsx
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { roleLabels, User } from "@/types/user";
import { KeyRound, Mail, UserCog } from "lucide-react";

interface UserCardProps {
  users: User[];
  currentUserId: string;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
}

export function UserCard({
  users,
  currentUserId,
  onEdit,
  onResetPassword,
}: UserCardProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {users.length === 0 && (
        <Card className="col-span-full p-12 text-center">
          <UserCog className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
        </Card>
      )}

      {users.map((u) => (
        <Card key={u.id} className="p-4 sm:p-5 bg-card-gradient space-y-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-hero text-primary-foreground flex items-center justify-center font-bold shrink-0">
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="font-semibold truncate">
                {u.name}
                {u.id === currentUserId && (
                  <span className="text-xs text-muted-foreground"> (você)</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{u.email}</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                  {roleLabels[u.role]}
                </Badge>
                <Badge variant={u.active ? "outline" : "destructive"}>
                  {u.active ? "Ativo" : "Inativo"}
                </Badge>
                {u.mustChangePassword && (
                  <Badge variant="outline">Senha temporária</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(u)}
            >
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onResetPassword(u)}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Redefinir senha
            </Button>
          </div>
        </Card>
      ))}
    </section>
  );
}
```

Crie `src/app/components/users/users.tsx`:

```tsx
"use client";

import { api } from "@/services/api/api";
import { User } from "@/types/user";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { ConfirmationDialog } from "../confirmation-modal";
import { Header } from "../header";
import { TemporaryPasswordDialog } from "./temporary-password-dialog";
import { UserCard } from "./user-card";
import { UserModal } from "./user-modal";

interface UsersProps {
  users: User[];
  currentUserId: string;
}

export default function Users({ users, currentUserId }: UsersProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<{
    name: string;
    password: string;
  } | null>(null);

  const handleCloseModal = () => {
    setSelectedUser(null);
    setIsModalOpen(false);
  };

  const handleResetPassword = async () => {
    if (!userToReset) return;
    setResetLoading(true);
    try {
      const { data } = await api.post(
        `/users/${userToReset.id}/reset-password`,
      );
      setTemporaryPassword({
        name: userToReset.name,
        password: data.temporaryPassword,
      });
      setUserToReset(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message ?? "Erro ao redefinir a senha.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="w-full px-4 py-4 sm:px-6 md:px-8 lg:px-10 space-y-4 md:space-y-8 max-w-7xl mx-auto mt-4 md:mt-0">
      <Header
        title="Usuários"
        description="Cadastre usuários e defina o perfil de acesso."
        titleButton="Novo Usuário"
        setIsModalOpen={setIsModalOpen}
      />
      <UserCard
        users={users}
        currentUserId={currentUserId}
        onEdit={setSelectedUser}
        onResetPassword={setUserToReset}
      />
      {(isModalOpen || selectedUser !== null) && (
        <UserModal
          user={selectedUser}
          isSelf={selectedUser?.id === currentUserId}
          onClose={handleCloseModal}
          onCreated={(name, password) =>
            setTemporaryPassword({ name, password })
          }
        />
      )}
      <ConfirmationDialog
        title="Redefinir senha?"
        description={`Uma nova senha temporária será gerada para ${
          userToReset?.name ?? ""
        }. A senha atual deixa de funcionar.`}
        loading={resetLoading}
        loadingText="Gerando..."
        openAlertDialog={userToReset !== null}
        setOpenAlertDialog={(open) => {
          if (!open) setUserToReset(null);
        }}
        handleExcluir={handleResetPassword}
      />
      {temporaryPassword && (
        <TemporaryPasswordDialog
          name={temporaryPassword.name}
          password={temporaryPassword.password}
          onClose={() => setTemporaryPassword(null)}
        />
      )}
    </div>
  );
}
```

Crie `src/app/(auth-routes)/usuarios/page.tsx`:

```tsx
import Users from "@/app/components/users/users";
import { authOptions } from "@/lib/authOptions";
import { getServerApi } from "@/services/api/serverApi";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const apiServer = await getServerApi();
  const { data } = await apiServer.get("users");

  return (
    <div className="max-w-6xl mx-auto w-full">
      <Users users={data.users} currentUserId={session.user.id} />
    </div>
  );
}
```

- [ ] **Passo 6: Item "Usuários" no menu**

Em `src/components/sidebar-nav.tsx`:

1. Acrescente `ShieldCheck,` ao import do lucide.
2. Depois de `const profileNav = ...`, acrescente:
   ```tsx
   const adminNav = [{ to: "/usuarios", label: "Usuários", icon: ShieldCheck }];
   ```
3. Troque `const items = [...nav, profileNav];` por:
   ```tsx
   const items = [
     ...nav,
     ...(session?.user.role === "ADMIN" ? adminNav : []),
     profileNav,
   ];
   ```

- [ ] **Passo 7: Compilar**

```bash
npm run build   # sem erros
```

- [ ] **Passo 8: Verificar no navegador**

Logado como admin, pelo Playwright MCP:

1. O menu mostra "Usuários". `/usuarios` lista os usuários, com o admin marcado "(você)" e badges de perfil e situação.
2. "Novo Usuário": nome `Ana Teste`, e-mail `ana.<algo único>@werk.local`, perfil Básico, salvar. O diálogo "Senha temporária" mostra uma senha de 10 caracteres.
3. **Review Focus 3:** clique fora do diálogo e aperte Esc: ele **continua aberto**. "Copiar" mostra o toast "Senha copiada.". "Fechar" fecha o diálogo, e a lista mostra Ana com o badge "Senha temporária".
4. Repita o cadastro com o mesmo e-mail em maiúsculas: o toast diz "E-mail já cadastrado".
5. Editar o próprio admin: os campos perfil e situação ficam desabilitados, com o aviso. Trocar só o nome funciona.
6. Editar Ana: mude a situação para Inativo e salve. O badge vira "Inativo". Volte para Ativo.
7. "Redefinir senha" em Ana: o diálogo de confirmação aparece; "Sim" mostra a senha temporária nova.
8. Saia e entre como Ana com a senha temporária: ela vai para `/alterar-senha`. Crie a senha `Ana12345`. Em `/`, o menu **não** mostra "Usuários". Abra `http://localhost:3000/usuarios` direto: volta para `/`.

- [ ] **Passo 9: Commit**

```bash
git add src/app/components/confirmation-modal.tsx src/app/components/users/temporary-password-dialog.tsx src/app/components/users/user-modal.tsx src/app/components/users/user-card.tsx src/app/components/users/users.tsx "src/app/(auth-routes)/usuarios/page.tsx" src/components/sidebar-nav.tsx
git status --short
git commit -F - <<'EOF'
feat(users): add admin page to manage users

Admins list, create, edit, deactivate and reset the password of users.
The temporary password is shown once in a dialog that only closes through
its button.
EOF
```

---

### Tarefa 9: Front: esconder exclusões do Básico e documentação

**Repositório:** `werk-app`

**Files:**
- Modify: `src/app/components/customers/customer-modal.tsx`
- Modify: `src/app/components/serviceOrder/serviceorder-modal.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `session.user.role` (Tarefa 5).

- [ ] **Passo 1: Rodar a verificação e ver que falha**

Entre como Ana (Básico, senha `Ana12345`, da Tarefa 8). Abra um cliente em "Editar". Esperado agora: o botão "Excluir" aparece, e clicar em "Sim" dá o toast "Acesso negado".

- [ ] **Passo 2: Modal de cliente**

Em `src/app/components/customers/customer-modal.tsx`:

1. Acrescente o import `import { useSession } from "next-auth/react";`.
2. Depois de `const [openAlertDialog, setOpenAlertDialog] = useState(false);`, acrescente:
   ```tsx
   const { data: session } = useSession();
   // Excluir é só para admin (a API também recusa com 403)
   const canDelete = isEditing && session?.user.role === "ADMIN";
   ```
3. Troque o botão:
   ```tsx
            <Button
              type="button"
              variant={`${customer && !isEditing ? "default" : "destructive"}`}
              onClick={isEditing ? () => setOpenAlertDialog(true) : onClose}
            >
              {isEditing ? "Excluir" : "Fechar"}
            </Button>
   ```
   por:
   ```tsx
            <Button
              type="button"
              variant={canDelete || !customer ? "destructive" : "default"}
              onClick={canDelete ? () => setOpenAlertDialog(true) : onClose}
            >
              {canDelete ? "Excluir" : "Fechar"}
            </Button>
   ```

- [ ] **Passo 3: Modal de OS**

Em `src/app/components/serviceOrder/serviceorder-modal.tsx`:

1. Acrescente o import `import { useSession } from "next-auth/react";`.
2. Depois de `const [openAlertDialog, setOpenAlertDialog] = useState(false);`, acrescente:
   ```tsx
   const { data: session } = useSession();
   // Excluir é só para admin (a API também recusa com 403)
   const canDelete = isEditing && session?.user.role === "ADMIN";
   ```
3. Troque o botão:
   ```tsx
              <Button
                type="button"
                variant={`${order && !isEditing ? "default" : "destructive"}`}
                onClick={isEditing ? () => setOpenAlertDialog(true) : onClose}
              >
                {isEditing ? "Excluir" : "Fechar"}
              </Button>
   ```
   por:
   ```tsx
              <Button
                type="button"
                variant={canDelete || !order ? "destructive" : "default"}
                onClick={canDelete ? () => setOpenAlertDialog(true) : onClose}
              >
                {canDelete ? "Excluir" : "Fechar"}
              </Button>
   ```

- [ ] **Passo 4: Documentação do front**

Em `CLAUDE.md` do `werk-app`:

1. No fim do parágrafo **Auth (next-auth v4, credentials + JWT).**, acrescente:
   ```markdown
   `authorize` calls `/session` with plain axios (not `api`, whose interceptors are browser-only) and throws the API's `message`, which the login page shows from `result.error`. The JWT and the session carry `role` (`"ADMIN" | "BASICO"`, typed in `src/types/user.ts`) and `mustChangePassword`. `useSession().update({ name?, mustChangePassword? })` changes only those two fields (the `jwt` callback ignores anything else, so the role never comes from the client). The role in the session is only refreshed on login; the API is the source of truth and answers 403 "Acesso negado".
   ```
2. Depois do parágrafo **Single active tab + logout on close**, acrescente:
   ```markdown
   **Roles and password change:**
   - `(auth-routes)/layout.tsx` redirects to `/alterar-senha` when `session.user.mustChangePassword`. `/alterar-senha` lives outside `(auth-routes)` (no sidebar, no TabGuard) and checks `GET /me` on the server, not the session, because the admin can reset a password while the session is open.
   - When the API answers 403, both axios clients call `GET /me`; if `mustChangePassword` is true, the browser client does `window.location.assign("/alterar-senha")` and the server client calls `redirect("/alterar-senha")`.
   - `/usuarios` is admin-only (server redirect to `/` otherwise, and the sidebar item only shows for admins). Creating a user or resetting a password shows `users/temporary-password-dialog.tsx`, which only closes through its button. `/perfil` changes the user's own name and password with `profile/change-password-form.tsx`, shared with `/alterar-senha`.
   - The "Excluir" buttons in the customer and OS modals only render for `role === "ADMIN"`.
   ```
3. Troque a linha **Backend endpoints in use:** por:
   ```markdown
   **Backend endpoints in use:** `/session`, `/me` (GET, PUT), `/me/password`, `/users` (list, create), `/users/:id`, `/users/:id/reset-password`, `/customers` (list, `data.customers`), `/customer` and `/customer/:id` (CRUD), `/os` (list, `data.os`), `/os/:id`, `/os/:id/pdf`, `/os/client/:customerId`.
   ```
4. Troque "**Feature components** live under `src/app/components/{customers,serviceOrder}/`." por "**Feature components** live under `src/app/components/{customers,serviceOrder,users,profile}/`."
5. Troque "`src/components/` currently holds only `sidebar-nav.tsx`, which is the app's navigation and logout." por "`src/components/` currently holds only `sidebar-nav.tsx`, which is the app's navigation (\"Usuários\" only for admins, \"Meu perfil\" for everyone) and logout."

- [ ] **Passo 5: Compilar**

```bash
npm run build   # sem erros
```

- [ ] **Passo 6: Verificar no navegador**

1. Como Ana (Básico): no modal de editar cliente e no de editar OS, aparece "Fechar" e **não** "Excluir". Salvar uma edição continua funcionando. Criar um cliente e uma OS funciona.
2. Como admin: os dois modais mostram "Excluir". Excluir uma OS de teste funciona.
3. Saia e entre de novo como Ana. Na API, desative-a: `req PUT /users/<id da Ana> "$TA" '{"active":false}'` (o id está em `req GET /users "$TA"`). No navegador, recarregue `/`: a API responde 401, e o interceptor leva ao login. Reative-a pela API com `'{"active":true}'`.

- [ ] **Passo 7: Commit**

```bash
git add src/app/components/customers/customer-modal.tsx src/app/components/serviceOrder/serviceorder-modal.tsx CLAUDE.md
git status --short
git commit -F - <<'EOF'
feat(roles): hide delete actions from basic users and document roles
EOF
```

---

## Depois da implementação (não faz parte das tarefas)

- Nenhum `push` foi feito. O deploy segue a spec: **API primeiro, front depois**. Logo depois do deploy, entrar com `admin@werk.com.br`; se a senha ainda for `123456`, o sistema obriga a troca.
- A migration `add_user_roles` roda em produção no deploy da API e promove só o `admin@werk.com.br`. Os outros usuários existentes ficam Básico até o admin promovê-los pela tela.
