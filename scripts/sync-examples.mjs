#!/usr/bin/env node
// Keep the getting-started code identical to attest-examples. src/examples/
// source.json pins the attest-examples commit and lists the files the pages
// import with `?raw`; src/examples/<path> holds byte-identical copies.
//
//   node scripts/sync-examples.mjs sync  <attest-examples-checkout>
//   node scripts/sync-examples.mjs check <attest-examples-checkout> [<copies-dir>]
//
// Both read the files from the pinned commit with `git show`, never from the
// checkout's working tree, so the checkout only has to contain that commit.
// `check` exits 1 when any copy differs, is missing or is not listed; the
// optional <copies-dir> lets CI prove the check fails on a mismatch fixture.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const PATH_PATTERN = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9_][a-z0-9_.-]*)+$/;
const SOURCE_FILE = "source.json";

const websiteRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const examplesDir = join(websiteRoot, "src/examples");

function fail(message) {
  console.error(`sync-examples: ${message}`);
  process.exit(1);
}

function readSource() {
  const source = JSON.parse(readFileSync(join(examplesDir, SOURCE_FILE), "utf8"));
  if (!SHA_PATTERN.test(source.commit)) fail(`${SOURCE_FILE}: commit must be a full 40-char sha`);
  if (!Array.isArray(source.files) || source.files.length === 0) {
    fail(`${SOURCE_FILE}: files must be a non-empty array`);
  }
  for (const path of source.files) {
    if (typeof path !== "string" || !PATH_PATTERN.test(path) || path.includes("..")) {
      fail(`${SOURCE_FILE}: invalid file path ${JSON.stringify(path)}`);
    }
  }
  return source;
}

function upstreamFile(checkout, commit, path) {
  try {
    return execFileSync("git", ["-C", checkout, "show", `${commit}:${path}`], {
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    fail(`cannot read ${path} at ${commit} from ${checkout}: ${error.stderr?.toString().trim()}`);
  }
}

function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => !entry.isDirectory())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .filter((path) => path !== SOURCE_FILE)
    .sort();
}

function sync(checkout, source) {
  const contents = source.files.map((path) => [path, upstreamFile(checkout, source.commit, path)]);
  for (const path of listFiles(examplesDir)) rmSync(join(examplesDir, path));
  for (const [path, content] of contents) {
    mkdirSync(dirname(join(examplesDir, path)), { recursive: true });
    writeFileSync(join(examplesDir, path), content);
    console.log(`wrote src/examples/${path}`);
  }
}

function check(checkout, source, copiesDir) {
  const problems = [];
  const present = new Set(listFiles(copiesDir));
  for (const path of source.files) {
    const upstream = upstreamFile(checkout, source.commit, path);
    if (!present.has(path)) {
      problems.push(`missing: ${path}`);
    } else if (!readFileSync(join(copiesDir, path)).equals(upstream)) {
      problems.push(`differs: ${path}`);
    }
    present.delete(path);
  }
  for (const path of present) problems.push(`unexpected: ${path}`);
  if (problems.length > 0) {
    fail(
      `${relative(websiteRoot, copiesDir)} does not match ${source.repository}@${source.commit}:\n  ` +
        `${problems.join("\n  ")}\n` +
        "Run `node scripts/sync-examples.mjs sync <attest-examples-checkout>` after updating the commit.",
    );
  }
  console.log(`${source.files.length} example files match ${source.repository}@${source.commit}`);
}

const [command, checkout, copiesDir] = process.argv.slice(2);
if (checkout === undefined || (command !== "sync" && command !== "check")) {
  fail("usage: node scripts/sync-examples.mjs sync|check <attest-examples-checkout> [<copies-dir>]");
}
const source = readSource();
if (command === "sync") {
  if (copiesDir !== undefined) fail("sync writes src/examples only; drop <copies-dir>");
  sync(checkout, source);
} else {
  check(checkout, source, copiesDir === undefined ? examplesDir : resolve(copiesDir));
}
