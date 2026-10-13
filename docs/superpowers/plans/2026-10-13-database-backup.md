# Backup e restauração do banco: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao admin uma área para gerar e baixar um backup completo do banco (`.json.gz`) e para restaurar o banco a partir desse arquivo, com validação total antes de apagar qualquer dado e transação única na escrita.

**Architecture:** A API (serverless na Vercel, sem `pg_dump`) lê `users`, `user_avatars`, `clients` e `os` com o Prisma e devolve um JSON com versão de formato, compactado com o `zlib` nativo. O restore recebe o arquivo como corpo cru e valida assinatura gzip, tamanho descompactado, schema Zod e integridade. Depois faz `TRUNCATE` + `createMany` em lotes + `setval` numa única `$transaction`. A tabela `backup_logs` registra cada backup e restauração para o lembrete da tela. O front (Next) ganha a rota `/backup`, só para admin, com prévia local do arquivo (`DecompressionStream`), confirmação digitada e backup automático do estado atual antes de restaurar.

**Tech Stack:** API: Express 4.19, TypeScript 5, Prisma 5.16 (PostgreSQL), Zod 4, `zlib` do Node. Front: Next.js 14.2 (App Router), next-auth 4.24, axios, shadcn/ui (Card, AlertDialog, Input, Label), react-toastify, lucide-react. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-10-13-database-backup-design.md`

**Repositórios:**
- API: `D:\Work\apiwerk` (Git Bash: `/d/Work/apiwerk`). Tarefas 1, 2 e 3.
- Front: `D:\Projetos\werk-app` (Git Bash: `/d/Projetos/werk-app`). Tarefas 4 e 5.

## Global Constraints

- Limite do arquivo compactado: `4 * 1024 * 1024` bytes (4 MiB), na API (`raw()` do restore e na geração) e no front. Aviso no front acima de `3.5 * 1024 * 1024` bytes.
- Limite descompactado no restore: `64 * 1024 * 1024` bytes (`maxOutputLength`).
- Formato: `{ format: "werk-backup", version: 1, createdAt, createdBy, migration, data: { users, userAvatars, clients, os } }`. Datas em ISO, `Decimal` como string, `UserAvatar.data` em base64.
- Nome do arquivo: `werk-backup-AAAA-MM-DD-HHmm.json.gz`, com a hora de America/Recife (UTC-3 fixo, sem horário de verão). O backup automático antes do restore leva o sufixo `-antes-da-restauracao` antes de `.json.gz`.
- Rotas, todas com `isAuthenticated` + `requireAdmin`: `GET /backup/status`, `POST /backup`, `POST /backup/restore`.
- Lembrete: alerta quando não há backup ou o último tem mais de **7 dias**.
- Mensagens (texto exato):
  - API: "Arquivo inválido: envie um backup .json.gz gerado pelo sistema", "Versão de backup não suportada", "Backup inválido: campo <caminho> fora do formato esperado", "Backup inconsistente: registros duplicados em <tabela>" (`usuários`, `fotos`, `clientes`, `ordens de serviço`), "Backup inconsistente: registro relacionado não encontrado", "O backup não tem nenhum administrador ativo", "Backup maior que o limite de 4 MB. Use o procedimento manual do README.", "Arquivo muito grande (máx. 4 MB)", "Backup restaurado". Mantida: "Imagem muito grande (máx. 1 MB)".
  - Front: "Backup gerado.", "O backup está perto do limite de 4 MB para restauração pela tela.", "Erro ao gerar o backup.", "Arquivo muito grande (máx. 4 MB).", "Arquivo inválido: escolha um backup .json.gz gerado pelo sistema.", "Versão de backup não suportada.", "Restauração concluída. Entre novamente.", "Erro ao restaurar o backup.", "Nenhum backup feito ainda", "Guarde o arquivo em local seguro: ele contém dados de clientes e senhas criptografadas.", "Digite RESTAURAR para confirmar".
- Toda mensagem que pode aparecer na tela fica em PT-BR. Identificadores, logs e mensagens de commit ficam em inglês.
- API: segue `.claude/rules/arquitetura.md`. Zod v4 (`{ error: "..." }`), controllers sem `try/catch`, `AppError(mensagem, status)` nos services, um controller e um service por caso de uso, arquivos em camelCase no singular.
- API: depois de qualquer mudança em `src/`, rodar `npm run build` e commitar o `dist/` regenerado junto com o código-fonte.
- **`prisma migrate` e todos os testes da API só rodam com `DATABASE_URL` apontando para `localhost:5433`.** O restore apaga o banco inteiro.
- Front: **não rodar `next build` com o `npm run dev` ligado** (sobrescreve `.next` e derruba o dev server). O type-check é `npx tsc --noEmit`. Não usar `npx shadcn add`.
- Formatos de resposta existentes não mudam.
- Commits: na branch atual, mensagem Conventional Commits em inglês, **sem** `Co-Authored-By` nem outra linha de atribuição, arquivos adicionados pelo nome e **sem push**.

## Review Focus

1. **Admin que restaura um backup no qual ele não existe:** o restore responde 200, e a próxima requisição dele dá 401, nunca 500. O teste está na Tarefa 3, passo 8 (item 7).
2. **Backup sem nenhum cliente ou OS:** depois do restore, o próximo cliente criado recebe id 1 (`setval` com `is_called = false`), sem 409. O teste está na Tarefa 3, passo 8 (item 6).
3. **Restaurar o mesmo arquivo duas vezes seguidas:** as duas respondem 200 e o banco fica idêntico (mesmo `snapshot`). O teste está na Tarefa 3, passo 8 (item 2).
4. **Escolher o mesmo arquivo de novo depois de cancelar o dialog:** o dialog reabre (o `input` é zerado). O teste está na Tarefa 5, passo 6 (item 4).
5. **Arquivo `.gz` que o Windows rotula como `application/x-gzip` ou sem tipo:** é aceito, porque o front sempre envia `Content-Type: application/gzip` e a API aceita os dois tipos. O teste da API está na Tarefa 3, passo 8 (item 3).

---

## Ambiente de verificação

Nenhum dos dois projetos tem framework de testes, e este plano não cria um. Os "testes" da API são roteiros com `curl` e `node` no Git Bash. Os do front são roteiros no navegador, com o Playwright MCP. Cada passo diz o resultado esperado.

**Pasta de arquivos de teste.** Use o diretório de scratchpad da sua sessão, nunca uma pasta do repositório:

```bash
T="<diretório de scratchpad da sessão>/backup"   # ex.: /c/Users/.../scratchpad/backup
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
# backup TOKEN ARQUIVO: POST /backup, salva o corpo em $T/ARQUIVO e os headers em $T/headers.txt; imprime o status
backup() { curl -s -D "$T/headers.txt" -o "$T/$2" -w '%{http_code}\n' -X POST "$API/backup" -H "Authorization: Bearer $1"; }
# restore TOKEN ARQUIVO [CONTENT-TYPE]: corpo cru, imprime corpo e status
restore() { (cd "$T" && curl -s -w '\n%{http_code}\n' -X POST "$API/backup/restore" -H "Authorization: Bearer $1" -H "Content-Type: ${3:-application/gzip}" --data-binary "@$2"); }
# peek ARQUIVO: formato, versão, migration e contagens de um backup
peek() { node -e 'const z=require("zlib"),fs=require("fs");const b=JSON.parse(z.gunzipSync(fs.readFileSync(process.argv[1])));const c={};for(const k in b.data)c[k]=b.data[k].length;console.log(JSON.stringify({format:b.format,version:b.version,createdBy:b.createdBy,migration:b.migration,counts:c}))' "$T/$1"; }
# tamper ORIGEM DESTINO 'código JS que altera b': gera um backup modificado
tamper() { node -e 'const z=require("zlib"),fs=require("fs");const b=JSON.parse(z.gunzipSync(fs.readFileSync(process.argv[1])));new Function("b",process.argv[3])(b);fs.writeFileSync(process.argv[2],z.gzipSync(JSON.stringify(b)))' "$T/$1" "$T/$2" "$3"; }
# snapshot: hash de todo o conteúdo das 4 tabelas (inclui ids, datas, update_at, decimais e bytes) e as contagens
snapshot() {
  node -e "
const p=new (require('@prisma/client').PrismaClient)();
Promise.all([p.user.findMany({orderBy:{id:'asc'}}),p.userAvatar.findMany({orderBy:{userId:'asc'}}),p.client.findMany({orderBy:{id:'asc'}}),p.os.findMany({orderBy:{id:'asc'}})])
.then(r=>console.log(require('crypto').createHash('sha256').update(JSON.stringify(r)).digest('hex').slice(0,16),r.map(t=>t.length).join('/')))
.finally(()=>p.\$disconnect())"
}
# reset_admin SENHA: redefine o admin LOCAL, ativo e sem troca pendente
reset_admin() {
  node -e "
    const b=require('bcryptjs');const p=new (require('@prisma/client').PrismaClient)();
    b.hash(process.argv[1],8)
      .then(h=>p.user.update({where:{email:'admin@werk.com.br'},data:{password:h,mustChangePassword:false,active:true,role:'ADMIN'}}))
      .then(u=>console.log('admin',u.role,'mustChangePassword',u.mustChangePassword))
      .finally(()=>p.\$disconnect())" "$1"
}
# populate: cria dados de teste (só se basico@werk.com.br não existir): um BÁSICO com foto, 3 clientes e 5 OS com decimais variados
populate() {
  node -e "
const p=new (require('@prisma/client').PrismaClient)();const b=require('bcryptjs');
(async()=>{
  if(await p.user.findUnique({where:{email:'basico@werk.com.br'}})){console.log('já populado');return;}
  const h=await b.hash('Senha123',8);
  const u=await p.user.create({data:{name:'Basico Teste',email:'basico@werk.com.br',password:h,role:'BASICO'}});
  await p.userAvatar.create({data:{userId:u.id,mimeType:'image/jpeg',data:Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),require('crypto').randomBytes(50000)])}});
  await p.user.update({where:{id:u.id},data:{avatarUpdatedAt:new Date()}});
  const c=[];
  for(const [nome,cpf,cnpj] of [['Ana Souza','52998224725',null],['Oficina Lima',null,'11222333000181'],['Bruno Melo','39053344705',null]])
    c.push(await p.client.create({data:{nome,telefone:'81999998888',email:nome.split(' ')[0].toLowerCase()+'@teste.com',cpf,cnpj}}));
  const vals=[[100,50.5],[0.5,null],[1234.56,0],[null,null],[99.99,0.01]];
  const tipos=['GARANTIA','FORADEGARANTIA','ORCAMENTO','CONTRATO','GARANTIA'];
  for(const [i,[s,m]] of vals.entries())
    await p.os.create({data:{client_id:c[i%3].id,contato:'Contato '+i,modeloEquipamento:'Modelo '+i,horaChegada:'08:00',horaSaida:i%2?'':'10:30',defeito:'Defeito '+i,valServico:s,valMaterial:m,total:(s??0)+(m??0),tipoServico:tipos[i]}});
  console.log('populado');
})().finally(()=>p.\$disconnect())"
}
```

**Preparação do front:**

```bash
cd /d/Projetos/werk-app
# Tem que imprimir http://localhost:3333/ (o .env tem duas linhas NEXT_PUBLIC_API; vale a última)
node -e "const {loadEnvConfig}=require('@next/env');console.log(loadEnvConfig(process.cwd()).combinedEnv.NEXT_PUBLIC_API)"
npm run dev   # http://localhost:3000, em segundo plano
```

Se o comando acima imprimir a URL da Vercel, **pare**: os testes do front não podem rodar contra a produção, porque o restore apaga o banco.

---

## Estrutura de arquivos

**API (`apiwerk`)**

| Arquivo | Ação | Responsabilidade |
| --- | --- | --- |
| `prisma/schema.prisma` | Alterar | Enum `BackupAction` e modelo `BackupLog` |
| `prisma/migrations/<timestamp>_add_backup_logs/migration.sql` | Criar (gerado) | Tabela `backup_logs` e enum |
| `src/schemas/backup.ts` | Criar | Schemas de linha, `backupFileSchema`, `backupUploadSchema`, checagem de colunas, tipos |
| `src/lib/backupFile.ts` | Criar | `encodeBackup`, `decodeBackup`, `checkBackupIntegrity`, `countBackupRows`, `backupFileName`, `BACKUP_MAX_BYTES` (puro, sem Prisma) |
| `src/services/backup/getBackupStatusService.ts` | Criar | Último backup e última restauração |
| `src/services/backup/createBackupService.ts` | Criar | Lê as tabelas, gera o arquivo, registra o log |
| `src/services/backup/restoreBackupService.ts` | Criar | Valida e substitui os dados numa transação |
| `src/controllers/backup/getBackupStatusController.ts` | Criar | `GET /backup/status` |
| `src/controllers/backup/createBackupController.ts` | Criar | `POST /backup` (binário) |
| `src/controllers/backup/restoreBackupController.ts` | Criar | `POST /backup/restore` |
| `src/routers.ts` | Alterar | Três rotas e `raw()` no restore |
| `src/middlewares/erroHandle.ts` | Alterar | Mensagem do 413 pelo limite |
| `README.md`, `CLAUDE.md` | Alterar | Endpoints, erros, procedimento manual, formatos de resposta, regra de colunas |
| `dist/**` | Regenerar | `npm run build` |

**Front (`werk-app`)**

| Arquivo | Ação | Responsabilidade |
| --- | --- | --- |
| `src/types/backup.ts` | Criar | `BackupCounts`, `BackupLogEntry`, `BackupStatus`, `BackupPreview` |
| `src/helpers/format.ts` | Alterar | `formatDateTime` |
| `src/helpers/apiErrorMessage.ts` | Criar | `message` da API, inclusive de corpo `Blob` |
| `src/helpers/downloadBackup.ts` | Criar | `POST /backup` + download |
| `src/helpers/readBackup.ts` | Criar | Prévia local do arquivo e limites |
| `src/app/(auth-routes)/backup/page.tsx` | Criar | Página server-side só para admin |
| `src/app/(auth-routes)/backup/loading.tsx` | Criar | Skeleton |
| `src/app/components/backup/backup.tsx` | Criar | Os dois cards |
| `src/app/components/backup/restore-backup-dialog.tsx` | Criar | Prévia, confirmação e restauração |
| `src/components/sidebar-nav.tsx` | Alterar | Item "Backup" em `adminNav` |

---

### Tarefa 1: Banco `backup_logs` e formato do arquivo

**Files:**
- Modify: `prisma/schema.prisma` (final do arquivo)
- Create: `prisma/migrations/<timestamp>_add_backup_logs/migration.sql` (gerado)
- Create: `src/schemas/backup.ts`
- Create: `src/lib/backupFile.ts`
- Regenerate: `dist/`

**Interfaces:**
- Consumes: `avatarMimeTypes` de `src/schemas/user.ts`; `AppError` de `src/utils/appError.ts`.
- Produces:
  - `prismaClient.backupLog` (`{ id: number; action: "BACKUP" | "RESTORE"; userName: string; userEmail: string; counts: JsonValue; created_at: Date }`).
  - `src/schemas/backup.ts`: `invalidBackupMessage: string`, `backupMimeTypes = ["application/gzip", "application/x-gzip"] as const`, `backupFileSchema`, `backupUploadSchema` (entrada `unknown`, saída `Buffer`), `type BackupFile`, `type BackupData = BackupFile["data"]`, `type BackupCounts = { users: number; userAvatars: number; clients: number; os: number }`.
  - `src/lib/backupFile.ts`: `BACKUP_MAX_BYTES = 4 * 1024 * 1024`, `encodeBackup(content: unknown): Buffer`, `decodeBackup(file: Buffer): BackupFile` (lança `AppError` 400), `checkBackupIntegrity(data: BackupData): void` (lança `AppError` 400), `countBackupRows(data: { users: unknown[]; userAvatars: unknown[]; clients: unknown[]; os: unknown[] }): BackupCounts`, `backupFileName(date: Date, suffix?: string): string`.

- [ ] **Passo 1: Modelo no schema do Prisma**

No final de `prisma/schema.prisma`, acrescente:

```prisma
enum BackupAction {
  BACKUP
  RESTORE
}

// Fora do backup e não apagada pelo restore: o histórico sobrevive às restaurações.
// Sem FK para users, porque o restore troca os usuários.
model BackupLog {
  id Int @id @default(autoincrement())
  action BackupAction
  userName String @db.VarChar(255)
  userEmail String @db.VarChar(255)
  counts Json
  created_at DateTime @default(now())

  @@map("backup_logs")
}
```

- [ ] **Passo 2: Gerar e aplicar a migration (banco local)**

**Pare a API** antes. Depois:

```bash
cd /d/Work/apiwerk
sed -n 's/^DATABASE_URL=.*@\([^/]*\)\/.*/\1/p' .env   # TEM que ser localhost:5433
npx prisma migrate dev --name add_backup_logs
cat prisma/migrations/*_add_backup_logs/migration.sql
```

Esperado: o SQL contém só isto, sem `DROP` e sem tocar em outras tabelas:
- `CREATE TYPE "BackupAction" AS ENUM ('BACKUP', 'RESTORE');`
- `CREATE TABLE "backup_logs" ("id" SERIAL NOT NULL, "action" "BackupAction" NOT NULL, "userName" VARCHAR(255) NOT NULL, "userEmail" VARCHAR(255) NOT NULL, "counts" JSONB NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id"));`

A tabela é nova, então não precisa de `DEFAULT` extra.

- [ ] **Passo 3: Schemas do backup**

Crie `src/schemas/backup.ts`:

```ts
import {
  Client,
  Os,
  Role,
  TipoServico,
  User,
  UserAvatar,
} from "@prisma/client";
import { z } from "zod";
import { avatarMimeTypes } from "./user";

export const invalidBackupMessage =
  "Arquivo inválido: envie um backup .json.gz gerado pelo sistema";

export const backupMimeTypes = [
  "application/gzip",
  "application/x-gzip",
] as const;

// Datas chegam em ISO (JSON.stringify de Date)
const date = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

// Decimal(30,2) serializado como string: "150", "0.5", "1234.56"
const money = z
  .string()
  .regex(/^-?\d{1,28}(\.\d{1,2})?$/)
  .nullable();

const text = (max: number) => z.string().max(max);

export const backupUserSchema = z.object({
  id: z.string().min(1),
  name: text(255),
  email: text(255),
  password: text(255),
  role: z.enum(Role),
  active: z.boolean(),
  mustChangePassword: z.boolean(),
  avatarUpdatedAt: date.nullable(),
  created_at: date.nullable(),
  update_at: date.nullable(),
});

export const backupUserAvatarSchema = z.object({
  userId: z.string().min(1),
  data: z
    .base64()
    .min(1)
    .transform((value) => Buffer.from(value, "base64")),
  mimeType: z.enum(avatarMimeTypes),
  updated_at: date,
});

export const backupClientSchema = z.object({
  id: z.number().int().positive(),
  nome: text(255),
  telefone: text(20),
  email: text(255),
  cpf: text(11).nullable(),
  cnpj: text(14).nullable(),
  cep: text(8).nullable(),
  endereco: text(255).nullable(),
  numero: text(20).nullable(),
  bairro: text(255).nullable(),
  cidade: text(150).nullable(),
  uf: text(2).nullable(),
  created_at: date.nullable(),
  update_at: date.nullable(),
});

export const backupOsSchema = z.object({
  id: z.number().int().positive(),
  contato: z.string(),
  modeloEquipamento: z.string(),
  horaChegada: z.string(),
  horaSaida: z.string().nullable(),
  defeito: z.string(),
  defeitoConstatado: z.string().nullable(),
  solucao: z.string().nullable(),
  valServico: money,
  valMaterial: money,
  total: money,
  garantiaPeca: z.string().nullable(),
  garantiaServico: z.string().nullable(),
  created_at: date.nullable(),
  update_at: date.nullable(),
  tipoServico: z.enum(TipoServico),
  client_id: z.number().int().positive(),
});

// Se um model ganhar uma coluna que o schema de linha não tem (ou o contrário),
// o build falha aqui: "Type 'false' does not satisfy the constraint 'true'".
// Coluna nova obrigatória entra com .default(...), para que backups antigos
// continuem restauráveis.
type SameKeys<A, B> = [
  Exclude<keyof A, keyof B>,
  Exclude<keyof B, keyof A>,
] extends [never, never]
  ? true
  : false;
type Assert<T extends true> = T;
export type BackupColumnsCheck = [
  Assert<SameKeys<z.output<typeof backupUserSchema>, User>>,
  Assert<SameKeys<z.output<typeof backupUserAvatarSchema>, UserAvatar>>,
  Assert<SameKeys<z.output<typeof backupClientSchema>, Client>>,
  Assert<SameKeys<z.output<typeof backupOsSchema>, Os>>,
];

export const backupFileSchema = z.object({
  format: z.literal("werk-backup", { error: invalidBackupMessage }),
  version: z.literal(1, { error: "Versão de backup não suportada" }),
  createdAt: z.string(),
  createdBy: z.string(),
  migration: z.string().nullable(),
  data: z.object({
    users: z.array(backupUserSchema),
    userAvatars: z.array(backupUserAvatarSchema),
    clients: z.array(backupClientSchema),
    os: z.array(backupOsSchema),
  }),
});

// Corpo lido pelo express.raw. Com outro Content-Type o corpo não é lido e
// req.body fica {}. A assinatura 1F 8B confirma que é gzip.
export const backupUploadSchema = z
  .instanceof(Buffer, { error: invalidBackupMessage })
  .refine(
    (data) => data.length > 2 && data[0] === 0x1f && data[1] === 0x8b,
    { error: invalidBackupMessage },
  );

export type BackupFile = z.infer<typeof backupFileSchema>;
export type BackupData = BackupFile["data"];
export type BackupCounts = {
  users: number;
  userAvatars: number;
  clients: number;
  os: number;
};
```

`BackupCounts` é `type`, não `interface`: assim ele é aceito no campo `Json` do Prisma.

- [ ] **Passo 4: Codificação, decodificação e integridade**

Crie `src/lib/backupFile.ts`:

```ts
import { gunzipSync, gzipSync } from "zlib";
import {
  BackupCounts,
  BackupData,
  BackupFile,
  backupFileSchema,
  invalidBackupMessage,
} from "../schemas/backup";
import AppError from "../utils/appError";

// A Vercel limita corpo de requisição e de resposta a 4,5 MB
export const BACKUP_MAX_BYTES = 4 * 1024 * 1024;

// Protege contra "bomba de gzip": arquivo pequeno que descompacta para gigabytes
const MAX_JSON_BYTES = 64 * 1024 * 1024;

export function encodeBackup(content: unknown): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(content), "utf8"));
}

export function decodeBackup(file: Buffer): BackupFile {
  let json: unknown;

  try {
    const text = gunzipSync(file, { maxOutputLength: MAX_JSON_BYTES });
    json = JSON.parse(text.toString("utf8"));
  } catch {
    throw new AppError(invalidBackupMessage, 400);
  }

  const result = backupFileSchema.safeParse(json);

  if (!result.success) {
    const issue = result.error.issues[0];
    const [field] = issue.path;

    if (field === undefined) {
      throw new AppError(invalidBackupMessage, 400);
    }

    // format e version já têm mensagem própria no schema
    if (field === "format" || field === "version") {
      throw new AppError(issue.message, 400);
    }

    throw new AppError(
      `Backup inválido: campo ${issue.path.join(".")} fora do formato esperado`,
      400,
    );
  }

  return result.data;
}

function hasDuplicates(values: unknown[]) {
  const present = values.filter((value) => value !== null);
  return new Set(present).size !== present.length;
}

// Regras que o schema de linha não enxerga, conferidas antes de apagar qualquer dado
export function checkBackupIntegrity({
  users,
  userAvatars,
  clients,
  os,
}: BackupData) {
  const duplicated = (table: string) =>
    new AppError(`Backup inconsistente: registros duplicados em ${table}`, 400);

  if (
    hasDuplicates(users.map((user) => user.id)) ||
    hasDuplicates(users.map((user) => user.email))
  ) {
    throw duplicated("usuários");
  }

  if (hasDuplicates(userAvatars.map((avatar) => avatar.userId))) {
    throw duplicated("fotos");
  }

  if (
    hasDuplicates(clients.map((client) => client.id)) ||
    hasDuplicates(clients.map((client) => client.cpf)) ||
    hasDuplicates(clients.map((client) => client.cnpj))
  ) {
    throw duplicated("clientes");
  }

  if (hasDuplicates(os.map((order) => order.id))) {
    throw duplicated("ordens de serviço");
  }

  const userIds = new Set(users.map((user) => user.id));
  const clientIds = new Set(clients.map((client) => client.id));

  if (
    userAvatars.some((avatar) => !userIds.has(avatar.userId)) ||
    os.some((order) => !clientIds.has(order.client_id))
  ) {
    throw new AppError(
      "Backup inconsistente: registro relacionado não encontrado",
      400,
    );
  }

  // Sem um admin ativo, ninguém entraria para gerenciar o sistema
  if (!users.some((user) => user.role === "ADMIN" && user.active)) {
    throw new AppError("O backup não tem nenhum administrador ativo", 400);
  }
}

export function countBackupRows(data: {
  users: unknown[];
  userAvatars: unknown[];
  clients: unknown[];
  os: unknown[];
}): BackupCounts {
  return {
    users: data.users.length,
    userAvatars: data.userAvatars.length,
    clients: data.clients.length,
    os: data.os.length,
  };
}

// Recife não tem horário de verão: UTC-3 fixo. "werk-backup-2026-10-13-1430.json.gz"
export function backupFileName(date: Date, suffix = "") {
  const recife = new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const day = recife.slice(0, 10);
  const time = recife.slice(11, 16).replace(":", "");
  return `werk-backup-${day}-${time}${suffix}.json.gz`;
}
```

- [ ] **Passo 5: Type-check e build**

```bash
npm run build
```

Esperado: termina sem erros.

- [ ] **Passo 6: A checagem de colunas pega uma coluna esquecida**

Com a API parada, acrescente temporariamente `teste String?` ao model `Client` em `prisma/schema.prisma` (logo depois de `uf`). Depois:

```bash
npx prisma generate
npm run build
```

Esperado: o build **falha** em `src/schemas/backup.ts`, na linha do `Assert` de `Client`, com "Type 'false' does not satisfy the constraint 'true'".

Remova a linha `teste String?` e rode de novo:

```bash
npx prisma generate
npm run build
git diff --stat prisma/schema.prisma   # só o BackupLog/BackupAction do passo 1
```

Esperado: build sem erros.

- [ ] **Passo 7: Verificar a codificação e a decodificação isoladas**

```bash
node -e '
const { encodeBackup, decodeBackup, backupFileName, checkBackupIntegrity } = require("./dist/src/lib/backupFile");
const ok = { format: "werk-backup", version: 1, createdAt: new Date().toISOString(), createdBy: "a@b.c", migration: null,
  data: { users: [{ id: "u1", name: "A", email: "a@b.c", password: "x", role: "ADMIN", active: true, mustChangePassword: false, avatarUpdatedAt: null, created_at: null, update_at: null }],
          userAvatars: [], clients: [], os: [] } };
const decoded = decodeBackup(encodeBackup(ok));
console.log("ok", decoded.data.users.length);
checkBackupIntegrity(decoded.data); console.log("integridade ok");
for (const [name, value] of [["v2", { ...ok, version: 2 }], ["formato", { hello: 1 }], ["array", []]]) {
  try { decodeBackup(encodeBackup(value)); } catch (e) { console.log(name, "→", e.statusCode, e.message); }
}
try { decodeBackup(Buffer.from("not gzip")); } catch (e) { console.log("lixo →", e.statusCode, e.message); }
console.log(backupFileName(new Date("2026-10-13T17:30:00Z")), backupFileName(new Date("2026-10-13T17:30:00Z"), "-antes-da-restauracao"));
'
```

Esperado:
```
ok 1
integridade ok
v2 → 400 Versão de backup não suportada
formato → 400 Arquivo inválido: envie um backup .json.gz gerado pelo sistema
array → 400 Arquivo inválido: envie um backup .json.gz gerado pelo sistema
lixo → 400 Arquivo inválido: envie um backup .json.gz gerado pelo sistema
werk-backup-2026-10-13-1430.json.gz werk-backup-2026-10-13-1430-antes-da-restauracao.json.gz
```

- [ ] **Passo 8: Commit**

```bash
git status --short
git add -- prisma/schema.prisma prisma/migrations/*_add_backup_logs/migration.sql src/schemas/backup.ts src/lib/backupFile.ts dist/src/schemas/backup.js dist/src/lib/backupFile.js
git status --short   # nada de src/, prisma/ ou dist/ desta tarefa pode ter ficado de fora
git commit -F - <<'EOF'
feat(backup): add backup log table and backup file format
EOF
```

---

### Tarefa 2: Gerar backup e status (`POST /backup`, `GET /backup/status`)

**Files:**
- Create: `src/services/backup/getBackupStatusService.ts`, `src/services/backup/createBackupService.ts`
- Create: `src/controllers/backup/getBackupStatusController.ts`, `src/controllers/backup/createBackupController.ts`
- Modify: `src/routers.ts` (imports e duas rotas, logo depois das rotas `/users`)
- Regenerate: `dist/`

**Interfaces:**
- Consumes (Tarefa 1): `prismaClient.backupLog`, `encodeBackup`, `countBackupRows`, `backupFileName`, `BACKUP_MAX_BYTES`, `BackupCounts`.
- Produces:
  - `GET /backup/status` → 200 `{ lastBackup: { userName: string; created_at: string; counts: BackupCounts } | null; lastRestore: (mesmo formato) | null }`.
  - `POST /backup` → 200 binário gzip com `Content-Disposition: attachment; filename="werk-backup-AAAA-MM-DD-HHmm.json.gz"`, `Access-Control-Expose-Headers: Content-Disposition`, `Cache-Control: no-store`; 413 acima de 4 MB.

- [ ] **Passo 1: Conferir o estado antes**

API rodando. Com os helpers:

```bash
reset_admin Senha123
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
req GET /backup/status "$TOKEN"
```

Esperado: 404 (rota ainda não existe; o Express responde `Cannot GET`).

- [ ] **Passo 2: Service de status**

Crie `src/services/backup/getBackupStatusService.ts`:

```ts
import { Prisma } from "@prisma/client";
import prismaClient from "../../prisma";

const backupLogSelect = {
  userName: true,
  created_at: true,
  counts: true,
} satisfies Prisma.BackupLogSelect;

export class GetBackupStatusService {
  async execute() {
    const [lastBackup, lastRestore] = await Promise.all([
      prismaClient.backupLog.findFirst({
        where: { action: "BACKUP" },
        orderBy: { id: "desc" },
        select: backupLogSelect,
      }),
      prismaClient.backupLog.findFirst({
        where: { action: "RESTORE" },
        orderBy: { id: "desc" },
        select: backupLogSelect,
      }),
    ]);

    return { lastBackup, lastRestore };
  }
}
```

- [ ] **Passo 3: Service de geração**

Crie `src/services/backup/createBackupService.ts`:

```ts
import { Prisma } from "@prisma/client";
import {
  BACKUP_MAX_BYTES,
  backupFileName,
  countBackupRows,
  encodeBackup,
} from "../../lib/backupFile";
import prismaClient from "../../prisma";
import AppError from "../../utils/appError";

export class CreateBackupService {
  async execute(userId: string) {
    const admin = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // RepeatableRead: as quatro leituras enxergam o mesmo instante do banco
    const [users, userAvatars, clients, os, migrations] =
      await prismaClient.$transaction(
        [
          prismaClient.user.findMany({ orderBy: { id: "asc" } }),
          prismaClient.userAvatar.findMany({ orderBy: { userId: "asc" } }),
          prismaClient.client.findMany({ orderBy: { id: "asc" } }),
          prismaClient.os.findMany({ orderBy: { id: "asc" } }),
          prismaClient.$queryRaw<{ migration_name: string }[]>`
            SELECT migration_name FROM _prisma_migrations
            WHERE finished_at IS NOT NULL
            ORDER BY finished_at DESC, migration_name DESC
            LIMIT 1`,
        ],
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );

    const createdAt = new Date();
    const counts = countBackupRows({ users, userAvatars, clients, os });

    const file = encodeBackup({
      format: "werk-backup",
      version: 1,
      createdAt: createdAt.toISOString(),
      createdBy: admin.email,
      migration: migrations[0]?.migration_name ?? null,
      data: {
        users,
        // Sem isto, JSON.stringify gravaria o Buffer como { type, data: [bytes] }
        userAvatars: userAvatars.map((avatar) => ({
          ...avatar,
          data: Buffer.from(avatar.data).toString("base64"),
        })),
        clients,
        os,
      },
    });

    if (file.length > BACKUP_MAX_BYTES) {
      throw new AppError(
        "Backup maior que o limite de 4 MB. Use o procedimento manual do README.",
        413,
      );
    }

    await prismaClient.backupLog.create({
      data: {
        action: "BACKUP",
        userName: admin.name,
        userEmail: admin.email,
        counts,
      },
    });

    return { fileName: backupFileName(createdAt), file };
  }
}
```

`Decimal` vira string sozinho no `JSON.stringify` (o `toJSON` do Prisma.Decimal), e `Date` vira ISO.

- [ ] **Passo 4: Controllers**

Crie `src/controllers/backup/getBackupStatusController.ts`:

```ts
import { Request, Response } from "express";
import { GetBackupStatusService } from "../../services/backup/getBackupStatusService";

export class GetBackupStatusController {
  async handle(req: Request, res: Response) {
    const getBackupStatusService = new GetBackupStatusService();
    const status = await getBackupStatusService.execute();

    return res.status(200).json(status);
  }
}
```

Crie `src/controllers/backup/createBackupController.ts`:

```ts
import { Request, Response } from "express";
import { CreateBackupService } from "../../services/backup/createBackupService";

export class CreateBackupController {
  async handle(req: Request, res: Response) {
    const createBackupService = new CreateBackupService();
    const { fileName, file } = await createBackupService.execute(req.user_id);

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    // O front está em outra origem: sem isto o navegador esconde o nome do arquivo
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(file);
  }
}
```

- [ ] **Passo 5: Rotas**

Em `src/routers.ts`, acrescente os imports (em ordem alfabética, junto dos outros controllers):

```ts
import { CreateBackupController } from "./controllers/backup/createBackupController";
import { GetBackupStatusController } from "./controllers/backup/getBackupStatusController";
```

E, logo depois da rota `GET /users/:id/avatar`, as rotas:

```ts
router.get(
  "/backup/status",
  isAuthenticated,
  requireAdmin,
  new GetBackupStatusController().handle,
);
router.post(
  "/backup",
  isAuthenticated,
  requireAdmin,
  new CreateBackupController().handle,
);
```

- [ ] **Passo 6: Build**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Passo 7: Verificar**

Reinicie a API (`npm run dev`). Com os helpers:

```bash
populate
reset_admin Senha123
TOKEN=$(login admin@werk.com.br Senha123 | json .token)

# 1. Status antes de qualquer backup
req GET /backup/status "$TOKEN"
# 2. Gerar
backup "$TOKEN" b1.json.gz
grep -i -E '^(content-type|content-disposition|access-control-expose-headers|cache-control):' "$T/headers.txt"
peek b1.json.gz
snapshot
# 3. Status depois
req GET /backup/status "$TOKEN"
# 4. A foto foi para o arquivo em base64, não como { type: "Buffer" }
node -e 'const b=JSON.parse(require("zlib").gunzipSync(require("fs").readFileSync(process.argv[1])));const a=b.data.userAvatars[0];console.log(typeof a.data,Buffer.from(a.data,"base64").length,a.mimeType);console.log(b.data.os.map(o=>[o.valServico,o.valMaterial,o.total]))' "$T/b1.json.gz"
# 5. BÁSICO e sem token
BTOKEN=$(login basico@werk.com.br Senha123 | json .token)
req GET /backup/status "$BTOKEN"
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$API/backup" -H "Authorization: Bearer $BTOKEN"
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$API/backup"
```

Esperado:
1. 200, `{"lastBackup":null,"lastRestore":null}`.
2. `backup` imprime `200`. Headers: `Content-Type: application/gzip`, `Content-Disposition: attachment; filename="werk-backup-<data de hoje em Recife>-<HHmm>.json.gz"`, `Access-Control-Expose-Headers: Content-Disposition`, `Cache-Control: no-store`. `peek`: `format` `werk-backup`, `version` 1, `createdBy` `admin@werk.com.br`, `migration` terminando em `_add_backup_logs`, `counts` iguais aos do `snapshot` (`users/userAvatars/clients/os`, por exemplo `2/1/3/5`).
3. 200, `lastBackup` com `userName` do admin, `created_at` e `counts`; `lastRestore` `null`.
4. `string 50004 image/jpeg`, e a lista **contém** os valores do `populate` como strings: `["100","50.5","150.5"]`, `["0.5",null,"0.5"]`, `["1234.56","0","1234.56"]`, `[null,null,"0"]` e `["99.99","0.01","100"]` (pode haver outras OS, se o banco local já tinha dados).
5. 403 `{"message":"Acesso negado"}`, `403`, `401`.

**Backup acima de 4 MB** (foto gigante gravada direto no banco, depois apagada):

```bash
node -e "
const p=new (require('@prisma/client').PrismaClient)();
p.user.findUnique({where:{email:'admin@werk.com.br'}})
 .then(u=>p.userAvatar.upsert({where:{userId:u.id},create:{userId:u.id,mimeType:'image/jpeg',data:require('crypto').randomBytes(4300000)},update:{data:require('crypto').randomBytes(4300000)}}))
 .then(()=>console.log('foto grande gravada')).finally(()=>p.\$disconnect())"
backup "$TOKEN" grande.json.gz; cat "$T/grande.json.gz"; echo
req GET /backup/status "$TOKEN" | json '.lastBackup.created_at'
node -e "
const p=new (require('@prisma/client').PrismaClient)();
p.user.findUnique({where:{email:'admin@werk.com.br'}})
 .then(u=>p.userAvatar.delete({where:{userId:u.id}})).then(()=>console.log('removida')).finally(()=>p.\$disconnect())"
```

Esperado: `413` e o corpo `{"message":"Backup maior que o limite de 4 MB. Use o procedimento manual do README."}`. O `created_at` do último backup é o mesmo do item 3 (nenhum registro novo).

- [ ] **Passo 8: Commit**

```bash
git status --short
git add -- src/services/backup/getBackupStatusService.ts src/services/backup/createBackupService.ts src/controllers/backup/getBackupStatusController.ts src/controllers/backup/createBackupController.ts src/routers.ts dist/src/services/backup/getBackupStatusService.js dist/src/services/backup/createBackupService.js dist/src/controllers/backup/getBackupStatusController.js dist/src/controllers/backup/createBackupController.js dist/src/routers.js
git status --short
git commit -F - <<'EOF'
feat(backup): add database backup download and backup status
EOF
```

---

### Tarefa 3: Restaurar backup (`POST /backup/restore`), erro 413 e documentação

**Files:**
- Create: `src/services/backup/restoreBackupService.ts`
- Create: `src/controllers/backup/restoreBackupController.ts`
- Modify: `src/routers.ts` (import do controller, import de `backupMimeTypes` e `BACKUP_MAX_BYTES`, rota depois de `POST /backup`)
- Modify: `src/middlewares/erroHandle.ts` (bloco `entity.too.large`)
- Modify: `README.md` (Funcionalidades, Endpoints, Erros, nova seção "Backup e restauração", Roadmap)
- Modify: `CLAUDE.md` (Controllers and error handling, Services, Response shapes, Data model)
- Regenerate: `dist/`

**Interfaces:**
- Consumes (Tarefa 1): `decodeBackup`, `checkBackupIntegrity`, `countBackupRows`, `BACKUP_MAX_BYTES`, `backupUploadSchema`, `backupMimeTypes`, `BackupCounts`.
- Produces: `POST /backup/restore` (corpo cru `application/gzip` ou `application/x-gzip`, até 4 MiB) → 200 `{ message: "Backup restaurado", counts: BackupCounts }`.

- [ ] **Passo 1: Service de restauração**

Crie `src/services/backup/restoreBackupService.ts`:

```ts
import {
  checkBackupIntegrity,
  countBackupRows,
  decodeBackup,
} from "../../lib/backupFile";
import prismaClient from "../../prisma";

interface RestoreBackupRequest {
  file: Buffer;
  userId: string;
}

// Lotes de 1000: a OS tem 17 colunas, longe do limite de parâmetros do Postgres
function chunk<T>(items: T[], size = 1000) {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }
  return batches;
}

export class RestoreBackupService {
  async execute({ file, userId }: RestoreBackupRequest) {
    // Tudo é validado antes de apagar qualquer dado
    const backup = decodeBackup(file);
    checkBackupIntegrity(backup.data);

    // Lido antes do TRUNCATE: o admin pode não existir no backup
    const admin = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const { users, userAvatars, clients, os } = backup.data;
    const counts = countBackupRows(backup.data);

    // Qualquer erro desfaz tudo. TRUNCATE é transacional no Postgres e trava as
    // tabelas: requisições concorrentes esperam o fim do restore.
    await prismaClient.$transaction(
      async (tx) => {
        await tx.$executeRaw`TRUNCATE TABLE user_avatars, os, clients, users`;

        // Ids, created_at e update_at explícitos: o Prisma só preenche
        // @updatedAt quando o valor não é enviado
        for (const batch of chunk(users)) {
          await tx.user.createMany({ data: batch });
        }
        for (const batch of chunk(userAvatars)) {
          await tx.userAvatar.createMany({ data: batch });
        }
        for (const batch of chunk(clients)) {
          await tx.client.createMany({ data: batch });
        }
        for (const batch of chunk(os)) {
          await tx.os.createMany({ data: batch });
        }

        // Próximo id depois do maior restaurado; tabela vazia volta a começar em 1
        await tx.$queryRaw`SELECT setval(pg_get_serial_sequence('clients', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM clients`;
        await tx.$queryRaw`SELECT setval(pg_get_serial_sequence('os', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM os`;

        await tx.backupLog.create({
          data: {
            action: "RESTORE",
            userName: admin.name,
            userEmail: admin.email,
            counts,
          },
        });
      },
      { maxWait: 10_000, timeout: 120_000 },
    );

    return counts;
  }
}
```

- [ ] **Passo 2: Controller**

Crie `src/controllers/backup/restoreBackupController.ts`:

```ts
import { Request, Response } from "express";
import { backupUploadSchema } from "../../schemas/backup";
import { RestoreBackupService } from "../../services/backup/restoreBackupService";

export class RestoreBackupController {
  async handle(req: Request, res: Response) {
    const file = await backupUploadSchema.parseAsync(req.body);

    const restoreBackupService = new RestoreBackupService();
    const counts = await restoreBackupService.execute({
      file,
      userId: req.user_id,
    });

    return res.status(200).json({ message: "Backup restaurado", counts });
  }
}
```

- [ ] **Passo 3: Rota**

Em `src/routers.ts`, acrescente os imports:

```ts
import { RestoreBackupController } from "./controllers/backup/restoreBackupController";
import { BACKUP_MAX_BYTES } from "./lib/backupFile";
import { backupMimeTypes } from "./schemas/backup";
```

E, logo depois da rota `POST /backup`:

```ts
// Corpo cru só nesta rota, e só depois de confirmar que é admin
router.post(
  "/backup/restore",
  isAuthenticated,
  requireAdmin,
  raw({ type: [...backupMimeTypes], limit: BACKUP_MAX_BYTES }),
  new RestoreBackupController().handle,
);
```

- [ ] **Passo 4: Mensagem do 413 pelo limite**

Em `src/middlewares/erroHandle.ts`, acrescente o import:

```ts
import { BACKUP_MAX_BYTES } from "../lib/backupFile";
```

E troque o bloco do `entity.too.large` por:

```ts
  // Corpo acima do limite (lançado pelo body-parser, que preenche err.limit em
  // bytes). Só o restore de backup tem limite de 4 MB; o resto chega perto do
  // limite apenas na rota de foto.
  if ((err as { type?: string }).type === "entity.too.large") {
    const message =
      (err as { limit?: number }).limit === BACKUP_MAX_BYTES
        ? "Arquivo muito grande (máx. 4 MB)"
        : "Imagem muito grande (máx. 1 MB)";
    return res.status(413).json({ message });
  }
```

- [ ] **Passo 5: Build**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Passo 6: Documentação no README**

Em `README.md`:

1. Em **Funcionalidades**, depois do bloco **Ordens de Serviço**, acrescente:

```markdown
**Backup (somente admin)**

- Geração e download de um backup completo do banco (`.json.gz`): usuários, fotos, clientes e OS
- Restauração a partir do arquivo, com validação completa antes de apagar qualquer dado e transação única
- Registro de quem fez cada backup e restauração, com lembrete na tela quando o último backup tem mais de 7 dias
```

2. Em **Endpoints**, depois de **Ordens de Serviço**, acrescente:

```markdown
### Backup

| Método | Rota              | Acesso | Descrição |
| ------ | ----------------- | ------ | --------- |
| GET    | `/backup/status`  | admin  | Último backup e última restauração: `{ lastBackup, lastRestore }`, cada um `{ userName, created_at, counts }` ou `null` |
| POST   | `/backup`         | admin  | Gera e baixa o backup (`application/gzip`, `werk-backup-AAAA-MM-DD-HHmm.json.gz`). 413 se passar de 4 MB |
| POST   | `/backup/restore` | admin  | Substitui **todos** os dados pelos do arquivo. Corpo cru com `Content-Type: application/gzip`, até 4 MB. Devolve `{ message, counts }` |
```

3. Na tabela de **Erros**, troque a linha do 413 e a do 400 por:

```markdown
| 400    | Corpo ou id inválido, JSON malformado, imagem em formato inválido, arquivo de backup inválido ou regra de negócio violada |
| 413    | Foto acima de 1 MB, ou arquivo de backup acima de 4 MB |
```

4. Antes de **## Deploy**, acrescente a seção:

````markdown
## Backup e restauração

O admin gera o backup na tela **Backup** do sistema (ou em `POST /backup`). O arquivo `.json.gz` contém todos os usuários (com as senhas criptografadas), as fotos, os clientes e as OS. Guarde-o em local seguro.

A restauração (`POST /backup/restore`) **substitui todos os dados** pelos do arquivo, inclusive usuários e senhas. Ela funciona também num banco novo e vazio: aponte a API para o novo Postgres, deixe o deploy rodar as migrations e o seed, entre com o admin do seed e restaure o arquivo. O formato tem versão (`version: 1`). A API recusa arquivos de outra versão, corrompidos ou inconsistentes antes de apagar qualquer coisa.

O arquivo é limitado a 4 MB, porque a Vercel limita o corpo das requisições e respostas a 4,5 MB.

### Procedimento manual (`pg_dump`)

Para quando o backup passar de 4 MB, a API estiver fora do ar ou for preciso um dump nativo do Postgres. Usa o `pg_dump` do container do `docker-compose`, sem instalar nada. Use a connection string **direta** do Neon (sem `-pooler` no host):

```bash
# Backup
docker exec api-werk-postgres pg_dump --format=custom --no-owner --no-privileges "<url-direta>" > werk.dump

# Restauração num banco vazio
docker exec -i api-werk-postgres pg_restore --no-owner --no-privileges --dbname "<url-direta>" < werk.dump
```
````

5. No **Roadmap**, troque `- [ ] Backup e restauração do banco (somente admin)` por `- [x] Backup e restauração do banco (somente admin)`.

- [ ] **Passo 7: Documentação no CLAUDE.md**

Em `CLAUDE.md`:

1. Em **Controllers and error handling**, troque a linha
   `- body over the parser limit (\`entity.too.large\`) → 413 "Imagem muito grande (máx. 1 MB)"`
   por:
   `- body over the parser limit (\`entity.too.large\`) → 413, "Arquivo muito grande (máx. 4 MB)" when the limit is the backup restore's \`BACKUP_MAX_BYTES\`, "Imagem muito grande (máx. 1 MB)" otherwise`

2. Em **Services**, no final da lista de regras de negócio, acrescente:

```markdown
- Only admins can back up and restore the database (`/backup`). The backup is a gzip JSON (`format: "werk-backup"`, `version: 1`) of `users` (with password hashes), `user_avatars` (bytes in base64), `clients` and `os`, generated by the API through Prisma, because Vercel has no `pg_dump`. Restore validates the whole file first (`src/lib/backupFile.ts`: gzip signature, 64 MB decompressed cap, Zod, duplicates, relations, at least one active admin), then truncates and reloads the four tables in one transaction and resets the `clients` and `os` sequences. `backup_logs` records every backup and restore and is never backed up or truncated. Files are capped at 4 MB (`BACKUP_MAX_BYTES`) because of Vercel's 4.5 MB body limit; larger databases use the manual `pg_dump` procedure in the README.
```

3. Em **Response shapes**, antes da linha `| \`DELETE\` routes | ...`, acrescente:

```markdown
| `GET /backup/status` | `{ lastBackup, lastRestore }`, each `{ userName, created_at, counts }` or `null` |
| `POST /backup` | the backup file (`application/gzip`, `Content-Disposition: attachment`, `Access-Control-Expose-Headers: Content-Disposition`, `no-store`); 413 over 4 MB |
| `POST /backup/restore` | `{ message, counts }` |
```

4. Em **Data model**, depois do item de `User.avatarUpdatedAt`, acrescente:

```markdown
- `src/schemas/backup.ts` has one row schema per backed-up table, and a type check (`BackupColumnsCheck`) makes `npm run build` fail when a model and its row schema have different columns. When you add a column, add it there too, with a `.default(...)` if it is required, so older backups still restore. A new table also needs a row schema, an entry in `createBackupService.ts`, the `TRUNCATE` and the `createMany` order in `restoreBackupService.ts`.
- `BackupLog` (`backup_logs`) has no FK to `users`, because a restore replaces the users; it keeps a copy of the admin's name and email.
```

- [ ] **Passo 8: Verificar**

Reinicie a API (`npm run dev`). Com os helpers, partindo do estado da Tarefa 2 (dados de `populate` e `b1.json.gz` em `$T`):

```bash
reset_admin Senha123
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
backup "$TOKEN" base.json.gz
snapshot                                   # anote: hash H0 e contagens
```

1. **Restore desfaz alterações e preserva tudo:**

```bash
CID=$(req POST /customer "$TOKEN" '{"nome":"Cliente Novo","telefone":"81988887777","email":"novo@teste.com","cpf":"11144477735"}' | head -1 | json .id)
req POST /os "$TOKEN" "{\"cliente_id\":$CID,\"tipoServico\":\"ORCAMENTO\",\"contato\":\"X\",\"modeloEquipamento\":\"Y\",\"horaChegada\":\"09:00\",\"defeito\":\"Z\",\"valServico\":10}"
OSID=$(req GET /os "$TOKEN" | head -1 | json '.os[0].id')
req DELETE "/os/$OSID" "$TOKEN"
BTOKEN=$(login basico@werk.com.br Senha123 | json .token)
req PUT /me/password "$BTOKEN" '{"currentPassword":"Senha123","newPassword":"OutraSenha9"}'
snapshot                                   # hash diferente de H0
restore "$TOKEN" base.json.gz
snapshot                                   # TEM que ser H0
login basico@werk.com.br Senha123 | json .name
login basico@werk.com.br OutraSenha9
```

Esperado: o restore responde 200 `{"message":"Backup restaurado","counts":{...}}` com as contagens de H0. O `snapshot` depois do restore é **idêntico** a H0. Isso confirma ids, `created_at`, `update_at` (o `@updatedAt` foi preservado), decimais e bytes da foto. Se o hash diferir só por `update_at`, pare e reporte: o Prisma está sobrescrevendo o `@updatedAt`. O login com `Senha123` volta a funcionar (`Basico Teste`), e com `OutraSenha9` dá 401.

2. **Restaurar o mesmo arquivo de novo:** `restore "$TOKEN" base.json.gz` → 200, e `snapshot` continua H0.

3. **Content-Type do Windows e tipos errados:**

```bash
restore "$TOKEN" base.json.gz application/x-gzip     # 200, snapshot H0
restore "$TOKEN" base.json.gz "application/gzip; charset=binary"   # 200
echo "texto" > "$T/texto.txt"; restore "$TOKEN" texto.txt          # 400 Arquivo inválido...
restore "$TOKEN" base.json.gz application/json      # 400 Arquivo inválido...
restore "$TOKEN" base.json.gz application/octet-stream   # 400 Arquivo inválido...
```

4. **Arquivos recusados sem tocar no banco** (rode `snapshot` no fim: TEM que ser H0):

```bash
tamper base.json.gz v2.json.gz 'b.version=2';                                   restore "$TOKEN" v2.json.gz
tamper base.json.gz semadmin.json.gz 'b.data.users.forEach(u=>u.role="BASICO")'; restore "$TOKEN" semadmin.json.gz
tamper base.json.gz inativo.json.gz 'b.data.users.forEach(u=>u.active=false)';  restore "$TOKEN" inativo.json.gz
tamper base.json.gz orfa.json.gz 'b.data.os[0].client_id=999999';               restore "$TOKEN" orfa.json.gz
tamper base.json.gz dup.json.gz 'b.data.users.push({...b.data.users[0],id:"outro-id"})'; restore "$TOKEN" dup.json.gz
tamper base.json.gz campo.json.gz 'b.data.os[0].valServico="abc"';             restore "$TOKEN" campo.json.gz
node -e 'require("fs").writeFileSync(process.argv[1],require("zlib").gzipSync(JSON.stringify({hello:1})))' "$T/outro.json.gz"; restore "$TOKEN" outro.json.gz
node -e 'require("fs").writeFileSync(process.argv[1],require("zlib").gzipSync(Buffer.alloc(70*1024*1024)))' "$T/bomba.json.gz"; ls -l "$T/bomba.json.gz"; restore "$TOKEN" bomba.json.gz
snapshot
```

Esperado, na ordem:
- 400 "Versão de backup não suportada"
- 400 "O backup não tem nenhum administrador ativo" (duas vezes)
- 400 "Backup inconsistente: registro relacionado não encontrado"
- 400 "Backup inconsistente: registros duplicados em usuários"
- 400 "Backup inválido: campo data.os.0.valServico fora do formato esperado"
- 400 "Arquivo inválido: envie um backup .json.gz gerado pelo sistema"
- a bomba tem menos de 100 KB compactada, e a resposta é 400 "Arquivo inválido: envie um backup .json.gz gerado pelo sistema"
- `snapshot` = H0

5. **Limites de tamanho:**

```bash
node -e 'require("fs").writeFileSync(process.argv[1],Buffer.concat([Buffer.from([0x1f,0x8b]),require("crypto").randomBytes(4500000)]))' "$T/grande.gz"
restore "$TOKEN" grande.gz
node -e 'require("fs").writeFileSync(process.argv[1],Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),require("crypto").randomBytes(1100000)]))' "$T/big.jpg"
(cd "$T" && curl -s -w '\n%{http_code}\n' -X PUT "$API/me/avatar" -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/jpeg" --data-binary @big.jpg)
```

Esperado: 413 `{"message":"Arquivo muito grande (máx. 4 MB)"}` e 413 `{"message":"Imagem muito grande (máx. 1 MB)"}`.

6. **Banco novo e backup sem clientes/OS** (local, apaga o banco):

**Pare a API**, depois:

```bash
sed -n 's/^DATABASE_URL=.*@\([^/]*\)\/.*/\1/p' .env   # TEM que ser localhost:5433
npx prisma migrate reset --force    # recria o banco e roda o seed (dist/prisma/seed.js)
```

Suba a API de novo e:

```bash
reset_admin Senha123
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
backup "$TOKEN" vazio.json.gz; peek vazio.json.gz     # clients 0, os 0
restore "$TOKEN" base.json.gz; snapshot               # TEM que ser H0
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
restore "$TOKEN" vazio.json.gz
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
req POST /customer "$TOKEN" '{"nome":"Primeiro Cliente","telefone":"81988887777","email":"p@teste.com","cpf":"11144477735"}' | json .id
restore "$TOKEN" base.json.gz
node -e 'const b=JSON.parse(require("zlib").gunzipSync(require("fs").readFileSync(process.argv[1])));console.log("maior id de cliente no backup:",Math.max(...b.data.clients.map(c=>c.id)))' "$T/base.json.gz"
req POST /customer "$TOKEN" '{"nome":"Depois do Restore","telefone":"81988887777","email":"d@teste.com","cpf":"28625587887"}' | json .id
req GET /backup/status "$TOKEN"
```

Esperado:
- O banco recém-criado aceita `base.json.gz` e fica com o `snapshot` H0.
- O backup vazio restaura com 200, e o primeiro cliente criado depois recebe id **1**.
- Depois de restaurar `base.json.gz` de novo, o cliente novo recebe o id **maior id do backup + 1**, sem 409.
- O `GET /backup/status` mostra `lastBackup` e `lastRestore` preenchidos. O `migrate reset` apagou os registros anteriores de `backup_logs`, então só aparecem os feitos depois dele.

7. **Admin que não existe no backup:**

```bash
node -e "
const b=require('bcryptjs');const p=new (require('@prisma/client').PrismaClient)();
b.hash('Senha123',8).then(h=>p.user.create({data:{name:'Admin Dois',email:'admin2@werk.com.br',password:h,role:'ADMIN'}}))
 .then(u=>console.log('criado',u.email)).finally(()=>p.\$disconnect())"
TOKEN2=$(login admin2@werk.com.br Senha123 | json .token)
restore "$TOKEN2" base.json.gz
req GET /me "$TOKEN2"
req GET /backup/status "$TOKEN" | json .lastRestore.userName
```

Esperado: o restore responde 200. O `GET /me` com o token do admin2 responde 401 `{"message":"Não autorizado"}` (nunca 500), porque ele não existe no backup. O último restore registrado mostra `Admin Dois`.

8. **Rollback no meio da transação:** em `restoreBackupService.ts`, acrescente **temporariamente**, logo depois do loop de `os`:

```ts
        throw new Error("rollback test");
```

Com a API reiniciada:

```bash
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
req POST /customer "$TOKEN" '{"nome":"Antes do Rollback","telefone":"81988887777","email":"r@teste.com","cpf":"11144477735"}' | tail -1   # 201
snapshot                                     # anote H1
restore "$TOKEN" vazio.json.gz
snapshot                                     # TEM que ser H1
```

Esperado: 500 `{"message":"Erro interno do servidor"}` e o erro `rollback test` no log da API. O `snapshot` continua H1: nada foi apagado. **Remova a linha `throw`** e confira com `git diff src/services/backup/restoreBackupService.ts` (sem diff em relação ao passo 1).

9. **Acesso:** `BTOKEN=$(login basico@werk.com.br Senha123 | json .token)` e `restore "$BTOKEN" base.json.gz` → 403 `{"message":"Acesso negado"}`. Sem token: `curl -s -w '\n%{http_code}\n' -X POST "$API/backup/restore" -H 'Content-Type: application/gzip' --data-binary @"$T/base.json.gz"` → 401.

- [ ] **Passo 9: Build final**

```bash
npm run build
git status --short   # src/services/backup/restoreBackupService.ts sem o throw
```

- [ ] **Passo 10: Commit**

```bash
git add -- src/services/backup/restoreBackupService.ts src/controllers/backup/restoreBackupController.ts src/routers.ts src/middlewares/erroHandle.ts dist/src/services/backup/restoreBackupService.js dist/src/controllers/backup/restoreBackupController.js dist/src/routers.js dist/src/middlewares/erroHandle.js README.md CLAUDE.md
git status --short
git commit -F - <<'EOF'
feat(backup): add database restore from a backup file

Validates the whole file before touching the database, then truncates and
reloads users, avatars, clients and OS in one transaction and resets the
id sequences.
EOF
```

---

### Tarefa 4: Front: rota `/backup`, status e geração do backup

Repositório: `/d/Projetos/werk-app`. A API das Tarefas 1–3 rodando em `localhost:3333`.

**Files:**
- Create: `src/types/backup.ts`
- Modify: `src/helpers/format.ts` (final do arquivo)
- Create: `src/helpers/apiErrorMessage.ts`, `src/helpers/downloadBackup.ts`, `src/helpers/readBackup.ts`
- Create: `src/app/(auth-routes)/backup/page.tsx`, `src/app/(auth-routes)/backup/loading.tsx`
- Create: `src/app/components/backup/backup.tsx`
- Modify: `src/components/sidebar-nav.tsx` (import do ícone e `adminNav`)

**Interfaces:**
- Consumes: `GET /backup/status`, `POST /backup` (Tarefa 2); `api` (`@/services/api/api`), `getServerApi` (`@/services/api/serverApi`), `authOptions`.
- Produces:
  - `src/types/backup.ts`: `BackupCounts { users; userAvatars; clients; os: number }`, `BackupLogEntry { userName: string; created_at: string; counts: BackupCounts }`, `BackupStatus { lastBackup: BackupLogEntry | null; lastRestore: BackupLogEntry | null }`, `BackupPreview { createdAt: string; createdBy: string; counts: BackupCounts }`.
  - `formatDateTime(value: string | Date): string` → `"13/10/2026 14:30"` (America/Recife).
  - `apiErrorMessage(error: unknown, fallback: string): Promise<string>`.
  - `downloadBackup(suffix?: string): Promise<number>` (tamanho em bytes).
  - `BACKUP_MAX_BYTES`, `BACKUP_WARNING_BYTES`, `readBackup(file: File): Promise<BackupPreview>` (lança `Error` com a mensagem do toast).
  - `src/app/components/backup/backup.tsx`: `export default function Backup({ status }: { status: BackupStatus })`. A Tarefa 5 acrescenta a restauração nele.

- [ ] **Passo 1: Conferir o estado antes**

Com o front rodando (`npm run dev`), entre como admin (`admin@werk.com.br` / `Senha123`, preparado pelo `reset_admin`) e abra `http://localhost:3000/backup` pelo Playwright.

Esperado: a página 404 do Next. A sidebar não tem "Backup".

- [ ] **Passo 2: Tipos**

Crie `src/types/backup.ts`:

```ts
export interface BackupCounts {
  users: number;
  userAvatars: number;
  clients: number;
  os: number;
}

export interface BackupLogEntry {
  userName: string;
  created_at: string;
  counts: BackupCounts;
}

export interface BackupStatus {
  lastBackup: BackupLogEntry | null;
  lastRestore: BackupLogEntry | null;
}

// Lido do arquivo no navegador, antes de enviar
export interface BackupPreview {
  createdAt: string;
  createdBy: string;
  counts: BackupCounts;
}
```

- [ ] **Passo 3: Helpers**

No final de `src/helpers/format.ts`, acrescente:

```ts
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Recife",
});

// "13/10/2026 14:30"
export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value)).replace(",", "");
}
```

Crie `src/helpers/apiErrorMessage.ts`:

```ts
import { isAxiosError } from "axios";

// Com responseType "blob", o corpo de erro da API chega como Blob, não como objeto
export async function apiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;

  const data = error.response?.data;

  try {
    const body = data instanceof Blob ? JSON.parse(await data.text()) : data;
    return typeof body?.message === "string" ? body.message : fallback;
  } catch {
    return fallback;
  }
}
```

Crie `src/helpers/downloadBackup.ts`:

```ts
import { api } from "@/services/api/api";

// Gera o backup na API e baixa o arquivo. Devolve o tamanho em bytes.
export async function downloadBackup(suffix = "") {
  const response = await api.post<Blob>("/backup", null, {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] as
    | string
    | undefined;
  const name =
    disposition?.match(/filename="([^"]+)"/)?.[1] ?? "werk-backup.json.gz";
  const fileName = suffix
    ? name.replace(/\.json\.gz$/, `${suffix}.json.gz`)
    : name;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return response.data.size;
}
```

Crie `src/helpers/readBackup.ts`:

```ts
import { BackupPreview } from "@/types/backup";

// A Vercel limita o corpo das requisições a 4,5 MB; a API aceita até 4 MB
export const BACKUP_MAX_BYTES = 4 * 1024 * 1024;
export const BACKUP_WARNING_BYTES = 3.5 * 1024 * 1024;

const INVALID_FILE =
  "Arquivo inválido: escolha um backup .json.gz gerado pelo sistema.";
const tables = ["users", "userAvatars", "clients", "os"] as const;

// Prévia local: confere o básico e conta os registros. A validação completa é da API.
export async function readBackup(file: File): Promise<BackupPreview> {
  if (file.size > BACKUP_MAX_BYTES) {
    throw new Error("Arquivo muito grande (máx. 4 MB).");
  }

  let content: any;
  try {
    const stream = file
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    content = JSON.parse(await new Response(stream).text());
  } catch {
    throw new Error(INVALID_FILE);
  }

  if (content?.format !== "werk-backup") {
    throw new Error(INVALID_FILE);
  }
  if (content.version !== 1) {
    throw new Error("Versão de backup não suportada.");
  }
  if (!tables.every((table) => Array.isArray(content.data?.[table]))) {
    throw new Error(INVALID_FILE);
  }

  return {
    createdAt: content.createdAt,
    createdBy: content.createdBy,
    counts: {
      users: content.data.users.length,
      userAvatars: content.data.userAvatars.length,
      clients: content.data.clients.length,
      os: content.data.os.length,
    },
  };
}
```

- [ ] **Passo 4: Página, loading e sidebar**

Crie `src/app/(auth-routes)/backup/page.tsx`:

```tsx
import Backup from "@/app/components/backup/backup";
import { authOptions } from "@/lib/authOptions";
import { getServerApi } from "@/services/api/serverApi";
import { BackupStatus } from "@/types/backup";
import { isAxiosError } from "axios";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function BackupPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const apiServer = await getServerApi();
  let data: BackupStatus | undefined;
  try {
    ({ data } = await apiServer.get<BackupStatus>("backup/status"));
  } catch (error) {
    // Admin rebaixado no meio da sessão: a sessão ainda diz ADMIN, mas a API responde 403
    if (!(isAxiosError(error) && error.response?.status === 403)) {
      throw error;
    }
  }

  if (!data) {
    redirect("/");
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <Backup status={data} />
    </div>
  );
}
```

Crie `src/app/(auth-routes)/backup/loading.tsx`:

```tsx
import { Skeleton } from "@/app/components/ui/skeleton";

// Mesmos contêineres de backup/page.tsx e backup.tsx
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="mx-auto mt-4 w-full max-w-6xl space-y-6 px-4 py-4 sm:px-6 md:mt-0 md:px-8 lg:px-10 lg:py-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 sm:h-9 md:h-10" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
```

Em `src/components/sidebar-nav.tsx`, acrescente `DatabaseBackup` ao import do `lucide-react` e troque `adminNav` por:

```tsx
const adminNav = [
  { to: "/usuarios", label: "Usuários", icon: ShieldCheck },
  { to: "/backup", label: "Backup", icon: DatabaseBackup },
];
```

- [ ] **Passo 5: Tela com o card de backup**

Crie `src/app/components/backup/backup.tsx`:

```tsx
"use client";

import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { apiErrorMessage } from "@/helpers/apiErrorMessage";
import { downloadBackup } from "@/helpers/downloadBackup";
import { formatDateTime } from "@/helpers/format";
import { BACKUP_WARNING_BYTES } from "@/helpers/readBackup";
import { cn } from "@/lib/utils";
import { BackupLogEntry, BackupStatus } from "@/types/backup";
import { DatabaseBackup, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

const STALE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

// "há 12 dias, por Sergio (01/10/2026 14:30)"
export function describeLog(entry: BackupLogEntry) {
  return `${daysAgo(entry.created_at)}, por ${entry.userName} (${formatDateTime(entry.created_at)})`;
}

interface BackupProps {
  status: BackupStatus;
}

export default function Backup({ status }: BackupProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  const { lastBackup } = status;
  const stale =
    !lastBackup ||
    Date.now() - new Date(lastBackup.created_at).getTime() >
      STALE_DAYS * DAY_MS;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const size = await downloadBackup();
      toast.success("Backup gerado.");
      if (size > BACKUP_WARNING_BYTES) {
        toast.warning(
          "O backup está perto do limite de 4 MB para restauração pela tela.",
          { autoClose: 8000 },
        );
      }
      router.refresh();
    } catch (error) {
      toast.error(await apiErrorMessage(error, "Erro ao gerar o backup."));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-6xl space-y-6 px-4 py-4 sm:px-6 md:mt-0 md:px-8 lg:px-10 lg:py-8">
      <header className="min-w-0 space-y-1">
        <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
          Backup
        </h1>
        <p className="text-sm text-muted-foreground">
          Gere uma cópia de todos os dados ou restaure a partir de um arquivo.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <DatabaseBackup className="h-5 w-5" />
              Backup
            </CardTitle>
            <CardDescription>
              Baixa um arquivo com todos os dados: usuários, fotos, clientes e
              ordens de serviço.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 text-sm">
            <p
              className={cn(
                "flex items-start gap-2",
                stale && "font-medium text-destructive",
              )}
            >
              {stale && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
              {lastBackup
                ? `Último backup: ${describeLog(lastBackup)}`
                : "Nenhum backup feito ainda"}
            </p>
            <p className="text-muted-foreground">
              Guarde o arquivo em local seguro: ele contém dados de clientes e
              senhas criptografadas.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              className="h-11 w-full sm:w-auto"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? "Gerando..." : "Gerar backup"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Passo 6: Type-check**

```bash
cd /d/Projetos/werk-app
npx tsc --noEmit
```

Esperado: sem erros. Se o `pipeThrough(new DecompressionStream("gzip"))` de `readBackup.ts` der erro de tipo (`ReadableWritablePair<…, Uint8Array<ArrayBufferLike>>`), troque a linha por `.pipeThrough(new DecompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>)` e rode de novo.

- [ ] **Passo 7: Verificar no navegador (Playwright MCP)**

Antes, apague os registros de backup do banco local para ver o estado "nunca feito":

```bash
cd /d/Work/apiwerk
node -e "const p=new (require('@prisma/client').PrismaClient)();p.backupLog.deleteMany().then(r=>console.log('apagados',r.count)).finally(()=>p.\$disconnect())"
```

1. Como admin, a sidebar mostra "Backup" depois de "Usuários". `/backup` mostra o título, o card "Backup" e "Nenhum backup feito ainda" em vermelho, com o ícone de alerta.
2. Clique em "Gerar backup": o botão mostra "Gerando..." e um arquivo `werk-backup-<data>-<HHmm>.json.gz` é baixado (confira o nome no evento de download do Playwright). Aparece o toast "Backup gerado." e o texto vira "Último backup: hoje, por <nome do admin> (<data hora>)", sem o vermelho.
3. Recarregue `/backup`: o skeleton aparece rapidamente e o texto continua.
4. Envelhecer o registro: `node -e "const p=new (require('@prisma/client').PrismaClient)();p.backupLog.updateMany({data:{created_at:new Date(Date.now()-8*864e5)}}).then(()=>console.log('ok')).finally(()=>p.\$disconnect())"` (em `/d/Work/apiwerk`). Ao recarregar, aparece "Último backup: há 8 dias, por …" em vermelho.
5. Saia e entre como `basico@werk.com.br` / `Senha123`: a sidebar **não** mostra "Backup", e `/backup` redireciona para `/`.
6. Viewport de 375 px: os cards ficam empilhados, sem rolagem horizontal, e o botão ocupa a largura toda.

- [ ] **Passo 8: Commit (werk-app)**

```bash
cd /d/Projetos/werk-app
git status --short
git add -- src/types/backup.ts src/helpers/format.ts src/helpers/apiErrorMessage.ts src/helpers/downloadBackup.ts src/helpers/readBackup.ts "src/app/(auth-routes)/backup/page.tsx" "src/app/(auth-routes)/backup/loading.tsx" src/app/components/backup/backup.tsx src/components/sidebar-nav.tsx
git status --short
git commit -F - <<'EOF'
feat(backup): add admin backup page with status and download
EOF
```

---

### Tarefa 5: Front: restaurar backup

**Files:**
- Create: `src/app/components/backup/restore-backup-dialog.tsx`
- Modify: `src/app/components/backup/backup.tsx` (imports, estado, card "Restaurar")

**Interfaces:**
- Consumes (Tarefa 4): `readBackup`, `downloadBackup`, `apiErrorMessage`, `formatDateTime`, `describeLog`, `BackupPreview`. API: `POST /backup/restore` (Tarefa 3).
- Produces: `RestoreBackupDialog({ file: File; preview: BackupPreview; onClose: () => void })`.

- [ ] **Passo 1: Dialog de restauração**

Crie `src/app/components/backup/restore-backup-dialog.tsx`:

```tsx
"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { apiErrorMessage } from "@/helpers/apiErrorMessage";
import { downloadBackup } from "@/helpers/downloadBackup";
import { formatDateTime } from "@/helpers/format";
import { api } from "@/services/api/api";
import { BackupCounts, BackupPreview } from "@/types/backup";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { toast } from "react-toastify";

const CONFIRMATION_WORD = "RESTAURAR";

function plural(count: number, singular: string, pluralForm: string) {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : pluralForm}`;
}

// "4 usuários, 1.204 clientes, 3.877 ordens de serviço"
function describeCounts(counts: BackupCounts) {
  return [
    plural(counts.users, "usuário", "usuários"),
    plural(counts.clients, "cliente", "clientes"),
    plural(counts.os, "ordem de serviço", "ordens de serviço"),
  ].join(", ");
}

interface RestoreBackupDialogProps {
  file: File;
  preview: BackupPreview;
  onClose: () => void;
}

type Step = "idle" | "saving" | "restoring";

export function RestoreBackupDialog({
  file,
  preview,
  onClose,
}: RestoreBackupDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const busy = step !== "idle";

  const handleRestore = async () => {
    // Backup do estado atual antes de apagar tudo: é o "desfazer" do restore
    setStep("saving");
    try {
      await downloadBackup("-antes-da-restauracao");
    } catch (error) {
      toast.error(await apiErrorMessage(error, "Erro ao gerar o backup."));
      setStep("idle");
      return;
    }

    setStep("restoring");
    try {
      // Tipo fixo: o Windows pode rotular .gz como application/x-gzip ou sem tipo
      await api.post("/backup/restore", file, {
        headers: { "Content-Type": "application/gzip" },
      });
      toast.success("Restauração concluída. Entre novamente.");
      // Usuários e senhas mudaram: a sessão atual pode nem existir mais.
      // O dialog continua travado até o redirecionamento.
      setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
    } catch (error) {
      toast.error(await apiErrorMessage(error, "Erro ao restaurar o backup."));
      setStep("idle");
    }
  };

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restaurar backup</AlertDialogTitle>
          <AlertDialogDescription>
            Backup de {formatDateTime(preview.createdAt)}, feito por{" "}
            {preview.createdBy}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          <p>{describeCounts(preview.counts)}</p>
          <p className="font-medium text-destructive">
            Todos os dados atuais serão substituídos pelos do arquivo. As senhas
            dos usuários voltam às da data do backup. Antes de restaurar, um
            backup do estado atual será baixado automaticamente.
          </p>
          <div className="space-y-2">
            <Label htmlFor="restore-confirmation">
              Digite {CONFIRMATION_WORD} para confirmar
            </Label>
            <Input
              id="restore-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          {/* Button comum: o AlertDialogAction fecharia o dialog no clique */}
          <Button
            variant="destructive"
            onClick={handleRestore}
            disabled={busy || confirmation !== CONFIRMATION_WORD}
          >
            {step === "saving"
              ? "Salvando backup atual..."
              : step === "restoring"
                ? "Restaurando..."
                : "Restaurar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Passo 2: Card "Restaurar" na tela**

Em `src/app/components/backup/backup.tsx`:

1. Troque os imports de `readBackup`, dos tipos, do `lucide-react` e do `react`, e acrescente o do dialog:

```tsx
import { BACKUP_WARNING_BYTES, readBackup } from "@/helpers/readBackup";
import { BackupLogEntry, BackupPreview, BackupStatus } from "@/types/backup";
import { DatabaseBackup, TriangleAlert, Upload } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { RestoreBackupDialog } from "./restore-backup-dialog";
```

2. Dentro de `Backup`, logo depois de `const [generating, setGenerating] = useState(false);`, acrescente:

```tsx
  const inputRef = useRef<HTMLInputElement>(null);
  const [restore, setRestore] = useState<{
    file: File;
    preview: BackupPreview;
  } | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Zera o input: escolher o mesmo arquivo de novo precisa disparar o onChange
    event.target.value = "";
    if (!file) return;

    try {
      setRestore({ file, preview: await readBackup(file) });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
```

3. Troque `const { lastBackup } = status;` por `const { lastBackup, lastRestore } = status;`.

4. Dentro do `<div className="grid gap-6 md:grid-cols-2">`, depois do card "Backup", acrescente o card e o dialog:

```tsx
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Upload className="h-5 w-5" />
              Restaurar
            </CardTitle>
            <CardDescription>
              Substitui todos os dados atuais pelos do arquivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 text-sm">
            <p className="text-muted-foreground">
              Última restauração:{" "}
              {lastRestore ? describeLog(lastRestore) : "nunca"}
            </p>
          </CardContent>
          <CardFooter>
            <input
              ref={inputRef}
              type="file"
              accept=".gz,application/gzip"
              hidden
              onChange={handleFile}
            />
            <Button
              variant="outline"
              className="h-11 w-full sm:w-auto"
              onClick={() => inputRef.current?.click()}
            >
              Escolher arquivo
            </Button>
          </CardFooter>
        </Card>
      </div>

      {restore && (
        <RestoreBackupDialog
          file={restore.file}
          preview={restore.preview}
          onClose={() => setRestore(null)}
        />
      )}
```

O `</div>` acima fecha o grid. Remova o `</div>` original do grid para não ficar duplicado. O `</div>` final do componente (contêiner da página) continua.

- [ ] **Passo 3: Type-check**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Passo 4: Arquivos de teste do front**

```bash
cd /d/Work/apiwerk
# Helpers da API colados; gere um backup atual do banco local como base
reset_admin Senha123
TOKEN=$(login admin@werk.com.br Senha123 | json .token)
backup "$TOKEN" front.json.gz
tamper front.json.gz front-v2.json.gz 'b.version=2'
tamper front.json.gz sem-admin.json.gz 'b.data.users.forEach(u=>u.role="BASICO")'
printf '%%PDF-1.4 falso' > "$T/falso.json.gz"
snapshot     # anote H2
```

- [ ] **Passo 5: Pré-condição de segurança**

Confirme de novo que o front aponta para `http://localhost:3333/` (comando da "Preparação do front"). O restore apaga o banco para onde o front aponta.

- [ ] **Passo 6: Verificar no navegador (Playwright MCP)**

Entre como admin (`Senha123`) e abra `/backup`.

1. O card "Restaurar" mostra "Última restauração: nunca" (ou a última dos testes da API).
2. Escolha `falso.json.gz` (upload de arquivo do Playwright): aparece o toast "Arquivo inválido: escolha um backup .json.gz gerado pelo sistema." e o dialog não abre. Com `front-v2.json.gz`: o toast é "Versão de backup não suportada.".
3. Escolha `front.json.gz`: o dialog abre com "Backup de <data hora>, feito por admin@werk.com.br.", as contagens (ex.: "2 usuários, 3 clientes, 5 ordens de serviço") e o aviso em vermelho. "Restaurar" fica desabilitado. Digitar `restaurar` (minúsculo) não habilita; `RESTAURAR` habilita.
4. Clique em "Cancelar": o dialog fecha. Escolha **o mesmo** `front.json.gz` de novo: o dialog reabre.
5. Escolha `sem-admin.json.gz`, digite `RESTAURAR` e confirme: o backup `…-antes-da-restauracao.json.gz` é baixado. Depois aparece o toast "O backup não tem nenhum administrador ativo", o dialog continua aberto e volta a "Restaurar". Feche o dialog. `snapshot` no terminal = H2.
6. No terminal, altere o banco: `req POST /customer "$TOKEN" '{"nome":"Cliente Temporario","telefone":"81988887777","email":"t@teste.com","cpf":"86288366757"}'`. Escolha `front.json.gz`, digite `RESTAURAR` e confirme. O botão passa por "Salvando backup atual..." e "Restaurando...", e o dialog não fecha com Esc nesse intervalo. É baixado o `…-antes-da-restauracao.json.gz`, aparece o toast "Restauração concluída. Entre novamente." e o app vai para `/login`. No terminal, `snapshot` = H2 (o cliente temporário sumiu).
7. Entre de novo como admin: `/backup` mostra "Última restauração: hoje, por <nome do admin> (…)".

- [ ] **Passo 7: Commit (werk-app)**

```bash
cd /d/Projetos/werk-app
git status --short
git add -- src/app/components/backup/restore-backup-dialog.tsx src/app/components/backup/backup.tsx
git status --short
git commit -F - <<'EOF'
feat(backup): restore the database from a backup file

Shows a local preview of the file, requires typing RESTAURAR and downloads
a backup of the current state before sending the restore.
EOF
```

---

## Depois do deploy

1. **apiwerk primeiro:** push e deploy. A migration `add_backup_logs` roda em produção no `prisma migrate deploy` e só cria a tabela `backup_logs` e o enum `BackupAction`. A mudança é aditiva e não quebra o front atual. O Fluid compute já está ativo no projeto da Vercel (confirmado), então o restore tem até 300 s.
2. **werk-app depois.**
3. Em produção, como admin, gere o primeiro backup pela tela e confira o tamanho do arquivo. Bem abaixo de 3,5 MB, não há o que fazer. Perto disso, avalie o procedimento manual do README.
4. **Não teste o restore em produção** sem antes baixar um backup atual. O dialog já faz isso automaticamente, mas um backup manual guardado à parte é a garantia extra.
