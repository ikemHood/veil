import type { VeilTransaction } from "../transactions/transaction.types";
import { generateComplianceProof } from "./compliance-proof.service";
import type { ComplianceReceipt } from "./compliance.types";
import { createViewKey } from "./view-key.service";

export function generateDisclosureReceipt(transaction: VeilTransaction): ComplianceReceipt {
  const proof = generateComplianceProof({
    amount: true,
    date: true,
    sender: transaction.type !== "deposit",
    recipient: transaction.type !== "withdraw",
    destination: transaction.type === "withdraw",
    provenance: true,
  });
  return {
    id: `receipt_${transaction.id}`,
    viewKey: createViewKey(),
    proofId: proof.id,
    options: proof.options,
    createdAt: proof.generatedAt,
  };
}
