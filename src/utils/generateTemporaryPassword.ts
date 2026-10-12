import { randomInt } from "crypto";

// Sem caracteres ambíguos ao ditar ou ler a senha: 0, O, 1, l, I
const LETTERS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALL = LETTERS + DIGITS;
const LENGTH = 10;

function pick(chars: string) {
  return chars[randomInt(chars.length)];
}

// Senha aleatória que já atende ao passwordSchema: 10 caracteres, com pelo
// menos uma letra e um número.
export function generateTemporaryPassword() {
  const chars = [pick(LETTERS), pick(DIGITS)];

  while (chars.length < LENGTH) {
    chars.push(pick(ALL));
  }

  // Embaralha (Fisher-Yates) para a letra e o número garantidos não ficarem sempre no início
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
