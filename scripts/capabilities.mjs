// Validation of the `attest-engine capabilities --json` document against
// attest's proto/attest/v1/cli/capabilities.schema.json (vendored copy in
// scripts/fixtures/, refreshed by sync-release.mjs from the release checkout).
import Ajv2020 from "ajv/dist/2020.js";

export function validateCapabilities(document, schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  if (validate(document)) return [];
  return validate.errors.map((error) => `${error.instancePath || "/"} ${error.message}`);
}
