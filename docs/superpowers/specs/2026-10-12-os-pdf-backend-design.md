# PDF da OS gerado no backend

Data: 2026-10-12
Status: aprovado em conversa, aguardando revisão da spec

## Objetivo

Hoje o front (`werk-app`) monta o PDF da Ordem de Serviço no navegador com pdfmake (`src/report/pdfOrder.tsx`). A geração passa para a API, com o mesmo layout. O front só pede o PDF pelo id da OS e continua exibindo, baixando, compartilhando e imprimindo como faz hoje.

Motivo: centralizar a geração em um único lugar, sempre com os dados atuais do banco, e tirar do front o pdfmake e as fontes (~1 MB baixado ao abrir o modal).

### Critérios de sucesso

- O PDF gerado pela API é igual ao gerado pelo front hoje, para a mesma OS: mesmo texto, mesma formatação de moeda e data, mesmo layout.
- O front exibe, baixa, compartilha e imprime o PDF da API sem perder nenhum desses fluxos.
- Uma OS excluída não tem mais PDF: o endpoint responde 404.
- O front deixa de depender de `pdfmake`, `@types/pdfmake` e `dayjs`.

### Decisões

- **O PDF não é armazenado.** Ele é gerado a cada pedido. Por isso não há mudança no banco, nada fica desatualizado quando a OS é editada, e não há o que apagar quando ela é excluída.
- **Mesma biblioteca:** pdfmake **0.2.13**, a versão instalada no front, usando a API de servidor (`PdfPrinter`).
- **Textos fixos continuam no código:** cabeçalho com CNPJ, endereço e telefone da Werk, e o rodapé de assinaturas.

### Fora do escopo

- Guardar cópias do PDF ou versões da OS como emitida.
- Link público para o cliente abrir o PDF sem login.
- Mudanças no layout do documento.

## Backend (apiwerk)

### Endpoint

`GET /os/:id/pdf`, protegido por `isAuthenticated`.

| Situação | Resposta |
| --- | --- |
| OS existe | `200`, corpo binário, `Content-Type: application/pdf`, `Content-Disposition: inline; filename="OS-<id>.pdf"`, `Cache-Control: no-store` |
| Id inválido | `400 { message: "Id inválido" }` |
| OS não existe | `404 { message: "Ordem de serviço não encontrada" }` |
| Sem token ou token inválido | `401 { message: "Não autorizado" }` |

Os erros seguem o `errorHandler` global, como o resto da API. A rota `/os/:id` do Express casa só o caminho exato, então não conflita com `/os/:id/pdf`.

### Arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `src/controllers/os/getOsPdfController.ts` | Valida o id com `idParamSchema`, chama o service e envia o `Buffer` com os cabeçalhos acima. |
| `src/services/os/getOsPdfService.ts` | Busca a OS com `client` (`findUnique`), lança `AppError(..., 404)` se não existir e devolve o PDF como `Buffer`. |
| `src/reports/osPdf.ts` | Função pura `buildOsPdfDefinition(os)`: recebe a OS com o cliente e devolve o `TDocumentDefinitions`. É o porte do `pdfOrder.tsx`. |
| `src/reports/logo.ts` | A logo (`public/logo.jpeg` do front, 64 KB) embutida como data URL base64. |
| `src/lib/pdf.ts` | Cria o `PdfPrinter` com as fontes Roboto que vêm em `pdfmake/build/vfs_fonts` e expõe `renderPdf(definition): Promise<Buffer>`. |
| `src/routers.ts` | Registra a rota. |

Os dados vêm sempre do banco, nunca do corpo da requisição.

### Cuidados no porte do layout

1. **Data no fuso de Recife.** O front formata `created_at` com `dayjs(...).format("DD/MM/YYYY")` no fuso do navegador. O servidor da Vercel roda em UTC, e uma OS criada às 22h sairia com a data do dia seguinte. A data é formatada com `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife" })`, sem adicionar o dayjs ao backend.
2. **Campos nulos.** O layout chama `.toUpperCase()` em endereço, bairro, cidade, garantias e outros campos que podem ser nulos no banco. No porte, campo nulo vira texto vazio, mantendo os placeholders atuais de CPF/CNPJ (`***.***.***-**` e `***.***.***/****-**`).
3. **Moeda.** Mantém `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`. O Node 22 traz ICU completo, então a saída é igual à do navegador.
4. **Arquivos no deploy.** A Vercel publica só o `dist/`, e o `tsc` não copia imagens. Por isso a logo vai num módulo `.ts`. As fontes são lidas do `pdfmake/build/vfs_fonts` em `node_modules`, que a Vercel inclui na função.

### Dependências

- `pdfmake@0.2.13` em `dependencies` e `@types/pdfmake` em `devDependencies`.

## Front (werk-app)

### `src/app/components/serviceOrder/order-pdf-modal.tsx`

- **Busca:** `api.get(\`/os/${order.id}/pdf\`, { responseType: "blob" })` substitui o `import("@/report/pdfOrder")`. O `Blob` vai para o estado `blob`, como hoje. O estado `pdf` (`TCreatedPdf`) é removido.
- **Erro:** se a requisição falhar, `failed = true` e o modal mostra o `PdfStatus` "Não foi possível gerar o PDF." que já existe.
- **Visualização, download e compartilhamento:** sem mudança, porque já usam o `Blob`.
- **Impressão:** hoje usa `pdf.print({}, win)` e `pdf.open({}, win)` do pdfmake.
  - Celular: a aba continua sendo aberta de forma síncrona dentro do clique (exigência do Safari no iOS) e recebe `URL.createObjectURL(blob)`, o que abre o leitor nativo de PDF.
  - Desktop: o PDF é carregado num `iframe` oculto com a URL do `Blob`. No `onload`, chama `iframe.contentWindow.print()`. O `iframe` e a URL são liberados depois.
- Os botões aparecem quando o `blob` existe, no lugar da condição atual `pdf && blob`.

### Remoções

- `src/report/pdfOrder.tsx`.
- Dependências `pdfmake`, `@types/pdfmake` e `dayjs`, que só esse arquivo usa.
- `public/logo.jpeg` **fica**: o login, o menu e a sidebar também usam.

`services-orders.tsx` e `customers/[id]/page.tsx` continuam passando a OS para o modal. Não mudam.

## Verificação

### Igualdade com o PDF atual

Antes de remover o gerador do front, gerar o PDF das mesmas OS pelos dois caminhos e comparar:

- **Front atual:** um script de teste descartável (fora dos dois repositórios) que carrega o `pdfOrder.tsx` com o `import` da logo, o `fetch` e o `FileReader` substituídos por stubs que devolvem a mesma logo, e grava o `Blob` do `createOrderPdf` em arquivo.
- **Backend:** a resposta de `GET /os/:id/pdf`.

O que comparar:

- o texto extraído de cada página;
- as páginas renderizadas como imagem, com tolerância a diferenças de anti-aliasing.

Casos: uma OS completa, uma com campos nulos e uma com CPF e outra com CNPJ.

### Casos de borda do endpoint

- OS criada às 23h do horário de Recife → data do mesmo dia no PDF.
- Horário gravado com segundos (`08:00:00`).
- OS inexistente → 404. Id `abc` → 400. Sem token → 401.
- OS excluída → 404 no PDF.
- Resposta começa com `%PDF-` e tem os cabeçalhos da tabela do endpoint.

### Front

- `tsc --noEmit` sem erros.
- Teste manual do usuário: exibir, baixar, compartilhar no celular e imprimir no desktop e no celular. Esses fluxos dependem do navegador e do sistema operacional.

## Deploy

1. Subir a API com o endpoint novo. O front atual continua funcionando, porque não depende dele.
2. Subir o front usando o endpoint.

Desfazer o deploy do front volta ao gerador local sem afetar a API.

## Riscos

- **Tamanho e tempo da função na Vercel:** o pdfmake com fontes adiciona alguns MB à função, bem abaixo do limite. A geração de uma página leva décimos de segundo.
- **Impressão por `iframe`:** o comportamento varia entre navegadores de desktop. Se falhar em algum, a alternativa é abrir o PDF numa aba nova, como no celular.
