import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const website = join(dirname(fileURLToPath(import.meta.url)), "..");

function sync(markdown, check) {
  const root = mkdtempSync(join(tmpdir(), "attest-sync-test-"));
  try {
    const source = join(root, "source");
    const target = join(root, "website");
    mkdirSync(join(source, "docs/guides"), { recursive: true });
    mkdirSync(join(source, "proto/attest/v1/cli"), { recursive: true });
    mkdirSync(join(target, "scripts/fixtures"), { recursive: true });
    mkdirSync(join(target, "src/data"), { recursive: true });
    for (const script of ["sync-release.mjs", "guide-links.mjs", "capabilities.mjs"]) {
      copyFileSync(join(website, "scripts", script), join(target, "scripts", script));
    }
    symlinkSync(join(website, "node_modules"), join(target, "node_modules"), "dir");
    copyFileSync(
      join(website, "scripts/fixtures/capabilities.schema.json"),
      join(source, "proto/attest/v1/cli/capabilities.schema.json"),
    );
    const capabilities = JSON.parse(readFileSync(join(website, "src/data/capabilities.json"), "utf8"));
    capabilities.engine_version = "1.1.0-rc.4";
    const engine = join(root, "engine");
    writeFileSync(engine, `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(JSON.stringify(capabilities))});\n`, { mode: 0o755 });
    writeFileSync(join(source, "CHANGELOG.md"), "# Changelog\n\nReleased.\n");
    writeFileSync(join(source, "docs/guides/example.md"), `# Example\n\n${markdown}\n`);
    const result = spawnSync(process.execPath, [
      join(target, "scripts/sync-release.mjs"), source, "v1.1.0-rc.4", "a".repeat(40), engine,
    ], { encoding: "utf8" });
    check(result, join(target, "src/content/docs/sdk-guides/example.md"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("release sync snippet markers", () => {
  it("strips single-line directives, including consecutive comments and CRLF", () => {
    const markers = [
      '<!-- snippet: skip reason="needs a provider key" -->',
      '<!-- snippet: fragment reason="part of a larger example" -->',
      "<!-- snippet: continue -->",
      "  <!-- snippet: setup=project,fixtures -->  ",
      "<!--snippet: exit=1-->",
      "<!-- snippet: mode=script -->",
      "<!-- snippet: harness=simulation_scenario -->",
    ];
    sync(`${markers.join("\r\n")}\r\n\r\n\`\`\`python\r\nprint('example')\r\n\`\`\``, (result, output) => {
      assert.equal(result.status, 0, result.stderr);
      const content = readFileSync(output, "utf8");
      assert.doesNotMatch(content, /<!--\s*snippet:/);
      assert.match(content, /print\('example'\)/);
    });
  });

  for (const html of [
    "<div>unsafe</div>",
    "<script>alert('unsafe')</script>",
    "<!-- ordinary comment -->",
    "<!-- snippet: continue\n -->",
    "<!-- snippet: continue --><script>alert('unsafe')</script><!-- -->",
    "<!-- snippet: continue -->\n<div>unsafe</div>",
    "<!-- snippet: continue -->\n<script>alert('unsafe')</script>",
    "Text before <!-- snippet: continue -->",
    "<!-- snippet: continue --> text after",
  ]) {
    it(`still rejects raw HTML: ${JSON.stringify(html)}`, () => {
      sync(html, (result) => {
        assert.equal(result.status, 1);
        assert.match(result.stderr, /raw HTML is not allowed/);
      });
    });
  }

  it("preserves literal markers inside fenced code and inline code", () => {
    const markdown = "```html\n<!-- snippet: continue -->\n```\n\n`<!-- snippet: continue -->`";
    sync(markdown, (result, output) => {
      assert.equal(result.status, 0, result.stderr);
      assert.ok(readFileSync(output, "utf8").includes(markdown));
    });
  });
});
