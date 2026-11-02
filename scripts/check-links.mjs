#!/usr/bin/env node
// Fail on any internal href or src in the built site that has no file in dist/.
//   node scripts/check-links.mjs [<dist-dir>]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const SITE_ORIGIN = "https://attest-framework.github.io";
const ATTRIBUTE_PATTERN = /\s(?:href|src)="([^"]*)"/g;

const dist = resolve(process.argv[2] ?? "dist");
if (!existsSync(dist)) {
  console.error(`check-links: ${dist} does not exist; run pnpm build first`);
  process.exit(1);
}

function pageUrl(file) {
  const path = relative(dist, file).split(sep).join("/");
  return new URL(`/${path.replace(/(^|\/)index\.html$/, "$1")}`, SITE_ORIGIN);
}

function exists(pathname) {
  const target = join(dist, decodeURIComponent(pathname));
  if (pathname.endsWith("/")) return existsSync(join(target, "index.html"));
  if (existsSync(target)) return statSync(target).isFile() || existsSync(join(target, "index.html"));
  return existsSync(`${target}.html`);
}

const htmlFiles = readdirSync(dist, { recursive: true })
  .map((path) => join(dist, path))
  .filter((path) => path.endsWith(".html"));

const dead = [];
for (const file of htmlFiles) {
  const base = pageUrl(file);
  for (const [, raw] of readFileSync(file, "utf8").matchAll(ATTRIBUTE_PATTERN)) {
    const value = raw.replaceAll("&amp;", "&");
    if (value === "" || value.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(value)) continue;
    const url = new URL(value, base);
    if (url.origin !== SITE_ORIGIN) continue;
    if (!exists(url.pathname)) dead.push(`${relative(dist, file)}: ${raw}`);
  }
}

if (dead.length > 0) {
  console.error(`check-links: ${dead.length} dead internal link(s):\n  ${dead.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-links: ${htmlFiles.length} pages, no dead internal links`);
