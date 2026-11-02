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
});
