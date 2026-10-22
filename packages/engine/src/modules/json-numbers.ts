// Números de um texto JSON que o JSON.parse + JSON.stringify do JavaScript mudariam: o double não
// representa o valor exato do literal (1e400 vira null, 12345678901234567890 vira ...7000,
// 0.1000000000000000055511151231257827 vira 0.1). Diferença só de forma (1.0, 19.90, 1e3) não conta.

// Valor decimal canônico de um literal numérico: sinal, dígitos sem zeros nas pontas e expoente.
function canonical(literal: string): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(literal);
  if (!m) return `?${literal}`;
  const [, sign, int, frac = "", exp = "0"] = m;
  const all = int + frac;
  // laços em vez de regex: /0+$/ sem âncora é quadrático num literal com muitos zeros
  let start = 0;
  while (start < all.length && all[start] === "0") start++;
  if (start === all.length) return "0"; // zero (o sinal de -0 não é preservado pelo JSON.stringify, e não importa)
  let end = all.length;
  while (end > start && all[end - 1] === "0") end--;
  const e = BigInt(exp) - BigInt(frac.length) + BigInt(all.length - end);
  return `${sign}${all.slice(start, end)}e${e}`;
}

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

// Segunda barreira: um double tem no máximo 17 dígitos significativos, e o maior expoente decimal
// cabe em poucos caracteres. Literal mais longo que isso é tratado como inexato sem cálculo exato.
const MAX_EXACT_LITERAL = 400;

/** Literais numéricos (fora de strings) cujo valor não sobrevive a JSON.parse + JSON.stringify. */
export function inexactNumbers(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      // pula a string, respeitando os escapes
      i++;
      while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
      i++;
    } else if (c === "-" || (c >= "0" && c <= "9")) {
      NUMBER.lastIndex = i;
      const m = NUMBER.exec(text);
      const literal = m ? m[0] : c;
      if (literal.length > MAX_EXACT_LITERAL) out.push(literal);
      else {
        const value = Number(literal);
        if (!Number.isFinite(value) || canonical(literal) !== canonical(String(value))) out.push(literal);
      }
      i += literal.length;
    } else i++;
  }
  return out;
}
