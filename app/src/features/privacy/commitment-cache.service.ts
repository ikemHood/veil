import { stellarConfig } from "../contracts/soroban.client";

function cacheKey() {
  return `veil.public-commitment-leaves.${stellarConfig.wrapperContractId || "local"}`;
}

export function getCachedCommitmentLeaves() {
  const raw = window.localStorage.getItem(cacheKey());
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((leaf) => !leaf || typeof leaf === "string") : [];
  } catch {
    window.localStorage.removeItem(cacheKey());
    return [];
  }
}

export function saveCachedCommitmentLeaves(leaves: string[]) {
  window.localStorage.setItem(cacheKey(), JSON.stringify(leaves));
}

export function rememberCommitmentLeaf(commitment: string, index: number) {
  const leaves = getCachedCommitmentLeaves();
  leaves[index] = commitment;
  saveCachedCommitmentLeaves(leaves);
}
