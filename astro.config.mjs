import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://attest-framework.github.io",
  base: "/attest-website",
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
        baseUrl: "https://github.com/attest-framework/attest-website/edit/main/",
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
          ],
        },
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
            { label: "v0.4.0 Launch", slug: "blog/v040-launch" },
            { label: "v0.4.2 Release", slug: "blog/v042-release" },
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
