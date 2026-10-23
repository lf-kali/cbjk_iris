// Monta tarballs à mão (ustar, pax "x", nome longo GNU "L") para os testes da conferência do
// release.yml, inclusive os maliciosos das revisões da E7 (rodadas 3 e 4).
import { gzipSync } from "node:zlib";

export function header(name, { type = "0", size = 0, prefix = "", linkname = "" } = {}) {
  const h = Buffer.alloc(512, 0);
  h.write(name, 0, 100, "utf8");
  h.write("0000644\0", 100);
  h.write("0000000\0", 108);
  h.write("0000000\0", 116);
  h.write(`${size.toString(8).padStart(11, "0")}\0`, 124);
  h.write("00000000000\0", 136);
  h.write("        ", 148);
  h.write(type, 156);
  h.write(linkname, 157, 100, "utf8");
  h.write("ustar\0", 257);
  h.write("00", 263);
  h.write(prefix, 345, 155, "utf8");
  let sum = 0;
  for (const b of h) sum += b;
  h.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148);
  return h;
}

function pad(data) {
  const rest = data.length % 512;
  return rest === 0 ? data : Buffer.concat([data, Buffer.alloc(512 - rest, 0)]);
}

/** Uma entrada: cabeçalho + dados (arquivo, pax, L) ou só cabeçalho (pasta, links, dispositivos). */
export function entry(name, data = "", opts = {}) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const type = opts.type ?? "0";
  const size = ["0", "x", "L", "g"].includes(type) ? buf.length : 0;
  return Buffer.concat([header(name, { ...opts, type, size }), size ? pad(buf) : Buffer.alloc(0)]);
}

/** Cabeçalho pax "x" com os registros dados (o valor pode ter NUL). */
export function pax(records) {
  const body = Object.entries(records).map(([k, v]) => {
    const line = ` ${k}=${v}\n`;
    let len = Buffer.byteLength(line);
    while (Buffer.byteLength(`${len}${line}`) !== len) len = Buffer.byteLength(`${len}${line}`);
    return `${len}${line}`;
  }).join("");
  return entry("PaxHeader", body, { type: "x" });
}

export const ZERO_BLOCK = Buffer.alloc(512, 0);

export function tgz(...parts) {
  return gzipSync(Buffer.concat([...parts, Buffer.alloc(1024, 0)]));
}

const GOOD = { name: "@cbjk_iris/schema", version: "1.0.0" };
const EVIL = { name: "@cbjk_iris/schema", version: "6.6.6", scripts: { postinstall: "echo PWNED" } };
export const goodManifest = (over = {}) => JSON.stringify({ ...GOOD, ...over });
export const evilManifest = JSON.stringify(EVIL);

/** Tarballs maliciosos das revisões: em todos, a conferência antiga lia 1.0.0. */
export const MALICIOUS = {
  // rodada 3 (adversarial, HIGH): bloco de zeros isolado; o node-tar continua lendo depois dele
  "bloco nulo isolado": () => tgz(entry("package/package.json", goodManifest()), ZERO_BLOCK, entry("package/package.json", evilManifest)),
  // rodada 3 (security): dois pax seguidos; o node-tar junta os registros
  "dois pax seguidos": () => tgz(entry("package/package.json", goodManifest()), pax({ path: "package/a.txt" }), pax({ path: "package/package.json" }), entry("package/b.txt", evilManifest)),
  // rodada 3 (security): pax + nome longo GNU L
  "pax + L": () => tgz(entry("package/package.json", goodManifest()), pax({ path: "package/a.txt" }), entry("././@LongLink", "package/package.json", { type: "L" }), entry("package/b.txt", evilManifest)),
  // rodada 3 (security): NUL no path do pax
  "NUL no path do pax": () => tgz(entry("package/package.json", goodManifest()), pax({ path: "package/package.json\0.txt" }), entry("package/c.txt", evilManifest)),
  // pax com size: o node-tar usa esse tamanho para achar o próximo cabeçalho
  "pax size": () => {
    const hidden = entry("package/package.json", evilManifest);
    return tgz(entry("package/package.json", goodManifest()), pax({ size: "0" }), entry("package/d.txt", hidden), ZERO_BLOCK);
  },
  // rodadas anteriores
  "zzz/package.json": () => tgz(entry("package/package.json", goodManifest()), entry("zzz/package.json", evilManifest)),
  "package.json duplicado": () => tgz(entry("package/package.json", goodManifest()), entry("package/package.json", evilManifest)),
  "binding.gyp": () => tgz(entry("package/package.json", goodManifest()), entry("package/binding.gyp", "{}")),
  "link simbólico": () => tgz(entry("package/package.json", goodManifest()), entry("package/x", "", { type: "2", linkname: "/etc/passwd" })),
  "hard link": () => tgz(entry("package/package.json", goodManifest()), entry("package/x", "", { type: "1", linkname: "package/package.json" })),
};
