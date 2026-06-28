import type { AspContract } from "./contract.types";
import { stellarConfig } from "./soroban.client";

export function getAspContract(): AspContract {
  return { contractId: stellarConfig.aspContractId };
}
