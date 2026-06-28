import type { VerifierContract } from "./contract.types";
import { stellarConfig } from "./soroban.client";

export function getVerifierContract(): VerifierContract {
  return { contractId: stellarConfig.verifierContractId };
}
