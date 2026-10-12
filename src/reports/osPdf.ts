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
