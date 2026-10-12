"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPdf = renderPdf;
const pdfmake_1 = __importDefault(require("pdfmake"));
const vfs_fonts_1 = __importDefault(require("pdfmake/build/vfs_fonts"));
// As fontes Roboto vêm em base64 dentro do próprio pdfmake, as mesmas que o front usava
const font = (file) => Buffer.from(vfs_fonts_1.default.pdfMake.vfs[file], "base64");
const printer = new pdfmake_1.default({
    Roboto: {
        normal: font("Roboto-Regular.ttf"),
        bold: font("Roboto-Medium.ttf"),
        italics: font("Roboto-Italic.ttf"),
        bolditalics: font("Roboto-MediumItalic.ttf"),
    },
});
function renderPdf(definition) {
    return new Promise((resolve, reject) => {
        const doc = printer.createPdfKitDocument(definition);
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        doc.end();
    });
}
