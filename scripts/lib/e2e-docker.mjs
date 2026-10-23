// Montagem do `docker run` do e2e:docker (SPEC §5.8; plano da Frente 1, E8, pendência do E2).
// O script (scripts/e2e-docker.mjs) só confere o build, chama prepareRun e roda o docker.
//
// Risco aceito (TOCTOU): ensureRealDirs confere que nenhuma pasta gravável é link e o docker monta
// depois. Quem tem escrita no repositório entre as duas coisas pode trocar uma pasta por um link e
// fazer o container gravar fora. Só alcança quem já escreve na worktree do dono, que é a mesma pessoa
// que roda o comando; fechar isso exigiria montar por descritor (o docker não oferece).
import { existsSync, lstatSync, mkdirSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";

/**
 * Imagem oficial do Playwright fixada por digest. O digest é o do índice multiarquitetura (amd64 e
 * arm64) da tag `v<versão>-noble`. Ao subir o @playwright/test, atualize os dois campos juntos:
 *   curl -sSI -H 'Accept: application/vnd.oci.image.index.v1+json' \
 *     https://mcr.microsoft.com/v2/playwright/manifests/v<versão>-noble | grep -i docker-content-digest
 * (conferido em 2026-10-23 também pelo sha256 do corpo do índice).
 */
export const PINNED_IMAGE = {
  version: "1.64.1",
  digest: "sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea",
};

/** Saída do Playwright no container (traces, .last-run.json), dentro de uma pasta gravável. */
export const DOCKER_OUTPUT_DIR = "apps/site/test-results/docker";

/**
 * Cache do `next start` (otimizador de imagens). Vai em tmpfs, não em montagem do host: um teste
 * comprometido não deixa nele nada que o `next start` do host leia depois.
 */
export const CACHE_DIR = "apps/site/.next/cache";

/**
 * Limites do container. Medido na E8 (2026-10-23) emulando o container com bwrap, numa máquina de 8
 * núcleos (4 workers do Playwright, o padrão) rodando os 36 testes da baseline: pico de 304 tarefas e
 * de 2,0 GB de memória no cgroup (memory.peak, que inclui o cache de arquivos).
 * - pids: conta processos e threads. 4096 é ~13x o medido: cabe uma máquina com o dobro de workers e
 *   ainda corta um fork bomb;
 * - memory: 8 GiB é ~4x o medido, sem deixar o container levar a memória toda do host. Sem swap além
 *   disso (memory-swap igual a memory);
 * - shm: o Chromium usa /dev/shm; 2 GiB substitui o --ipc=host recomendado pelo Playwright;
 * - cacheSize: teto do tmpfs do cache do next start (as 20 fotos otimizadas cabem com sobra).
 */
export const LIMITS = { pids: 4096, memory: "8g", shm: "2g", cacheSize: "1g" };

const DIGEST = /^sha256:[0-9a-f]{64}$/;

/** Referência da imagem para a versão instalada; versão diferente da fixada é erro. */
export function imageFor(installedVersion, pinned = PINNED_IMAGE) {
  if (!DIGEST.test(pinned.digest)) throw new Error(`Digest inválido em PINNED_IMAGE: ${pinned.digest}`);
  if (installedVersion !== pinned.version) {
    throw new Error(
      `O @playwright/test instalado é ${installedVersion}, mas a imagem fixada em scripts/lib/e2e-docker.mjs é a ${pinned.version}. ` +
        `Atualize PINNED_IMAGE (versão e digest) para v${installedVersion}-noble; o comando está no comentário.`,
    );
  }
  return `mcr.microsoft.com/playwright:v${pinned.version}-noble@${pinned.digest}`;
}

/**
 * Pastas do host que o container pode gravar, relativas à raiz. O resto do repositório entra só
 * para leitura.
 * - apps/site/test-results: pasta-mãe da saída do Playwright (DOCKER_OUTPUT_DIR). O Playwright apaga a
 *   pasta de saída inteira no começo, e um ponto de montagem não pode ser apagado: por isso a saída
 *   fica numa subpasta;
 * - apps/site/e2e/<pasta>/__screenshots__: capturas (`--update-snapshots`), uma por pasta de e2e.
 */
export function writableDirs(root) {
  const e2e = path.join(root, "apps/site/e2e");
  const folders = existsSync(e2e)
    ? readdirSync(e2e, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith("."))
        .map((d) => d.name)
        .sort()
    : [];
  return ["apps/site/test-results", ...folders.map((f) => `apps/site/e2e/${f}/__screenshots__`)];
}

/**
 * Pasta que vai para a montagem: relativa, sem `..`/`.`/trecho vazio, sem vírgula (separa as opções do
 * --mount e do --tmpfs) e sem dois-pontos (separa destino e opções no --tmpfs).
 */
function assertMountable(rel) {
  if (path.isAbsolute(rel) || rel.split("/").some((s) => s === ".." || s === "." || s === "")) {
    throw new Error(`Pasta gravável fora do repositório: ${rel}`);
  }
  if (rel.includes(",")) throw new Error(`Caminho com vírgula não pode ir na montagem do docker: ${rel}`);
  if (rel.includes(":")) throw new Error(`Pasta com dois-pontos não pode ir na montagem do docker: ${rel}`);
}

/**
 * Cria cada pasta (relativa à raiz) que faltar, sem seguir link: cada trecho do caminho que já existe
 * precisa ser pasta de verdade. Devolve o caminho real da raiz, que é o que vai para o docker.
 */
export function ensureRealDirs(root, rels) {
  // todos os nomes antes de criar qualquer pasta: um nome recusado não deixa pasta vazia para trás
  for (const rel of rels) assertMountable(rel);
  const realRoot = realpathSync(root);
  if (realRoot.includes(",")) throw new Error(`Caminho com vírgula não pode ir na montagem do docker: ${realRoot}`);
  for (const rel of rels) {
    let current = realRoot;
    for (const segment of rel.split("/")) {
      current = path.join(current, segment);
      if (!existsSync(current) && !isLink(current)) {
        mkdirSync(current);
        continue;
      }
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) throw new Error(`${path.relative(realRoot, current)} é link simbólico; apague e rode de novo.`);
      if (!stat.isDirectory()) throw new Error(`${path.relative(realRoot, current)} existe e não é pasta.`);
    }
  }
  return realRoot;
}

function isLink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Usuário do host para o --user e dono do tmpfs: as capturas gravadas não ficam com dono root, e o
 * processo do container grava no cache. Sem uid e gid não roda, inclusive no Windows nativo: a imagem
 * não define USER (roda como root), e o caminho nunca foi testado. No Windows, use o WSL2, onde o
 * Node tem getuid.
 */
export function hostUser(proc = process) {
  if (typeof proc.getuid === "function" && typeof proc.getgid === "function") return { uid: proc.getuid(), gid: proc.getgid() };
  if (proc.platform === "win32") {
    throw new Error("npm run e2e:docker não roda no Windows nativo (sem uid e gid, o container rodaria como root). Rode pelo WSL2.");
  }
  throw new Error("Não consegui ler o uid e o gid do usuário (process.getuid); sem eles o container gravaria como root.");
}

/**
 * Argumentos do `docker run`.
 * @param {{ root: string, image: string, writable: string[], tmpfs: string[], user: { uid: number, gid: number }, playwrightArgs: string[] }} o
 */
export function dockerArgs({ root, image, writable, tmpfs, user, playwrightArgs }) {
  if (!user || !Number.isInteger(user.uid) || !Number.isInteger(user.gid)) {
    throw new Error("dockerArgs precisa do uid e do gid do host (hostUser).");
  }
  // a raiz pode ter dois-pontos (C:\), mas não vírgula
  if (root.includes(",")) throw new Error(`Caminho com vírgula não pode ir na montagem do docker: ${root}`);
  for (const rel of [...writable, ...tmpfs]) assertMountable(rel);
  const target = (rel) => path.posix.join("/work", rel);
  const bind = (rel, mode) => ["--mount", `type=bind,source=${path.join(root, rel)},target=${target(rel)}${mode}`];
  return [
    "run", "--rm", "--init",
    // memória compartilhada do Chromium sem --ipc=host (que dividiria o IPC do host com o container)
    `--shm-size=${LIMITS.shm}`,
    `--pids-limit=${LIMITS.pids}`,
    `--memory=${LIMITS.memory}`,
    `--memory-swap=${LIMITS.memory}`,
    // o servidor (next start) e o navegador conversam pelo loopback do próprio container
    "--network=none",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--user", `${user.uid}:${user.gid}`,
    "-e", "HOME=/tmp",
    "-e", "CI=1",
    "-e", "NEXT_TELEMETRY_DISABLED=1",
    ...bind(".", ",readonly"),
    ...writable.flatMap((rel) => bind(rel, "")),
    ...tmpfs.flatMap((rel) => ["--tmpfs", `${target(rel)}:rw,noexec,nosuid,nodev,size=${LIMITS.cacheSize},mode=0700,uid=${user.uid},gid=${user.gid}`]),
    "-w", "/work",
    image,
    "node", "node_modules/@playwright/test/cli.js", "test", "-c", "apps/site/playwright.config.ts",
    "--output", DOCKER_OUTPUT_DIR,
    ...playwrightArgs,
  ];
}

/**
 * Tudo o que vem antes do `docker run`: imagem da versão instalada, pastas graváveis criadas e sem
 * link, ponto de montagem do tmpfs, usuário do host.
 * @param {{ root: string, version: string, playwrightArgs: string[], proc?: NodeJS.Process }} o
 */
export function prepareRun({ root, version, playwrightArgs, proc = process }) {
  const image = imageFor(version);
  const user = hostUser(proc);
  const writable = writableDirs(root);
  // o tmpfs também precisa do ponto de montagem: dentro da montagem só de leitura o docker não o cria
  const realRoot = ensureRealDirs(root, [...writable, CACHE_DIR]);
  return dockerArgs({ root: realRoot, image, writable, tmpfs: [CACHE_DIR], user, playwrightArgs });
}
