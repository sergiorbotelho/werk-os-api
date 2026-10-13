# Backup e restauração do banco de dados

Data: 2026-10-13
Status: em revisão

## Objetivo

Hoje não há como o admin ter uma cópia dos dados fora do Neon. Esta mudança cria uma área exclusiva do admin para **gerar e baixar um backup** do banco e para **restaurar** o banco a partir desse arquivo.

O backup protege contra dois cenários:

1. **Erro humano:** alguém exclui ou altera clientes e OS, e é preciso voltar ao estado da data do backup.
2. **Perda ou troca do provedor:** o banco do Neon some, a conta se perde ou o sistema migra para outro Postgres. O arquivo precisa restaurar um banco novo, vazio, em que só existem as tabelas criadas pelo `prisma migrate deploy` e o admin do seed.

### Critérios de sucesso

- Só usuários ADMIN veem a área e conseguem chamar os endpoints. BÁSICO recebe 403 na API e é redirecionado no front.
- O admin gera e baixa um arquivo `.json.gz` com todos os dados: usuários (com hash de senha), fotos de perfil, clientes e OS.
- Restaurar esse arquivo deixa o banco com exatamente os mesmos registros, ids, datas e valores do momento do backup, e a próxima OS ou cliente criado recebe um id que não colide com os restaurados.
- Um arquivo inválido, corrompido, de outra versão ou inconsistente é recusado **antes** de qualquer dado ser apagado. Uma falha no meio da restauração desfaz tudo.
- O restore funciona num banco novo, com só o admin do seed.
- A tela mostra quando e por quem foi feito o último backup e alerta quando ele tem mais de 7 dias ou nunca foi feito.
- Antes de restaurar, o front salva automaticamente um backup do estado atual.
- Toda mensagem que pode aparecer na tela está em PT-BR.

### Decisões

- **Backup lógico gerado pela API, em JSON compactado com gzip.** A API roda como função serverless na Vercel, onde não existem `pg_dump`/`pg_restore` nem disco persistente. A API lê as tabelas com o Prisma e compacta com o `zlib` nativo do Node, sem dependência nova. Empacotar o binário do `pg_dump` na função foi descartado: a versão precisa casar com a do Neon, o bundle cresce e restaurar significaria executar SQL enviado pelo usuário. Os recursos do Neon (PITR e branches) foram descartados como solução única, porque não deixam um arquivo fora do provedor nem dão uma tela ao admin.
- **O restore substitui tudo, inclusive usuários, senhas e fotos.** É o único modo que atende ao cenário 2. As senhas voltam às da data do backup, e o admin é avisado disso antes de confirmar.
- **O arquivo não é criptografado.** A proteção depende de onde o admin guarda o arquivo, e a tela avisa que ele contém dados de clientes e senhas criptografadas. As senhas estão em bcrypt. Criptografia por senha do admin foi descartada (senha esquecida significa backup inútil), e também por chave fixa da API (se a conta da Vercel se perder junto com o Neon, nenhum backup abre).
- **Backup só manual, com lembrete.** A API guarda a data e o autor de cada backup e de cada restauração (não guarda o arquivo), e a tela alerta depois de 7 dias.
- **Limite de 4 MB para o arquivo compactado.** A Vercel limita o corpo da requisição **e** da resposta das funções a 4,5 MB. Uma OS ocupa cerca de 0,6 KB em JSON e o gzip comprime JSON cerca de 8 vezes, então 4 MB comportam dezenas de milhares de OS. As fotos de perfil pesam mais: cerca de 130 KB cada em base64, porque JPEG não comprime mais. Acima do limite, vale o procedimento manual com `pg_dump` documentado no README.
- **Sem pedir a senha do admin de novo no restore.** O corpo da requisição é o arquivo cru, e a senha teria que ir num header. A confirmação digitada e o backup automático do estado atual cobrem o erro acidental.

### Fora do escopo

- Backup automático agendado (cron) com envio para um destino externo (e-mail, Google Drive). Fica para uma segunda etapa.
- Guardar arquivos de backup no servidor ou um histórico de arquivos para baixar depois.
- Restaurar só parte dos dados (só clientes e OS, ou só um cliente).
- Restaurar backups com `version` diferente de 1. Quando o formato mudar, a versão nova traz o conversor.
- Invalidar os tokens JWT existentes no restore. Não há mecanismo para isso hoje.
- Testes automatizados. Nenhum dos dois repositórios tem infraestrutura de testes, e a verificação é manual (veja "Verificação").

## Backend (apiwerk)

### Banco

Em `prisma/schema.prisma`:

```prisma
enum BackupAction {
  BACKUP
  RESTORE
}

// Fora do backup e não apagada pelo restore: o histórico sobrevive às restaurações
model BackupLog {
  id         Int          @id @default(autoincrement())
  action     BackupAction
  userName   String       @db.VarChar(255)
  userEmail  String       @db.VarChar(255)
  counts     Json
  created_at DateTime     @default(now())

  @@map("backup_logs")
}
```

- Não há FK para `users`, porque o restore troca os usuários. Nome e e-mail são cópias do momento da ação.
- `counts` é `{ users, userAvatars, clients, os }` do arquivo gerado ou restaurado.
- A migration (`npx prisma migrate dev --name add_backup_logs`) só cria a tabela e o enum. Não toca em dados existentes.

### Formato do arquivo

Nome: `werk-backup-AAAA-MM-DD-HHmm.json.gz`, com a data no fuso `America/Recife`. O conteúdo é este JSON compactado com gzip:

```json
{
  "format": "werk-backup",
  "version": 1,
  "createdAt": "2026-10-13T17:30:00.000Z",
  "createdBy": "admin@werk.com.br",
  "migration": "20261013010542_add_user_avatar",
  "data": {
    "users": [],
    "userAvatars": [],
    "clients": [],
    "os": []
  }
}
```

- `data` traz **todas** as colunas de cada tabela, com os nomes do Prisma (`client_id`, `created_at`, `avatarUpdatedAt`), inclusive `users.password` (hash bcrypt).
- Serialização: datas em ISO 8601, `Decimal` como string (`"150.00"`, sem perda de precisão), `UserAvatar.data` (bytes) em base64.
- `migration` é o nome da última migration aplicada (`_prisma_migrations`, maior `finished_at`). É só informativo, para diagnóstico. O restore não o compara. O que define a compatibilidade é `version`.
- `backup_logs` e `_prisma_migrations` não entram no arquivo.

### Schemas

Em `src/schemas/backup.ts`:

- Um schema Zod de linha por tabela (`backupUserSchema`, `backupUserAvatarSchema`, `backupClientSchema`, `backupOsSchema`), que valida e converte: datas ISO para `Date`, decimais (`/^-?\d+(\.\d{1,2})?$/`) para string aceita pelo Prisma, base64 para `Buffer`, enums com `z.enum(Role)` e `z.enum(TipoServico)` de `@prisma/client`, e `mimeType` com os tipos do avatar (`avatarMimeTypes`).
- `backupFileSchema`: `format: z.literal("werk-backup")` e `version: z.literal(1)`, com mensagem "Versão de backup não suportada", além de `createdAt`, `createdBy`, `migration` e `data` com os quatro arrays.
- **Checagem de colunas em tempo de build.** Para cada tabela, uma asserção de tipo exige que as chaves do schema de linha sejam exatamente as do model Prisma (`User`, `UserAvatar`, `Client`, `Os`):

  ```ts
  type SameKeys<A, B> = [keyof A] extends [keyof B]
    ? [keyof B] extends [keyof A] ? true : false
    : false;

  const usersHaveAllColumns: SameKeys<z.infer<typeof backupUserSchema>, User> = true;
  ```

  Se alguém adicionar uma coluna ao schema do Prisma e não incluí-la no backup, o `npm run build` falha. Ao adicionar uma coluna obrigatória, o schema de linha deve aceitar a ausência dela com um `default`, para que backups antigos continuem restauráveis.
- Tipos exportados: `BackupFile`, `BackupCounts`.

### Endpoints

Todos usam `isAuthenticated` + `requireAdmin`.

| Rota | O que faz | Resposta |
| --- | --- | --- |
| `GET /backup/status` | Último `BACKUP` e último `RESTORE` em `backup_logs` | 200, `{ lastBackup, lastRestore }`, cada um `{ userName, created_at, counts }` ou `null` |
| `POST /backup` | Gera o arquivo. Se ele passar de 4 MB, lança `AppError` 413. Senão grava um `BackupLog` `BACKUP` e devolve o arquivo | 200, binário. Detalhes abaixo |
| `POST /backup/restore` | Valida o arquivo e substitui todos os dados (veja "Restauração") | 200, `{ message: "Backup restaurado", counts }` |

`POST /backup` usa `POST` porque tem efeito colateral (grava o registro). Cabeçalhos da resposta:

- `Content-Type: application/gzip`
- `Content-Disposition: attachment; filename="werk-backup-AAAA-MM-DD-HHmm.json.gz"`
- `Access-Control-Expose-Headers: Content-Disposition`, porque o front está em outra origem e o `cors()` padrão não expõe esse header
- `Cache-Control: no-store`

A rota de restore registra o parser só nela, como a de avatar:

```ts
router.post(
  "/backup/restore",
  isAuthenticated,
  requireAdmin,
  raw({ type: ["application/gzip", "application/x-gzip"], limit: "4mb" }),
  new RestoreBackupController().handle,
);
```

### Geração (`POST /backup`)

1. Lê as quatro tabelas com `findMany` (todas as colunas, `orderBy: { id: "asc" }`, ou `userId` em `user_avatars`) e a última migration aplicada. As leituras rodam em uma `$transaction` para que o arquivo seja um retrato consistente.
2. Monta o JSON, serializa e compacta com `zlib.gzipSync`.
3. Se o resultado passar de 4 MB (`4 * 1024 * 1024` bytes): `AppError("Backup maior que o limite de 4 MB. Use o procedimento manual do README.", 413)`. Nada é registrado.
4. Grava o `BackupLog` `BACKUP` com o nome e o e-mail do admin (lidos por `req.user_id`) e as contagens.
5. O service devolve `{ fileName, buffer }`, e o controller envia com os cabeçalhos acima.

### Restauração (`POST /backup/restore`)

**Validação, antes de tocar no banco:**

1. O corpo precisa ser um `Buffer` não vazio que começa com a assinatura gzip `1F 8B`. Com outro `Content-Type`, o `express.raw` não lê o corpo e `req.body` fica `{}`, o que cai no mesmo erro. Mensagem: "Arquivo inválido: envie um backup .json.gz gerado pelo sistema".
2. Descompacta com `zlib.gunzipSync(buffer, { maxOutputLength: 64 * 1024 * 1024 })`, que protege contra uma "bomba de gzip", e faz o `JSON.parse`. Qualquer falha dá 400 com a mesma mensagem.
3. `backupFileSchema.parseAsync`. Erros de Zod viram 400 pelo `errorHandler`.
4. Integridade, com `AppError(..., 400)`:
   - ids únicos em cada tabela; `email`, `cpf` e `cnpj` únicos onde não são nulos. Mensagem: "Backup inconsistente: registros duplicados em <tabela>".
   - todo `os.client_id` existe em `clients`, e todo `userAvatars.userId` existe em `users`. Mensagem: "Backup inconsistente: registro relacionado não encontrado".
   - pelo menos um usuário com `role = ADMIN` e `active = true`. Mensagem: "O backup não tem nenhum administrador ativo". Sem ele, ninguém conseguiria entrar para gerenciar o sistema.

**Escrita, numa única `prismaClient.$transaction(async (tx) => ..., { maxWait: 10_000, timeout: 120_000 })`:**

1. `` tx.$executeRaw`TRUNCATE TABLE user_avatars, os, clients, users` ``. No Postgres, o `TRUNCATE` é transacional e trava as tabelas, então requisições concorrentes esperam o fim do restore. `backup_logs` e `_prisma_migrations` não são tocadas.
2. `createMany` em lotes de 1000 linhas, na ordem das FKs: `users` → `userAvatar` → `client` → `os`. Os ids, `created_at`, `update_at` e `avatarUpdatedAt` originais são gravados como estão no arquivo. **Verificar na implementação** que o Prisma 5.16 grava o valor explícito em campos `@updatedAt` no `createMany` em vez de sobrescrever com `now()`.
3. Reajusta as sequências dos ids autoincrement:

   ```sql
   SELECT setval(pg_get_serial_sequence('clients', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM clients;
   SELECT setval(pg_get_serial_sequence('os', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM os;
   ```

4. Grava o `BackupLog` `RESTORE` com o nome e o e-mail do admin, lidos **antes** do `TRUNCATE`.

Qualquer erro dentro da transação desfaz tudo, e o banco fica como estava. Um erro do Prisma não previsto pela validação (ex.: `P2002`) segue o `errorHandler` normal.

**Efeito nas sessões:** o `isAuthenticated` lê o usuário do banco a cada requisição. Depois do restore, um token continua válido se o usuário existir e estiver ativo no backup. Um usuário que não existe no backup recebe 401 na próxima requisição. As senhas voltam às do backup. O front encerra a sessão do admin que restaurou.

### Erros

`src/middlewares/erroHandle.ts` passa a escolher a mensagem do `entity.too.large` pelo limite do parser que lançou o erro (o body-parser preenche `err.limit` em bytes):

| Origem | Mensagem (413) |
| --- | --- |
| `/backup/restore` (limite de 4 MB) | "Arquivo muito grande (máx. 4 MB)" |
| demais (avatar de 1 MB, JSON global de 100 KB) | "Imagem muito grande (máx. 1 MB)", como hoje |

Acima de 4,5 MB, quem responde é a própria Vercel (`413 FUNCTION_PAYLOAD_TOO_LARGE`, sem `{ message }`). O front impede esse caso ao barrar arquivos acima de 4 MB antes do envio.

### Arquivos

Seguindo `.claude/rules/arquitetura.md`:

- `prisma/schema.prisma` e a migration `add_backup_logs`
- `src/schemas/backup.ts`: schemas de linha, `backupFileSchema`, a checagem de colunas, `BackupFile`, `BackupCounts`
- `src/services/backup/getBackupStatusService.ts`, `createBackupService.ts`, `restoreBackupService.ts`
- `src/controllers/backup/getBackupStatusController.ts`, `createBackupController.ts`, `restoreBackupController.ts`
- `src/routers.ts`: as três rotas
- `src/middlewares/erroHandle.ts`: a mensagem do 413 por limite
- `README.md`: endpoints, e uma seção "Backup e restauração" com o uso da tela e o procedimento manual
- `CLAUDE.md`: a tabela de respostas e uma regra "ao adicionar uma coluna ou tabela, atualize `src/schemas/backup.ts`; uma tabela nova também entra no `TRUNCATE`, na ordem do `createMany` e no `SameKeys`"
- `dist/` regenerado com `npm run build`

### Procedimento manual (README)

É a rede de segurança para quando o backup passar de 4 MB, a API estiver fora do ar ou for preciso um dump nativo. Usa o `pg_dump` 18 que já vem no container do `docker-compose`, sem instalar nada. A connection string é a **direta** do Neon (sem `-pooler`):

```bash
# Backup
docker exec api-werk-postgres pg_dump --format=custom --no-owner --no-privileges "<url-direta>" > werk.dump

# Restauração num banco vazio
docker exec -i api-werk-postgres pg_restore --no-owner --no-privileges --dbname "<url-direta>" < werk.dump
```

## Frontend (werk-app)

### Rota e navegação

- `src/app/(auth-routes)/backup/page.tsx`: página server-side no padrão de `usuarios/page.tsx`. Redireciona para `/` quem não é ADMIN, busca `GET /backup/status` com `getServerApi()` e trata o 403 de admin rebaixado no meio da sessão.
- `src/app/(auth-routes)/backup/loading.tsx`: skeleton dos dois cards.
- `src/components/sidebar-nav.tsx`: `{ to: "/backup", label: "Backup", icon: DatabaseBackup }` em `adminNav`, depois de "Usuários".
- `src/types/backup.ts`: `BackupStatus`, `BackupCounts` e o formato do arquivo usado na prévia.

### Tela: `src/app/components/backup/backup.tsx`

Componente cliente com dois cards (`ui/card`).

**Card "Backup":**

- "Último backup: há 12 dias, por Sergio (13/10/2026 14:30)", ou "Nenhum backup feito ainda".
- Destaque de alerta (cor `destructive` e ícone `TriangleAlert`) quando nunca houve backup ou quando o último tem mais de 7 dias.
- Aviso: "Guarde o arquivo em local seguro: ele contém dados de clientes e senhas criptografadas."
- Botão "Gerar backup" ("Gerando..." durante a requisição):
  - `api.post("/backup", null, { responseType: "blob" })`.
  - O nome vem do `Content-Disposition`. Se o header não vier, usa `werk-backup.json.gz`.
  - O download é feito por object URL e `<a download>`, como em `order-pdf-modal.tsx`.
  - Em sucesso, mostra o toast "Backup gerado." e chama `router.refresh()`. Se o arquivo passar de 3,5 MB, mostra também um toast de aviso: "O backup está perto do limite de 4 MB para restauração pela tela."

**Card "Restaurar":**

- "Substitui todos os dados atuais pelos do arquivo." e "Última restauração: há 3 dias, por Sergio", ou "nunca".
- Botão "Escolher arquivo" que abre um `<input type="file" accept=".gz,application/gzip" hidden>`.

### Prévia: `src/helpers/readBackup.ts`

`readBackup(file: File)`:

1. Arquivo acima de 4 MB: erro "Arquivo muito grande (máx. 4 MB)."
2. Descompacta com `file.stream().pipeThrough(new DecompressionStream("gzip"))` e faz o `JSON.parse`.
3. Confere `format === "werk-backup"`, `version === 1` e os quatro arrays em `data`.
4. Devolve `{ createdAt, createdBy, counts }`.

Qualquer falha gera o toast "Arquivo inválido: escolha um backup .json.gz gerado pelo sistema." e o dialog não abre. A validação completa continua na API.

### Confirmação: `src/app/components/backup/restore-backup-dialog.tsx`

Usa o `AlertDialog` de `ui/`.

- Prévia: "Backup de 13/10/2026 14:30, feito por admin@werk.com.br", seguida das contagens: "4 usuários, 1.204 clientes, 3.877 ordens de serviço".
- Aviso em vermelho: "Todos os dados atuais serão substituídos pelos do arquivo. As senhas dos usuários voltam às da data do backup. Antes de restaurar, um backup do estado atual será baixado automaticamente."
- Campo "Digite RESTAURAR para confirmar". O botão "Restaurar" fica desabilitado até o texto ser exatamente `RESTAURAR`.
- Ao confirmar:
  1. "Salvando backup atual...": chama `POST /backup` e baixa o arquivo como `werk-backup-…-antes-da-restauracao.json.gz`. Se falhar, o restore **não** acontece e aparece o toast com a mensagem da API.
  2. "Restaurando...": `api.post("/backup/restore", file, { headers: { "Content-Type": "application/gzip" } })`.
  3. Durante os dois passos, o dialog não fecha (Esc, clique fora e Cancelar ficam desabilitados).
- Em sucesso: toast "Restauração concluída. Entre novamente." e `signOut({ callbackUrl: "/login" })`.
- Em erro: toast com `error.response?.data?.message`, ou "Erro ao restaurar o backup." como fallback. O dialog continua aberto.

### Erros com `responseType: "blob"`

Com `responseType: "blob"`, o corpo de erro do `POST /backup` chega como `Blob`. O helper `src/helpers/apiErrorMessage.ts` lê o `Blob` com `text()` e faz `JSON.parse` para extrair `message`. O fallback é "Erro ao gerar o backup.".

## Verificação

**API**, com `npm run dev` e o Postgres do docker populado (alguns usuários, um com foto, clientes e OS com valores decimais), por scripts `curl` no scratchpad:

1. `POST /backup` como ADMIN → 200, `application/gzip`, `Content-Disposition` e `Access-Control-Expose-Headers` corretos. O arquivo descompactado tem os quatro arrays com as contagens do banco.
2. `GET /backup/status` → `lastBackup` preenchido com o nome do admin; `lastRestore` `null`.
3. Alterar dados (criar cliente e OS, excluir uma OS, trocar a senha de um usuário) e restaurar o arquivo do passo 1 → 200. O banco volta exatamente ao estado do backup: mesmas contagens, ids, `created_at`, `update_at`, valores decimais e bytes da foto. A senha antiga volta a funcionar. `backup_logs` mantém os registros.
4. Depois do restore, `POST /customer` e `POST /os` → ids maiores que os restaurados, sem 409.
5. Restore num banco recém-criado (`migrate reset` + seed) → 200. O admin do backup consegue entrar.
6. Um `.txt` com `Content-Type: application/gzip` → 400. `Content-Type: application/json` → 400.
7. Um gzip válido com JSON que não é backup, outra `version`, um backup sem admin ativo, com OS apontando para cliente inexistente ou com e-mails duplicados → 400 com a mensagem esperada, e o banco intacto.
8. Uma bomba de gzip (pequena compactada, mais de 64 MB descompactada) → 400.
9. Corpo acima de 4 MB → 413 "Arquivo muito grande (máx. 4 MB)". O avatar acima de 1 MB continua com 413 "Imagem muito grande (máx. 1 MB)".
10. Rollback: forçar uma falha no meio da transação (temporariamente, num lote de `os`) → erro, e o banco fica exatamente como estava antes.
11. Como BÁSICO, as três rotas → 403. Sem token → 401.
12. `npm run build` sem erros de tipo. Adicionar uma coluna de teste a `Client` no schema do Prisma faz o build falhar na checagem de colunas (e a coluna é removida depois).

**Front**, com `npm run build` sem erros e o app rodando contra a API local, usando o Playwright:

1. Como ADMIN, "Backup" aparece na sidebar e a página mostra "Nenhum backup feito ainda" com o alerta.
2. "Gerar backup" baixa o arquivo e atualiza o "Último backup".
3. Restaurar: escolher o arquivo mostra a prévia com as contagens. O botão só habilita com `RESTAURAR`. O backup "antes-da-restauracao" é baixado, o restore conclui e o app volta para `/login`.
4. Um arquivo `.pdf` renomeado para `.json.gz` mostra o toast de erro e o dialog não abre.
5. Como BÁSICO, "Backup" não aparece na sidebar e `/backup` redireciona para `/`.

## Entrega

1. **Pré-requisito:** confirmar no painel da Vercel que o projeto da API usa Fluid compute (Settings → Functions), que dá 300 s de duração. Sem ele, o limite do plano Hobby é de 10 s, apertado para o restore.
2. **apiwerk primeiro.** A mudança é aditiva, então o deploy da API não quebra o front atual. A entrega inclui migration, código, `dist/` regenerado, `README.md` e `CLAUDE.md`. A migration roda em produção no próximo deploy (`prisma migrate deploy`) e só cria a tabela `backup_logs` e o enum `BackupAction`.
3. **werk-app depois:** rota, tela, dialog, helpers e o item da sidebar.
4. Commits separados por repositório. Commit e push só quando pedidos.
