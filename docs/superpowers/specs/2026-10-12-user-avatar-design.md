# Foto de perfil do usuário

Data: 2026-10-12
Status: em revisão

## Objetivo

Hoje o avatar de todo usuário é um círculo com as iniciais do nome. Esta mudança deixa cada usuário, Admin ou Básico, enviar, trocar e remover a **própria** foto de perfil. Onde as iniciais do usuário aparecem, a foto passa a aparecer no lugar delas. Quem não tem foto continua vendo as iniciais exatamente como hoje.

### Critérios de sucesso

- Qualquer usuário logado envia uma foto pela página de perfil, enquadra a imagem num recorte circular com arraste e zoom e vê a foto no perfil logo depois de salvar.
- A foto aparece no avatar grande do perfil e na lista de usuários do admin.
- O usuário remove a própria foto e o avatar volta às iniciais.
- Sem foto, o avatar é idêntico ao atual (iniciais e cores por perfil e situação).
- A foto só é servida a quem está logado.
- Depois de uma troca, o navegador nunca mostra a foto antiga.
- A API só aceita JPEG, PNG ou WebP de verdade (pela assinatura do arquivo) e de até 1 MB.
- Toda mensagem que pode aparecer na tela está em PT-BR.

### Decisões

- **A foto fica no Postgres**, sem storage externo. São poucos usuários e cerca de 100 KB por foto, então não há conta nova, credencial, cota nem custo, e o backup vem junto com o banco. Vercel Blob (gratuito só no plano Hobby, que não permite uso comercial) e Cloudflare R2 (10 GB grátis, mas com conta, chaves e SDK S3) foram descartados. Um storage externo volta a fazer sentido se o sistema passar a guardar muitas imagens, como fotos de equipamento na OS.
- **O front recorta e reduz a foto para 512×512 JPEG, qualidade 0,9, antes do envio.** O maior avatar tem 128 px na tela (256 px reais em tela retina), então não há perda visível. O arquivo fica em torno de 60–120 KB, bem abaixo do limite de ~4,5 MB de corpo de requisição da Vercel. Usamos JPEG porque o Safari antigo não gera WebP pelo `canvas`.
- **A imagem trafega crua no corpo**, não em multipart. O `express.raw` é aplicado só na rota de upload, então não entra dependência nova (`multer`) e o `express.json` global continua com o limite de 100 KB.
- **O front exibe a foto por um proxy no Next**, e a API continua 100% autenticada. Uma tag `<img>` não envia o header `Authorization`. A rota `/api/avatar/[id]` do Next lê o token da sessão (cookie) e repassa a requisição à API.
- **Usamos `<Image unoptimized />` do Next.** Sem `unoptimized`, o `src` vira `/_next/image?url=...`: quem busca a imagem é o servidor do Next, sem o cookie do usuário, o que dá 401. Além disso, o otimizador guarda o resultado em cache pela URL. Com `unoptimized`, o navegador busca `/api/avatar/[id]` direto, com o cookie, e continuamos tendo lazy loading e dimensões fixas.
- **`User.avatarUpdatedAt` indica se há foto e serve de versão para o cache.** A URL da foto leva `?v=<avatarUpdatedAt>`, então pode ser guardada em cache por um ano: uma foto nova gera uma URL nova.
- **Os bytes ficam numa tabela separada (`user_avatars`).** O `isAuthenticated` lê o usuário em toda requisição e não deve carregar a imagem junto.

### Fora do escopo

- O admin trocar ou remover a foto de outro usuário.
- Avatar no header ou na sidebar. Hoje não há avatar ali. Se passar a haver, `avatarUpdatedAt` vai para a sessão do NextAuth.
- Foto de cliente. As iniciais de `customer-card.tsx` e `customers/[id]` continuam como estão.
- Testes automatizados. Nenhum dos dois repositórios tem infraestrutura de testes, e a verificação desta feature é manual (veja "Verificação").

## Backend (apiwerk)

### Banco

Em `prisma/schema.prisma`:

```prisma
model User {
  // ...campos atuais
  avatarUpdatedAt DateTime?
  avatar          UserAvatar?
}

model UserAvatar {
  userId     String   @id
  data       Bytes
  mimeType   String   @db.VarChar(20)
  updated_at DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_avatars")
}
```

Migration criada com `npx prisma migrate dev --name add_user_avatar`. Ela só cria uma tabela e uma coluna nullable, sem tocar em dados existentes, e não precisa de `DEFAULT`.

### Seleção de campos

`avatarUpdatedAt: true` entra em `profileSelect` (`src/services/user/userSelect.ts`). `userSelect` herda o campo. A mudança é aditiva e o front atual ignora o campo novo. Endpoints que passam a devolvê-lo:

- `GET /me`, `PUT /me` e o novo `PUT /me/avatar` (via `profileSelect`)
- `GET /users`, `PUT /users/:id` (via `userSelect`)
- `POST /session`: o `AuthUserService` monta a resposta à mão, então o campo **não** entra ali. Nada no front precisa dele na sessão.

### Endpoints

Todos usam `isAuthenticated`, então um usuário com `mustChangePassword` recebe 403, como no resto da API.

| Rota | O que faz | Resposta |
| --- | --- | --- |
| `PUT /me/avatar` | Recebe a imagem crua no corpo. Faz upsert em `UserAvatar` e grava `avatarUpdatedAt = now()` numa `$transaction` | 200, perfil `{ id, name, email, role, mustChangePassword, avatarUpdatedAt }` |
| `DELETE /me/avatar` | `deleteMany` em `UserAvatar` e `avatarUpdatedAt = null` numa `$transaction`. Idempotente | 200, `{ message: "Foto removida" }` |
| `GET /users/:id/avatar` | Busca a foto do usuário `:id` | 200, bytes com `Content-Type` salvo e `Cache-Control: private, max-age=31536000, immutable`; 404 "Foto não encontrada" |

A rota de upload registra o parser só nela:

```ts
router.put(
  "/me/avatar",
  isAuthenticated,
  express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "1mb" }),
  new UploadAvatarController().handle,
);
```

### Validação

O schema do upload fica em `src/schemas/user.ts` (`avatarSchema` e `AvatarInput`). Ele recebe `{ mimeType: req.headers["content-type"], data: req.body }`:

- `mimeType`: `z.enum(["image/jpeg", "image/png", "image/webp"])`, erro "Formato de imagem inválido (use JPEG, PNG ou WebP)".
- `data`: precisa ser um `Buffer` não vazio. Com outro `Content-Type`, o `express.raw` não lê o corpo e `req.body` fica `{}`, o que dá o mesmo erro.
- **Assinatura do arquivo** (`refine`): os bytes iniciais precisam bater com o `mimeType` declarado. JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF` nos bytes 0–3 e `WEBP` nos bytes 8–11. Isso impede que a API sirva HTML ou SVG disfarçado de imagem. O erro é o mesmo de formato inválido.

O `:id` de `GET /users/:id/avatar` é validado com o `uuidParamSchema` que já existe em `src/schemas/common.ts`.

### Erros

`src/middlewares/erroHandle.ts` passa a mapear o erro do body-parser para corpo grande demais, ao lado do `entity.parse.failed`:

```ts
if ((err as { type?: string }).type === "entity.too.large") {
  return res.status(413).json({ message: "Imagem muito grande (máx. 1 MB)" });
}
```

Hoje esse erro só pode vir da rota de avatar. O `express.json` global também o lança acima de 100 KB, mas um JSON desse tamanho não acontece no uso normal. A mensagem genérica de imagem é aceitável nesse caso.

### Arquivos

Seguindo `.claude/rules/arquitetura.md`:

- `src/schemas/user.ts`: `avatarSchema`, `AvatarInput`
- `src/services/user/uploadAvatarService.ts`, `deleteAvatarService.ts`, `getAvatarService.ts`
- `src/controllers/user/uploadAvatarController.ts`, `deleteAvatarController.ts`, `getAvatarController.ts`
- `src/routers.ts`: as três rotas
- `src/middlewares/erroHandle.ts`: o 413
- `src/services/user/userSelect.ts`: `avatarUpdatedAt`
- `prisma/schema.prisma` e a migration
- `README.md` (endpoints) e a tabela de respostas do `CLAUDE.md`
- `dist/` regenerado com `npm run build`

O `GetAvatarController` é o único que responde binário: `res.setHeader("Content-Type", mimeType)`, o `Cache-Control` e `return res.status(200).send(data)`.

## Frontend (werk-app)

### Proxy: `src/app/api/avatar/[id]/route.ts`

- `GET`: `getServerSession(authOptions)`. Sem token, responde 401.
- Chama `GET {NEXT_PUBLIC_API}/users/:id/avatar` com `Authorization: Bearer <token>`.
- Em sucesso, devolve os bytes com o `Content-Type` da API e `Cache-Control: private, max-age=31536000, immutable`. O `private` impede que a CDN da Vercel guarde a foto.
- Em erro, repassa o status da API (401, 403, 404) sem corpo.

### Componente: `src/app/components/user-avatar.tsx`

```tsx
interface UserAvatarProps {
  id: string;
  name: string;
  avatarUpdatedAt: string | null;
  className?: string;          // tamanho, anel, sombra, tipografia
  fallbackClassName?: string;  // cor de fundo e texto das iniciais
}
```

- Com `avatarUpdatedAt` (e sem falha de carregamento), renderiza um contêiner `relative overflow-hidden rounded-full` com `<Image unoptimized fill src={`/api/avatar/${id}?v=${encodeURIComponent(avatarUpdatedAt)}`} alt={`Foto de ${name}`} sizes="128px" className="object-cover" />`.
- Sem foto, ou depois de um `onError`, renderiza as iniciais com `initials(name)`, como hoje.
- O estado de erro é resetado quando `avatarUpdatedAt` muda.

Substituições:

- `src/app/components/profile/profile.tsx`: o avatar grande sobre a capa, com as mesmas classes de tamanho, anel e sombra de hoje.
- `src/app/components/users/user-list.tsx`: o `UserAvatar` local passa a usar o componente compartilhado. Ele mantém os tamanhos `md` e `lg` e as cores das iniciais por perfil e situação (inativo neutro, admin `primary`, básico `accent`).

### Trocar e remover a foto no perfil

- Um botão redondo com ícone `Camera` (lucide) fica sobre o canto inferior direito do avatar, com `aria-label="Alterar foto"`, e abre um `<input type="file" accept="image/jpeg,image/png,image/webp" hidden>`.
- Arquivo de outro tipo ou acima de 10 MB é barrado com toast: "Escolha uma imagem JPEG, PNG ou WebP de até 10 MB."
- **Modal de recorte**, em `src/app/components/profile/avatar-crop-dialog.tsx`, com o `Dialog` de `ui/` e a lib `react-easy-crop`: `aspect={1}`, `cropShape="round"`, arraste, slider de zoom (1 a 3) e os botões "Cancelar" e "Salvar foto".
- Ao salvar, um helper em `src/helpers/cropImage.ts` desenha a área recortada (`croppedAreaPixels`) num `canvas` de 512×512 e gera `toBlob("image/jpeg", 0.9)`.
- Envio: `api.put("/me/avatar", blob, { headers: { "Content-Type": "image/jpeg" } })`. O botão fica desabilitado com "Salvando..." durante o envio.
- O link "Remover foto" só aparece quando `avatarUpdatedAt` existe. Ele abre o `confirmation-modal` existente e, se confirmado, chama `api.delete("/me/avatar")`.
- Em sucesso: atualiza o estado local `avatarUpdatedAt` (com o valor devolvido pelo `PUT`, ou `null` depois do `DELETE`), chama `router.refresh()` e mostra o toast "Foto atualizada." ou "Foto removida.".
- Em erro: toast com `error.response?.data?.message`, ou "Erro ao salvar a foto." como fallback.

### Tipos e dependências

- `src/types/user.ts`: `avatarUpdatedAt: string | null` em `User`.
- `profile.tsx`: `avatarUpdatedAt: string | null` na prop `me`.
- `npm install react-easy-crop`.

## Verificação

**API**, com `npm run dev` e o Postgres do docker, por scripts `curl` no scratchpad:

1. `PUT /me/avatar` com JPEG, PNG e WebP válidos → 200, com `avatarUpdatedAt` preenchido.
2. `GET /users/:id/avatar` → bytes idênticos aos enviados, com `Content-Type` e `Cache-Control` corretos.
3. Um `.txt` enviado com `Content-Type: image/jpeg` → 400 "Formato de imagem inválido…".
4. `Content-Type: image/gif` → 400.
5. Corpo acima de 1 MB → 413 "Imagem muito grande (máx. 1 MB)".
6. Sem token → 401. Usuário com `mustChangePassword` → 403.
7. `GET /users/abc/avatar` → 400 "Id inválido". Usuário sem foto → 404 "Foto não encontrada".
8. `DELETE /me/avatar` duas vezes → 200 nas duas, com `avatarUpdatedAt` voltando a `null` em `GET /me`.
9. `GET /me` e `GET /users` trazendo `avatarUpdatedAt`.
10. `npm run build` sem erros de tipo.

**Front**, com `npm run build` sem erros e o app rodando contra a API local, usando o Playwright:

1. No perfil, escolher uma foto, recortar e salvar: a foto aparece no avatar grande.
2. Na lista de usuários (admin), a foto aparece na linha do usuário e no card mobile. Usuários sem foto continuam com as iniciais coloridas.
3. Trocar a foto: a nova aparece sem precisar recarregar com cache limpo.
4. Remover a foto: as iniciais voltam no perfil e na lista.
5. Escolher um arquivo `.pdf` ou de mais de 10 MB: aparece o toast de erro e o modal não abre.

## Entrega

1. **apiwerk primeiro.** As mudanças são aditivas, então o deploy da API não quebra o front atual. A entrega inclui migration, código, `dist/` regenerado, `README.md` e `CLAUDE.md`. A migration roda em produção no próximo deploy (`prisma migrate deploy`) e só cria a tabela `user_avatars` e a coluna `users.avatarUpdatedAt`.
2. **werk-app depois.** Inclui a dependência, o proxy, o componente e o perfil.
3. Commits separados por repositório. Commit e push só quando pedidos.
