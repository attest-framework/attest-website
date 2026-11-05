import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import rehypeMermaid from "rehype-mermaid";
import { existsSync } from "node:fs";

// Written only by scripts/sync-release.mjs; absent until the first release sync.
const hasSyncedGuides = existsSync(new URL("./src/content/docs/sdk-guides", import.meta.url));


// Build-time mermaid rendering (inline SVG, no client JS). Theme variables
// mirror the design tokens in src/styles/custom.css.
const mermaidTheme = {
  theme: "base",
  themeVariables: {
    darkMode: true,
    background: "#15161A",
    primaryColor: "#1E2127",
    primaryTextColor: "#EDEEF0",
    primaryBorderColor: "#4CC9F0",
    secondaryColor: "#1A1C21",
    secondaryTextColor: "#C2C6CC",
    secondaryBorderColor: "#383C45",
    tertiaryColor: "#1A1C21",
    tertiaryTextColor: "#C2C6CC",
    tertiaryBorderColor: "#2A2D34",
    lineColor: "#9A9FA8",
    textColor: "#C2C6CC",
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "15px",
    noteBkgColor: "#1E2127",
    noteTextColor: "#EDEEF0",
    noteBorderColor: "#5F646E",
    actorBkg: "#1A1C21",
    actorTextColor: "#EDEEF0",
    actorBorder: "#4CC9F0",
    actorLineColor: "#5F646E",
    signalColor: "#9A9FA8",
    signalTextColor: "#C2C6CC",
    labelBoxBkgColor: "#1A1C21",
    labelBoxBorderColor: "#2A2D34",
    labelTextColor: "#EDEEF0",
    loopTextColor: "#C2C6CC",
    activationBkgColor: "#0E3D4D",
    activationBorderColor: "#4CC9F0",
    sequenceNumberColor: "#15161A",
    clusterBkg: "#17181D",
    clusterBorder: "#2A2D34",
    edgeLabelBackground: "#17181D",
    classText: "#EDEEF0",
  },
};
export default defineConfig({
  site: "https://attest-framework.github.io",
  markdown: {
    syntaxHighlight: {
      type: "shiki",
      excludeLangs: ["mermaid"],
    },
    rehypePlugins: [
      [
        rehypeMermaid,
        {
          strategy: "inline-svg",
          colorScheme: "dark",
          // Load the site fonts into the headless rendering page so text
          // measurement matches what the site displays (prevents label clipping).
          css: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap",
          mermaidConfig: mermaidTheme,
        },
      ],
    ],
  },
  integrations: [
    starlight({
      title: "Attest Framework",
      description:
        "Test your AI agents like you test your code. 8-layer assertion pipeline, 11 framework adapters, multi-agent support.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/attest-framework",
        },
      ],
      logo: {
        src: "./src/assets/attest-logo.png",
        replacesTitle: false,
      },
      favicon: "/favicon.png",
      components: {
        ThemeProvider: "./src/overrides/ThemeProvider.astro",
        ThemeSelect: "./src/overrides/ThemeSelect.astro",
        Header: "./src/overrides/Header.astro",
      },
      customCss: [
        "@fontsource/inter/400.css",
        "@fontsource/inter/500.css",
        "@fontsource/inter/600.css",
        "@fontsource/inter/700.css",
        "@fontsource/jetbrains-mono/400.css",
        "@fontsource/jetbrains-mono/500.css",
        "./src/styles/custom.css",
      ],
      editLink: {
        baseUrl: "https://github.com/attest-framework/attest-framework.github.io/edit/main/",
      },
      sidebar: [
        {
          label: "Overview",
          slug: "overview",
        },
        {
          label: "Getting Started",
          items: [
            { label: "Quickstart", slug: "getting-started/quickstart" },
            { label: "Python SDK", slug: "getting-started/python" },
            { label: "TypeScript SDK", slug: "getting-started/typescript" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Framework Adapters", slug: "guides/framework-adapters" },
            { label: "Multi-Agent Testing", slug: "guides/multi-agent" },
            { label: "Simulation Mode", slug: "guides/simulation" },
            { label: "Continuous Evaluation", slug: "guides/continuous-eval" },
            { label: "Drift Detection", slug: "guides/drift-detection" },
            { label: "Judge Calibration", slug: "guides/judge-calibration" },
          ],
        },
        ...(hasSyncedGuides
          ? [{ label: "SDK Guides", autogenerate: { directory: "sdk-guides" } }]
          : []),
        {
          label: "Reference",
          items: [
            {
              label: "Python SDK",
              items: [
                { label: "Expect DSL", slug: "reference/python/expect-dsl" },
                { label: "Adapters", slug: "reference/python/adapters" },
                {
                  label: "TraceBuilder",
                  slug: "reference/python/trace-builder",
                },
                {
                  label: "EngineManager",
                  slug: "reference/python/engine-manager",
                },
              ],
            },
            {
              label: "TypeScript SDK",
              items: [
                {
                  label: "Expect DSL",
                  slug: "reference/typescript/expect-dsl",
                },
                {
                  label: "Agent Class",
                  slug: "reference/typescript/agent-class",
                },
                {
                  label: "TraceBuilder",
                  slug: "reference/typescript/trace-builder",
                },
              ],
            },
            {
              label: "Engine",
              items: [
                {
                  label: "JSON-RPC Protocol",
                  slug: "reference/engine/json-rpc-protocol",
                },
              ],
            },
            {
              label: "Configuration",
              slug: "reference/configuration",
            },
          ],
        },
        {
          label: "Architecture",
          items: [
            { label: "Overview", slug: "architecture/overview" },
            {
              label: "Assertion Pipeline",
              slug: "architecture/assertion-pipeline",
            },
            {
              label: "Engine Protocol",
              slug: "architecture/engine-protocol",
            },
            { label: "Adapter System", slug: "architecture/adapter-system" },
          ],
        },
        {
          label: "Migration",
          items: [
            { label: "From DeepEval", slug: "migration/from-deepeval" },
            { label: "From PromptFoo", slug: "migration/from-promptfoo" },
            {
              label: "From Manual Testing",
              slug: "migration/from-manual-testing",
            },
            {
              label: "v0.5.0 → v0.6.0",
              slug: "migration/v05-to-v06",
            },
            {
              label: "v0.4.x → v0.5.0",
              slug: "migration/v04-to-v05",
            },
          ],
        },
        {
          label: "Tutorials",
          items: [
            {
              label: "Writing an Adapter",
              slug: "tutorials/writing-adapter",
            },
            { label: "Writing a Plugin", slug: "tutorials/writing-plugin" },
          ],
        },
        {
          label: "Blog",
          items: [
            { label: "v0.6.0 Release", slug: "blog/v060-release" },
            { label: "v0.5.0 Release", slug: "blog/v050-release" },
            { label: "v0.4.2 Release", slug: "blog/v042-release" },
            { label: "v0.4.0 Launch", slug: "blog/v040-launch" },
          ],
        },
        {
          label: "Changelog",
          slug: "changelog",
        },
      ],
    }),
  ],
});
