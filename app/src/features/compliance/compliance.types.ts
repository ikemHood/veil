import type { DisclosureOptions } from "../privacy/privacy.types";

export type ComplianceReceipt = {
  id: string;
  viewKey: string;
  proofId: string;
  options: DisclosureOptions;
  createdAt: string;
};
