#!/usr/bin/env node
// Copy attest's single-source docs (CHANGELOG.md, docs/guides/*.md) at a
// release tag into the website. Usage:
//   node scripts/sync-release.mjs <attest-checkout-dir> <tag>
// Owns src/synced/CHANGELOG.md and src/content/docs/sdk-guides/ outright:
// both are replaced on every run, so no website-native page is touched.
import { lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+(-rc\.[0-9]+)?$/;
const GUIDE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*\.md$/;
const ATTEST_EDIT_BASE = "https://github.com/attest-framework/attest/edit/main/docs/guides";

const websiteRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const changelogTarget = join(websiteRoot, "src/synced/CHANGELOG.md");
const guidesTarget = join(websiteRoot, "src/content/docs/sdk-guides");

function fail(message) {
  console.error(`sync-release: ${message}`);
  process.exit(1);
}

// The first non-blank line must be the H1; it becomes the page title and is
// removed from the body because Starlight renders the title itself.
function splitTitle(markdown, label) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const index = lines.findIndex((line) => line.trim() !== "");
  if (index === -1 || !lines[index].startsWith("# ")) {
    fail(`${label}: first non-blank line must be an H1 ("# Title")`);
  }
  const title = lines[index].slice(2).trim();
  if (title === "") fail(`${label}: H1 is empty`);
  const body = lines.slice(index + 1).join("\n").replace(/^\n+/, "");
  return { title, body };
}

// Source files must be regular files inside the checkout: a symlink could point
// at runner files (for example the website's .git/config) and publish them.
function readRegularFile(path, label) {
  const stats = lstatSync(path, { throwIfNoEntry: false });
  if (stats === undefined) fail(`${label}: not found at ${path}`);
  if (!stats.isFile()) fail(`${label}: must be a regular file, not a symlink or directory`);
  return readFileSync(path, "utf8");
}

function provenance(sourcePath, tag) {
  return (
    `<!-- Synced from attest-framework/attest ${sourcePath} at ${tag} by ` +
    `scripts/sync-release.mjs. Edit the source in attest, not this file. -->\n`
  );
}

const [sourceDir, tag] = process.argv.slice(2);
if (sourceDir === undefined || tag === undefined) {
  fail("usage: node scripts/sync-release.mjs <attest-checkout-dir> <tag>");
}
if (!TAG_PATTERN.test(tag)) fail(`invalid tag ${JSON.stringify(tag)}`);

// Read and validate every source before writing, so a bad input leaves the
// website untouched.
const changelog = splitTitle(
  readRegularFile(join(sourceDir, "CHANGELOG.md"), "CHANGELOG.md"),
  "CHANGELOG.md",
);

const guidesSource = join(sourceDir, "docs/guides");
if (!lstatSync(guidesSource, { throwIfNoEntry: false })?.isDirectory()) {
  fail("docs/guides must be a directory, not a symlink");
}
const entries = readdirSync(guidesSource, { withFileTypes: true });
const guides = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
for (const entry of entries) {
  if (!guides.includes(entry)) console.log(`skipped non-guide entry docs/guides/${entry.name}`);
}
if (guides.length === 0) fail(`no *.md guides in ${guidesSource}`);

const guideOutputs = guides.map((entry) => {
  const sourcePath = `docs/guides/${entry.name}`;
  if (!GUIDE_NAME_PATTERN.test(entry.name)) {
    fail(`${sourcePath}: name must match ${GUIDE_NAME_PATTERN}`);
  }
  const guide = splitTitle(readRegularFile(join(guidesSource, entry.name), sourcePath), sourcePath);
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(guide.title)}`,
    `editUrl: ${JSON.stringify(`${ATTEST_EDIT_BASE}/${entry.name}`)}`,
    "---",
    "",
  ].join("\n");
  return {
    target: join(guidesTarget, entry.name),
    content: `${frontmatter}\n${provenance(sourcePath, tag)}\n${guide.body}`,
  };
});

mkdirSync(dirname(changelogTarget), { recursive: true });
writeFileSync(changelogTarget, `${provenance("CHANGELOG.md", tag)}\n${changelog.body}`);
console.log(`wrote ${changelogTarget}`);

rmSync(guidesTarget, { recursive: true, force: true });
mkdirSync(guidesTarget, { recursive: true });
for (const { target, content } of guideOutputs) {
  writeFileSync(target, content);
  console.log(`wrote ${target}`);
}
