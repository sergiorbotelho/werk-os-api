# Perfis de usuário (Admin e Básico), gestão de usuários e perfil

Data: 2026-10-12
Status: em revisão

## Objetivo

Hoje todo usuário logado pode tudo, inclusive criar usuários e apagar clientes e OS. Esta mudança cria dois perfis fixos, **Admin** e **Básico**, aplicados no backend (`apiwerk`) e refletidos no front (`werk-app`). Ela também cria uma área em que o admin gerencia usuários e uma página de perfil em que cada usuário troca o próprio nome e a própria senha.

### Critérios de sucesso

- Um usuário Básico cria e edita clientes e OS, vê as listas e o PDF, mas não apaga cliente nem OS e não gerencia usuários. A regra vale na API, não só no front.
- O admin cadastra, lista, edita (nome e perfil), desativa e reativa usuários, e redefine a senha deles.
- Cadastro e redefinição geram uma senha temporária aleatória, mostrada uma única vez ao admin. O usuário que entra com ela é levado para a troca de senha e não consegue usar mais nada até criar a própria.
- Desativar um usuário bloqueia o acesso dele na próxima requisição, sem esperar o token vencer.
- Senhas novas seguem a regra: de 8 a 72 caracteres, com pelo menos uma letra e um número. Senhas antigas continuam valendo no login.
- O sistema nunca fica sem um admin ativo.
- Toda mensagem que pode aparecer na tela está em PT-BR.

### Decisões

- **Perfil fixo, não permissões por usuário.** O admin escolhe Admin ou Básico. O que cada perfil pode fazer está no código. Um terceiro perfil pode ser criado depois.
- **O perfil e a situação são lidos do banco a cada requisição**, não do token. Rebaixar, desativar ou redefinir a senha vale na hora. O custo é uma consulta por chave primária por requisição.
- **Senha temporária gerada pelo sistema**, no cadastro e na redefinição. O admin nunca conhece a senha definitiva de ninguém.
- **Desativar em vez de excluir.** Nenhum usuário é apagado.
- **Idioma:** mensagens que podem chegar à tela em PT-BR, inclusive as do domínio de usuário e auth que hoje estão em inglês. Nomes de campo, código e logs continuam em inglês.

### Fora do escopo

- **Backup e restauração do banco.** Fica para uma spec própria, só para admin, usando o `requireAdmin` desta. Ela deve tratar com cuidado a cópia de segurança automática antes de restaurar, a validação do arquivo e a confirmação explícita.
- Excluir usuário.
- Recuperar a senha por e-mail.
- Encerrar sessões abertas quando a senha muda. Se for preciso depois, o token passa a carregar uma versão de senha que invalida os tokens anteriores. Hoje, quem tem a senha vazada é desativado, e o bloqueio é imediato.
- Expiração da senha temporária.

## Permissões

| Ação | Básico | Admin |
| --- | :---: | :---: |
| Ver e listar clientes, OS e PDF | ✓ | ✓ |
| Criar e editar cliente | ✓ | ✓ |
| Criar e editar OS | ✓ | ✓ |
| Apagar cliente | ✗ | ✓ |
| Apagar OS | ✗ | ✓ |
| Gerenciar usuários (listar, cadastrar, editar, desativar, redefinir senha) | ✗ | ✓ |
| Ver e editar o próprio perfil (nome e senha) | ✓ | ✓ |

**Sempre existe um admin ativo:** um admin não pode alterar o próprio `role` nem o próprio `active`. Só um admin ativo mexe em usuários, e ele nunca mexe em si mesmo, então sempre resta pelo menos um admin ativo.

## Backend (apiwerk)

### Banco

Em `prisma/schema.prisma`:

```prisma
enum Role {
  ADMIN
  BASICO
}

model User {
  // ...campos atuais
  role               Role    @default(BASICO)
  active             Boolean @default(true)
  mustChangePassword Boolean @default(false)
}
```

Migration com `npx prisma migrate dev --name add_user_roles`. As três colunas já têm `DEFAULT`, então a migration é segura para a tabela com dados. Ela termina com um ajuste de dado, **aprovado explicitamente pelo usuário**:

```sql
UPDATE "users" SET "role" = 'ADMIN' WHERE "email" = 'admin@werk.com.br' AND "role" <> 'ADMIN';
```

Os demais usuários existentes ficam como Básico, e o admin os promove pela tela.

### Seed (`prisma/seed.ts`)

- O `create` passa a usar `role: "ADMIN"`.
- O `update` continua sem mexer em `role` nem em `active`, para não desfazer o que foi decidido pela tela.
- Depois do upsert: se a senha do `admin@werk.com.br` ainda for `123456` (`compare` do bcrypt), o seed liga `mustChangePassword`. A senha do seed é pública no repositório e fura a regra nova. O seed roda a cada deploy e faz isso enquanto a senha não for trocada.

### Tipos do Express

`src/@types/express/index.d.ts` ganha `user_role: Role` (de `@prisma/client`) ao lado de `user_id`.

### Middlewares (`src/middlewares/`)

- **`isAuthenticated`** (alterado): valida o JWT como hoje e busca o usuário com `findUnique({ where: { id: sub }, select: { id, role, active, mustChangePassword } })`.
  - Se o usuário não existir ou estiver inativo, responde 401 "Não autorizado".
  - Se `mustChangePassword` estiver ligado, responde 403 "Troca de senha obrigatória".
  - Senão, preenche `req.user_id` e `req.user_role`.
- **`isAuthenticatedPendingPassword`** (novo): faz o mesmo, mas deixa passar quem tem `mustChangePassword`. É usado só em `GET /me` e `PUT /me/password`. Os dois middlewares compartilham uma função interna que recebe a opção, para a lógica não ser duplicada.
- **`requireAdmin`** (novo): vem depois de `isAuthenticated` e responde 403 "Acesso negado" quando `req.user_role !== "ADMIN"`.

Os erros são lançados como `AppError`, como no `isAuthenticated` atual.

### Rotas

| Método e rota | Middlewares | Corpo | Resposta |
| --- | --- | --- | --- |
| `POST /session` | — | `{ email, password }` | `{ id, name, email, role, mustChangePassword, token }` |
| `GET /me` | `isAuthenticatedPendingPassword` | — | `{ id, name, email, role, mustChangePassword }` |
| `PUT /me` | `isAuthenticated` | `{ name }` | o usuário atualizado (mesmos campos de `GET /me`) |
| `PUT /me/password` | `isAuthenticatedPendingPassword` | `{ currentPassword, newPassword }` | `{ message }` |
| `GET /users` | `isAuthenticated`, `requireAdmin` | — | `{ users: [...], count }` |
| `POST /users` | `isAuthenticated`, `requireAdmin` | `{ name, email, role }` | 201 `{ user, temporaryPassword }` |
| `PUT /users/:id` | `isAuthenticated`, `requireAdmin` | `{ name?, role?, active? }` | o usuário atualizado |
| `POST /users/:id/reset-password` | `isAuthenticated`, `requireAdmin` | — | `{ temporaryPassword }` |
| `DELETE /customer/:id` | `isAuthenticated`, **`requireAdmin`** | — | sem mudança |
| `DELETE /os/:id` | `isAuthenticated`, **`requireAdmin`** | — | sem mudança |

O usuário devolvido por `GET /users`, `POST /users` e `PUT /users/:id` tem `id, name, email, role, active, mustChangePassword, created_at`, sempre com `select` e nunca com `password`. A lista é ordenada por `name`.

O front de hoje não usa `POST /users` nem os campos novos, então nada quebra para ele.

### Regras nos services (`src/services/user/`)

- **Login (`AuthUserService`):** confere e-mail e senha como hoje (401 "E-mail ou senha incorretos"). Com a senha correta e o usuário inativo, responde 403 "Usuário desativado. Fale com o administrador." O token continua igual (30 dias, `sub` = id).
- **Cadastro (`CreateUserService`):** e-mail duplicado dá 409 "E-mail já cadastrado". Gera a senha temporária, grava o hash com `mustChangePassword: true` e devolve a senha em texto puro só na resposta.
- **Edição (`UpdateUserService`):** usuário inexistente dá 404 "Usuário não encontrado". Se o id for o do próprio admin e o corpo trouxer `role` ou `active` diferente do atual, responde 400 "Você não pode alterar seu próprio perfil ou situação".
- **Redefinição (`ResetUserPasswordService`):** usuário inexistente dá 404. Gera uma nova senha temporária, grava o hash e liga `mustChangePassword`.
- **Perfil (`UpdateProfileService`):** altera só o `name` do próprio usuário.
- **Troca de senha (`ChangePasswordService`):**
  - Se a senha atual não conferir, responde 400 "Senha atual incorreta".
  - Se a nova for igual à atual, responde 400 "A nova senha deve ser diferente da atual".
  - Senão, grava o hash e desliga `mustChangePassword`.
- O detalhe do usuário (`GET /me`) passa a usar `findUnique` com `await` e 404 "Usuário não encontrado".
- O hash continua com `bcryptjs`, custo 8, como hoje.

### Schemas (`src/schemas/`)

- `common.ts`: `uuidParamSchema` ("Id inválido"), para os ids de usuário.
- `user.ts`:
  - `passwordSchema`: string de 8 a 72 caracteres, com `/[A-Za-z]/` e `/\d/`. Mensagens: "A senha deve ter no mínimo 8 caracteres", "A senha deve ter no máximo 72 caracteres", "A senha deve conter pelo menos uma letra", "A senha deve conter pelo menos um número".
  - `createUserSchema`: `{ name, email, role }`. Não tem mais `password`. `role` é `z.enum(Role)` vindo de `@prisma/client`.
  - `updateUserSchema`: `{ name?, role?, active? }`, com pelo menos um campo.
  - `updateProfileSchema`: `{ name }`.
  - `changePasswordSchema`: `{ currentPassword: string obrigatória, newPassword: passwordSchema }`.
  - `authUserSchema`: **não** aplica a regra nova. Ele exige só e-mail válido e senha preenchida, para senhas antigas de 6 caracteres continuarem entrando.
  - Todas as mensagens em PT-BR.
  - Exporta os tipos `z.infer` de cada schema.

### Senha temporária (`src/utils/generateTemporaryPassword.ts`)

10 caracteres sorteados com `crypto.randomInt`, de um alfabeto sem caracteres ambíguos (`0 O 1 l I`), com pelo menos uma letra e um número. Ela passa no `passwordSchema`. A senha nunca é gravada em texto puro nem escrita em log.

### Nomes e arquivos

Seguem `.claude/rules/arquitetura.md`: um controller e um service por caso de uso, em camelCase e no singular. Por exemplo: `listUsersController.ts`/`ListUsersService`, `updateUserController.ts`, `resetUserPasswordController.ts`, `updateProfileController.ts`, `changePasswordController.ts`. Os arquivos legados do domínio de usuário (`authUserControllers`, `createUserServices`, `detailUserControllers`) são alterados no lugar, sem renomear.

## Front (werk-app)

### Sessão

- `src/lib/authOptions.ts`:
  - `authorize` repassa `name`, `role` e `mustChangePassword` da resposta de `/session`.
  - Quando a API responde com erro, `authorize` lança `new Error(message da API)`, para o login mostrar "Usuário desativado…" em vez de uma mensagem genérica.
  - O callback `jwt` guarda `name`, `role` e `mustChangePassword`, e trata `trigger === "update"` para aceitar novos valores de `name` e `mustChangePassword`.
  - O callback `session` expõe esses campos.
- `src/types/next-auth.d.ts`: `role: "ADMIN" | "BASICO"` e `mustChangePassword: boolean` em `Session["user"]`.
- `src/app/login/page.tsx`: mostra `result.error` quando ele vier preenchido. O fallback "Internal server error" vira "Erro ao entrar. Tente novamente."

### Guardas de rota

- `src/app/(auth-routes)/layout.tsx`: se `session.user.mustChangePassword`, `redirect("/alterar-senha")`.
- Página `/usuarios`: se `session.user.role !== "ADMIN"`, `redirect("/")`.

### Telas

1. **`/alterar-senha`**, fora de `(auth-routes)` e sem menu lateral.
   - Protegida no servidor: quem não está logado vai para `/login`, e quem não tem troca pendente vai para `/`.
   - Campos: senha atual (a temporária), nova senha e confirmação. A regra aparece ao vivo, com cada item marcado conforme a digitação ("Mínimo de 8 caracteres", "Pelo menos uma letra", "Pelo menos um número"). Também tem um botão "Sair".
   - Ao salvar, chama `PUT /me/password`, depois `update({ mustChangePassword: false })`, e vai para `/`.
2. **`/perfil`**, para todos, com o item "Meu perfil" no menu lateral.
   - Cartão **Dados**: nome editável, e-mail e perfil só para leitura. Ao salvar, chama `PUT /me` e depois `update({ name })`.
   - Cartão **Trocar senha**: o mesmo formulário da tela anterior, num componente compartilhado.
3. **`/usuarios`**, só para admin, com o item "Usuários" no menu lateral apenas para admin. Segue o padrão dos módulos atuais (lista, card, skeleton, modal).
   - A lista mostra nome, e-mail, um badge de perfil (Admin ou Básico) e um badge de situação (Ativo ou Inativo).
   - **"Novo usuário"** abre um modal com nome, e-mail e perfil.
   - **Editar** abre um modal com nome, perfil e situação (Ativo/Inativo). Na linha do próprio admin, perfil e situação ficam desabilitados.
   - **"Redefinir senha"** passa pelo `confirmation-modal`.
   - **Diálogo da senha temporária**, aberto depois de criar ou redefinir: a senha em destaque, um botão "Copiar" e o aviso "Esta senha não será exibida novamente. Repasse ao usuário; ele deverá criar uma nova no primeiro acesso." Fechar o diálogo descarta a senha.

### Esconder ações do Básico

Os botões de excluir dos modais de cliente e de OS só aparecem com `session.user.role === "ADMIN"`.

### Mudanças com a sessão aberta (`src/services/api/api.ts`)

- **401** (usuário desativado ou token inválido): continua como hoje, com logout.
- **403:** o interceptor chama `GET /me`. Se `mustChangePassword` estiver ligado, ele atualiza a sessão e manda para `/alterar-senha`. Senão, devolve o erro, e o toast mostra a mensagem ("Acesso negado"). A própria chamada a `/me` não passa por essa checagem (ela usa `isAuthenticatedPendingPassword` e não devolve 403), e um 403 de `POST /session` também fica de fora, para não haver laço.
- **Usuário rebaixado:** a sessão continua com o perfil antigo até o próximo login (no máximo 12 h). A API recusa as ações com "Acesso negado". Esse limite é aceito.

## Erros

Todos passam pelo `errorHandler` atual e saem no formato `{ message }`.

| Situação | Status | Mensagem |
| --- | --- | --- |
| Token inválido, usuário inexistente ou inativo | 401 | Não autorizado |
| E-mail ou senha errados no login | 401 | E-mail ou senha incorretos |
| Login de usuário inativo | 403 | Usuário desativado. Fale com o administrador. |
| Básico em rota de admin | 403 | Acesso negado |
| Troca de senha pendente | 403 | Troca de senha obrigatória |
| Senha atual errada | 400 | Senha atual incorreta |
| Nova senha igual à atual | 400 | A nova senha deve ser diferente da atual |
| Admin alterando o próprio perfil ou situação | 400 | Você não pode alterar seu próprio perfil ou situação |
| E-mail já usado | 409 | E-mail já cadastrado |
| Usuário não encontrado | 404 | Usuário não encontrado |

## Deploy

1. **Backend primeiro.** O front atual continua funcionando com a API nova. A partir daí, usuários Básico que tentarem excluir recebem "Acesso negado".
2. **Front depois**, porque ele depende de `role` e `mustChangePassword`.
3. Logo após o deploy, entrar com `admin@werk.com.br`. Se a senha ainda for `123456`, o sistema obriga a troca. Em seguida, promover pela tela quem precisar ser admin.

O `dist/` do backend é regenerado e commitado junto com o código-fonte, como de costume.

## Verificação

Os dois projetos não têm testes, e esta mudança não cria um framework de testes.

- `npm run build` sem erros nos dois repositórios.
- Roteiro com `curl` contra o Postgres local (Docker):
  - O login antigo com senha de 6 caracteres continua funcionando.
  - Um Básico recebe 403 em `DELETE /customer/:id`, `DELETE /os/:id` e `/users`. Um admin consegue os três.
  - Um usuário criado entra com a senha temporária: `GET /me` e `PUT /me/password` funcionam, e as outras rotas dão 403. Depois da troca, tudo fica liberado.
  - Ao trocar a senha: a senha atual errada dá 400, a nova igual à atual dá 400, e uma nova fora da regra dá 400 com a mensagem certa.
  - Desativar faz o token existente receber 401 na hora, e o login dele dá 403. Reativar devolve o acesso.
  - Um admin alterando o próprio perfil ou a própria situação recebe 400.
  - Redefinir a senha de um usuário logado faz a próxima requisição dele receber 403 "Troca de senha obrigatória".
  - O seed liga `mustChangePassword` no admin com senha `123456` e não mexe em um admin com a senha já trocada.
- No navegador (Playwright):
  - troca obrigatória no primeiro acesso;
  - perfil (nome e senha), com o nome atualizado sem novo login;
  - tela de usuários: criar, editar, desativar, redefinir e copiar a senha temporária;
  - botões de excluir escondidos para o Básico;
  - redefinição com a sessão aberta levando para `/alterar-senha`.

## Documentação

- Backend:
  - `README.md`: endpoints novos e permissões.
  - `CLAUDE.md`: tabela de respostas, seção Auth (perfis, `requireAdmin`, `mustChangePassword`, sem mais "There are no roles") e a regra de idioma (mensagens visíveis no front em PT-BR).
  - `.claude/rules/arquitetura.md`: a mesma regra de idioma e o uso de `requireAdmin` em rotas restritas.
- Front: `CLAUDE.md` com a sessão (novos campos), as guardas de rota, as telas novas e o tratamento de 403 no interceptor.
