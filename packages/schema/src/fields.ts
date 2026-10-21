// Campos primitivos compartilhados por config, seções e catálogo (SPEC §5.2 e §5.3).
// A validação de URL é a defesa contra link malicioso vindo do conteúdo: mude com revisão de segurança.
import { z } from "zod";

/** Mensagens padrão do zod em pt-BR, por parse ({ error: ptBRError }), sem mexer na config global. */
export const ptBRError = z.locales.ptBR().localeError;

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugSchema = z
  .string()
  .regex(SLUG_RE, { error: "use só letras minúsculas, números e hífens (ex.: capa-iphone-15)" })
  .max(80, { error: "no máximo 80 caracteres" });

export const MAX_URL_LENGTH = 2048;

/**
 * Caracteres que o navegador ou o new URL() removem ou reinterpretam, e que por isso não podem
 * aparecer em link nem em caminho: controle (C0, DEL, C1), espaço, espaços e marcas invisíveis
 * (NBSP, soft hyphen, ZWSP/ZWNJ/ZWJ, LRM/RLM, controles bidi, separadores de linha e parágrafo,
 * word joiner e os invisíveis de U+2061 a U+206F, CGJ U+034F, ALM U+061C, MVS U+180E, BOM), a barra
 * invertida (o navegador a trata como /) e os pontos unicode que viram "." no host.
 * Ex.: "/\t/evil.com" vira "//evil.com" no navegador.
 */
const UNSAFE_CHARS =
  /[\u0000-\u0020\u007f-\u00a0\u00ad\u034f\u061c\u180e\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u206f\ufeff\\\u3002\uff0e\uff61]/;

/** true se o valor cru tem caractere que o navegador reinterpretaria (ver UNSAFE_CHARS). */
export function hasUnsafeChars(value: string): boolean {
  return UNSAFE_CHARS.test(value);
}

/**
 * Por que a URL foi recusada (ou null se passou): sem caractere inseguro no valor cru, só
 * https, sem usuário e senha, sem porta explícita, até 2048 caracteres. Com hosts, o hostname
 * precisa ser um deles ou subdomínio (host === d || host.endsWith("." + d)), comparado em
 * minúsculas depois do new URL().
 */
export function urlProblem(value: string, hosts?: readonly string[]): string | null {
  if (hasUnsafeChars(value)) return "não pode ter espaço, caractere invisível ou de controle, nem \\";
  if (value.length > MAX_URL_LENGTH) return `no máximo ${MAX_URL_LENGTH} caracteres`;
  if (!value.startsWith("https://")) return "precisa começar com https://";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "não é uma URL válida";
  }
  if (url.protocol !== "https:" || !url.hostname) return "precisa começar com https://";
  if (url.username || url.password) return "não pode ter usuário e senha na URL";
  if (url.port) return "não pode ter porta na URL";
  if (hosts && !hosts.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))) return "host não permitido";
  return null;
}

const httpsPattern = /^https:\/\//;

/**
 * Link https. Com `hosts`, só esses hosts e subdomínios. `message` troca a mensagem de erro
 * (uma só para qualquer falha).
 */
export function httpsUrlWith(message?: string, hosts?: readonly string[]) {
  return z
    .string()
    .regex(httpsPattern, { error: message ?? "precisa começar com https://" })
    .max(MAX_URL_LENGTH, { error: message ?? `no máximo ${MAX_URL_LENGTH} caracteres` })
    .superRefine((value, ctx) => {
      const problem = urlProblem(value, hosts);
      // as falhas de prefixo e tamanho já foram ditas pelas checagens acima
      if (problem && value.startsWith("https://") && value.length <= MAX_URL_LENGTH) {
        ctx.addIssue({ code: "custom", message: message ?? problem });
      }
    });
}

export const httpsUrl = httpsUrlWith();

const hasDotDot = (path: string) => path.split("/").includes("..");
// %2e (.), %2f (/) e %5c (\) codificados: o servidor ou o navegador podem decodificar depois
const ENCODED_SEPARATORS = /%(?:2e|2f|5c)/i;

/** Caminho local seguro: começa com uma / só, sem .., sem separador codificado. */
function isLocalPath(v: string): boolean {
  return v.startsWith("/") && !v.startsWith("//") && !hasDotDot(v) && !ENCODED_SEPARATORS.test(v);
}

/** Imagem: caminho em public/ (começa com /, sem // e sem ..) ou URL https. */
export const imageSrc = z.string().refine(
  (v) => !hasUnsafeChars(v) && (isLocalPath(v) || urlProblem(v) === null),
  { error: "use um caminho em public/ começando com / (ex.: /products/foto.jpg) ou um link https://, sem espaço nem caractere invisível" },
);

// e-mail no formato do zod (o mesmo do z.email())
const EMAIL_RE = z.regexes.email;

/**
 * mailto: com um endereço só e, na query, só subject e body. Recusa cc, bcc, to e outros
 * parâmetros (mandariam cópia para outro endereço) e %0d/%0a (injeção de cabeçalho).
 */
function isSafeMailto(v: string): boolean {
  if (!v.startsWith("mailto:") || /%0[ad]/i.test(v)) return false;
  const [address, query, ...rest] = v.slice("mailto:".length).split("?");
  if (rest.length || !EMAIL_RE.test(address)) return false;
  if (query === undefined) return true;
  const keys = [...new URLSearchParams(query).keys()];
  return keys.length > 0 && keys.every((k) => k === "subject" || k === "body");
}

/** Destino de link: rota do site (/sobre), âncora (#contato), https:, mailto: ou tel:. */
export const siteHref = z.string().refine(
  (v) =>
    !hasUnsafeChars(v) &&
    (isLocalPath(v) ||
      /^#[\w-]*$/.test(v) ||
      isSafeMailto(v) ||
      /^tel:\+?[\d()-]+$/.test(v) ||
      urlProblem(v) === null),
  { error: "use uma rota (/sobre), uma âncora (#contato) ou um link https://, mailto: ou tel:, sem espaço nem caractere invisível" },
);

/** Funções CSS permitidas em cssValue (cores e contas). Qualquer outra é recusada. */
const CSS_FUNCTIONS = new Set([
  "calc", "min", "max", "clamp", "var", "rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color", "color-mix",
]);

/** Por que o valor CSS foi recusado (ou null): parênteses, funções permitidas e var(--nome). */
function cssStructureProblem(v: string): string | null {
  if (v.length > 200) return "no máximo 200 caracteres";
  let depth = 0;
  for (const ch of v) {
    if (ch === "(") depth++;
    if (ch === ")" && --depth < 0) return "parênteses desbalanceados";
  }
  if (depth !== 0) return "parênteses desbalanceados";
  for (const [, name] of v.matchAll(/(-?[a-z_][\w-]*)\s*\(/gi)) {
    if (!CSS_FUNCTIONS.has(name.toLowerCase())) return `função ${name}() não é permitida (use calc, min, max, clamp, var, rgb, hsl, oklch, color-mix...)`;
  }
  // var( precisa começar por --nome (ex.: var(--radius) ou var(--radius, 1px))
  for (const m of v.matchAll(/var\s*\(/gi)) {
    if (!/^\s*--[\w-]+\s*[,)]/.test(v.slice(m.index + m[0].length))) return "var() precisa de uma variável --nome como primeiro argumento";
  }
  return null;
}

/**
 * Valor CSS que vai cru para o <style> do layout (cores, raio, tokens de forma). Estrutura
 * permitida, não lista negra: até 200 caracteres; só os caracteres A-Z a-z 0-9, espaço e
 * . , % # ( ) / + - * _ (sem colchete, que abriria um bloco que engole o resto da folha; sem
 * ; : { } < > @ aspas, barra invertida e não-ASCII); sem início ou fim de comentário;
 * parênteses balanceados; só as funções de CSS_FUNCTIONS; var() só com --nome.
 */
export const cssValue = z
  .string()
  .min(1)
  // abort: valor longo demais não chega às outras regras (o regex de funções de
  // cssStructureProblem é lento em texto longo: 200 000 caracteres levavam ~30 s)
  .max(200, { error: "valor CSS com no máximo 200 caracteres", abort: true })
  .regex(/^[A-Za-z0-9 .,%#()/+*_-]*$/, {
    error: "valor CSS só pode ter letras sem acento, números, espaço e . , % # ( ) / + - * _",
    abort: true,
  })
  .refine((v) => !/\/\*|\*\//.test(v), { error: "valor CSS não pode ter comentário" })
  .superRefine((v, ctx) => {
    const problem = cssStructureProblem(v);
    if (problem) ctx.addIssue({ code: "custom", message: `valor CSS inválido: ${problem}` });
  });

/** Comprimento CSS simples (ex.: 320px, 20rem, 50vh). */
export const cssLength = z
  .string()
  .regex(/^\d+(?:\.\d+)?(?:px|rem|em|vh|svh|dvh)$/, { error: "use um comprimento simples, ex.: 320px" });

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Sufixos de hospedagem pública e de registro de 2 níveis: como host inteiro, liberariam no
 * /_next/image as imagens de qualquer cliente desse provedor. Subdomínio específico
 * (meu-site.vercel.app, minha-loja.com.br) é aceito. Lista é dado, não contrato: PR ao arquiteto.
 */
export const PUBLIC_SUFFIX_HOSTS = [
  "github.io", "vercel.app", "netlify.app", "pages.dev", "workers.dev", "amazonaws.com", "s3.amazonaws.com",
  "cloudfront.net", "blob.core.windows.net", "appspot.com", "firebaseapp.com", "web.app", "herokuapp.com",
  "onrender.com", "fly.dev", "azurewebsites.net", "googleusercontent.com", "storage.googleapis.com",
  "r2.dev", "ngrok.io", "ngrok-free.app", "trycloudflare.com", "duckdns.org", "no-ip.org", "googleapis.com", "surge.sh",
  "glitch.me", "repl.co",
  "co.uk", "org.uk", "ac.uk", "com.br", "net.br", "org.br", "gov.br", "com.au", "net.au", "co.jp", "com.mx", "com.ar",
  "co.nz", "co.za", "com.cn", "co.kr", "co.in",
] as const;

/**
 * Rede interna, nomes reservados e DNS curinga (resolvem para qualquer IP, inclusive privado):
 * recusados como sufixo ou host inteiro. Defesa em profundidade: a defesa principal é do Next,
 * cujo otimizador recusa IP local por padrão (images.dangerouslyAllowLocalIP: false).
 */
export const PRIVATE_HOST_SUFFIXES = [
  "internal", "local", "localhost", "home.arpa", "arpa", "lan", "corp", "intranet", "private", "home", "test",
  "example", "invalid", "onion",
  "nip.io", "sslip.io", "xip.io", "localtest.me", "lvh.me", "vcap.me", "traefik.me",
] as const;

/**
 * Host exato para next/image (images.remoteHosts). Sem curinga (vira proxy aberto no
 * /_next/image), sem protocolo, caminho, porta ou IP; só minúsculas e com pelo menos um ponto;
 * nem sufixo de hospedagem pública, nem rede interna.
 */
export const hostnameSchema = z
  .string()
  .refine(
    (v) => {
      const labels = v.split(".");
      return v.length <= 253 && labels.length >= 2 && labels.every((l) => LABEL_RE.test(l)) && /[a-z]/.test(labels[labels.length - 1]);
    },
    { error: "host inválido: use só o nome exato, sem curinga, protocolo, caminho, porta ou IP (ex.: ik.imagekit.io)", abort: true },
  )
  .refine((v) => !(PUBLIC_SUFFIX_HOSTS as readonly string[]).includes(v), {
    error: (iss) =>
      `"${String(iss.input)}" é um sufixo de hospedagem pública: liberaria as imagens de qualquer site desse provedor. Use o host do seu site (ex.: meu-site.${String(iss.input)})`,
    abort: true,
  })
  .refine((v) => !PRIVATE_HOST_SUFFIXES.some((s) => v === s || v.endsWith(`.${s}`)), {
    error: (iss) => `"${String(iss.input)}" é de rede interna ou de DNS curinga (resolve para qualquer IP): use um host público`,
  });

/** Lista sem repetição; a repetida aponta o índice no caminho do erro. */
export function uniqueItems<T>(what: string) {
  return (list: readonly T[], ctx: z.RefinementCtx) => {
    list.forEach((item, i) => {
      if (list.indexOf(item) !== i) ctx.addIssue({ code: "custom", message: `${what} repetido: ${String(item)}`, path: [i] });
    });
  };
}
