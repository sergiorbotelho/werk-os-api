# Padrão de arquitetura da Werk OS API

Todo código novo (endpoint, domínio, regra de negócio) segue este padrão. Ao alterar código existente, siga o padrão no trecho que você tocar, mas não refatore o resto do arquivo nem mude formatos de resposta sem pedido explícito: o front-end depende dos formatos atuais (veja a tabela em `CLAUDE.md`).

## Camadas

```
routers.ts → isAuthenticated → Controller → Service → prismaClient
                                   ↑
                             schemas/ (Zod)
```

| Camada | Local | Responsabilidade | Não faz |
| --- | --- | --- | --- |
| Rota | `src/routers.ts` | Registra método, caminho, `isAuthenticated` e `new XController().handle` | Lógica |
| Controller | `src/controllers/<dominio>/` | Lê `req`, valida com Zod, chama o service, escolhe o status de sucesso | Acessar Prisma, regra de negócio, tratar erros |
| Erros | `src/middlewares/erroHandle.ts` | Converte qualquer erro em status + `{ message }` | — |
| Service | `src/services/<dominio>/` | Regra de negócio e acesso ao banco; lança `AppError` em falhas esperadas | Conhecer `req`/`res`, status de sucesso |
| Schema | `src/schemas/<dominio>.ts` | Schemas Zod v4 e tipos derivados (`z.infer`) | — |

Um controller e um service por caso de uso. Toda rota, exceto `/session`, usa `isAuthenticated`.

## Nomes

- Arquivos em camelCase, no singular: `createProductController.ts`, `createProductService.ts`.
- Classes em PascalCase, no singular: `CreateProductController`, `CreateProductService`.
- Pasta por domínio em inglês (`customer`, `os`, `user`). Campos e mensagens seguem o domínio em português (`nome`, `telefone`, "Cliente não encontrado"), exceto o domínio de usuário/auth, que é em inglês.
- Não copie os nomes legados com erro de digitação ou plural (`deleteCustomerServic.ts`, `updateOsControlles.ts`, `erroHandle.ts`, `authUserControllers`, `GetCustomersServices`).

## Controller

```ts
import { Request, Response } from "express";
import { idParamSchema } from "../../schemas/common";
import { updateProductSchema } from "../../schemas/product";
import { UpdateProductService } from "../../services/product/updateProductService";

export class UpdateProductController {
  async handle(req: Request, res: Response) {
    const id = await idParamSchema.parseAsync(req.params.id);
    const data = await updateProductSchema.parseAsync(req.body);

    const updateProductService = new UpdateProductService();
    const product = await updateProductService.execute({ id, ...data });

    return res.status(200).json(product);
  }
}
```

Regras:

- **Sem `try/catch` no controller.** Erros sobem até o `errorHandler` global (`src/middlewares/erroHandle.ts`) via `express-async-errors`. Ele já converte `ZodError` em 400, `AppError` no status dela, os erros P2002/P2003/P2025 do Prisma em 409/400/404 e JSON malformado em 400. Qualquer outro erro vira 500 com log. Um novo tipo de erro que precise de tradução é tratado lá, não no controller.
- **Sempre** passe ao service o resultado do `parseAsync` (`data`), nunca o `req.body` cru. Só assim o `trim` e o `coerce` do Zod chegam ao service.
- Todo endpoint com corpo valida o corpo com um schema. Ids de rota são validados com `idParamSchema` (`src/schemas/common.ts`).
- O service recebe o id como `number`, nunca string, e não chama `parseInt`.
- Sempre use `return res.status(...).json(...)`. Respostas binárias (como PDF) definem `Content-Type` e usam `return res.status(...).send(buffer)`.
- Status de sucesso: `201` para criação, `200` para leitura, atualização e exclusão.

## Service

```ts
import prismaClient from "../../prisma";
import { CreateProductInput } from "../../schemas/product";
import AppError from "../../utils/appError";

export class CreateProductService {
  async execute(data: CreateProductInput) {
    const exists = await prismaClient.product.findUnique({
      where: { codigo: data.codigo },
    });

    if (exists) {
      throw new AppError("Código já cadastrado", 409);
    }

    return prismaClient.product.create({ data });
  }
}
```

Regras:

- Tipe a entrada com o tipo inferido do schema (`export type CreateProductInput = z.infer<typeof createProductSchema>`). Não duplique interfaces à mão.
- Falhas esperadas lançam `AppError(mensagem, status)`: `404` para não encontrado, `409` para conflito/duplicidade, `400` para regra de negócio violada. Não crie novas classes de erro.
- Busca por id usa `findUnique` e lança `AppError(..., 404)` quando o registro não existe. Nunca devolva `null` ou `undefined` com status 200.
- Use `select` para não vazar campos sensíveis (ex.: `password`).
- Ao montar `where` com campos opcionais, coloque no `OR` só as condições que têm valor e trate o array vazio explicitamente. No Prisma 5.16 deste projeto, chaves `undefined` e `{}` dentro de `OR` são descartadas (`OR: [{}]` vira `WHERE 1=0`), mas não dependa desse comportamento: ele não é óbvio na leitura e pode mudar em upgrades.
- Valores calculados (como `total = valServico + valMaterial`) são recalculados em toda escrita que altera as parcelas, a partir de números já validados.
- Operações com várias escritas dependentes usam `prismaClient.$transaction`.

## Schema

- Zod v4 (`{ error: "..." }`), com mensagens no idioma do domínio.
- Exporte o schema e o tipo inferido juntos.
- Um enum que existe no Prisma deve ser importado de `@prisma/client` (`z.enum(TipoServico)`) em vez de redefinido em TypeScript.

## Respostas

- Endpoints novos de criação, leitura e atualização devolvem o recurso diretamente. Listagens devolvem `{ <recurso>: [...], count }`, com `count` referente ao mesmo filtro da lista.
- Erros sempre no formato `{ message }`.
- Não altere o formato dos endpoints existentes.

## Banco

- Mudanças no schema via `npx prisma migrate dev --name <nome_descritivo>`.
- Coluna obrigatória nova em tabela com dados: edite o SQL gerado para incluir `DEFAULT` (veja `20260523022953_migrate_teset`).
- Correção de dados já gravados vira uma migration só com SQL (veja `20261012120000_recalculate_os_total`): idempotente, com `WHERE` restrito às linhas erradas. Ela roda em produção no próximo deploy, então precisa de aprovação explícita.

## Checklist de entrega

1. Schema em `src/schemas/`, service, controller e rota em `src/routers.ts`.
2. `npm run build` sem erros de tipo.
3. Commitar o `dist/` regenerado junto com o código-fonte (o deploy na Vercel usa o `dist/` commitado). Remover do `dist/` os `.js` de arquivos renomeados ou apagados.
4. Atualizar a seção de endpoints do `README.md` e, se o formato de resposta for novo, a tabela de respostas do `CLAUDE.md`.
