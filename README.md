# Werk OS API

![Node.js](https://img.shields.io/badge/Node.js-22.14.0-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

API REST para gestão de **Ordens de Serviço (OS)**, clientes e usuários de assistências técnicas. Centraliza o registro de atendimentos, o histórico de serviços por cliente, o controle de garantias e os valores de serviço e material.

## Sumário

- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
- [Modelo de dados](#modelo-de-dados)
- [Arquitetura](#arquitetura)
- [Deploy](#deploy)
- [Roadmap](#roadmap)
- [Autor](#autor)

## Stack

| Camada         | Tecnologia                                  |
| -------------- | ------------------------------------------- |
| Runtime        | Node.js 22.14.0                             |
| Linguagem      | TypeScript 5                                |
| Framework HTTP | Express 4                                   |
| ORM            | Prisma 5                                    |
| Banco de dados | PostgreSQL                                  |
| Autenticação   | JWT (`jsonwebtoken`) + `bcryptjs`           |
| Validação      | Zod 4 + `cpf-cnpj-validator`                |
| Deploy         | Vercel                                      |

## Funcionalidades

**Usuários**

- Perfis **Admin** e **Básico**. O Básico cadastra e edita clientes e OS; só o Admin exclui clientes e OS e gerencia usuários
- Cadastro de usuários pelo admin, com senha temporária gerada pelo sistema e troca obrigatória no primeiro acesso
- Edição de nome e perfil, desativação e redefinição de senha pelo admin
- Perfil do usuário: alteração do próprio nome e da própria senha (mínimo de 8 caracteres, com letra e número)
- Login com emissão de token JWT (validade de 30 dias)

**Clientes**

- Cadastro, edição, exclusão e consulta
- Validação de CPF e CNPJ, com bloqueio de documentos duplicados
- Contagem de OS por cliente
- Proteção contra exclusão de clientes que possuem OS vinculadas

**Ordens de Serviço**

- Cadastro, edição, exclusão e consulta
- Listagem de OS por cliente
- Registro de horário de chegada e saída do técnico
- Controle de valores de serviço e material, com cálculo automático do total
- Controle de garantia de peça e de serviço
- Classificação por tipo de atendimento: `GARANTIA`, `FORADEGARANTIA`, `ORCAMENTO` e `CONTRATO`

## Pré-requisitos

- [Node.js 22.14.0](https://nodejs.org/) (`nvm use 22.14.0`)
- npm
- [Docker](https://www.docker.com/) (opcional, para subir o PostgreSQL localmente)

## Instalação e execução

```bash
# 1. Clone o repositório
git clone https://github.com/sergiorbotelho/werk-os-api.git
cd werk-os-api

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp example.env .env   # edite os valores conforme a seção abaixo

# 4. Suba o PostgreSQL local (porta 5433)
docker compose up -d

# 5. Gere o Prisma Client e aplique as migrations
npx prisma generate
npx prisma migrate dev

# 6. Compile e popule o banco com o usuário administrador
npm run build
npx prisma db seed

# 7. Inicie o servidor em modo de desenvolvimento
npm run dev
```

O seed cria o administrador inicial abaixo. Só um admin cadastra usuários, então use-o para o primeiro acesso. Enquanto a senha dele for `123456`, o sistema obriga a troca no login.

| E-mail             | Senha    |
| ------------------ | -------- |
| admin@werk.com.br  | 123456   |

## Variáveis de ambiente

| Variável       | Descrição                               | Exemplo                                                    |
| -------------- | --------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL` | String de conexão do PostgreSQL         | `postgresql://postgres:123456@localhost:5433/dbWerk`       |
| `JWT_SECRET`   | Chave usada para assinar os tokens JWT  | `uma_chave_longa_e_aleatoria`                              |
| `PORT`         | Porta HTTP do servidor                  | `3333`                                                     |

O exemplo de `DATABASE_URL` corresponde ao banco criado pelo `docker-compose.yml`.

## Scripts

| Comando               | Descrição                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `npm run dev`         | Inicia o servidor com recarregamento automático (`ts-node-dev`)  |
| `npm run build`       | Compila o TypeScript para `dist/` e verifica os tipos            |
| `npm start`           | Executa a versão compilada (`dist/src/server.js`)                |
| `npx prisma migrate dev --name <nome>` | Cria e aplica uma nova migration               |
| `npx prisma db seed`  | Popula o banco (requer `npm run build` antes)                    |

## Autenticação

Todas as rotas, exceto `POST /session`, exigem um token JWT no cabeçalho. A API consulta o usuário a cada requisição: um usuário desativado recebe 401 na hora, e quem tem a troca de senha pendente só acessa `GET /me` e `PUT /me/password` (as demais rotas respondem 403).

```http
Authorization: Bearer <token>
```

**Requisição**

```http
POST /session
Content-Type: application/json

{
  "email": "admin@werk.com.br",
  "password": "123456"
}
```

**Resposta `200`**

```json
{
  "id": "uuid-do-usuario",
  "name": "Administrador",
  "email": "admin@werk.com.br",
  "role": "ADMIN",
  "mustChangePassword": false,
  "token": "jwt_token"
}
```

## Endpoints

### Usuários

| Método | Rota                         | Acesso | Descrição |
| ------ | ---------------------------- | ------ | --------- |
| POST   | `/session`                   | público | Autentica e retorna o token JWT |
| GET    | `/me`                        | logado | Dados do usuário logado (`role`, `mustChangePassword`) |
| PUT    | `/me`                        | logado | Altera o próprio nome |
| PUT    | `/me/password`               | logado | Troca a própria senha (`currentPassword`, `newPassword`) |
| GET    | `/users`                     | admin  | Lista os usuários: `{ users, count }` |
| POST   | `/users`                     | admin  | Cadastra (`name`, `email`, `role`) e devolve `{ user, temporaryPassword }` |
| PUT    | `/users/:id`                 | admin  | Altera `name`, `role` e `active` |
| POST   | `/users/:id/reset-password`  | admin  | Gera nova senha temporária: `{ temporaryPassword }`. Retorna 400 se o admin usar o próprio id (ele troca a senha em `PUT /me/password`) |

### Clientes

| Método | Rota            | Descrição                                  |
| ------ | --------------- | ------------------------------------------ |
| GET    | `/customers`    | Lista os clientes com o total de OS de cada |
| GET    | `/customer/:id` | Retorna um cliente                          |
| POST   | `/customer`     | Cadastra um cliente                         |
| PUT    | `/customer/:id` | Atualiza um cliente                         |
| DELETE | `/customer/:id` | Exclui um cliente sem OS vinculadas (somente admin) |

### Ordens de Serviço

| Método | Rota                    | Descrição                       |
| ------ | ----------------------- | ------------------------------- |
| GET    | `/os`                   | Lista as OS com dados do cliente |
| GET    | `/os/:id`               | Retorna uma OS                   |
| GET    | `/os/:id/pdf`           | Gera o PDF da OS                 |
| GET    | `/os/client/:clientId`  | Lista as OS de um cliente        |
| POST   | `/os`                   | Cadastra uma OS                  |
| PUT    | `/os/:id`               | Atualiza uma OS                  |
| DELETE | `/os/:id`               | Exclui uma OS (somente admin)    |

### Erros

Todos os erros retornam o mesmo formato:

```json
{ "message": "Cliente não encontrado" }
```

| Status | Quando ocorre |
| ------ | ------------- |
| 400    | Corpo ou id inválido, JSON malformado ou regra de negócio violada |
| 401    | Token ausente, inválido ou expirado, ou credenciais incorretas |
| 403    | Ação exclusiva de admin, troca de senha pendente ou login de usuário desativado |
| 404    | Registro não encontrado |
| 409    | CPF/CNPJ ou e-mail já cadastrado |
| 500    | Erro inesperado no servidor |

## Modelo de dados

O schema completo está em [`prisma/schema.prisma`](prisma/schema.prisma).

### Cliente (`clients`)

| Campo      | Tipo   | Observação                          |
| ---------- | ------ | ----------------------------------- |
| `id`       | Int    | Autoincremento                      |
| `nome`     | String | Obrigatório                         |
| `telefone` | String | Obrigatório                         |
| `email`    | String |                                     |
| `cpf`      | String | Único. Informe CPF ou CNPJ          |
| `cnpj`     | String | Único. Informe CPF ou CNPJ          |
| `cep`      | String |                                     |
| `endereco` | String |                                     |
| `numero`   | String |                                     |
| `bairro`   | String |                                     |
| `cidade`   | String |                                     |
| `uf`       | String | 2 caracteres                        |

### Ordem de Serviço (`os`)

| Campo               | Tipo          | Observação                                  |
| ------------------- | ------------- | ------------------------------------------- |
| `id`                | Int           | Autoincremento                              |
| `client_id`         | Int           | Enviado como `cliente_id` no corpo da requisição |
| `contato`           | String        | Obrigatório                                 |
| `modeloEquipamento` | String        | Obrigatório                                 |
| `horaChegada`       | String        | Formato `HH:mm`                             |
| `horaSaida`         | String        | Formato `HH:mm`, opcional                   |
| `defeito`           | String        | Defeito relatado pelo cliente               |
| `defeitoConstatado` | String        | Defeito identificado pelo técnico           |
| `solucao`           | String        |                                             |
| `valServico`        | Decimal(30,2) |                                             |
| `valMaterial`       | Decimal(30,2) |                                             |
| `total`             | Decimal(30,2) | `valServico + valMaterial`, calculado no cadastro |
| `garantiaPeca`      | String        |                                             |
| `garantiaServico`   | String        |                                             |
| `tipoServico`       | Enum          | Padrão: `FORADEGARANTIA`                    |

## Arquitetura

```
src/
├── server.ts          # Inicialização do Express
├── routers.ts         # Definição de todas as rotas
├── middlewares/       # Autenticação e tratamento global de erros
├── controllers/       # Camada HTTP: recebe a requisição e valida o corpo
├── services/          # Regras de negócio e acesso ao banco via Prisma
├── schemas/           # Schemas de validação (Zod)
├── helpers/           # Respostas HTTP padronizadas
├── errors/ e utils/   # Classes de erro da aplicação
└── prisma/            # Instância única do Prisma Client
```

Fluxo de uma requisição:

```
rota → isAuthenticated → requireAdmin (rotas de admin) → controller → service → Prisma → PostgreSQL
```

## Deploy

O projeto é publicado na Vercel a partir do código já compilado em `dist/`. Durante o deploy, o script `vercel-build` executa `prisma generate`, `prisma migrate deploy` e `prisma db seed`.

Por isso, ao alterar qualquer arquivo em `src/` ou `prisma/seed.ts`, execute `npm run build` e inclua os arquivos atualizados de `dist/` no mesmo commit.

## Roadmap

- [ ] Paginação nas listagens
- [ ] Filtros avançados
- [x] Perfis de acesso e permissões
- [ ] Upload de anexos
- [ ] Histórico de alterações
- [ ] Dashboard com indicadores
- [ ] Relatórios em PDF
- [ ] Testes automatizados
- [ ] Backup e restauração do banco (somente admin)

## Licença

Projeto desenvolvido para fins de estudo e portfólio.

## Autor

**Sergio Botelho**

- GitHub: [@sergiorbotelho](https://github.com/sergiorbotelho)
- LinkedIn: [sergiobotelho](https://linkedin.com/in/sergiobotelho)
