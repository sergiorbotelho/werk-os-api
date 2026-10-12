# PDF da OS no backend: plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** a API passa a gerar o PDF da OS em `GET /os/:id/pdf`, com o mesmo layout do front. O front só busca e exibe o arquivo.

**Arquitetura:** o `pdfOrder.tsx` do front é portado para uma função pura no backend (`buildOsPdfDefinition`), renderizada com o `PdfPrinter` do pdfmake 0.2.13. Um service busca a OS no banco e devolve o `Buffer`, e o controller envia o PDF. O modal do front troca a geração local por `api.get(..., { responseType: "blob" })` e imprime por `iframe` oculto no desktop.

**Stack:** Express 4, Prisma 5, TypeScript 5, pdfmake 0.2.13 (API de servidor) na API. Next.js 14, axios e react-pdf no front.

**Spec:** [`docs/superpowers/specs/2026-10-12-os-pdf-backend-design.md`](../specs/2026-10-12-os-pdf-backend-design.md)

**Repositórios:**
- API: `D:\Work\apiwerk` (tarefas 1 e 2)
- Front: `D:\Projetos\werk-app` (tarefa 3)

## Restrições globais

- pdfmake fixo em **0.2.13** (`"pdfmake": "0.2.13"`, sem `^`) e `@types/pdfmake` fixo em **0.2.9**, as versões do front.
- Seguir `.claude/rules/arquitetura.md` da API: controller sem `try/catch`, id validado com `idParamSchema`, service recebe `number` e lança `AppError` em falha esperada.
- Mensagens ao usuário em português. Mensagens de commit em inglês, no padrão Conventional Commits, **sem** `Co-Authored-By`. Usar a skill `commit` para commitar.
- Depois de mudar `src/` na API, rodar `npm run build` e commitar o `dist/` junto.
- Data do PDF no fuso `America/Recife`. Moeda com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Não há framework de testes nos projetos. A verificação usa os scripts descartáveis do apêndice, gravados no **diretório de scratchpad da sessão** (chamado aqui de `$PDFV`), fora dos dois repositórios.
- Não fazer `push` em nenhum repositório.

## Foco da revisão

Modos de falha que a spec implica e que um usuário notaria:

1. **OS criada à noite** (21h–23h59 em Recife) sair com a data do dia seguinte porque o servidor roda em UTC. Coberto na tarefa 1 (fixture `created_at` 01:30Z, renderizado com `TZ=UTC`).
2. **Campo opcional nulo** (endereço, bairro, garantias, solução, valores) derrubar a geração ou imprimir `null`. Coberto na tarefa 1 (fixture `order-nulls`).
3. **OS com CNPJ e sem CPF** imprimir o placeholder no lugar errado. Coberto na tarefa 1 (fixture `order-cnpj`).
4. **Diferença visual sutil no porte** (margem, quebra de linha, tamanho de fonte). Coberto na tarefa 1 (comparação de texto com posição e de pixels) e na tarefa 2 (comparação com uma OS real vinda do banco).
5. **Falha da API deixar o modal carregando para sempre.** Coberto na tarefa 3 (o `catch` marca `failed`, verificado no teste com Playwright usando id inexistente).

---

### Tarefa 1: gerador de PDF da OS na API

Porta o layout para o backend como função pura e renderiza com pdfmake. Ainda sem endpoint.

**Arquivos:**
- Criar: `src/lib/pdf.ts`
- Criar: `src/reports/logo.ts` (gerado por script)
- Criar: `src/reports/osPdf.ts`
- Modificar: `package.json` e `package-lock.json` (dependências)
- Gerados: `dist/src/lib/pdf.js`, `dist/src/reports/logo.js`, `dist/src/reports/osPdf.js`
- Teste: `$PDFV/front-pdf.js`, `$PDFV/backend-pdf.js`, `$PDFV/compare-pdf.mjs` e as fixtures (apêndice)

**Interfaces:**
- Produz: `renderPdf(definition: TDocumentDefinitions): Promise<Buffer>` em `src/lib/pdf.ts`
- Produz: `type OsWithClient = Os & { client: Client }` e `buildOsPdfDefinition(os: OsWithClient): TDocumentDefinitions` em `src/reports/osPdf.ts`
- Produz: `logoDataUrl: string` em `src/reports/logo.ts`

- [ ] **Passo 1: criar as ferramentas de verificação e as fixtures**

Criar em `$PDFV` os arquivos `front-pdf.js`, `backend-pdf.js` e `compare-pdf.mjs`, e as fixtures `order-complete.json`, `order-cnpj.json`, `order-nulls.json` e `order-nulls-front.json`, com o conteúdo do **apêndice A**.

Conferir que o Node respeita a variável `TZ` nesta máquina:

```bash
TZ=America/Recife node -e "console.log(new Date('2026-10-13T01:30:00Z').toString())"
```

Esperado: `Mon Oct 12 2026 22:30:00 GMT-0300 ...`

- [ ] **Passo 2: gerar os PDFs de referência com o front atual**

```bash
cd "$PDFV"
for f in complete cnpj; do TZ=America/Recife node front-pdf.js "D:/Projetos/werk-app" order-$f.json front-$f.pdf; done
TZ=America/Recife node front-pdf.js "D:/Projetos/werk-app" order-nulls-front.json front-nulls.pdf
```

Esperado: três linhas `front: front-<caso>.pdf (<n> bytes)`.

- [ ] **Passo 3: rodar o gerador do backend e confirmar que falha**

```bash
TZ=UTC node "$PDFV/backend-pdf.js" "D:/Work/apiwerk" "$PDFV/order-complete.json" "$PDFV/backend-complete.pdf"
```

Esperado: erro `Cannot find module '.../dist/src/reports/osPdf'`.

- [ ] **Passo 4: instalar as dependências**

```bash
cd D:/Work/apiwerk
npm install --save-exact pdfmake@0.2.13
npm install --save-dev --save-exact @types/pdfmake@0.2.9
```

Conferir em `package.json`: `"pdfmake": "0.2.13"` em `dependencies` e `"@types/pdfmake": "0.2.9"` em `devDependencies`.

- [ ] **Passo 5: gerar `src/reports/logo.ts` a partir da logo do front**

```bash
cd D:/Work/apiwerk
node -e "
const fs = require('fs');
const b64 = fs.readFileSync('D:/Projetos/werk-app/public/logo.jpeg').toString('base64');
fs.writeFileSync('src/reports/logo.ts',
  '// Logo da Werk (public/logo.jpeg do front) embutida, porque o deploy publica só o dist/\n' +
  'export const logoDataUrl =\n  \"data:image/jpeg;base64,' + b64 + '\";\n');
"
head -c 160 src/reports/logo.ts
```

Esperado: o arquivo começa com o comentário e `export const logoDataUrl =`.

- [ ] **Passo 6: criar `src/lib/pdf.ts`**

```ts
import PdfPrinter from "pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { TDocumentDefinitions } from "pdfmake/interfaces";

// As fontes Roboto vêm em base64 dentro do próprio pdfmake, as mesmas que o front usava
const font = (file: string) =>
  Buffer.from(pdfFonts.pdfMake.vfs[file], "base64");

const printer = new PdfPrinter({
  Roboto: {
    normal: font("Roboto-Regular.ttf"),
    bold: font("Roboto-Medium.ttf"),
    italics: font("Roboto-Italic.ttf"),
    bolditalics: font("Roboto-MediumItalic.ttf"),
  },
});

export function renderPdf(definition: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(definition);
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
```

- [ ] **Passo 7: criar `src/reports/osPdf.ts`**

Porte de `werk-app/src/report/pdfOrder.tsx`. As únicas diferenças em relação ao original são: os dados vêm de `OsWithClient`, a data usa o fuso de Recife, campos nulos viram texto vazio (os placeholders de CPF/CNPJ continuam) e a logo vem de `logoDataUrl`.

```ts
import { Client, Os, Prisma } from "@prisma/client";
import { TDocumentDefinitions } from "pdfmake/interfaces";
import { logoDataUrl } from "./logo";

export type OsWithClient = Os & { client: Client };

const currencyFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// O servidor roda em UTC; a data impressa é a de Recife, como no navegador da loja
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Recife",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const text = (value: string | null | undefined) => value ?? "";
const upper = (value: string | null | undefined) => text(value).toUpperCase();
const money = (value: Prisma.Decimal | null) =>
  currencyFormat.format(Number(value ?? 0));
const date = (value: Date | null) => (value ? dateFormat.format(value) : "");

export function buildOsPdfDefinition(os: OsWithClient): TDocumentDefinitions {
  const { client } = os;

  return {
    pageSize: "A4",
    pageMargins: [30, 200, 15, 70],
    header: {
      margin: [20, 20, 0, 0],
      stack: [
        {
          columns: [
            {
              image: logoDataUrl,
              width: 150,
              alignment: "center",
              margin: [120, 20, 0, 0],
            },
            {
              stack: [
                {
                  text: "MANUTENÇÃO PREVENTIVA, CORRETIVA EM EQUIPAMENTO DE INFORMÁTICA.",
                  style: { fontSize: 10 },
                },
                {
                  text: "CNPJ: 08.546.821/0001-30 INSC. Municipal: 377.346-9",
                  style: { fontSize: 10 },
                },
                {
                  text: "Rua Irene Ramos Gomes de Mattos 97 Compl. CXPST 1927",
                  style: { fontSize: 10 },
                },
                {
                  text: "Pina - Recife - PE CEP: 51.011-530",
                  style: { fontSize: 10 },
                },
                {
                  text: "Fone: (81) 9972-6829. www.werknet.com.br",
                  style: { fontSize: 10 },
                },
              ],
              margin: [30, 40, 0, 0],
            },
          ],
        },
        {
          table: {
            widths: ["*", "*"],
            body: [
              [
                {
                  text: "OS - ORDEM DE SERVIÇO EXTERNA",
                  alignment: "center",
                  fontSize: 12,
                },
                {
                  text: `N.º ${os.id}`,
                  alignment: "center",
                  fontSize: 12,
                },
              ],
            ],
          },
          margin: [0, 10, 10, 0],
        },
      ],
    },
    content: {
      stack: [
        {
          margin: [0, 0, 0, 2],
          columns: [
            {
              text: `DATA: ${date(os.created_at)}`,
              style: { fontSize: 12 },
              alignment: "left",
              width: "*",
            },
            {
              text: `CONTATO: ${upper(os.contato)}`,
              style: { fontSize: 12 },
              alignment: "right",
              marginRight: 15,
            },
          ],
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: ["70%", "30%"],
            body: [
              [
                {
                  text: `CLIENTE: ${upper(client.nome)}`,
                  alignment: "left",
                },
                {
                  text: `FONE: ${text(client.telefone)}`,
                  alignment: "right",
                  fontSize: 12,
                  marginRight: 15,
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: [200, 200],
            body: [
              [
                {
                  text: `ENDEREÇO: ${upper(client.endereco)}`,
                  alignment: "left",
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: ["*", "*", "*", "*"],
            body: [
              [
                {
                  text: `NÚMERO: ${text(client.numero)}`,
                  alignment: "left",
                  fontSize: 12,
                },
                {
                  text: `BAIRRO: ${upper(client.bairro)}`,
                  alignment: "left",
                },
                {
                  text: `CIDADE: ${text(client.cidade)}`,
                  fontSize: 12,
                  alignment: "center",
                },
                {
                  text: `UF: ${text(client.uf)}`,
                  fontSize: 12,
                  alignment: "right",
                  marginRight: 15,
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: [200, 200],
            body: [
              [
                {
                  text: `CPF: ${client.cpf ?? "***.***.***-**"}`,
                  alignment: "left",
                },
                {
                  text: `CNPJ: ${client.cnpj ?? "***.***.***/****-**"}`,
                  alignment: "left",
                  fontSize: 12,
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: `MODELO DO EQUIPAMENTO: ${text(os.modeloEquipamento)}`,
                  alignment: "left",
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: `DEFEITO: ${text(os.defeito)}`,
                  alignment: "left",
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: `DEFEITO CONSTATADO: ${text(os.defeitoConstatado)}`,
                  alignment: "left",
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: `SOLUÇÃO: ${text(os.solucao)}`,
                  alignment: "left",
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: ["*", "*", "*"],
            body: [
              [
                {
                  text: `VALOR SERVIÇO: ${money(os.valServico)}`,
                  alignment: "left",
                },
                {
                  text: `VALOR MATERIAL: ${money(os.valMaterial)}`,
                  alignment: "center",
                },
                {
                  text: `TOTAL: ${money(os.total)}`,
                  alignment: "right",
                  marginRight: 15,
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          margin: [0, 0, 0, 2],
          table: {
            widths: ["*", "*"],
            body: [
              [
                {
                  text: `GARANTIA DE PEÇA: ${upper(os.garantiaPeca)}`,
                  alignment: "left",
                },
                {
                  text: `GARANTIA DE SERVIÇO: ${upper(os.garantiaServico)}`,
                  alignment: "right",
                  marginRight: 15,
                },
              ],
            ],
          },
        },
        {
          layout: {
            defaultBorder: true,
            hLineWidth: (i, node) =>
              i === 0 || i === node.table.body.length ? 1 : 0, // Bordas horizontais externas
            vLineWidth: (i, node) =>
              i === 0 || i === node.table.widths.length ? 1 : 0, // Bordas verticais externas
            hLineColor: () => "black",
            vLineColor: () => "black",
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
          margin: [0, 30, 15, 30],
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: "01 - O prazo de cobertura da garantia de serviço será contado a partir da data de saída, somente terá validade mediante a apresentação deste documento.",
                  margin: [5, 0, 5, 0],
                  fontSize: 10,
                  alignment: "left",
                },
              ],
              [
                {
                  text: "02 - Não nos responsabilizamos por falha causada por agentes da natureza, por mau uso dos componentes por usuário não classificados, e programas ou arquivos de dados que estejam dentro do computador.",
                  margin: [5, 0, 5, 0],
                  fontSize: 10,
                  alignment: "left",
                },
              ],
              [
                {
                  text: "03 - Esta garantia será considerada nula de pleno direito, na hipótese de abertura de um dos equipamentos, quer para conserto, por técnico não autorizado.",
                  margin: [5, 0, 5, 0],
                  fontSize: 10,
                },
              ],
              [
                {
                  text: "04 - Restringimos nossa responsabilidade à substituição de peças defeituosas, desde que a critério de nosso Dep.Técnico, se constatar falhas em condições normais de uso. Neste caso o prazo para a substituição será de 08 (oito) dias úteis a contar da data de recepção em nossa Empresa.",
                  margin: [5, 0, 5, 0],
                  fontSize: 10,
                },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: "Obs.: O cliente terá prazo de 90 dias para a retirada do(s) equipamento(s), na aprovação ou não do orçamento pelo cliente, e passado do prazo o equipamento será vendido para pagar despesas e serviços da empresa. ",
                  margin: [0, 15, 0, 15],
                  fontSize: 12,
                },
              ],
            ],
          },
        },
      ],
    },
    footer: {
      margin: [15, 0, 15, 80],
      stack: [
        {
          layout: "noBorders",
          table: {
            widths: ["*", "*", "*"],
            body: [
              [
                { text: "____________________________", alignment: "center" },
                { text: "____________________________", alignment: "center" },
                { text: "____________________________", alignment: "center" },
              ],
            ],
          },
        },
        {
          layout: "noBorders",
          table: {
            widths: ["*", "*", "*"],
            body: [
              [
                { text: "Técnico", alignment: "center" },
                { text: "Recepção", alignment: "center" },
                { text: "Cliente", alignment: "center" },
              ],
            ],
          },
        },
      ],
    },
    styles: {
      content: {
        fontSize: 12,
      },
    },
  };
}
```

- [ ] **Passo 8: compilar**

```bash
cd D:/Work/apiwerk && npm run build
```

Esperado: sem erros. Se o `tsc` reclamar de tipo em `hLineWidth`/`vLineWidth`, tipar os parâmetros como `(i: number, node: ContentTable)` importando `ContentTable` de `pdfmake/interfaces`.

- [ ] **Passo 9: gerar os PDFs do backend com o servidor em UTC e comparar**

```bash
cd "$PDFV"
for f in complete cnpj nulls; do
  TZ=UTC node backend-pdf.js "D:/Work/apiwerk" order-$f.json backend-$f.pdf
  node compare-pdf.mjs "D:/Projetos/werk-app" front-$f.pdf backend-$f.pdf || echo "FALHOU: $f"
done
```

Esperado: `RESULTADO: IGUAL` nos três casos e nenhuma linha `FALHOU`. No caso `complete`, o texto extraído contém `DATA: 12/10/2026`, apesar de o `created_at` ser 01:30 UTC do dia 13. Para conferir:

```bash
node -e "
import('file:///D:/Projetos/werk-app/node_modules/pdfjs-dist/legacy/build/pdf.mjs').then(async (p) => {
  const d = await p.getDocument({ data: new Uint8Array(require('fs').readFileSync('backend-complete.pdf')), verbosity: 0 }).promise;
  const t = await (await d.getPage(1)).getTextContent();
  console.log(t.items.map((i) => i.str).join(' ').match(/DATA: [0-9/]+/)[0]);
});"
```

Esperado: `DATA: 12/10/2026`.

Se algum caso der `DIFERENTE`, corrigir o `osPdf.ts` até a saída do comparador ficar vazia. Não alterar as fixtures para fazer o teste passar.

- [ ] **Passo 10: commit**

Usar a skill `commit` com estes arquivos: `package.json`, `package-lock.json`, `src/lib/pdf.ts`, `src/reports/logo.ts`, `src/reports/osPdf.ts`, `dist/src/lib/pdf.js`, `dist/src/reports/logo.js`, `dist/src/reports/osPdf.js`.

```
feat(os): add server-side OS PDF builder with pdfmake

Port the front-end pdfOrder layout to buildOsPdfDefinition and render
it with pdfmake 0.2.13 (same version as the front end). Dates use the
America/Recife time zone and null fields print as empty text.
```

---

### Tarefa 2: endpoint `GET /os/:id/pdf`

**Arquivos:**
- Criar: `src/services/os/getOsPdfService.ts`
- Criar: `src/controllers/os/getOsPdfController.ts`
- Modificar: `src/routers.ts` (import e rota, junto das rotas de OS)
- Modificar: `README.md` (tabela de endpoints de OS)
- Modificar: `CLAUDE.md` (tabela de respostas e descrição das pastas `reports/` e `lib/`)
- Modificar: `.claude/rules/arquitetura.md` (respostas binárias)
- Gerados: `dist/src/services/os/getOsPdfService.js`, `dist/src/controllers/os/getOsPdfController.js`, `dist/src/routers.js`
- Teste: `$PDFV/endpoint-tests.js` (apêndice B)

**Interfaces:**
- Consome: `renderPdf` de `src/lib/pdf.ts` e `buildOsPdfDefinition` de `src/reports/osPdf.ts` (tarefa 1). `idParamSchema` de `src/schemas/common.ts`. `AppError` de `src/utils/appError.ts`.
- Produz: `GET /os/:id/pdf`, com `200 application/pdf`, `400` para id inválido, `404` para OS inexistente e `401` sem token. A tarefa 3 depende deste contrato.

- [ ] **Passo 1: criar o teste do endpoint**

Criar `$PDFV/endpoint-tests.js` com o conteúdo do **apêndice B**.

- [ ] **Passo 2: subir a API de teste e confirmar que o teste falha**

Em background:

```bash
cd D:/Work/apiwerk && PORT=3399 npx ts-node-dev --transpile-only src/server.ts
```

Depois:

```bash
node "$PDFV/endpoint-tests.js" "D:/Work/apiwerk" "D:/Projetos/werk-app" "$PDFV" http://localhost:3399
```

Esperado: `FAIL` em `p1` (status 404, porque a rota ainda não existe) e código de saída 1.

- [ ] **Passo 3: criar `src/services/os/getOsPdfService.ts`**

```ts
import { renderPdf } from "../../lib/pdf";
import prismaClient from "../../prisma";
import { buildOsPdfDefinition } from "../../reports/osPdf";
import AppError from "../../utils/appError";

export class GetOsPdfService {
  async execute(id: number) {
    const os = await prismaClient.os.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!os) {
      throw new AppError("Ordem de serviço não encontrada", 404);
    }

    return renderPdf(buildOsPdfDefinition(os));
  }
}
```

- [ ] **Passo 4: criar `src/controllers/os/getOsPdfController.ts`**

```ts
import { Request, Response } from "express";
import { idParamSchema } from "../../schemas/common";
import { GetOsPdfService } from "../../services/os/getOsPdfService";

export class GetOsPdfController {
  async handle(req: Request, res: Response) {
    const id = await idParamSchema.parseAsync(req.params.id);

    const getOsPdfService = new GetOsPdfService();
    const pdf = await getOsPdfService.execute(id);

    // Gerado a cada pedido com os dados atuais da OS, por isso sem cache
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="OS-${id}.pdf"`);
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(pdf);
  }
}
```

- [ ] **Passo 5: registrar a rota em `src/routers.ts`**

Adicionar o import em ordem alfabética, junto dos outros controllers de OS:

```ts
import { GetOsPdfController } from "./controllers/os/getOsPdfController";
```

E a rota, logo abaixo de `router.get("/os/:id", ...)`:

```ts
router.get("/os/:id/pdf", isAuthenticated, new GetOsPdfController().handle);
```

- [ ] **Passo 6: rodar o teste**

O `ts-node-dev` reinicia sozinho ao detectar a mudança. Esperar a linha `Server at running on 3399` e rodar:

```bash
node "$PDFV/endpoint-tests.js" "D:/Work/apiwerk" "D:/Projetos/werk-app" "$PDFV" http://localhost:3399
```

Esperado: todas as linhas `PASS`, `RESULTADO: IGUAL` na comparação com o front e a limpeza devolvendo o banco às contagens iniciais.

- [ ] **Passo 7: atualizar a documentação**

`README.md`, na tabela "Ordens de Serviço", logo abaixo da linha de `GET /os/:id`:

```markdown
| GET    | `/os/:id/pdf`           | Gera o PDF da OS                 |
```

`CLAUDE.md`, na tabela "Response shapes", logo abaixo da linha de `GET /os/:id`:

```markdown
| `GET /os/:id/pdf` | the OS PDF (`application/pdf`, `inline`, `no-store`), generated on every request; 404 if missing |
```

`CLAUDE.md`, ao final da seção "Services", um parágrafo novo:

```markdown
The OS PDF is built by `src/reports/osPdf.ts` (`buildOsPdfDefinition`, a pure function ported from the front end's `pdfOrder.tsx`) and rendered by `src/lib/pdf.ts` (`renderPdf`, pdfmake 0.2.13 server API with the Roboto fonts from `pdfmake/build/vfs_fonts`). The logo is embedded as base64 in `src/reports/logo.ts`, because `tsc` does not copy images into `dist/`. Dates use the `America/Recife` time zone, since Vercel runs in UTC.
```

`.claude/rules/arquitetura.md`, na lista de regras do controller, trocar a linha `- Sempre use \`return res.status(...).json(...)\`.` por:

```markdown
- Sempre use `return res.status(...).json(...)`. Respostas binárias (como PDF) definem `Content-Type` e usam `return res.status(...).send(buffer)`.
```

- [ ] **Passo 8: compilar e parar a API de teste**

```bash
cd D:/Work/apiwerk && npm run build && git status --short
```

Esperado: build sem erros. O status lista os arquivos desta tarefa e seus `.js` em `dist/`. Parar o processo da API de teste.

- [ ] **Passo 9: commit**

Usar a skill `commit` com os arquivos desta tarefa (fontes, `dist/` e documentação).

```
feat(os): add GET /os/:id/pdf endpoint

Generate the OS PDF on every request from the stored OS and client
data, and return it inline as application/pdf with no-store caching.
Return 404 for a missing OS and 400 for an invalid id.
```

---

### Tarefa 3: front usa o PDF da API

Repositório: `D:\Projetos\werk-app`.

**Arquivos:**
- Modificar: `src/app/components/serviceOrder/order-pdf-modal.tsx` (substituição completa)
- Excluir: `src/report/pdfOrder.tsx`
- Modificar: `package.json` e `package-lock.json` (remover `pdfmake`, `@types/pdfmake` e `dayjs`)
- Modificar: `README.md` e `CLAUDE.md` (seções de PDF)

**Interfaces:**
- Consome: `GET /os/:id/pdf` (tarefa 2), via `api` de `src/services/api/api.ts`, que injeta o token.
- Produz: `OrderPdfModal({ order, onClose })`, com as mesmas props de hoje. `services-orders.tsx` e `customers/[id]/page.tsx` não mudam.

- [ ] **Passo 1: substituir `src/app/components/serviceOrder/order-pdf-modal.tsx`**

```tsx
"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { api } from "@/services/api/api";
import { IOrderService } from "@/types/order";
import { Download, Printer, Share2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { PdfStatus } from "./pdf-status";

// pdf.js depende de APIs do navegador; carrega só no cliente e quando o modal abre
const PdfViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => <PdfStatus />,
});

interface OrderPdfModalProps {
  order: IOrderService;
  onClose: () => void;
}

export function OrderPdfModal({ order, onClose }: OrderPdfModalProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  const fileName = `OS-${order.id}.pdf`;

  useEffect(() => {
    let cancelled = false;

    // O PDF é gerado pela API a cada pedido, sempre com os dados atuais da OS
    api
      .get<Blob>(`/os/${order.id}/pdf`, { responseType: "blob" })
      .then((response) => {
        if (!cancelled) setBlob(response.data);
      })
      .catch((error) => {
        console.error("Erro ao gerar PDF:", error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [order.id]);

  const file = useMemo(
    () =>
      blob ? new File([blob], fileName, { type: "application/pdf" }) : null,
    [blob, fileName],
  );

  // Celular: tela de toque; compartilhar só se o navegador aceitar arquivos
  const isMobile = useMemo(
    () => window.matchMedia("(pointer: coarse)").matches,
    [],
  );
  const canShare = useMemo(
    () =>
      !!file &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] }),
    [file],
  );

  const handleDownload = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleShare = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: `OS ${order.id}` });
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        console.error(error);
        toast.error("Não foi possível compartilhar o PDF.");
      }
    }
  };

  // Abre o PDF numa aba; precisa rodar dentro do clique, senão o Safari (iOS) bloqueia
  const openInNewTab = (url: string) => {
    const win = window.open(url, "_blank");
    if (!win) {
      toast.error("O navegador bloqueou a abertura do PDF.");
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handlePrint = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);

    // No celular abre o leitor nativo, que tem a opção de imprimir
    if (isMobile) {
      openInNewTab(url);
      return;
    }

    // No PC imprime direto por um iframe oculto; o iframe só imprime, não exibe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (error) {
        // Fora do clique o navegador pode bloquear a aba; nesse caso o toast avisa
        console.error(error);
        openInNewTab(URL.createObjectURL(blob));
      }
      setTimeout(() => {
        iframe.remove();
        URL.revokeObjectURL(url);
      }, 60_000);
    };
    document.body.appendChild(iframe);
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="flex h-[90dvh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-lg font-semibold">
            Ordem de Serviço #{order.id}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} title="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative flex-1 overflow-y-auto bg-muted p-3 pb-24 sm:p-6 sm:pb-24">
          {failed ? (
            <PdfStatus message="Não foi possível gerar o PDF." />
          ) : blob ? (
            <PdfViewer file={blob} />
          ) : (
            <PdfStatus />
          )}
        </div>

        {blob && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border bg-card p-2 shadow-lg">
            {isMobile && canShare ? (
              <Button className="rounded-full" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            ) : (
              <Button className="rounded-full" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-full"
              onClick={handlePrint}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Passo 2: remover o gerador local e as dependências**

```bash
cd D:/Projetos/werk-app
git rm src/report/pdfOrder.tsx
npm uninstall pdfmake @types/pdfmake dayjs
grep -rn "pdfmake\|dayjs\|report/pdfOrder" src || echo "sem referências"
```

Esperado: `sem referências`.

- [ ] **Passo 3: checar os tipos**

```bash
cd D:/Projetos/werk-app && npx tsc --noEmit -p .
```

Esperado: nenhuma saída.

- [ ] **Passo 4: teste de fumaça com Playwright**

1. Subir a API de teste em background: `cd D:/Work/apiwerk && PORT=3399 npx ts-node-dev --transpile-only src/server.ts`.
2. Subir o front em background apontando para ela: `cd D:/Projetos/werk-app && NEXT_PUBLIC_API=http://localhost:3399 NEXTAUTH_URL=http://localhost:3010 npx next dev -p 3010`.
3. Com as ferramentas `mcp__playwright__*`: abrir `http://localhost:3010/login`, entrar com `admin@werk.com.br` / `123456`, abrir a lista de OS e clicar em "Visualizar PDF" de uma OS. Esperar pelo `canvas` do visualizador e conferir com `browser_network_requests` que houve um `GET /os/<id>/pdf` com status 200. Tirar um screenshot do modal.
4. Confirmar o modo de falha: fechar o modal, parar o processo da API de teste e abrir o modal de novo. Esperado: aparece "Não foi possível gerar o PDF." e o modal não fica carregando para sempre. Subir a API de novo se ainda for preciso.
5. Parar o front e a API de teste.

- [ ] **Passo 5: atualizar a documentação do front**

`README.md`:
- Na tabela de stack, trocar a linha do PDF por: `| PDF          | Gerado pela API · react-pdf / pdf.js (visualização)      |`.
- Na árvore de pastas, remover a linha `├── report/pdfOrder.tsx       # Montagem do PDF da OS (pdfmake)`.
- Na seção "PDF", trocar os três itens por:

```markdown
  - A API gera o documento (`GET /os/:id/pdf`) e o modal o desenha em canvas com o pdf.js. Iframes não são usados para exibir o PDF, porque o Safari do iOS e o Chrome do Android não mostram PDF dentro deles.
  - No desktop, **Imprimir** usa um iframe oculto só para chamar a impressão. No celular, abre o leitor nativo numa aba.
```

`CLAUDE.md`, na seção "PDF generation and viewing":
- Remover o item **Building the PDF**.
- Trocar o item **Viewing modal** por:

```markdown
- **Viewing modal:** the "Visualizar PDF" buttons open `serviceOrder/order-pdf-modal.tsx`. The modal fetches the PDF from the API (`GET /os/:id/pdf` with `responseType: "blob"`). The API generates it on every request from the current OS data. The modal renders pages to canvas with `react-pdf` in `pdf-viewer.tsx`, loaded through `next/dynamic` with `ssr: false`. iframes are deliberately not used for viewing, because iOS Safari shows only page 1 and Android Chrome shows nothing.
```

- Trocar o item **Floating buttons** por:

```markdown
- **Floating buttons:** on desktop, Download, and Imprimir, which loads the PDF into a hidden iframe and calls `print()` on it (falling back to a new tab if that throws). On mobile (`pointer: coarse`), Compartilhar via `navigator.share` with the file (falls back to Download when sharing isn't supported), and Imprimir, which opens the PDF blob URL in a new tab with the native viewer.
```

- Trocar o item **Opening tabs** por:

```markdown
- **Opening tabs:** any `window.open` must happen synchronously in the click handler, before any `await`. Otherwise iOS Safari silently blocks it. The PDF blob is already loaded when the buttons appear, so the handlers open it directly.
```

- Remover o item **Planned change**.

- [ ] **Passo 6: commit**

Usar a skill `commit` no repositório do front.

```
feat(pdf): load the OS PDF from the API

Fetch the PDF from GET /os/:id/pdf instead of building it with pdfmake
in the browser. Print through a hidden iframe on desktop and the
native viewer on mobile. Remove pdfOrder.tsx and the pdfmake,
@types/pdfmake and dayjs dependencies.
```

- [ ] **Passo 7: pedir o teste manual ao usuário**

Pedir ao usuário que teste com o front local ou de homologação apontando para a API nova: exibir, baixar, compartilhar no celular, imprimir no desktop (Chrome/Edge e, se usado na loja, Safari ou Firefox) e imprimir no celular. Lembrar a ordem de deploy: API primeiro, front depois.

---

## Apêndice A: ferramentas de verificação da tarefa 1

### `$PDFV/front-pdf.js`

Gera o PDF com o gerador **atual** do front, fora do navegador.

```js
// Uso: TZ=America/Recife node front-pdf.js <werk-app> <order.json> <saida.pdf>
const fs = require("fs");
const path = require("path");
const Module = require("module");

const [frontRoot, orderFile, outFile] = process.argv.slice(2);
const ts = require(path.join(frontRoot, "node_modules/typescript"));

// Imports de imagem do Next viram { src: <caminho do arquivo> }
for (const ext of [".jpeg", ".jpg", ".png"]) {
  Module._extensions[ext] = (m, filename) => {
    m.exports = { default: { src: filename }, src: filename };
  };
}

// fetch(logo.src) devolve os bytes do arquivo; FileReader converte em data URL
global.fetch = async (url) => {
  const bytes = fs.readFileSync(url);
  return { blob: async () => new Blob([bytes], { type: "image/jpeg" }) };
};
global.FileReader = class {
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buf).toString("base64")}`;
      this.onloadend();
    }, this.onerror);
  }
};

// Transpila o pdfOrder.tsx para CommonJS e carrega com o node_modules do front
const src = path.join(frontRoot, "src/report/pdfOrder.tsx");
const { outputText } = ts.transpileModule(fs.readFileSync(src, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.React },
});
const m = new Module(src, module);
m.filename = src;
m.paths = Module._nodeModulePaths(path.dirname(src));
m._compile(outputText, src);

(async () => {
  const order = JSON.parse(fs.readFileSync(orderFile, "utf8"));
  const pdf = await m.exports.createOrderPdf(order);
  pdf.getBuffer((buffer) => {
    fs.writeFileSync(outFile, Buffer.from(buffer));
    console.log(`front: ${outFile} (${buffer.length} bytes)`);
  });
})();
```

### `$PDFV/backend-pdf.js`

Gera o PDF com o código compilado da API (`dist/`), sem servidor.

```js
// Uso: TZ=UTC node backend-pdf.js <apiwerk> <order.json> <saida.pdf>
const fs = require("fs");
const path = require("path");

const [apiRoot, orderFile, outFile] = process.argv.slice(2);
const { buildOsPdfDefinition } = require(path.join(apiRoot, "dist/src/reports/osPdf"));
const { renderPdf } = require(path.join(apiRoot, "dist/src/lib/pdf"));

const order = JSON.parse(fs.readFileSync(orderFile, "utf8"));
order.created_at = order.created_at ? new Date(order.created_at) : null;

renderPdf(buildOsPdfDefinition(order)).then((buffer) => {
  fs.writeFileSync(outFile, buffer);
  console.log(`backend: ${outFile} (${buffer.length} bytes)`);
});
```

### `$PDFV/compare-pdf.mjs`

Compara dois PDFs pelo texto com posição (pdfjs) e pelas páginas renderizadas (pixels). Sai com código 1 se houver diferença.

```js
// Uso: node compare-pdf.mjs <werk-app> <a.pdf> <b.pdf>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [frontRoot, fileA, fileB] = process.argv.slice(2);
const nm = (p) => pathToFileURL(path.join(frontRoot, "node_modules", p)).href;
const pdfjs = await import(nm("pdfjs-dist/legacy/build/pdf.mjs"));
const { createCanvas } = await import(nm("@napi-rs/canvas/index.js"));

async function load(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  return pdfjs.getDocument({ data, verbosity: 0 }).promise;
}

async function pageText(page) {
  const { items } = await page.getTextContent();
  return items
    .filter((i) => i.str.trim())
    .map((i) => `${Math.round(i.transform[4])},${Math.round(i.transform[5])} ${i.str}`);
}

async function pagePixels(page) {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, w: canvas.width, h: canvas.height };
}

const [a, b] = await Promise.all([load(fileA), load(fileB)]);
let failed = false;
if (a.numPages !== b.numPages) {
  console.log(`páginas diferentes: ${a.numPages} x ${b.numPages}`);
  failed = true;
}

for (let n = 1; n <= Math.min(a.numPages, b.numPages); n++) {
  const [pa, pb] = await Promise.all([a.getPage(n), b.getPage(n)]);

  const [ta, tb] = await Promise.all([pageText(pa), pageText(pb)]);
  const onlyA = ta.filter((t) => !tb.includes(t));
  const onlyB = tb.filter((t) => !ta.includes(t));
  if (onlyA.length || onlyB.length) {
    failed = true;
    console.log(`página ${n}: texto diferente`);
    onlyA.forEach((t) => console.log(`  - ${t}`));
    onlyB.forEach((t) => console.log(`  + ${t}`));
  }

  const [ia, ib] = await Promise.all([pagePixels(pa), pagePixels(pb)]);
  let diff = 0;
  for (let i = 0; i < ia.data.length; i += 4) {
    const d = Math.abs(ia.data[i] - ib.data[i]) + Math.abs(ia.data[i + 1] - ib.data[i + 1]) + Math.abs(ia.data[i + 2] - ib.data[i + 2]);
    if (d > 60) diff++;
  }
  const ratio = diff / (ia.w * ia.h);
  // Tolerância de 0,1% dos pixels para anti-aliasing
  if (ia.w !== ib.w || ia.h !== ib.h || ratio > 0.001) {
    failed = true;
    console.log(`página ${n}: imagem diferente (${(ratio * 100).toFixed(3)}% dos pixels)`);
  } else {
    console.log(`página ${n}: igual (${ta.length} trechos de texto, ${(ratio * 100).toFixed(3)}% pixels diferentes)`);
  }
}

console.log(failed ? "RESULTADO: DIFERENTE" : "RESULTADO: IGUAL");
process.exit(failed ? 1 : 0);
```

### Fixtures

`$PDFV/order-complete.json`: OS completa, cliente com CPF, criada às 22:30 de 12/10 em Recife (01:30 UTC do dia 13).

```json
{"id":1001,"contato":"João","horaChegada":"12:23","horaSaida":"","defeito":"Não liga","defeitoConstatado":"Fonte queimada","solucao":"Troca da fonte","valServico":"120","valMaterial":"0","total":"120","garantiaPeca":"90 dias","garantiaServico":"30 dias","tipoServico":"GARANTIA","created_at":"2026-10-13T01:30:00.000Z",
"client":{"id":1,"nome":"Maria Silva","telefone":"81999990000","cpf":"12345678909","cnpj":null,"cep":"51011530","endereco":"Rua A","numero":"10","bairro":"Pina","cidade":"Recife","uf":"PE"}}
```

`$PDFV/order-cnpj.json`: cliente com CNPJ e sem CPF, valores com centavos.

```json
{"id":1002,"contato":"Ana","horaChegada":"09:05","horaSaida":"11:40","defeito":"Tela azul","defeitoConstatado":"Memória com defeito","solucao":"Troca de memória","valServico":"1234.56","valMaterial":"89.9","total":"1324.46","garantiaPeca":"3 meses","garantiaServico":"1 mês","tipoServico":"CONTRATO","created_at":"2026-10-12T15:00:00.000Z",
"client":{"id":2,"nome":"Werk Cliente Ltda","telefone":"8133334444","cpf":null,"cnpj":"11222333000181","cep":"50000000","endereco":"Av. Boa Viagem","numero":"1000","bairro":"Boa Viagem","cidade":"Recife","uf":"PE"}}
```

`$PDFV/order-nulls.json` (backend): campos opcionais nulos.

```json
{"id":1003,"contato":"Pedro","horaChegada":"08:00:00","horaSaida":null,"defeito":"Sem imagem","defeitoConstatado":null,"solucao":null,"valServico":"50","valMaterial":null,"total":"50","garantiaPeca":null,"garantiaServico":null,"tipoServico":"ORCAMENTO","created_at":"2026-10-12T12:00:00.000Z",
"client":{"id":3,"nome":"Carlos","telefone":"81988887777","cpf":"52998224725","cnpj":null,"cep":null,"endereco":null,"numero":null,"bairro":null,"cidade":null,"uf":null}}
```

`$PDFV/order-nulls-front.json` (front): a mesma OS, com texto vazio no lugar dos nulos. O gerador atual do front quebra com nulos, e a spec define que nulo é impresso como texto vazio. `valMaterial` continua nulo, porque o front já imprime `R$ 0,00` nesse caso.

```json
{"id":1003,"contato":"Pedro","horaChegada":"08:00:00","horaSaida":"","defeito":"Sem imagem","defeitoConstatado":"","solucao":"","valServico":"50","valMaterial":null,"total":"50","garantiaPeca":"","garantiaServico":"","tipoServico":"ORCAMENTO","created_at":"2026-10-12T12:00:00.000Z",
"client":{"id":3,"nome":"Carlos","telefone":"81988887777","cpf":"52998224725","cnpj":null,"cep":"","endereco":"","numero":"","bairro":"","cidade":"","uf":""}}
```

## Apêndice B: `$PDFV/endpoint-tests.js` (tarefa 2)

Cria um cliente e uma OS de teste pela API, testa o endpoint, compara o PDF da API com o do front atual para a mesma OS e apaga tudo no final.

```js
// Uso: node endpoint-tests.js <apiwerk> <werk-app> <dir-dos-scripts> <baseUrl>
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const [apiRoot, frontRoot, dir, BASE] = process.argv.slice(2);
const { PrismaClient } = require(path.join(apiRoot, "node_modules/@prisma/client"));
const { cpf } = require(path.join(apiRoot, "node_modules/cpf-cnpj-validator"));
const db = new PrismaClient();

let token;
const results = [];
const expect = (id, desc, ok, got) =>
  results.push({ id, desc, ok: ok ? "PASS" : "FAIL", got: String(got).slice(0, 100) });

async function call(method, p, { body, auth = true } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, buffer, text: buffer.toString("utf8", 0, 200) };
}

(async () => {
  const before = { clients: await db.client.count(), os: await db.os.count() };
  const login = await call("POST", "/session", { body: { email: "admin@werk.com.br", password: "123456" }, auth: false });
  token = JSON.parse(login.buffer.toString()).token;

  const c = await call("POST", "/customer", {
    body: { nome: "[TESTE] PDF", email: "teste@teste.com", telefone: "81999990000", cpf: cpf.generate(), cnpj: "",
            cep: "51011530", endereco: "Rua A", numero: "10", bairro: "Pina", cidade: "Recife", uf: "PE" },
  });
  const clientId = JSON.parse(c.buffer.toString()).id;
  const o = await call("POST", "/os", {
    body: { cliente_id: clientId, contato: "[TESTE] contato", modeloEquipamento: "Notebook", tipoServico: "GARANTIA",
            defeito: "Não liga", defeitoConstatado: "Fonte", solucao: "Troca", valServico: 120, valMaterial: 30.5,
            garantiaPeca: "90 dias", garantiaServico: "30 dias", horaChegada: "08:00:00", horaSaida: "" },
  });
  const osId = JSON.parse(o.buffer.toString()).os.id;

  const t0 = Date.now();
  const p1 = await call("GET", `/os/${osId}/pdf`);
  const ms = Date.now() - t0;
  expect("p1", "GET /os/:id/pdf → 200", p1.status === 200, p1.status);
  expect("p2", "Content-Type application/pdf", p1.headers.get("content-type") === "application/pdf", p1.headers.get("content-type"));
  expect("p3", "Content-Disposition inline", p1.headers.get("content-disposition") === `inline; filename="OS-${osId}.pdf"`, p1.headers.get("content-disposition"));
  expect("p4", "Cache-Control no-store", p1.headers.get("cache-control") === "no-store", p1.headers.get("cache-control"));
  expect("p5", "corpo começa com %PDF-", p1.buffer.subarray(0, 5).toString() === "%PDF-", p1.buffer.subarray(0, 8).toString());
  expect("p6", "gera em menos de 2 s", ms < 2000, `${ms} ms`);

  // Mesma OS, com os dados que o front recebe hoje de GET /os
  const list = JSON.parse((await call("GET", "/os")).buffer.toString()).os;
  fs.writeFileSync(path.join(dir, "endpoint-order.json"), JSON.stringify(list.find((x) => x.id === osId)));
  fs.writeFileSync(path.join(dir, "endpoint-backend.pdf"), p1.buffer);
  spawnSync("node", ["front-pdf.js", frontRoot, "endpoint-order.json", "endpoint-front.pdf"], { cwd: dir, env: { ...process.env, TZ: "America/Recife" }, stdio: "inherit" });
  const cmp = spawnSync("node", ["compare-pdf.mjs", frontRoot, "endpoint-front.pdf", "endpoint-backend.pdf"], { cwd: dir, encoding: "utf8" });
  console.log(cmp.stdout);
  expect("p7", "PDF da API igual ao do front para a mesma OS", cmp.status === 0, cmp.stdout.trim().split("\n").pop());

  const e1 = await call("GET", "/os/abc/pdf");
  expect("e1", "id inválido → 400", e1.status === 400, `${e1.status} ${e1.text}`);
  const e2 = await call("GET", "/os/999999/pdf");
  expect("e2", "OS inexistente → 404", e2.status === 404, `${e2.status} ${e2.text}`);
  const e3 = await call("GET", `/os/${osId}/pdf`, { auth: false });
  expect("e3", "sem token → 401", e3.status === 401, `${e3.status} ${e3.text}`);
  await call("DELETE", `/os/${osId}`);
  const e4 = await call("GET", `/os/${osId}/pdf`);
  expect("e4", "OS excluída → 404", e4.status === 404, `${e4.status} ${e4.text}`);

  await call("DELETE", `/customer/${clientId}`);
  const after = { clients: await db.client.count(), os: await db.os.count() };
  expect("c1", "banco volta às contagens iniciais", JSON.stringify(before) === JSON.stringify(after), `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
})()
  .catch((e) => {
    console.error("ERRO NO SCRIPT:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Limpeza de segurança se o script parar no meio
    const leftovers = await db.client.findMany({ where: { nome: "[TESTE] PDF" }, select: { id: true } });
    const ids = leftovers.map((c) => c.id);
    await db.os.deleteMany({ where: { client_id: { in: ids } } });
    await db.client.deleteMany({ where: { id: { in: ids } } });
    console.table(results);
    await db.$disconnect();
    if (results.some((r) => r.ok === "FAIL")) process.exitCode = 1;
  });
```
