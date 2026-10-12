# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Werk OS API: an Express + TypeScript + Prisma (PostgreSQL) REST API for a repair shop. It manages service orders ("OS", Ordem de Serviço), customers (`Client`), and users. Domain names, field names, and the customer/OS error messages are in Portuguese (`nome`, `telefone`, `defeito`, `valServico`, "Cliente não encontrado"). Keep new code consistent with that. Every message that can reach the screen (Zod and `AppError` messages, in every domain including user/auth) is in Brazilian Portuguese. The user domain keeps English identifiers and field names (`name`, `role`, `mustChangePassword`), and logs and commit messages stay in English.

## Commands

```bash
npm run dev              # ts-node-dev --transpile-only src/server.ts (no type checking)
npm run build            # tsc --build → dist/ (use this to type-check)
npm start                # node dist/src/server.js
docker compose up -d     # local Postgres on localhost:5433 (postgres/123456, db dbWerk)
npx prisma migrate dev --name <name>   # create + apply a migration after editing prisma/schema.prisma
npx prisma generate
npx prisma db seed       # runs dist/prisma/seed.js, so build first
```

Required env vars (see `example.env`): `DATABASE_URL`, `JWT_SECRET`, `PORT`. `dotenv` is installed but never imported. Env values in `.env` reach `process.env` only because Prisma Client loads `.env` itself when it is imported.

There are no tests and no linter.

## Deployment (Vercel) — `dist/` is committed

`vercel.json` serves the **prebuilt, committed** `dist/src/server.js`. Vercel does not compile the TypeScript. `vercel-build` only runs `prisma generate && prisma migrate deploy && prisma db seed`, and the seed also runs from `dist/prisma/seed.js`. After changing anything in `src/` or `prisma/seed.ts`, run `npm run build` and commit the regenerated `dist/` files with the source change. If you rename or delete a source file, delete its stale `.js` file in `dist/` too.

`prisma migrate deploy` runs against a production database that already has data. When a migration adds a required column, hand-edit the generated SQL to give it a default (see `20260523022953_migrate_teset`, which uses `ADD COLUMN IF NOT EXISTS ... DEFAULT ''`).

## Architecture

Request flow: `src/server.ts` → `src/routers.ts` (all routes in one file) → `isAuthenticated` middleware → controller class → service class → `prismaClient` (singleton in `src/prisma/index.ts`).

### Controllers and error handling

Controllers live in `src/controllers/<domain>/`. Each is a class with an `async handle(req, res)` method. Routes register them as `new XController().handle`, so `this` is not available inside `handle`.

The architecture rules for new code are in `.claude/rules/arquitetura.md`.

Controllers have no try/catch. They validate the route id with `idParamSchema` (`src/schemas/common.ts`) and the body with the Zod schemas in `src/schemas/` (Zod v4 syntax, e.g. `{ error: "..." }`), then pass the **parsed** result to the service. Every error reaches the global `errorHandler` (`src/middlewares/erroHandle.ts`) through `express-async-errors`, which is imported first in `server.ts`. The handler maps:

- `ZodError` → 400 with only the first issue's message
- `AppError` (`src/utils/appError.ts`) → its `statusCode`
- Prisma `P2002` → 409, `P2003` → 400, `P2025` → 404
- malformed JSON body → 400
- anything else → 500, logged

Every error response is `{ message }`. The front end reads only `error.response.data.message` and status 401.

Unused helper: `checkIdIsValid` (a UUID check) in `helpers/validation.ts`.

### Services

Services live in `src/services/<domain>/`. Each is a class with an `async execute(props)` method that holds the business rules and Prisma calls, and throws `AppError(message, status)` for expected failures. Inputs are typed with `z.infer` types exported from the schemas, and ids arrive as numbers.

Business rules in services:

- Creating or updating a customer rejects a CPF/CNPJ that another customer already has (409).
- A customer that has OS records cannot be deleted (400).
- Creating or updating an OS requires an existing client (404).
- `Os.total` is `valServico + valMaterial`, computed with `Prisma.Decimal` on create and on update. On update, a money field missing from the body keeps its stored value.
- No list endpoint is paginated. Pagination code is commented out in the services.

The OS PDF is built by `src/reports/osPdf.ts` (`buildOsPdfDefinition`, a pure function ported from the front end's `pdfOrder.tsx`) and rendered by `src/lib/pdf.ts` (`renderPdf`, pdfmake 0.2.13 server API with the Roboto fonts from `pdfmake/build/vfs_fonts`). The logo is embedded as base64 in `src/reports/logo.ts`, because `tsc` does not copy images into `dist/`. Dates use the `America/Recife` time zone, since Vercel runs in UTC.

### Response shapes

The front end (`werk-app`, Next.js) depends on these shapes, which are inconsistent:

| Endpoint | Response |
| --- | --- |
| `GET /customers` | `{ customers: [...with totalOs], count }` |
| `GET /customer/:id` | the customer object, 404 if missing |
| `GET /os` | `{ os: [...] }`, each with the full `client` |
| `GET /os/client/:clientId` | `{ os: [...], count }`, with `count` of this client's OS |
| `GET /os/:id` | the OS object (with `id` and `tipoServico`, without `client`), 404 if missing |
| `GET /os/:id/pdf` | the OS PDF (`application/pdf`, `inline`, `no-store`), generated on every request; 404 if missing |
| `POST /customer` | the customer object (201) |
| `POST /os` | `{ os }` (201) |
| `POST /users` | `{ user, temporaryPassword }` (201) |
| `POST /session` | `{ id, name, email, role, mustChangePassword, token }` |
| `PUT /customer/:id`, `PUT /os/:id` | the updated record (200) |
| `GET /me`, `PUT /me` | `{ id, name, email, role, mustChangePassword }` |
| `PUT /me/password` | `{ message }` |
| `GET /users` | `{ users: [...], count }`, each without `password` |
| `PUT /users/:id` | the updated user |
| `POST /users/:id/reset-password` | `{ temporaryPassword }` |
| `DELETE` routes | `{ message }` |

### Auth

`POST /session` returns a JWT (30-day expiry, `sub` = user id), plus `role` and `mustChangePassword`. Email lookup at login is case-insensitive, and the login does not apply the new password rule, so old 6-character passwords still work.

`isAuthenticated` expects `Authorization: Bearer <token>` and reads the user from the database on every request (`role`, `active`, `mustChangePassword`). A missing or inactive user gets 401, and a user with `mustChangePassword` gets 403 "Troca de senha obrigatória". It sets `req.user_id` and `req.user_role`, typed through `src/@types/express/index.d.ts` (`typeRoots` in tsconfig). `isAuthenticatedPendingPassword` is the same but lets a pending user through; only `GET /me` and `PUT /me/password` use it. `requireAdmin` goes after `isAuthenticated` and returns 403 "Acesso negado" for non-admins.

Roles (`Role` enum): `ADMIN` can do everything. `BASICO` can read everything and create and edit customers and OS, but cannot delete customers or OS or manage users. Admins create users with `POST /users`, which generates a temporary password (`src/utils/generateTemporaryPassword.ts`) returned once and sets `mustChangePassword`. `POST /users/:id/reset-password` does the same for an existing user. An admin cannot change their own `role` or `active`, which guarantees at least one active admin. Users are deactivated, never deleted. The first admin comes from the seed: `admin@werk.com.br` / `123456`, and the seed forces a password change while that password is unchanged. New passwords need 8–72 characters with at least one letter and one digit (`passwordSchema`).

### Data model

The schema is in `prisma/schema.prisma`.

- `User` uses UUID ids. `Client` and `Os` use autoincrement ints.
- `User.role` (`ADMIN` | `BASICO`, default `BASICO`), `User.active` (default `true`) and `User.mustChangePassword` (default `false`).
- `Client.cpf` and `Client.cnpj` are optional but unique, and at least one of them is required. CPF/CNPJ are validated with `cpf-cnpj-validator` in `src/schemas/customer.ts`, using `createCustomerSchema` and `updateCustomerSchema`. Only the create schema enforces "at least one"; the update service enforces it too.
- OS request bodies use `cliente_id`, and services map it to the Prisma column `client_id`.
- `TipoServico` is a Prisma enum. `src/schemas/order.ts` imports it from `@prisma/client`.
- Hours (`horaChegada`, `horaSaida`) are `"HH:mm"` strings. Validation also accepts `"HH:mm:ss"`, because older records may have seconds. `horaSaida` may be `""`. Money fields are `Decimal(30,2)`.

`tsconfig` has `strict: false`.

Treat `src/routers.ts` as the source of truth for routes.
