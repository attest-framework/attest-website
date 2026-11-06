import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validateCapabilities } from "./capabilities.mjs";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const schema = read("./fixtures/capabilities.schema.json");
const data = read("../src/data/capabilities.json");

test("committed capabilities data validates against attest's capabilities schema", () => {
  assert.deepEqual(validateCapabilities(data, schema), []);
});

test("capabilities data lists no Go SDK and Apache-2.0 licence", () => {
  assert.ok(!data.sdk_languages.includes("go"));
  assert.equal(data.license, "Apache-2.0");
});

test("a retired cost class is rejected", () => {
  const bad = structuredClone(data);
  bad.layers[0].cost = "paid";
  assert.notDeepEqual(validateCapabilities(bad, schema), []);
});

test("an unknown top-level key is rejected", () => {
  const bad = { ...structuredClone(data), extra: 1 };
  assert.notDeepEqual(validateCapabilities(bad, schema), []);
});

test("a missing licence is rejected", () => {
  const bad = structuredClone(data);
  delete bad.license;
  assert.notDeepEqual(validateCapabilities(bad, schema), []);
});
