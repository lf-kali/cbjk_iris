import { describe, expect, it } from "vitest";
// auxiliares internos do pacote (não são exportados pela raiz)
import { cssValue, hostnameSchema, httpsUrl, imageSrc, siteHref, urlProblem } from "../src/fields";
import { platformUrl } from "../src/catalog";

const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: string) => s.safeParse(v).success;

// caracteres de controle, espaços e invisíveis que o navegador ou o new URL() removem ou reinterpretam
const INVISIBLE = ["\t", "\n", "\r", "\u0000", " ", "\u007f", "\u0085", "\u00a0", "\u200b", "\u200c", "\u200d", "\u2028", "\u2029", "\ufeff"];

describe("valor cru: controle, espaço e barra invertida (correção M1/L1/L3)", () => {
  it("siteHref recusa caminho que o navegador transformaria em //host", () => {
    for (const v of ["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/ /evil.com", "/\\evil.com"]) {
      expect(ok(siteHref, v), JSON.stringify(v)).toBe(false);
    }
  });

  it("siteHref e imageSrc recusam %2e, %2f e %5c em caminho local", () => {
    for (const v of ["/%2e%2e/admin", "/a/%2E%2E/b", "/%2f%2fevil.com", "/%2Fevil", "/a%5cb", "/a%5Cb"]) {
      expect(ok(siteHref, v), v).toBe(false);
      expect(ok(imageSrc, `${v}.jpg`), v).toBe(false);
    }
  });

  it("links https recusam controle, espaço, invisível e \\ em qualquer posição", () => {
    const ml = platformUrl("mercadoLivre");
    expect(ok(httpsUrl, "https://x.com\n")).toBe(false);
    expect(ok(ml, "https://mercadolivre.com.br\\@evil.com/")).toBe(false);
    expect(ok(ml, "https://\u200bmercadolivre.com.br/")).toBe(false);
    for (const c of INVISIBLE) {
      expect(urlProblem(`https://a.com/x${c}y`), JSON.stringify(c)).not.toBeNull();
      expect(ok(siteHref, `https://a.com/${c}`), JSON.stringify(c)).toBe(false);
      expect(ok(imageSrc, `/a${c}.jpg`), JSON.stringify(c)).toBe(false);
    }
  });

  it("links https recusam pontos unicode no valor (o new URL() os troca por .)", () => {
    for (const dot of ["\u3002", "\uff0e", "\uff61"]) {
      expect(ok(platformUrl("mercadoLivre"), `https://evil${dot}mercadolivre.com.br/`), dot).toBe(false);
      expect(ok(httpsUrl, `https://a${dot}com/`), dot).toBe(false);
    }
  });

  it("valores normais continuam válidos", () => {
    expect(ok(siteHref, "/sobre")).toBe(true);
    expect(ok(siteHref, "/produtos?categoria=capas#topo")).toBe(true);
    expect(ok(siteHref, "tel:+5511999999999")).toBe(true);
    expect(ok(imageSrc, "/products/capa-1.jpg")).toBe(true);
    expect(ok(httpsUrl, "https://www.google.com/maps?q=Av.+Paulista,+1000,+S%C3%A3o+Paulo&output=embed")).toBe(true);
  });
});

describe("cssValue (correção M2)", () => {
  it("recusa comentário, url(), @import, expression() e controle", () => {
    for (const v of ["red/*x*/", "*/red", "url(https://evil.com/x.png)", "URL(x)", "@import x", "@IMPORT x", "expression(alert(1))", "Expression(x)", "red\f", "red\u0000", "red\u2028", "red\u2029", "red\t"]) {
      expect(ok(cssValue, v), JSON.stringify(v)).toBe(false);
    }
  });

  it("aceita cores e comprimentos normais", () => {
    for (const v of ["#1d4ed8", "oklch(55% 0.2 260)", "rgb(10 20 30 / 50%)", "0.625rem", "calc(var(--radius) * 0.8)", "color-mix(in oklab, var(--foreground) 5%, transparent)", "0 1px 2px rgb(0 0 0 / 0.1)"]) {
      expect(ok(cssValue, v), v).toBe(true);
    }
  });
});

describe("hostnameSchema (correção M4)", () => {
  it("recusa sufixo de hospedagem pública e de 2 níveis quando é o host inteiro", () => {
    for (const h of ["github.io", "vercel.app", "netlify.app", "pages.dev", "workers.dev", "amazonaws.com", "s3.amazonaws.com", "cloudfront.net", "blob.core.windows.net", "appspot.com", "firebaseapp.com", "web.app", "herokuapp.com", "co.uk", "com.br", "com.au"]) {
      expect(ok(hostnameSchema, h), h).toBe(false);
    }
    expect(hostnameSchema.safeParse("vercel.app").error?.issues[0].message).toMatch(/hospedagem pública|sufixo/);
  });

  it("aceita subdomínio específico desses sufixos", () => {
    for (const h of ["meu-site.vercel.app", "minha-loja.com.br", "fotos.s3.amazonaws.com", "d111111abcdef8.cloudfront.net", "ik.imagekit.io"]) {
      expect(ok(hostnameSchema, h), h).toBe(true);
    }
  });

  it("recusa domínio de rede interna e de DNS curinga", () => {
    for (const h of ["db.internal", "printer.local", "app.localhost", "router.home.arpa", "home.arpa", "nip.io", "10.0.0.1.nip.io", "x.sslip.io", "sslip.io"]) {
      expect(ok(hostnameSchema, h), h).toBe(false);
    }
    expect(hostnameSchema.safeParse("10.0.0.1.nip.io").error?.issues[0].message).toMatch(/interna|curinga/);
  });
});

describe("cssValue por estrutura permitida (rodada final, item 1)", () => {
  it("aceita os valores de hoje: padrões do sera, brand do apps/site e cores e sombras comuns", async () => {
    const { SHAPE_TOKENS } = await import("../src/theme/tokens");
    for (const t of SHAPE_TOKENS) expect(ok(cssValue, t.sera), t.name).toBe(true);
    for (const v of ["calc(var(--radius) * 0.8)", "calc((var(--a) + 2px) * 2)", "clamp(1rem, 2vw, 3rem)", "min(1px, 2px)", "max(1px,2px)",
      "hsl(0 0% 0% / 0.10)", "HSLA(0, 0%, 0%, .1)", "hwb(0 0% 0%)", "lab(50% 10 10)", "lch(50% 10 10)", "oklab(0.5 0.1 0.1)",
      "color(display-p3 1 0 0)", "rgba(0,0,0,.5)", "0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)", "none", "uppercase", "9999px"]) {
      expect(ok(cssValue, v), v).toBe(true);
    }
  });

  it("recusa função fora da lista permitida, inclusive com espaço antes do (", () => {
    for (const v of ["src(x)", "image-set(x 1x)", "-webkit-image-set(x 1x)", "image(x)", "element(#a)", "cross-fade(a, b)", "paint(x)",
      "attr(data-x)", "env(safe-area-inset-top)", "url(x)", "url (x)", "expression(1)", "calc(1px + attr(x))", "rgb(0 0 0) url(x)"]) {
      expect(ok(cssValue, v), v).toBe(false);
    }
  });

  it("var() só com --nome como primeiro argumento", () => {
    expect(ok(cssValue, "var(--radius)")).toBe(true);
    expect(ok(cssValue, "var( --radius , 1px)")).toBe(true);
    for (const v of ["var(radius)", "var(1px)", "var()", "var(calc(1px))"]) expect(ok(cssValue, v), v).toBe(false);
  });

  it("parênteses balanceados, aspas recusadas, no máximo 200 caracteres", () => {
    for (const v of ["calc(1px", "calc(1px))", ")(", "rgb(0 0 0))(", "\"red\"", "'red'", "x".repeat(201)]) {
      expect(ok(cssValue, v), v.slice(0, 20)).toBe(false);
    }
    expect(ok(cssValue, "x".repeat(200))).toBe(true);
  });
});

describe("mailto: (rodada final, item 2)", () => {
  it("aceita endereço válido com subject e body", () => {
    for (const v of ["mailto:contato@cbjk.com.br", "mailto:a@b.com?subject=Or%C3%A7amento", "mailto:a@b.com?subject=Oi&body=Ol%C3%A1"]) {
      expect(ok(siteHref, v), v).toBe(true);
    }
  });

  it("recusa endereço inválido, cc/bcc/to/outros parâmetros e quebra de linha codificada", () => {
    for (const v of ["mailto:", "mailto:nao-e-email", "mailto:a@b.com,c@d.com", "mailto:a@b.com?cc=x@y.com", "mailto:a@b.com?BCC=x@y.com",
      "mailto:a@b.com?to=x@y.com", "mailto:a@b.com?subject=a&x=1", "mailto:a@b.com?subject=a%0d%0abcc:x@y.com", "mailto:a@b.com?body=a%0Ab",
      "mailto:a%0d@b.com"]) {
      expect(ok(siteHref, v), v).toBe(false);
    }
  });
});

describe("hosts: listas ampliadas (rodada final, item 3)", () => {
  it("recusa os internos e de DNS curinga novos", () => {
    for (const h of ["10.0.0.1.xip.io", "localtest.me", "a.lvh.me", "vcap.me", "x.traefik.me", "nas.lan", "erp.corp", "rh.intranet",
      "x.private", "router.home", "site.test", "www.example", "a.invalid", "abc.onion", "x.in-addr.arpa"]) {
      expect(ok(hostnameSchema, h), h).toBe(false);
    }
  });

  it("recusa os sufixos públicos novos como host inteiro e aceita subdomínio", () => {
    for (const h of ["com.cn", "co.kr", "co.in", "gov.br", "ac.uk", "r2.dev", "ngrok.io", "ngrok-free.app", "trycloudflare.com",
      "duckdns.org", "no-ip.org", "googleapis.com", "surge.sh", "glitch.me", "repl.co"]) {
      expect(ok(hostnameSchema, h), h).toBe(false);
    }
    expect(ok(hostnameSchema, "pub-123.r2.dev")).toBe(true);
    expect(ok(hostnameSchema, "loja.com.cn")).toBe(true);
  });
});

describe("UNSAFE_CHARS: soft hyphen e controles bidi (rodada final, item 4)", () => {
  it("recusa U+00AD, U+202A–U+202E e U+2066–U+2069", () => {
    for (const c of ["\u00ad", "\u202a", "\u202b", "\u202c", "\u202d", "\u202e", "\u2066", "\u2067", "\u2068", "\u2069"]) {
      expect(ok(siteHref, `/a${c}b`), c.codePointAt(0)!.toString(16)).toBe(false);
      expect(ok(httpsUrl, `https://a.com/${c}`), c.codePointAt(0)!.toString(16)).toBe(false);
    }
  });
});

describe("cssValue: lista de caracteres permitidos (correção estrutural)", () => {
  it("recusa colchete, !, :, =, não-ASCII e o resto fora da lista", () => {
    const dottedI = String.fromCodePoint(0x130);
    for (const v of ["[", "]", "([)]", "[(])", "red [", "red!important", `url${dottedI}(x)`, "a:b", "a=b", "a&b", "a$b", "a^b", "a|b", "a~b", "a`b", "a?b"]) {
      expect(ok(cssValue, v), v).toBe(false);
    }
  });

  it("200 000 caracteres são recusados rápido (o limite aborta antes das outras regras)", () => {
    const started = performance.now();
    expect(ok(cssValue, "a".repeat(200000))).toBe(false);
    expect(ok(cssValue, "(".repeat(200000))).toBe(false);
    expect(performance.now() - started).toBeLessThan(50);
  });
});

describe("UNSAFE_CHARS: invisíveis restantes (correção estrutural, item 3)", () => {
  it("recusa U+034F, U+061C, U+180E, U+2061 a U+2065 e U+206A a U+206F", () => {
    const cps = [0x034f, 0x061c, 0x180e, 0x2061, 0x2062, 0x2063, 0x2064, 0x2065, 0x206a, 0x206b, 0x206c, 0x206d, 0x206e, 0x206f];
    for (const cp of cps) {
      const c = String.fromCodePoint(cp);
      expect(ok(siteHref, `/a${c}b`), cp.toString(16)).toBe(false);
      expect(ok(httpsUrl, `https://a.com/${c}`), cp.toString(16)).toBe(false);
    }
  });
});
