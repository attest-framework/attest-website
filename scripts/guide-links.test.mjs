import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rewriteGuideLinks } from "./guide-links.mjs";

const slugs = new Set(["verdicts", "simulation"]);

describe("rewriteGuideLinks", () => {
  it("rewrites a sibling guide link to its website route", () => {
    const result = rewriteGuideLinks("see [Verdicts](verdicts.md).", slugs, "");
    assert.deepEqual(result, { markdown: "see [Verdicts](/sdk-guides/verdicts/).", problems: [] });
  });

  it("keeps the anchor and accepts a ./ prefix", () => {
    const result = rewriteGuideLinks("[x](./verdicts.md#outcomes)", slugs, "");
    assert.equal(result.markdown, "[x](/sdk-guides/verdicts/#outcomes)");
  });

  it("rewrites the link target, not link text that repeats it", () => {
    const result = rewriteGuideLinks("[verdicts.md](verdicts.md)", slugs, "");
    assert.equal(result.markdown, "[verdicts.md](/sdk-guides/verdicts/)");
  });

  it("rewrites reference definitions", () => {
    const result = rewriteGuideLinks("[Sim][s]\n\n[s]: simulation.md\n", slugs, "");
    assert.equal(result.markdown, "[Sim][s]\n\n[s]: /sdk-guides/simulation/\n");
  });

  it("resolves CHANGELOG links through docs/guides/", () => {
    const result = rewriteGuideLinks("[v](docs/guides/verdicts.md)", slugs, "docs/guides/");
    assert.equal(result.markdown, "[v](/sdk-guides/verdicts/)");
  });

  it("leaves absolute, rooted, anchor and code-span links alone", () => {
    const markdown = "[a](https://x.dev/verdicts.md) [b](/changelog/) [c](#top) `[d](verdicts.md)`";
    assert.deepEqual(rewriteGuideLinks(markdown, slugs, ""), { markdown, problems: [] });
  });

  it("reports a relative link with no website page", () => {
    const result = rewriteGuideLinks("[r](../README.md) [g](missing.md)", slugs, "");
    assert.deepEqual(result.problems, [
      'line 1: relative link "../README.md" has no website page',
      'line 1: relative link "missing.md" has no website page',
    ]);
  });

  it("links a non-guide repository file through repoFileUrl, keeping the anchor", () => {
    const files = new Map([["../../proto/x.schema.json", "https://github.com/o/r/blob/v1/proto/x.schema.json"]]);
    const result = rewriteGuideLinks(
      "[s](../../proto/x.schema.json#defs) [g](verdicts.md)",
      slugs,
      "",
      (path) => files.get(path) ?? null,
    );
    assert.deepEqual(result, {
      markdown: "[s](https://github.com/o/r/blob/v1/proto/x.schema.json#defs) [g](/sdk-guides/verdicts/)",
      problems: [],
    });
  });

  it("still reports a relative link that repoFileUrl cannot resolve", () => {
    const result = rewriteGuideLinks("[m](missing.md)", slugs, "", () => null);
    assert.deepEqual(result.problems, ['line 1: relative link "missing.md" has no website page']);
  });

  it("never sends images to repoFileUrl, inline or by reference", () => {
    const seen = [];
    const resolve = (path) => {
      seen.push(path);
      return "https://github.com/o/r/blob/v1/x";
    };
    const result = rewriteGuideLinks("![a](../a.png) ![b][img]\n\n[img]: ../b.png\n", slugs, "", resolve);
    assert.deepEqual(seen, []);
    assert.deepEqual(result.problems, [
      'line 1: relative link "../a.png" has no website page',
      'line 3: relative link "../b.png" has no website page',
    ]);
  });
});
