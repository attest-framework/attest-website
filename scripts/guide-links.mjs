// Rewrite relative Markdown links between attest docs into website routes.
// In attest, docs/guides/simulation.md links `verdicts.md`; on the website that
// page lives at /sdk-guides/verdicts/, so the relative `.md` href is dead.
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export const markdownParser = unified().use(remarkParse).use(remarkGfm);

const SCHEME_OR_ROOTED = /^([a-z][a-z0-9+.-]*:|\/|#)/i;

// `guideBase` is the path from the source file's directory to docs/guides/:
// "" for a guide, "docs/guides/" for CHANGELOG.md at the repository root.
// Returns the rewritten Markdown and a problem for every relative link that has
// no website page, so the caller can fail instead of publishing a dead link.
export function rewriteGuideLinks(markdown, guideSlugs, guideBase) {
  const escapedBase = guideBase.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const guideLink = new RegExp(`^(?:\\./)?${escapedBase}([a-z0-9][a-z0-9-]*)\\.md(#[^\\s]*)?$`);
  const edits = [];
  const problems = [];
  const visit = (node) => {
    if (typeof node.url === "string" && node.url !== "" && !SCHEME_OR_ROOTED.test(node.url)) {
      const line = node.position.start.line;
      const match = guideLink.exec(node.url);
      if (match === null || !guideSlugs.has(match[1])) {
        problems.push(`line ${line}: relative link ${JSON.stringify(node.url)} has no website page`);
      } else {
        const searchFrom =
          node.type === "link" && node.children.length > 0
            ? node.children.at(-1).position.end.offset
            : markdown.indexOf("]", node.position.start.offset);
        const start = markdown.indexOf(node.url, searchFrom);
        if (start === -1 || start >= node.position.end.offset) {
          problems.push(`line ${line}: cannot locate link target ${JSON.stringify(node.url)} in source`);
        } else {
          const href = `/sdk-guides/${match[1]}/${match[2] ?? ""}`;
          edits.push({ start, end: start + node.url.length, href });
        }
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(markdownParser.parse(markdown));
  let output = markdown;
  for (const { start, end, href } of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, start) + href + output.slice(end);
  }
  return { markdown: output, problems };
}
