import { createDisclosureProof } from "../privacy/disclosure.service";
import type { DisclosureOptions } from "../privacy/privacy.types";

export function generateComplianceProof(options: DisclosureOptions) {
  return createDisclosureProof(options);
}
