#!/usr/bin/env node
// Copy attest's single-source docs (CHANGELOG.md, docs/guides/*.md) at a
// release tag into the website. Usage:
//   node scripts/sync-release.mjs <attest-checkout-dir> <tag> <commit-sha> <attest-engine-binary>
// Owns src/synced/CHANGELOG.md, src/content/docs/sdk-guides/, src/data/capabilities.json
// and scripts/fixtures/capabilities.schema.json outright: all are replaced on every
// run, so no website-native page is touched. capabilities.json is the output of
// `<attest-engine-binary> capabilities --json`, built from the release commit by
// the workflow, validated against the schema at proto/attest/v1/cli/capabilities.schema.json
// in the same commit, and required to report the release tag as its engine_version.
//
// Synced files must stay `.md`, never `.mdx`: MDX compiles `{expressions}`,
// `import` and `export` into JavaScript that runs at build time, so an `.mdx`
// copy would execute content from another repository.
import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCapabilities } from "./capabilities.mjs";
import { markdownParser, rewriteGuideLinks } from "./guide-links.mjs";

const TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+(-rc\.[0-9]+)?$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const GUIDE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*\.md$/;
const ALLOWED_URL_SCHEMES = new Set(["http", "https", "mailto"]);
// Region markers attest's generator writes around generated tables; inert comments.
const CLAIMS_MARKER_PATTERN = /^<!-- claims:[a-z0-9-]+:(start|end) -->$/;
// Match run_doc_snippets.py's single-line directive comments, not other HTML.
// Never consume a second comment or markup following a closed marker.
const SNIPPET_MARKER_PATTERN = /^[^\S\r\n]*<!--[^\S\r\n]*snippet:[^\S\r\n]*(?:(?!-->|<!--)[^\r\n])*?-->[^\S\r\n]*$/;
const URL_SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/i;
const ATTEST_EDIT_BASE = "https://github.com/attest-framework/attest/edit/main/docs/guides";
const ATTEST_BLOB_BASE = "https://github.com/attest-framework/attest/blob";

const websiteRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const changelogTarget = join(websiteRoot, "src/synced/CHANGELOG.md");
const guidesTarget = join(websiteRoot, "src/content/docs/sdk-guides");
const capabilitiesTarget = join(websiteRoot, "src/data/capabilities.json");
const capabilitiesSchemaTarget = join(websiteRoot, "scripts/fixtures/capabilities.schema.json");
const CAPABILITIES_SCHEMA_PATH = "proto/attest/v1/cli/capabilities.schema.json";

function fail(message) {
  console.error(`sync-release: ${message}`);
  process.exit(1);
}

function stripSnippetMarkers(markdown) {
  const removals = [];
  const visit = (node) => {
    // Only HTML nodes: fenced examples and inline code must remain literal.
    if (node.type === "html") {
      let offset = node.position.start.offset;
      for (const line of node.value.split("\n")) {
        if (SNIPPET_MARKER_PATTERN.test(line)) {
          removals.push({ start: offset, end: offset + line.length });
        }
        offset += line.length + 1;
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(markdownParser.parse(markdown));
  for (const { start, end } of removals.reverse()) {
    markdown = markdown.slice(0, start) + markdown.slice(end);
  }
  return markdown;
}

// The first non-blank line must be the H1; it becomes the page title and is
// removed from the body because Starlight renders the title itself.
function splitTitle(markdown, label) {
  const lines = stripSnippetMarkers(markdown.replace(/\r\n/g, "\n")).split("\n");
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

// Browsers ignore whitespace and control characters inside a URL scheme
// ("java\tscript:"), so strip them before reading the scheme.
function urlScheme(url) {
  const match = URL_SCHEME_PATTERN.exec(url.replace(/[\u0000- \u007f]/g, ""));
  return match === null ? null : match[1].toLowerCase();
}

// Parse with the same GFM dialect Astro renders, so code fences and inline code
// are not mistaken for HTML. Reject raw HTML nodes and non-web URL schemes.
function assertSafeMarkdown(markdown, label) {
  const problems = [];
  const visit = (node) => {
    const line = node.position?.start.line ?? "?";
    if (node.type === "html" && !CLAIMS_MARKER_PATTERN.test(node.value.trim())) {
      problems.push(`line ${line}: raw HTML is not allowed (${JSON.stringify(node.value.slice(0, 60))})`);
    }
    if (typeof node.url === "string") {
      const scheme = urlScheme(node.url);
      if (scheme !== null && !ALLOWED_URL_SCHEMES.has(scheme)) {
        problems.push(`line ${line}: ${node.type} URL scheme "${scheme}:" is not allowed`);
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(markdownParser.parse(markdown));
  if (problems.length > 0) fail(`${label}:\n  ${problems.join("\n  ")}`);
}

function provenance(sourcePath, tag, sha) {
  return (
    `<!-- Synced from attest-framework/attest ${sourcePath} at ${tag} (${sha}) by ` +
    `scripts/sync-release.mjs. Edit the source in attest, not this file. -->\n`
  );
}

const [sourceDir, tag, sha, engineBinary] = process.argv.slice(2);
if (
  sourceDir === undefined ||
  tag === undefined ||
  sha === undefined ||
  engineBinary === undefined
) {
  fail(
    "usage: node scripts/sync-release.mjs <attest-checkout-dir> <tag> <commit-sha> <attest-engine-binary>",
  );
}
if (!TAG_PATTERN.test(tag)) fail(`invalid tag ${JSON.stringify(tag)}`);
if (!SHA_PATTERN.test(sha)) fail(`invalid commit sha ${JSON.stringify(sha)}`);

// The release workflow checks attest out sparsely (CHANGELOG.md and docs/guides/
// only), so a linked repository file is looked up in the checkout's commit tree,
// not on disk. checkoutCommit is null when sourceDir is not a git checkout (a
// local copy); files are then looked up on disk.
function git(args) {
  return execFileSync("git", ["--literal-pathspecs", "-C", sourceDir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}
let checkoutCommit = null;
try {
  checkoutCommit = git(["rev-parse", "--verify", "HEAD^{commit}"]).trim();
} catch {
  checkoutCommit = null;
}
if (checkoutCommit !== null && checkoutCommit !== sha) {
  fail(`checkout is at ${checkoutCommit}, not the release commit ${sha}`);
}

function isRegularFile(repoPath) {
  if (checkoutCommit === null) {
    return lstatSync(join(sourceDir, repoPath), { throwIfNoEntry: false })?.isFile() === true;
  }
  const entry = git(["ls-tree", "-z", "HEAD", "--", repoPath]).split("\0")[0];
  const tab = entry.indexOf("\t");
  if (tab === -1 || entry.slice(tab + 1) !== repoPath) return false;
  const [mode, type] = entry.slice(0, tab).split(" ");
  return type === "blob" && (mode === "100644" || mode === "100755");
}

// Read and validate every source before writing, so a bad input leaves the
// website untouched.
const changelog = splitTitle(
  readRegularFile(join(sourceDir, "CHANGELOG.md"), "CHANGELOG.md"),
  "CHANGELOG.md",
);
assertSafeMarkdown(changelog.body, "CHANGELOG.md");

const capabilitiesSchemaText = readRegularFile(
  join(sourceDir, CAPABILITIES_SCHEMA_PATH),
  CAPABILITIES_SCHEMA_PATH,
);
let capabilitiesText;
try {
  capabilitiesText = execFileSync(engineBinary, ["capabilities", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
} catch (error) {
  fail(`${engineBinary} capabilities --json failed: ${error.message}`);
}
const capabilities = JSON.parse(capabilitiesText);
const capabilitiesProblems = validateCapabilities(
  capabilities,
  JSON.parse(capabilitiesSchemaText),
);
if (capabilitiesProblems.length > 0) {
  fail(`capabilities --json:\n  ${capabilitiesProblems.join("\n  ")}`);
}
if (`v${capabilities.engine_version}` !== tag) {
  fail(`capabilities engine_version ${capabilities.engine_version} does not match ${tag}`);
}

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
const guideSlugs = new Set(guides.map((entry) => entry.name.slice(0, -".md".length)));

// A relative link to another file in attest (a schema, a fixture) has no website
// page; it becomes a link to that file on GitHub at the release tag. A path that
// normalizes to a synced guide gets that guide's website route instead. The
// target must be a regular file in the release commit, so a typo or a path that
// leaves the repository still fails the sync instead of publishing a dead link.
function repoFileUrl(sourceDirInRepo) {
  return (path) => {
    let decoded;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return null;
    }
    if (decoded.includes("\0")) return null;
    const repoPath = posix.normalize(posix.join(sourceDirInRepo, decoded));
    if (repoPath === "." || repoPath === ".." || repoPath.startsWith("../") || posix.isAbsolute(repoPath)) {
      return null;
    }
    const guide = /^docs\/guides\/([a-z0-9][a-z0-9-]*)\.md$/.exec(repoPath);
    if (guide !== null && guideSlugs.has(guide[1])) return `/sdk-guides/${guide[1]}/`;
    if (!isRegularFile(repoPath)) return null;
    return `${ATTEST_BLOB_BASE}/${tag}/${repoPath.split("/").map(encodeURIComponent).join("/")}`;
  };
}

function withSiteLinks(markdown, guideBase, sourceDirInRepo, label) {
  const rewritten = rewriteGuideLinks(markdown, guideSlugs, guideBase, repoFileUrl(sourceDirInRepo));
  if (rewritten.problems.length > 0) fail(`${label}:\n  ${rewritten.problems.join("\n  ")}`);
  return rewritten.markdown;
}
const changelogBody = withSiteLinks(changelog.body, "docs/guides/", "", "CHANGELOG.md");

const guideOutputs = guides.map((entry) => {
  const sourcePath = `docs/guides/${entry.name}`;
  if (!GUIDE_NAME_PATTERN.test(entry.name)) {
    fail(`${sourcePath}: name must match ${GUIDE_NAME_PATTERN}`);
  }
  const guide = splitTitle(readRegularFile(join(guidesSource, entry.name), sourcePath), sourcePath);
  assertSafeMarkdown(guide.body, sourcePath);
  const body = withSiteLinks(guide.body, "", "docs/guides", sourcePath);
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(guide.title)}`,
    `editUrl: ${JSON.stringify(`${ATTEST_EDIT_BASE}/${entry.name}`)}`,
    "---",
    "",
  ].join("\n");
  return {
    target: join(guidesTarget, entry.name),
    content: `${frontmatter}\n${provenance(sourcePath, tag, sha)}\n${body}`,
  };
});

mkdirSync(dirname(capabilitiesTarget), { recursive: true });
writeFileSync(capabilitiesTarget, `${JSON.stringify(capabilities, null, 2)}\n`);
console.log(`wrote ${capabilitiesTarget}`);
writeFileSync(capabilitiesSchemaTarget, capabilitiesSchemaText);
console.log(`wrote ${capabilitiesSchemaTarget}`);

mkdirSync(dirname(changelogTarget), { recursive: true });
writeFileSync(changelogTarget, `${provenance("CHANGELOG.md", tag, sha)}\n${changelogBody}`);
console.log(`wrote ${changelogTarget}`);

rmSync(guidesTarget, { recursive: true, force: true });
mkdirSync(guidesTarget, { recursive: true });
for (const { target, content } of guideOutputs) {
  writeFileSync(target, content);
  console.log(`wrote ${target}`);
}
