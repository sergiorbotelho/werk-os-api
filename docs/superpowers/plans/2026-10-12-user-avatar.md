# Foto de perfil do usuário: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar cada usuário enviar, trocar e remover a própria foto de perfil, exibida no lugar das iniciais no perfil e na lista de usuários, com as iniciais mantidas para quem não tem foto.

**Architecture:** A API guarda a foto (JPEG, PNG ou WebP de até 1 MB, recebida como corpo cru) na tabela `user_avatars` e marca `users.avatarUpdatedAt`. Ela serve a foto em `GET /users/:id/avatar`, sempre autenticada. O front recorta a imagem em 512×512 JPEG no navegador (`react-easy-crop` + `canvas`) e exibe a foto com `<Image unoptimized />`, que aponta para um proxy do Next (`/api/avatar/[id]`). O proxy acrescenta o token da sessão. A URL leva `?v=<avatarUpdatedAt>`, o que permite cache longo sem nunca mostrar uma foto antiga.

**Tech Stack:** API: Express 4.19, TypeScript 5, Prisma 5.16 (PostgreSQL), Zod 4. Front: Next.js 14.2 (App Router), next-auth 4.24, axios, shadcn/ui (Radix Dialog e AlertDialog), react-toastify, `react-easy-crop` (nova).

**Spec:** `docs/superpowers/specs/2026-10-12-user-avatar-design.md`

**Repositórios:**
- API: `D:\Work\apiwerk` (Git Bash: `/d/Work/apiwerk`). Tarefas 1 e 2.
- Front: `D:\Projetos\werk-app` (Git Bash: `/d/Projetos/werk-app`). Tarefas 3 e 4.

## Global Constraints

- Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`. O limite do corpo na API é `1mb`, e a assinatura do arquivo é conferida: JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF` nos bytes 0–3 e `WEBP` nos bytes 8–11.
- O front envia sempre 512×512 `image/jpeg`, qualidade `0.9`, e barra arquivos acima de 10 MB ou de outro tipo.
- `Cache-Control` da foto, na API e no proxy: `private, max-age=31536000, immutable`.
- Mensagens (texto exato):
  - API: "Formato de imagem inválido (use JPEG, PNG ou WebP)", "Imagem muito grande (máx. 1 MB)", "Foto não encontrada", "Foto removida".
  - Front: "Escolha uma imagem JPEG, PNG ou WebP de até 10 MB.", "Foto atualizada.", "Foto removida.", "Erro ao salvar a foto.", "Erro ao remover a foto.".
- Toda mensagem que pode aparecer na tela fica em PT-BR. Identificadores, nomes de campo (`avatarUpdatedAt`), logs e mensagens de commit ficam em inglês.
- API: segue `.claude/rules/arquitetura.md`. Zod v4 (`{ error: "..." }`), controllers sem `try/catch`, `AppError(mensagem, status)` nos services, um controller e um service por caso de uso, arquivos em camelCase no singular.
- API: depois de qualquer mudança em `src/`, rodar `npm run build` e commitar o `dist/` regenerado junto com o código-fonte.
- **`prisma migrate` só roda com `DATABASE_URL` apontando para `localhost:5433`.**
- Front: o `<Image>` de `next/image` sempre leva `unoptimized` quando o `src` é `/api/avatar/...`. A única dependência nova é `react-easy-crop`. Não usar `npx shadcn add`.
- Formatos de resposta existentes não mudam. Só ganham o campo `avatarUpdatedAt` (`string | null`).
- Commits: na branch atual, mensagem Conventional Commits em inglês, **sem** `Co-Authored-By` nem outra linha de atribuição, arquivos adicionados pelo nome e **sem push**.

## Review Focus

1. **PNG com transparência:** o fundo transparente tem que virar branco no JPEG, não preto. O teste está na Tarefa 4, passo 6 (item 4).
2. **Escolher o mesmo arquivo de novo depois de cancelar o recorte:** o modal tem que abrir outra vez (o `input` precisa ser zerado). O teste está na Tarefa 4, passo 6 (item 3).
3. **Foto indisponível** (registro apagado com `avatarUpdatedAt` ainda preenchido, ou sessão expirada): o avatar volta às iniciais, sem ícone de imagem quebrada. O teste está na Tarefa 3, passo 7 (item 4).
4. **UUID válido de usuário inexistente, e `Content-Type` com parâmetro** (`image/jpeg; charset=binary`): o primeiro dá 404, nunca 500; o segundo é aceito. Os testes estão na Tarefa 2, passo 9 (itens 3 e 9).
5. **Trocar o nome depois de enviar a foto:** `PUT /me` mantém `avatarUpdatedAt`, e a foto continua lá. O teste está na Tarefa 2, passo 9 (item 6).

---

## Ambiente de verificação

Nenhum dos dois projetos tem framework de testes, e este plano não cria um. Os "testes" da API são roteiros com `curl` no Git Bash. Os do front são roteiros no navegador, com o Playwright MCP. Cada passo diz o resultado esperado.

**Pasta de arquivos de teste.** Use o diretório de scratchpad da sua sessão, nunca uma pasta do repositório:

```bash
T="<diretório de scratchpad da sessão>/avatar"   # ex.: /c/Users/.../scratchpad/avatar
mkdir -p "$T"
```

**Preparação da API (uma vez por sessão):**

```bash
cd /d/Work/apiwerk
# 1. O banco TEM que ser o local. Deve imprimir: localhost:5433
sed -n 's/^DATABASE_URL=.*@\([^/]*\)\/.*/\1/p' .env
# 2. Docker Desktop aberto, depois:
docker compose up -d
# 3. API em segundo plano (porta 3333). PARE a API antes de `prisma migrate`/`generate`:
#    no Windows o engine do Prisma fica travado (EPERM) com o servidor rodando.
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
# upload TOKEN CONTENT-TYPE ARQUIVO (nome dentro de $T): corpo cru, imprime corpo e status
upload() { (cd "$T" && curl -s -w '\n%{http_code}\n' -X PUT "$API/me/avatar" -H "Authorization: Bearer $1" -H "Content-Type: $2" --data-binary "@$3"); }
# reset_admin SENHA: redefine o admin LOCAL, ativo e sem troca pendente
reset_admin() {
  node -e "
    const b=require('bcryptjs');const p=new (require('@prisma/client').PrismaClient)();
    b.hash(process.argv[1],8)
      .then(h=>p.user.update({where:{email:'admin@werk.com.br'},data:{password:h,mustChangePassword:false,active:true,role:'ADMIN'}}))
      .then(u=>console.log('admin',u.role,'mustChangePassword',u.mustChangePassword))
      .finally(()=>p.\$disconnect())" "$1"
}
```

**Arquivos de teste da API** (só a assinatura importa para a API, que não decodifica a imagem):

```bash
node -e '
const fs=require("fs"),d=process.argv[1],pad=n=>require("crypto").randomBytes(n);
fs.writeFileSync(d+"/ok.jpg",Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),pad(50000)]));
fs.writeFileSync(d+"/ok.png",Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),pad(50000)]));
fs.writeFileSync(d+"/ok.webp",Buffer.concat([Buffer.from("RIFF"),Buffer.alloc(4),Buffer.from("WEBP"),pad(50000)]));
fs.writeFileSync(d+"/fake.jpg","<html>not an image</html>");
fs.writeFileSync(d+"/big.jpg",Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),pad(1100000)]));
' "$T"
ls -l "$T"
```

**Preparação do front:**

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
| `prisma/schema.prisma` | Alterar | `User.avatarUpdatedAt`, relação `avatar` e modelo `UserAvatar` |
| `prisma/migrations/<timestamp>_add_user_avatar/migration.sql` | Criar (gerado) | Tabela `user_avatars` e coluna `users.avatarUpdatedAt` |
| `src/services/user/userSelect.ts` | Alterar | `avatarUpdatedAt` em `profileSelect` |
| `src/schemas/user.ts` | Alterar | `avatarMimeTypes`, `avatarSchema`, `AvatarInput` |
| `src/services/user/uploadAvatarService.ts` | Criar | Upsert da foto e de `avatarUpdatedAt` |
| `src/services/user/deleteAvatarService.ts` | Criar | Remove a foto e zera `avatarUpdatedAt` |
| `src/services/user/getAvatarService.ts` | Criar | Busca a foto ou lança 404 |
| `src/controllers/user/uploadAvatarController.ts` | Criar | `PUT /me/avatar` |
| `src/controllers/user/deleteAvatarController.ts` | Criar | `DELETE /me/avatar` |
| `src/controllers/user/getAvatarController.ts` | Criar | `GET /users/:id/avatar` (binário) |
| `src/routers.ts` | Alterar | Três rotas e `raw()` na rota de upload |
| `src/middlewares/erroHandle.ts` | Alterar | `entity.too.large` → 413 |
| `README.md`, `CLAUDE.md` | Alterar | Endpoints, erros e formatos de resposta |
| `dist/**` | Regenerar | `npm run build` |

**Front (`werk-app`)**

| Arquivo | Ação | Responsabilidade |
| --- | --- | --- |
| `src/types/user.ts` | Alterar | `avatarUpdatedAt` em `User` |
| `src/app/api/avatar/[id]/route.ts` | Criar | Proxy autenticado da foto |
| `src/app/components/user-avatar.tsx` | Criar | Foto ou iniciais |
| `src/app/components/users/user-list.tsx` | Alterar | Usa `UserAvatar` |
| `src/app/components/profile/profile.tsx` | Alterar | Avatar com foto, botão "Alterar foto", "Remover foto" |
| `src/helpers/cropImage.ts` | Criar | Recorte em 512×512 JPEG |
| `src/app/components/profile/avatar-crop-dialog.tsx` | Criar | Modal de recorte |
| `package.json`, `package-lock.json` | Alterar | `react-easy-crop` |

---

### Tarefa 1: Banco: tabela `user_avatars`, coluna `avatarUpdatedAt` e campo no perfil

**Files:**
- Modify: `prisma/schema.prisma` (modelo `User`, e o novo modelo `UserAvatar` logo depois dele)
- Create: `prisma/migrations/<timestamp>_add_user_avatar/migration.sql` (gerado pelo Prisma)
- Modify: `src/services/user/userSelect.ts`
- Regenerate: `dist/`

**Interfaces:**
- Consumes: nada.
- Produces:
  - Modelo Prisma `UserAvatar { userId: string; data: Buffer; mimeType: string; updated_at: Date }`, acessado por `prismaClient.userAvatar`.
  - Campo `User.avatarUpdatedAt: Date | null`.
  - `profileSelect` e `userSelect` passam a incluir `avatarUpdatedAt`. `GET /me`, `PUT /me`, `GET /users` e `PUT /users/:id` devolvem `"avatarUpdatedAt": null | "<ISO>"`.

- [ ] **Passo 1: Conferir o estado antes da mudança**

API rodando (`npm run dev`). Rode os helpers e depois:

```bash
reset_admin Senha123
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
req GET /me "$TOKEN"
```

Esperado: 200, **sem** o campo `avatarUpdatedAt`.

- [ ] **Passo 2: Alterar o schema do Prisma**

Em `prisma/schema.prisma`, no modelo `User`, acrescente as duas linhas antes de `@@map("users")`:

```prisma
model User {
  id String @id @default(uuid())
  name String @db.VarChar(255) 
  email String @db.VarChar(255) @unique
  password String @db.VarChar(255)
  role Role @default(BASICO)
  active Boolean @default(true)
  mustChangePassword Boolean @default(false)
  avatarUpdatedAt DateTime?
  avatar UserAvatar?
  created_at DateTime? @default(now())
  update_at DateTime?  @updatedAt

  @@map("users")
}

// Foto de perfil fora de "users": o isAuthenticated lê o usuário a cada requisição
model UserAvatar {
  userId String @id
  data Bytes
  mimeType String @db.VarChar(20)
  updated_at DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_avatars")
}
```

- [ ] **Passo 3: Gerar e aplicar a migration (banco local)**

**Pare a API** (`npm run dev`) antes. Depois:

```bash
cd /d/Work/apiwerk
sed -n 's/^DATABASE_URL=.*@\([^/]*\)\/.*/\1/p' .env   # TEM que ser localhost:5433
npx prisma migrate dev --name add_user_avatar
cat prisma/migrations/*_add_user_avatar/migration.sql
```

Esperado: o SQL contém só isto, sem `DROP` e sem alterar outras colunas:
- `ALTER TABLE "users" ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);`
- `CREATE TABLE "user_avatars" (... "userId" TEXT NOT NULL, "data" BYTEA NOT NULL, "mimeType" VARCHAR(20) NOT NULL, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "user_avatars_pkey" PRIMARY KEY ("userId"));`
- `ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;`

A coluna nova é nullable e a tabela é nova, então não precisa editar o SQL para incluir `DEFAULT`.

- [ ] **Passo 4: Incluir `avatarUpdatedAt` no perfil**

Em `src/services/user/userSelect.ts`, `profileSelect` fica assim (`userSelect` herda o campo pelo spread):

```ts
// Campos devolvidos em GET /me e PUT /me
export const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  mustChangePassword: true,
  avatarUpdatedAt: true,
} satisfies Prisma.UserSelect;
```

- [ ] **Passo 5: Type-check e build**

```bash
npm run build
```

Esperado: termina sem erros.

- [ ] **Passo 6: Verificar**

Suba a API de novo (`npm run dev`). Com os helpers:

```bash
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
req GET /me "$TOKEN"
req GET /users "$TOKEN"
req PUT /me "$TOKEN" '{"name":"Administrador"}'
```

Esperado: as três respondem 200 e trazem `"avatarUpdatedAt":null` (em `GET /users`, em cada usuário). Nenhuma resposta tem `password`.

- [ ] **Passo 7: Commit**

```bash
git status --short   # confira os arquivos de dist/ alterados
git add -- prisma/schema.prisma prisma/migrations/*_add_user_avatar/migration.sql src/services/user/userSelect.ts dist/src/services/user/userSelect.js
git status --short   # nada de src/ ou dist/ desta tarefa pode ter ficado de fora
git commit -F - <<'EOF'
feat(user): add user avatar table and avatarUpdatedAt to profile
EOF
```

---

### Tarefa 2: Endpoints da foto, erro 413 e documentação da API

**Files:**
- Modify: `src/schemas/user.ts` (final do arquivo)
- Create: `src/services/user/uploadAvatarService.ts`, `src/services/user/deleteAvatarService.ts`, `src/services/user/getAvatarService.ts`
- Create: `src/controllers/user/uploadAvatarController.ts`, `src/controllers/user/deleteAvatarController.ts`, `src/controllers/user/getAvatarController.ts`
- Modify: `src/routers.ts` (import do express, imports dos controllers, rotas `/me/avatar` e `/users/:id/avatar`)
- Modify: `src/middlewares/erroHandle.ts` (ao lado de `entity.parse.failed`)
- Modify: `README.md` (Funcionalidades, Endpoints › Usuários, Erros), `CLAUDE.md` (Controllers and error handling, Services, Response shapes, Data model)
- Regenerate: `dist/`

**Interfaces:**
- Consumes (Tarefa 1): `prismaClient.userAvatar`, `User.avatarUpdatedAt` e `profileSelect`.
- Produces:
  - `export const avatarMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;`
  - `export const avatarSchema` com entrada `{ mimeType: unknown; data: unknown }`, e `export type AvatarInput = { mimeType: "image/jpeg" | "image/png" | "image/webp"; data: Buffer }`.
  - `PUT /me/avatar` (corpo cru) → 200, perfil `{ id, name, email, role, mustChangePassword, avatarUpdatedAt }`.
  - `DELETE /me/avatar` → 200, `{ message: "Foto removida" }`.
  - `GET /users/:id/avatar` → 200 binário, `Content-Type` salvo e `Cache-Control: private, max-age=31536000, immutable`. Também 400 "Id inválido" e 404 "Foto não encontrada".

- [ ] **Passo 1: Schema do upload**

No final de `src/schemas/user.ts`, antes dos `export type`, acrescente:

```ts
export const avatarMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const invalidImageMessage = "Formato de imagem inválido (use JPEG, PNG ou WebP)";

// Os bytes iniciais precisam bater com o tipo declarado: impede servir HTML ou
// SVG disfarçado de imagem.
function matchesSignature(mimeType: (typeof avatarMimeTypes)[number], data: Buffer) {
  // Defensivo: se os campos já falharam, não deixa o refine lançar TypeError (500)
  if (!Buffer.isBuffer(data)) return false;

  switch (mimeType) {
    case "image/jpeg":
      return data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    case "image/png":
      return data
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return (
        data.subarray(0, 4).toString("ascii") === "RIFF" &&
        data.subarray(8, 12).toString("ascii") === "WEBP"
      );
  }
}

// Recebe { mimeType: header Content-Type, data: corpo lido pelo express.raw }.
// Com outro Content-Type o express.raw não lê o corpo, e data não é Buffer.
export const avatarSchema = z
  .object({
    // "image/jpeg; charset=binary" → "image/jpeg"
    mimeType: z.preprocess(
      (value) =>
        typeof value === "string"
          ? value.split(";")[0].trim().toLowerCase()
          : value,
      z.enum(avatarMimeTypes, { error: invalidImageMessage }),
    ),
    data: z
      .instanceof(Buffer, { error: invalidImageMessage })
      .refine((data) => data.length > 0, { error: invalidImageMessage }),
  })
  .refine(({ mimeType, data }) => matchesSignature(mimeType, data), {
    error: invalidImageMessage,
  });
```

E, junto dos outros tipos no final do arquivo:

```ts
export type AvatarInput = z.infer<typeof avatarSchema>;
```

- [ ] **Passo 2: Services**

`src/services/user/uploadAvatarService.ts`:

```ts
import prismaClient from "../../prisma";
import { AvatarInput } from "../../schemas/user";
import { profileSelect } from "./userSelect";

interface UploadAvatarRequest extends AvatarInput {
  userId: string;
}

export class UploadAvatarService {
  async execute({ userId, mimeType, data }: UploadAvatarRequest) {
    // avatarUpdatedAt muda junto com a foto: é a versão usada na URL (?v=)
    const [, user] = await prismaClient.$transaction([
      prismaClient.userAvatar.upsert({
        where: { userId },
        create: { userId, mimeType, data },
        update: { mimeType, data },
      }),
      prismaClient.user.update({
        where: { id: userId },
        data: { avatarUpdatedAt: new Date() },
        select: profileSelect,
      }),
    ]);

    return user;
  }
}
```

`src/services/user/deleteAvatarService.ts`:

```ts
import prismaClient from "../../prisma";

export class DeleteAvatarService {
  async execute(userId: string) {
    // deleteMany: remover sem foto não é erro
    await prismaClient.$transaction([
      prismaClient.userAvatar.deleteMany({ where: { userId } }),
      prismaClient.user.update({
        where: { id: userId },
        data: { avatarUpdatedAt: null },
      }),
    ]);
  }
}
```

`src/services/user/getAvatarService.ts`:

```ts
import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

export class GetAvatarService {
  async execute(userId: string) {
    const avatar = await prismaClient.userAvatar.findUnique({
      where: { userId },
      select: { data: true, mimeType: true },
    });

    if (!avatar) {
      throw new AppError("Foto não encontrada", 404);
    }

    return avatar;
  }
}
```

- [ ] **Passo 3: Controllers**

`src/controllers/user/uploadAvatarController.ts`:

```ts
import { Request, Response } from "express";
import { avatarSchema } from "../../schemas/user";
import { UploadAvatarService } from "../../services/user/uploadAvatarService";

export class UploadAvatarController {
  async handle(req: Request, res: Response) {
    const data = await avatarSchema.parseAsync({
      mimeType: req.headers["content-type"],
      data: req.body,
    });

    const uploadAvatarService = new UploadAvatarService();
    const user = await uploadAvatarService.execute({
      userId: req.user_id,
      ...data,
    });

    return res.status(200).json(user);
  }
}
```

`src/controllers/user/deleteAvatarController.ts`:

```ts
import { Request, Response } from "express";
import { DeleteAvatarService } from "../../services/user/deleteAvatarService";

export class DeleteAvatarController {
  async handle(req: Request, res: Response) {
    const deleteAvatarService = new DeleteAvatarService();
    await deleteAvatarService.execute(req.user_id);

    return res.status(200).json({ message: "Foto removida" });
  }
}
```

`src/controllers/user/getAvatarController.ts`:

```ts
import { Request, Response } from "express";
import { uuidParamSchema } from "../../schemas/common";
import { GetAvatarService } from "../../services/user/getAvatarService";

export class GetAvatarController {
  async handle(req: Request, res: Response) {
    const id = await uuidParamSchema.parseAsync(req.params.id);

    const getAvatarService = new GetAvatarService();
    const avatar = await getAvatarService.execute(id);

    // O front pede a foto com ?v=<avatarUpdatedAt>: foto nova, URL nova
    res.setHeader("Content-Type", avatar.mimeType);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");

    return res.status(200).send(avatar.data);
  }
}
```

- [ ] **Passo 4: Rotas**

Em `src/routers.ts`, troque a primeira linha:

```ts
import { raw, Router } from "express";
```

Acrescente os imports junto dos outros controllers de usuário e do schema:

```ts
import { DeleteAvatarController } from "./controllers/user/deleteAvatarController";
import { GetAvatarController } from "./controllers/user/getAvatarController";
import { UploadAvatarController } from "./controllers/user/uploadAvatarController";
import { avatarMimeTypes } from "./schemas/user";
```

Logo depois do bloco `router.post("/users/:id/reset-password", ...)`, acrescente:

```ts
router.get(
  "/users/:id/avatar",
  isAuthenticated,
  new GetAvatarController().handle,
);
```

Logo depois do bloco `router.put("/me/password", ...)`, acrescente:

```ts
// Corpo cru só nesta rota; o express.json global continua com 100 KB
router.put(
  "/me/avatar",
  isAuthenticated,
  raw({ type: [...avatarMimeTypes], limit: "1mb" }),
  new UploadAvatarController().handle,
);
router.delete("/me/avatar", isAuthenticated, new DeleteAvatarController().handle);
```

- [ ] **Passo 5: Erro 413**

Em `src/middlewares/erroHandle.ts`, logo depois do bloco `entity.parse.failed`:

```ts
  // Corpo acima do limite (lançado pelo body-parser). Só a rota de foto chega
  // perto do limite na prática.
  if ((err as { type?: string }).type === "entity.too.large") {
    return res.status(413).json({ message: "Imagem muito grande (máx. 1 MB)" });
  }
```

- [ ] **Passo 6: Type-check e build**

```bash
npm run build
```

Esperado: termina sem erros. Se `raw` não for reconhecido como export de `express`, use `import express, { Router } from "express";` e `express.raw(...)` na rota.

- [ ] **Passo 7: Documentação**

`README.md`:

Em **Funcionalidades**, logo depois da linha "- Perfil do usuário: alteração do próprio nome e da própria senha …", acrescente:

```markdown
- Foto de perfil: cada usuário envia, troca e remove a própria foto (JPEG, PNG ou WebP de até 1 MB); sem foto, o front mostra as iniciais
```

Na tabela **Endpoints › Usuários**, depois da linha de `PUT /me/password`, acrescente:

```markdown
| PUT    | `/me/avatar`                 | logado | Envia ou troca a própria foto. Corpo cru com `Content-Type` `image/jpeg`, `image/png` ou `image/webp`, até 1 MB. Devolve o perfil com `avatarUpdatedAt` |
| DELETE | `/me/avatar`                 | logado | Remove a própria foto |
```

E, depois da linha de `POST /users/:id/reset-password`:

```markdown
| GET    | `/users/:id/avatar`          | logado | Foto do usuário (binário, com cache longo; o cliente versiona a URL com `?v=<avatarUpdatedAt>`). 404 se ele não tiver foto |
```

Na tabela **Erros**, entre as linhas 409 e 500:

```markdown
| 413    | Foto acima de 1 MB |
```

E, na linha 400, troque "Corpo ou id inválido, JSON malformado ou regra de negócio violada" por "Corpo ou id inválido, JSON malformado, imagem em formato inválido ou regra de negócio violada".

`CLAUDE.md`:

Na lista do `errorHandler` (seção "Controllers and error handling"), depois de "- malformed JSON body → 400", acrescente:

```markdown
- body over the parser limit (`entity.too.large`) → 413 "Imagem muito grande (máx. 1 MB)"
```

Na seção **Services**, ao final da lista "Business rules in services", acrescente:

```markdown
- Any user can upload (`PUT /me/avatar`) or remove (`DELETE /me/avatar`) only their own profile photo. The upload is a raw body parsed by `raw()` on that route alone (JPEG, PNG or WebP, 1 MB); `avatarSchema` checks the file signature, not just the `Content-Type`. The bytes go to `UserAvatar` and `User.avatarUpdatedAt` is set in the same transaction.
```

Na tabela **Response shapes**, troque a linha de `GET /me`, `PUT /me` por:

```markdown
| `GET /me`, `PUT /me`, `PUT /me/avatar` | `{ id, name, email, role, mustChangePassword, avatarUpdatedAt }` |
```

E acrescente, antes da linha de `DELETE` routes:

```markdown
| `GET /users/:id/avatar` | the photo bytes with the stored `Content-Type` and `Cache-Control: private, max-age=31536000, immutable`; 404 if the user has no photo |
```

Na seção **Data model**, depois do item de `User.role`, acrescente:

```markdown
- `User.avatarUpdatedAt` is `null` when the user has no photo, and it is the cache version the front puts in the photo URL. The bytes live in `UserAvatar` (`user_avatars`, 1:1 by `userId`, cascade delete), kept out of `users` because `isAuthenticated` reads the user on every request.
```

- [ ] **Passo 8: Reiniciar a API**

Reinicie o `npm run dev` para carregar as rotas novas.

- [ ] **Passo 9: Verificar**

Helpers e arquivos de teste (seção "Ambiente de verificação") já carregados:

```bash
reset_admin Senha123
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
ADMIN_ID=$(req GET /me "$TOKEN" | head -1 | json .id)
```

1. **Upload dos três formatos:**
   ```bash
   upload "$TOKEN" image/png ok.png
   upload "$TOKEN" image/webp ok.webp
   upload "$TOKEN" image/jpeg ok.jpg
   ```
   Esperado: 200 nas três, com perfil sem `password` e `avatarUpdatedAt` preenchido e diferente a cada envio.

2. **Download idêntico e headers:**
   ```bash
   (cd "$T" && curl -s "$API/users/$ADMIN_ID/avatar" -H "Authorization: Bearer $TOKEN" -o out.jpg -D headers.txt)
   (cd "$T" && cmp ok.jpg out.jpg && echo IDENTICAL; grep -i "content-type\|cache-control" headers.txt)
   ```
   Esperado: `IDENTICAL`, `Content-Type: image/jpeg` e `Cache-Control: private, max-age=31536000, immutable`.

3. **`Content-Type` com parâmetro:**
   ```bash
   upload "$TOKEN" "image/jpeg; charset=binary" ok.jpg
   ```
   Esperado: 200.

4. **Formato inválido:**
   ```bash
   upload "$TOKEN" image/jpeg fake.jpg
   upload "$TOKEN" image/png ok.jpg
   upload "$TOKEN" image/gif ok.jpg
   (cd "$T" && curl -s -w '\n%{http_code}\n' -X PUT "$API/me/avatar" -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/jpeg")
   ```
   Esperado: 400 `{"message":"Formato de imagem inválido (use JPEG, PNG ou WebP)"}` nas quatro chamadas (assinatura falsa, assinatura de outro tipo, tipo não aceito e corpo vazio).

5. **Acima de 1 MB:**
   ```bash
   upload "$TOKEN" image/jpeg big.jpg
   ```
   Esperado: 413 `{"message":"Imagem muito grande (máx. 1 MB)"}`.

6. **Trocar o nome mantém a foto:**
   ```bash
   req PUT /me "$TOKEN" '{"name":"Administrador"}'
   ```
   Esperado: 200, com `avatarUpdatedAt` preenchido.

7. **Sem token e id inválido:**
   ```bash
   curl -s -w '\n%{http_code}\n' "$API/users/$ADMIN_ID/avatar"
   req GET /users/abc/avatar "$TOKEN"
   ```
   Esperado: 401 `{"message":"Não autorizado"}` e 400 `{"message":"Id inválido"}`.

8. **Usuário Básico: troca pendente, depois foto própria e foto de outro:**
   ```bash
   EMAIL="foto.$(date +%s)@werk.com.br"
   TEMP=$(req POST /users "$TOKEN" "{\"name\":\"Foto Teste\",\"email\":\"$EMAIL\",\"role\":\"BASICO\"}" | head -1 | json .temporaryPassword)
   T2=$(login "$EMAIL" "$TEMP" | json .token)
   upload "$T2" image/jpeg ok.jpg                                   # 403 "Troca de senha obrigatória"
   req PUT /me/password "$T2" "{\"currentPassword\":\"$TEMP\",\"newPassword\":\"Senha1234\"}"
   T2=$(login "$EMAIL" Senha1234 | json .token)
   upload "$T2" image/png ok.png                                    # 200
   curl -s -o /dev/null -w '%{http_code}\n' "$API/users/$ADMIN_ID/avatar" -H "Authorization: Bearer $T2"   # 200
   ```
   Esperado: 403, depois 200 na troca de senha, 200 no upload do Básico e 200 ao ver a foto do admin.

9. **Remover (idempotente), usuário sem foto e UUID inexistente:**
   ```bash
   req DELETE /me/avatar "$TOKEN"
   req DELETE /me/avatar "$TOKEN"
   req GET /me "$TOKEN"
   req GET "/users/$ADMIN_ID/avatar" "$TOKEN"
   req GET /users/00000000-0000-4000-8000-000000000000/avatar "$TOKEN"
   ```
   Esperado: 200 `{"message":"Foto removida"}` duas vezes, `GET /me` com `"avatarUpdatedAt":null`, e 404 `{"message":"Foto não encontrada"}` nas duas últimas chamadas (nunca 500).

10. **Lista de usuários:**
    ```bash
    req GET /users "$TOKEN"
    ```
    Esperado: 200. O usuário "Foto Teste" tem `avatarUpdatedAt` preenchido e o admin tem `null`. Nenhum usuário traz `password` nem os bytes da foto.

- [ ] **Passo 10: Commit**

```bash
git status --short
git add -- src/schemas/user.ts src/services/user/uploadAvatarService.ts src/services/user/deleteAvatarService.ts src/services/user/getAvatarService.ts src/controllers/user/uploadAvatarController.ts src/controllers/user/deleteAvatarController.ts src/controllers/user/getAvatarController.ts src/routers.ts src/middlewares/erroHandle.ts README.md CLAUDE.md dist/src/schemas/user.js dist/src/services/user/uploadAvatarService.js dist/src/services/user/deleteAvatarService.js dist/src/services/user/getAvatarService.js dist/src/controllers/user/uploadAvatarController.js dist/src/controllers/user/deleteAvatarController.js dist/src/controllers/user/getAvatarController.js dist/src/routers.js dist/src/middlewares/erroHandle.js
git status --short   # nada de src/ ou dist/ desta tarefa pode ter ficado de fora
git commit -F - <<'EOF'
feat(user): add profile photo upload, download and removal

PUT /me/avatar takes a raw JPEG, PNG or WebP body up to 1 MB and checks
the file signature. GET /users/:id/avatar serves the photo with a long
private cache, versioned by avatarUpdatedAt. Oversized bodies now map
to 413.
EOF
```

---

### Tarefa 3: Front: proxy da foto e avatar com foto no perfil e na lista

**Files:**
- Modify: `src/types/user.ts`
- Create: `src/app/api/avatar/[id]/route.ts`
- Create: `src/app/components/user-avatar.tsx`
- Modify: `src/app/components/users/user-list.tsx` (imports, função `UserAvatar` local e seus dois usos)
- Modify: `src/app/components/profile/profile.tsx` (prop `me` e o avatar do `<header>`)

**Interfaces:**
- Consumes (Tarefas 1 e 2): `GET /me` e `GET /users` com `avatarUpdatedAt: string | null`, e `GET /users/:id/avatar`.
- Produces:
  - `User.avatarUpdatedAt: string | null`.
  - Rota `GET /api/avatar/[id]` do Next: bytes da foto, ou 401/403/404 sem corpo.
  - `export function UserAvatar(props: { id: string; name: string; avatarUpdatedAt: string | null; className?: string; fallbackClassName?: string })` em `@/app/components/user-avatar`.
  - Em `profile.tsx`: o estado `avatarUpdatedAt` / `setAvatarUpdatedAt`, que a Tarefa 4 usa.

- [ ] **Passo 1: Tipo**

Em `src/types/user.ts`, na interface `User`, depois de `mustChangePassword: boolean;`:

```ts
  avatarUpdatedAt: string | null;
```

- [ ] **Passo 2: Proxy**

`src/app/api/avatar/[id]/route.ts`:

```ts
import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";

// <img> não envia o header Authorization: a rota busca a foto na API com o
// token da sessão (cookie) e repassa os bytes.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  const token = session?.user?.token;

  if (!token) {
    return new Response(null, { status: 401 });
  }

  const response = await fetch(
    new URL(
      `users/${encodeURIComponent(params.id)}/avatar`,
      process.env.NEXT_PUBLIC_API,
    ),
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );

  if (!response.ok) {
    return new Response(null, { status: response.status });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/octet-stream",
      // A URL leva ?v=<avatarUpdatedAt>, então pode ficar em cache por um ano.
      // private: a CDN da Vercel não guarda a foto.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
```

- [ ] **Passo 3: Componente `UserAvatar`**

`src/app/components/user-avatar.tsx`:

```tsx
"use client";

import { initials } from "@/helpers/initials";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

interface UserAvatarProps {
  id: string;
  name: string;
  avatarUpdatedAt: string | null;
  // Tamanho, anel, sombra e tipografia das iniciais
  className?: string;
  // Fundo e cor do texto das iniciais (só sem foto)
  fallbackClassName?: string;
}

// Foto do usuário ou, sem foto, as iniciais.
// unoptimized: o navegador busca /api/avatar direto, com o cookie da sessão.
// Pelo otimizador do Next, a busca sairia do servidor, sem o cookie (401).
export function UserAvatar({
  id,
  name,
  avatarUpdatedAt,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  // Foto nova: tenta carregar de novo
  useEffect(() => {
    setFailed(false);
  }, [avatarUpdatedAt]);

  const showPhoto = Boolean(avatarUpdatedAt) && !failed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        className,
        showPhoto ? "bg-muted" : fallbackClassName,
      )}
    >
      {showPhoto ? (
        <Image
          unoptimized
          fill
          src={`/api/avatar/${id}?v=${encodeURIComponent(avatarUpdatedAt)}`}
          alt={`Foto de ${name}`}
          sizes="128px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </div>
  );
}
```

- [ ] **Passo 4: Lista de usuários**

Em `src/app/components/users/user-list.tsx`:

Troque o import `import { initials } from "@/helpers/initials";` por:

```ts
import { UserAvatar } from "@/app/components/user-avatar";
```

Substitua a função local `UserAvatar` inteira (comentário "A cor das iniciais indica o perfil…" incluído) por:

```tsx
// Sem foto, a cor das iniciais indica o perfil; inativo fica neutro
function UserListAvatar({
  user,
  size = "md",
}: {
  user: User;
  size?: "md" | "lg";
}) {
  return (
    <UserAvatar
      id={user.id}
      name={user.name}
      avatarUpdatedAt={user.avatarUpdatedAt}
      className={cn(
        "font-bold tracking-tight",
        size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm",
      )}
      fallbackClassName={
        !user.active
          ? "bg-muted text-muted-foreground"
          : user.role === "ADMIN"
            ? "bg-primary text-primary-foreground"
            : "bg-accent text-accent-foreground"
      }
    />
  );
}
```

Troque os dois usos: `<UserAvatar user={user} />` por `<UserListAvatar user={user} />`, e `<UserAvatar user={user} size="lg" />` por `<UserListAvatar user={user} size="lg" />`.

- [ ] **Passo 5: Perfil (só exibição)**

Em `src/app/components/profile/profile.tsx`:

Troque o import `import { initials } from "@/helpers/initials";` por:

```ts
import { UserAvatar } from "@/app/components/user-avatar";
```

Na interface `ProfileProps`, acrescente `avatarUpdatedAt: string | null;` em `me`:

```ts
interface ProfileProps {
  me: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUpdatedAt: string | null;
  };
}
```

Logo depois de `const [displayName, setDisplayName] = useState(me.name);`:

```ts
  const [avatarUpdatedAt, setAvatarUpdatedAt] = useState(me.avatarUpdatedAt);
```

No `<header>`, troque o comentário e o `<div>` das iniciais:

```tsx
        {/* Identidade: as iniciais sobrepõem a borda da capa */}
        <header className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-accent text-3xl font-black tracking-tight text-accent-foreground shadow-glow ring-[6px] ring-background sm:h-32 sm:w-32 sm:text-4xl">
            {initials(displayName)}
          </div>
```

por:

```tsx
        {/* Identidade: o avatar sobrepõe a borda da capa */}
        <header className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <UserAvatar
            id={me.id}
            name={displayName}
            avatarUpdatedAt={avatarUpdatedAt}
            className="h-24 w-24 text-3xl font-black tracking-tight shadow-glow ring-[6px] ring-background sm:h-32 sm:w-32 sm:text-4xl"
            fallbackClassName="bg-accent text-accent-foreground"
          />
```

O `setAvatarUpdatedAt` fica sem uso até a Tarefa 4. Isso é esperado; o build não falha por isso.

- [ ] **Passo 6: Build**

```bash
cd /d/Projetos/werk-app
npm run build
```

Esperado: termina sem erros de tipo.

- [ ] **Passo 7: Verificar no navegador**

API (com as Tarefas 1 e 2) e front (`npm run dev`) rodando, sempre contra a API local. Prepare uma foto real para o admin pela API. Use `D:\Projetos\werk-app\public\logo.jpeg`, que é um JPEG de verdade:

```bash
cd /d/Work/apiwerk   # helpers carregados
cp /d/Projetos/werk-app/public/logo.jpeg "$T/logo.jpeg"
reset_admin Senha123
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
ADMIN_ID=$(req GET /me "$TOKEN" | head -1 | json .id)
upload "$TOKEN" image/jpeg logo.jpeg   # 200
```

Com o Playwright MCP:

1. **Perfil com foto:** faça login em `http://localhost:3000/login` com `admin@werk.com.br` / `Senha123` e abra `/perfil`. Esperado: o avatar grande mostra a logo (um `img` com `alt="Foto de Administrador"`), redonda e com o anel. Com `browser_evaluate`, `document.querySelector('img[alt^="Foto de"]').src` contém `/api/avatar/<ADMIN_ID>?v=` e `naturalWidth > 0`.
2. **Lista com foto e com iniciais:** abra `/usuarios`. Esperado: a linha do admin mostra a foto, o usuário "Foto Teste" da Tarefa 2 mostra a foto dele (a imagem de bytes aleatórios não decodifica, então o avatar volta às **iniciais**, sem ícone quebrado, o que já cobre o caso de falha) e os demais usuários mostram as iniciais com as cores de antes. Reduza a janela para 390 px de largura (`browser_resize`): os cartões mostram o mesmo.
3. **Proxy sem sessão:**
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000/api/avatar/$ADMIN_ID"
   ```
   Esperado: 401.
4. **Foto indisponível volta às iniciais** (Review Focus 3): apague só o registro da foto e mude `avatarUpdatedAt` para uma data nova. Assim a URL muda, o navegador não usa o cache e a API responde 404:
   ```bash
   node -e "const p=new (require('@prisma/client').PrismaClient)();p.userAvatar.delete({where:{userId:process.argv[1]}}).then(()=>p.user.update({where:{id:process.argv[1]},data:{avatarUpdatedAt:new Date()}})).then(()=>console.log('photo row deleted, avatarUpdatedAt bumped')).finally(()=>p.\$disconnect())" "$ADMIN_ID"
   ```
   Recarregue `/perfil`. Esperado: o avatar mostra "A" (iniciais de "Administrador") com o fundo `accent`, sem ícone de imagem quebrada. Na lista de rede (`browser_network_requests`), `/api/avatar/<ADMIN_ID>?v=...` respondeu 404. Volte ao estado limpo com `req DELETE /me/avatar "$TOKEN"`.
5. **Sem foto:** com `avatarUpdatedAt` nulo, `/perfil` e `/usuarios` ficam idênticos ao que eram antes desta tarefa.

- [ ] **Passo 8: Commit**

```bash
cd /d/Projetos/werk-app
git status --short
git add -- src/types/user.ts "src/app/api/avatar/[id]/route.ts" src/app/components/user-avatar.tsx src/app/components/users/user-list.tsx src/app/components/profile/profile.tsx
git commit -F - <<'EOF'
feat(profile): show user photo in place of initials

Photos load through an authenticated Next route (/api/avatar/[id]) with
next/image unoptimized, so the browser sends the session cookie. Users
without a photo, or whose photo fails to load, keep the initials.
EOF
```

---

### Tarefa 4: Front: enviar, recortar e remover a foto no perfil

**Files:**
- Modify: `package.json`, `package-lock.json` (`react-easy-crop`)
- Create: `src/helpers/cropImage.ts`
- Create: `src/app/components/profile/avatar-crop-dialog.tsx`
- Modify: `src/app/components/profile/profile.tsx` (imports, estados, handlers, `<header>` e o `ConfirmationDialog` no final)

**Interfaces:**
- Consumes: `PUT /me/avatar`, que devolve o perfil com `avatarUpdatedAt`; `DELETE /me/avatar`; e, da Tarefa 3, `UserAvatar` e o estado `avatarUpdatedAt` / `setAvatarUpdatedAt` em `profile.tsx`.
- Produces:
  - `export async function cropToAvatar(src: string, area: Area): Promise<Blob>` em `@/helpers/cropImage`.
  - `export function AvatarCropDialog(props: { imageSrc: string | null; saving: boolean; onCancel: () => void; onSave: (area: Area) => void })` em `@/app/components/profile/avatar-crop-dialog`.

- [ ] **Passo 1: Dependência**

```bash
cd /d/Projetos/werk-app
npm install react-easy-crop
```

Esperado: `react-easy-crop` aparece em `dependencies` no `package.json`.

- [ ] **Passo 2: Helper de recorte**

`src/helpers/cropImage.ts`:

```ts
import type { Area } from "react-easy-crop";

const AVATAR_SIZE = 512;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar a imagem"));
    image.src = src;
  });
}

// Desenha a área recortada (em pixels da imagem original) num quadrado de
// 512×512 e devolve um JPEG. A API aceita até 1 MB; com 512×512 fica bem abaixo.
export async function cropToAvatar(src: string, area: Area): Promise<Blob> {
  const image = await loadImage(src);

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas indisponível");
  }

  // JPEG não tem transparência: sem fundo, o transparente de um PNG vira preto
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem")),
      "image/jpeg",
      0.9,
    );
  });
}
```

- [ ] **Passo 3: Modal de recorte**

`src/app/components/profile/avatar-crop-dialog.tsx`:

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
import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

interface AvatarCropDialogProps {
  // Object URL do arquivo escolhido; null fecha o modal
  imageSrc: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (area: Area) => void;
}

// O pai monta com key={imageSrc}: cada arquivo começa sem zoom e centralizado
export function AvatarCropDialog({
  imageSrc,
  saving,
  onCancel,
  onSave,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  return (
    <Dialog
      open={imageSrc !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
          <DialogDescription>
            Arraste para enquadrar e use o controle para aproximar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>

        <label className="grid gap-2 text-sm font-medium text-foreground">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="accent-primary"
          />
        </label>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={() => area && onSave(area)}
            disabled={saving || !area}
          >
            {saving ? "Salvando..." : "Salvar foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Passo 4: Perfil: enviar e remover**

Em `src/app/components/profile/profile.tsx`:

Imports. Acrescente aos existentes (e troque o import do lucide e o do React):

```ts
import { ConfirmationDialog } from "@/app/components/confirmation-modal";
import { cropToAvatar } from "@/helpers/cropImage";
import { Camera, Mail, ShieldCheck, UserRound } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { AvatarCropDialog } from "./avatar-crop-dialog";
```

Constantes, logo depois de `type FormData = z.infer<typeof schema>;`:

```ts
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
```

Estados, logo depois de `const [avatarUpdatedAt, setAvatarUpdatedAt] = useState(me.avatarUpdatedAt);`:

```ts
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
```

Handlers, logo depois de `onSubmit`:

```ts
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Zera o input: escolher o mesmo arquivo de novo dispara onChange
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_SIZE) {
      toast.error("Escolha uma imagem JPEG, PNG ou WebP de até 10 MB.");
      return;
    }

    setCropSrc(URL.createObjectURL(file));
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleSavePhoto = async (area: Area) => {
    if (!cropSrc) return;
    setSavingPhoto(true);
    try {
      const blob = await cropToAvatar(cropSrc, area);
      const { data } = await api.put("/me/avatar", blob, {
        headers: { "Content-Type": "image/jpeg" },
      });
      setAvatarUpdatedAt(data.avatarUpdatedAt);
      closeCrop();
      router.refresh();
      toast.success("Foto atualizada.");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message ?? "Erro ao salvar a foto.");
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setRemovingPhoto(true);
    try {
      await api.delete("/me/avatar");
      setAvatarUpdatedAt(null);
      setConfirmRemovePhoto(false);
      router.refresh();
      toast.success("Foto removida.");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message ?? "Erro ao remover a foto.");
    } finally {
      setRemovingPhoto(false);
    }
  };
```

No `<header>`, envolva o `UserAvatar` (da Tarefa 3) com o botão da câmera e o input:

```tsx
          <div className="relative w-fit shrink-0">
            <UserAvatar
              id={me.id}
              name={displayName}
              avatarUpdatedAt={avatarUpdatedAt}
              className="h-24 w-24 text-3xl font-black tracking-tight shadow-glow ring-[6px] ring-background sm:h-32 sm:w-32 sm:text-4xl"
              fallbackClassName="bg-accent text-accent-foreground"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Alterar foto"
              title="Alterar foto"
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-ring sm:h-10 sm:w-10"
            >
              <Camera className="h-4 w-4" aria-hidden />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
```

Ainda no `<header>`, dentro do `<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">`, depois do `<span>` do perfil (`roleLabels[me.role]`):

```tsx
              {avatarUpdatedAt && (
                <button
                  type="button"
                  onClick={() => setConfirmRemovePhoto(true)}
                  className="font-medium underline-offset-4 hover:text-destructive hover:underline"
                >
                  Remover foto
                </button>
              )}
```

No final do componente, logo antes do `</div>` mais externo (o de `className="w-full pb-12"`):

```tsx
      <AvatarCropDialog
        key={cropSrc ?? "closed"}
        imageSrc={cropSrc}
        saving={savingPhoto}
        onCancel={closeCrop}
        onSave={handleSavePhoto}
      />
      <ConfirmationDialog
        title="Remover foto de perfil?"
        description="Seu avatar volta a mostrar as iniciais do seu nome."
        loading={removingPhoto}
        loadingText="Removendo..."
        openAlertDialog={confirmRemovePhoto}
        setOpenAlertDialog={setConfirmRemovePhoto}
        handleExcluir={handleRemovePhoto}
      />
```

- [ ] **Passo 5: Build**

```bash
npm run build
```

Esperado: termina sem erros de tipo.

- [ ] **Passo 6: Verificar no navegador**

API e front rodando, contra a API local, com o admin sem foto (`req DELETE /me/avatar "$TOKEN"`). Crie os arquivos de teste do navegador no `$T` (a pasta do scratchpad):

```bash
cp /d/Projetos/werk-app/public/logo.jpeg "$T/logo.jpeg"
node -e '
const fs=require("fs"),zlib=require("zlib"),d=process.argv[1];
// PNG 64x64 totalmente transparente (RGBA zerado)
function crc32(b){let c=~0;for(const x of b){c^=x;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return ~c>>>0;}
function chunk(t,data){const l=Buffer.alloc(4);l.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(t),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([l,td,c]);}
const w=64,h=64,ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(Buffer.alloc((w*4+1)*h))),chunk("IEND",Buffer.alloc(0))]);
fs.writeFileSync(d+"/transparent.png",png);
fs.writeFileSync(d+"/doc.pdf","%PDF-1.4 not an image");
fs.writeFileSync(d+"/huge.jpg",Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(11*1024*1024)]));
' "$T"
```

No `browser_file_upload`, use os caminhos Windows absolutos desses arquivos (ex.: `C:\Users\...\scratchpad\avatar\logo.jpeg`).

Com o Playwright MCP, logado como admin em `/perfil`:

1. **Enviar:** clique em "Alterar foto" e envie `logo.jpeg`. Esperado: o modal "Ajustar foto" abre com a imagem e a máscara redonda. Arraste a imagem, mova o slider de zoom e clique em "Salvar foto". O botão mostra "Salvando...", o modal fecha, aparece o toast "Foto atualizada." e o avatar mostra a foto. Com `browser_evaluate`, o `img[alt^="Foto de"]` tem `naturalWidth === 512` e `naturalHeight === 512`. Guarde o `src`.
2. **Trocar:** envie `logo.jpeg` de novo, com outro zoom, e salve. Esperado: o `src` do `img` tem um `?v=` diferente do anterior, e a foto nova aparece sem recarregar a página.
3. **Cancelar e escolher o mesmo arquivo** (Review Focus 2): clique em "Alterar foto", envie `logo.jpeg` e clique em "Cancelar". Repita com o **mesmo** `logo.jpeg`. Esperado: o modal abre de novo, e a foto atual não muda.
4. **PNG transparente** (Review Focus 1): envie `transparent.png` e salve. Esperado: o avatar fica branco, não preto. Com `browser_evaluate`:
   ```js
   (() => { const img = document.querySelector('img[alt^="Foto de"]'); const c = document.createElement("canvas"); c.width = c.height = 1; const ctx = c.getContext("2d"); ctx.drawImage(img, 256, 256, 1, 1, 0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data); })()
   ```
   O resultado é próximo de `[255, 255, 255, 255]`.
5. **Arquivo inválido:** envie `doc.pdf` e depois `huge.jpg`. Esperado: nas duas vezes aparece o toast "Escolha uma imagem JPEG, PNG ou WebP de até 10 MB." e o modal não abre. (O `accept` do input não impede o Playwright de enviar um PDF, e por isso a validação no front é testada aqui.)
6. **Lista:** envie `logo.jpeg` de novo e abra `/usuarios`. Esperado: a linha do admin mostra a foto nova.
7. **Remover:** volte a `/perfil` e clique em "Remover foto". Esperado: abre "Remover foto de perfil?". Clique em "Sim": o botão mostra "Removendo...", aparece o toast "Foto removida.", o avatar volta a "A" com o fundo `accent` e o link "Remover foto" some. Em `/usuarios`, o admin volta às iniciais.
8. **Celular:** com `browser_resize` em 390×844, o botão da câmera fica no canto do avatar, sem cobrir o nome, e o modal de recorte cabe na tela.

- [ ] **Passo 7: Commit**

```bash
git status --short
git add -- package.json package-lock.json src/helpers/cropImage.ts src/app/components/profile/avatar-crop-dialog.tsx src/app/components/profile/profile.tsx
git commit -F - <<'EOF'
feat(profile): upload, crop and remove the profile photo

The photo is cropped in the browser with react-easy-crop and sent as a
512x512 JPEG to PUT /me/avatar. Transparent areas become white.
EOF
```

---

## Depois do deploy

A API vai primeiro: a migration roda no `vercel-build` e só cria a tabela e a coluna. Com a API publicada e antes do front, confira em produção que a Vercel entrega o corpo cru ao `raw()` (o JSON já funciona, mas o upload binário é novo ali):

```bash
API=https://werk-os-api.vercel.app
# login com um usuário real, depois:
upload "$TOKEN" image/jpeg logo.jpeg       # 200 com avatarUpdatedAt
req DELETE /me/avatar "$TOKEN"             # 200
```

Se o upload falhar só em produção, pare antes de publicar o front e investigue.
