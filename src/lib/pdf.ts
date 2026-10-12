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
