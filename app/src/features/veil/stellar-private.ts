import {
  ContractClient,
  IndexedDbBlobStorage,
  EncryptedJsonStorage,
  addressToField,
  bigintToBytes,
  bytesToHex,
  fieldFromBytes,
  hexToBytes,
  poseidonHash,
  randomBytes,
  sha256,
  toField,
  transferBindingHash,
  unwrapBindingHash,
  type Groth16Proof,
} from "@sct01/sdk";
import {
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

const TREE_DEPTH = 20;

export type StoredNote = {
  id: string;
  assetId: string;
  amount: string;
  owner: string;
  randomness: string;
  nullifierKey: string;
  nullifierSecret: string;
  commitment: string;
  leafIndex?: number;
  memo?: string;
  spent: boolean;
  creationTxHash?: string;
  createdAt: number;
};

export type NotesStateBlob = {
  notes: StoredNote[];
  commitmentLeaves: string[];
};

export type PrivateTxResult = {
  txHash: string;
  proofId: string;
  commitment?: string;
  nullifier?: string;
  balance: bigint;
};

export type WalletConnection = {
  address: string;
  network: string;
  networkPassphrase: string;
};

type SnarkJsProof = {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
};

type ProofPack = {
  proof: SnarkJsProof;
  publicSignals: string[];
};

type MerklePath = {
  pathElements: string[];
  pathIndices: string[];
  root: Uint8Array;
};

declare global {
  interface Window {
    snarkjs?: {
      groth16: {
        fullProve: (
          input: Record<string, unknown>,
          wasmPath: string,
          zkeyPath: string,
        ) => Promise<{ proof: SnarkJsProof; publicSignals: string[] }>;
      };
    };
  }
}

export const stellarConfig = {
  network: import.meta.env.VITE_STELLAR_NETWORK ?? "testnet",
  rpcUrl:
    import.meta.env.VITE_STELLAR_RPC_URL ??
    "https://soroban-testnet.stellar.org",
  horizonUrl:
    import.meta.env.VITE_STELLAR_HORIZON_URL ??
    "https://horizon-testnet.stellar.org",
  networkPassphrase:
    import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE ??
    StellarSdk.Networks.TESTNET,
  wrapperContractId: import.meta.env.VITE_WRAPPER_CONTRACT_ID ?? "",
  verifierContractId: import.meta.env.VITE_VERIFIER_CONTRACT_ID ?? "",
  assetAddress: import.meta.env.VITE_ASSET_ADDRESS ?? "",
};

let currentWallet: WalletConnection | null = null;
let vault:
  | { status: "locked" }
  | {
      status: "unlocked";
      owner: string;
      storage: EncryptedJsonStorage<NotesStateBlob>;
      state: NotesStateBlob;
    } = { status: "locked" };

export async function connectStellarWallet(): Promise<WalletConnection> {
  const connected = await isConnected();
  if (connected.error || !connected.isConnected) {
    throw new Error("Install Freighter to connect a Stellar wallet");
  }
  const access = await requestAccess();
  if (access.error) throw new Error(access.error.message);
  const network = await getNetwork().catch(() => ({
    network: stellarConfig.network,
    networkPassphrase: stellarConfig.networkPassphrase,
  }));
  currentWallet = {
    address: access.address,
    network: network.network,
    networkPassphrase: network.networkPassphrase,
  };
  return currentWallet;
}

export function getCurrentWallet() {
  return currentWallet;
}

export function hasContractConfig() {
  return Boolean(
    stellarConfig.wrapperContractId &&
      stellarConfig.verifierContractId &&
      stellarConfig.assetAddress,
  );
}

export async function unlockPrivateVault(owner: string, pin: string) {
  const storage = new EncryptedJsonStorage<NotesStateBlob>(
    new IndexedDbBlobStorage({ dbName: "veil-private-vault", storeName: "notes" }),
    { passcode: pin },
  );
  const state = (await storage.load(vaultKey(owner))) ?? {
    notes: [],
    commitmentLeaves: [],
  };
  vault = { status: "unlocked", owner, storage, state };
  return state;
}

export async function saveVaultState(state: NotesStateBlob) {
  if (vault.status !== "unlocked") return;
  vault.state = state;
  await vault.storage.save(vaultKey(vault.owner), state);
}

export function getVaultState(): NotesStateBlob {
  if (vault.status !== "unlocked") {
    throw new Error("Private note vault locked");
  }
  return vault.state;
}

export function getPrivateBalance() {
  const assetId = requireAssetId();
  return getVaultState().notes.reduce((sum, note) => {
    if (note.spent || note.assetId !== assetId) return sum;
    return sum + BigInt(note.amount);
  }, 0n);
}

export async function depositPrivate(amount: bigint): Promise<PrivateTxResult> {
  const wallet = requireWallet();
  const assetId = requireAssetId();
  const client = contractClient();
  const state = getVaultState();
  const leafIndex = await client.getNoteCount(wallet.address);
  const { note, commitment } = createStoredNote(assetId, amount, wallet.address, leafIndex, "deposit");
  const encryptedNote = encodeNote(note);
  const txHash = await client.deposit(
    wallet.address,
    amount,
    commitment,
    encryptedNote,
    signTransaction,
  );
  const nextState = {
    notes: [...state.notes, { ...note, creationTxHash: txHash }],
    commitmentLeaves: insertLeaf(state.commitmentLeaves, bytesToHex(commitment), leafIndex),
  };
  await saveVaultState(nextState);
  return {
    txHash,
    proofId: `wrap:${txHash.slice(0, 12)}`,
    commitment: bytesToHex(commitment),
    balance: getPrivateBalance(),
  };
}

export async function sendPrivate(
  amount: bigint,
  recipientAddress: string,
): Promise<PrivateTxResult> {
  const wallet = requireWallet();
  const tx = await transferNote({
    amount,
    recipientAddress,
    storeRecipientNote: recipientAddress === wallet.address,
    memo: "send",
  });
  return tx;
}

export async function withdrawPrivate(
  amount: bigint,
  destination: string,
): Promise<PrivateTxResult> {
  const wallet = requireWallet();
  let state = getVaultState();
  const assetId = requireAssetId();
  let note = findExactNote(state.notes, assetId, amount);

  if (!note) {
    await transferNote({
      amount,
      recipientAddress: wallet.address,
      storeRecipientNote: true,
      memo: "withdraw split",
    });
    state = getVaultState();
    note = findExactNote(state.notes, assetId, amount);
  }

  if (!note) throw new Error("Unable to create exact private withdrawal note");

  const client = contractClient();
  const root = await client.getRoot(wallet.address);
  const merklePath = buildMerklePath(state.commitmentLeaves, note.leafIndex ?? -1);
  const nullifier = deriveNullifierBytes(note);
  const bindingHash = unwrapBindingHash(root, assetId, destination, nullifier, amount);
  const proof = await generateUnwrapProof({
    assetId,
    merkleRoot: root,
    note,
    merklePath,
    nullifier,
    recipient: destination,
    amount,
    bindingHash,
  });
  const txHash = await client.withdraw(
    wallet.address,
    proof,
    nullifier,
    destination,
    amount,
    root,
    assetId,
    signTransaction,
  );
  await saveVaultState({
    ...state,
    notes: state.notes.map((item) =>
      item.id === note.id ? { ...item, spent: true, creationTxHash: txHash } : item,
    ),
  });
  return {
    txHash,
    proofId: `unwrap:${txHash.slice(0, 12)}`,
    nullifier: bytesToHex(nullifier),
    balance: getPrivateBalance(),
  };
}

async function transferNote({
  amount,
  recipientAddress,
  storeRecipientNote,
  memo,
}: {
  amount: bigint;
  recipientAddress: string;
  storeRecipientNote: boolean;
  memo: string;
}): Promise<PrivateTxResult> {
  const wallet = requireWallet();
  const assetId = requireAssetId();
  const state = getVaultState();
  const source = selectSingleNote(state.notes, assetId, amount);
  const total = BigInt(source.amount);
  const changeAmount = total - amount;
  const outputLeafIndex = await contractClient().getNoteCount(wallet.address);
  const changeLeafIndex = outputLeafIndex + 1;
  const output = createStoredNote(assetId, amount, recipientAddress, outputLeafIndex, memo);
  const change = createStoredNote(assetId, changeAmount, wallet.address, changeLeafIndex, "change");
  const encryptedNotes = [encodeNote(output.note), encodeNote(change.note)];
  const encryptedNoteHashes = encryptedNotes.map((note) => sha256(note));
  const root = await contractClient().getRoot(wallet.address);
  const merklePath = buildMerklePath(state.commitmentLeaves, source.leafIndex ?? -1);
  const nullifier = deriveNullifierBytes(source);
  const outputCommitments = [output.commitment, change.commitment];
  const bindingHash = transferBindingHash(
    root,
    assetId,
    nullifier,
    outputCommitments,
    encryptedNoteHashes,
  );
  const proof = await generateTransferProof({
    assetId,
    merkleRoot: root,
    note: source,
    merklePath,
    nullifier,
    outAmount: amount,
    outOwner: recipientAddress,
    outRandomness: hexToBytes(output.note.randomness),
    outNullifierKey: hexToBytes(output.note.nullifierKey),
    outputCommitment: output.commitment,
    changeAmount,
    changeOwner: wallet.address,
    changeRandomness: hexToBytes(change.note.randomness),
    changeNullifierKey: hexToBytes(change.note.nullifierKey),
    changeCommitment: change.commitment,
    encryptedNoteHashes,
    bindingHash,
  });
  const txHash = await contractClient().transfer(
    wallet.address,
    proof,
    root,
    assetId,
    [nullifier],
    outputCommitments,
    encryptedNotes,
    signTransaction,
  );
  const notes = state.notes.map((note) =>
    note.id === source.id ? { ...note, spent: true, creationTxHash: txHash } : note,
  );
  if (storeRecipientNote) notes.push({ ...output.note, creationTxHash: txHash });
  if (changeAmount > 0n) notes.push({ ...change.note, creationTxHash: txHash });
  await saveVaultState({
    notes,
    commitmentLeaves: insertLeaf(
      insertLeaf(state.commitmentLeaves, bytesToHex(output.commitment), outputLeafIndex),
      bytesToHex(change.commitment),
      changeLeafIndex,
    ),
  });
  return {
    txHash,
    proofId: `transfer:${txHash.slice(0, 12)}`,
    nullifier: bytesToHex(nullifier),
    commitment: bytesToHex(output.commitment),
    balance: getPrivateBalance(),
  };
}

function contractClient() {
  if (!hasContractConfig()) {
    throw new Error("Missing Stellar contract configuration");
  }
  return new ContractClient({
    rpcUrl: stellarConfig.rpcUrl,
    horizonUrl: stellarConfig.horizonUrl,
    networkPassphrase: stellarConfig.networkPassphrase,
    wrapperContractId: stellarConfig.wrapperContractId,
    verifierContractId: stellarConfig.verifierContractId,
  });
}

async function signTransaction(xdr: string) {
  const wallet = requireWallet();
  const response = await freighterSignTransaction(xdr, {
    networkPassphrase: stellarConfig.networkPassphrase,
    address: wallet.address,
  });
  if (response.error) throw new Error(response.error.message);
  return response.signedTxXdr;
}

function requireWallet() {
  if (!currentWallet) throw new Error("Connect Stellar wallet first");
  return currentWallet;
}

function requireAssetId() {
  if (!stellarConfig.assetAddress) throw new Error("Missing VITE_ASSET_ADDRESS");
  return stellarConfig.assetAddress;
}

function vaultKey(owner: string) {
  return `veil:notes:${stellarConfig.wrapperContractId || "local"}:${owner}`;
}

function createStoredNote(
  assetId: string,
  amount: bigint,
  owner: string,
  leafIndex: number,
  memo: string,
) {
  const note: StoredNote = {
    id: `note_${Date.now()}_${bytesToHex(randomBytes(4))}`,
    assetId,
    amount: amount.toString(),
    owner,
    randomness: bytesToHex(randomBytes(32)),
    nullifierKey: bytesToHex(randomBytes(32)),
    nullifierSecret: bytesToHex(randomBytes(32)),
    commitment: "",
    leafIndex,
    memo,
    spent: false,
    createdAt: Date.now(),
  };
  const commitment = computeCommitmentBytes(note);
  note.commitment = bytesToHex(commitment);
  return { note, commitment };
}

function computeCommitmentBytes(note: StoredNote) {
  return bigintToBytes(
    poseidonHash([
      addressToField(note.assetId),
      BigInt(note.amount),
      addressToField(note.owner),
      fieldFromBytes(hexToBytes(note.randomness)),
      fieldFromBytes(hexToBytes(note.nullifierKey)),
    ]),
  );
}

function deriveNullifierBytes(note: StoredNote) {
  return bigintToBytes(
    poseidonHash([
      fieldFromBytes(hexToBytes(note.nullifierKey)),
      fieldFromBytes(hexToBytes(note.nullifierSecret)),
    ]),
  );
}

function encodeNote(note: StoredNote) {
  return new TextEncoder().encode(JSON.stringify(note));
}

function insertLeaf(leaves: string[], commitment: string, index: number) {
  const next = [...leaves];
  next[index] = commitment;
  return next;
}

function selectSingleNote(notes: StoredNote[], assetId: string, amount: bigint) {
  const note = notes
    .filter((item) => !item.spent && item.assetId === assetId && BigInt(item.amount) >= amount)
    .sort((a, b) => Number(BigInt(a.amount) - BigInt(b.amount)))[0];
  if (!note) throw new Error("Insufficient private balance");
  return note;
}

function findExactNote(notes: StoredNote[], assetId: string, amount: bigint) {
  return notes.find(
    (item) => !item.spent && item.assetId === assetId && BigInt(item.amount) === amount,
  );
}

function decimalToBytes32(value: string): Uint8Array {
  const n = BigInt(value);
  if (n < 0n) throw new Error("negative field element");
  const hex = n.toString(16).padStart(64, "0");
  if (hex.length > 64) throw new Error("field element exceeds 32 bytes");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function g1Bytes(point: [string, string, string]): Uint8Array {
  return concatBytes([decimalToBytes32(point[0]), decimalToBytes32(point[1])]);
}

function g2Bytes(point: [[string, string], [string, string], [string, string]]): Uint8Array {
  const [x, y] = point;
  return concatBytes([
    decimalToBytes32(x[1]),
    decimalToBytes32(x[0]),
    decimalToBytes32(y[1]),
    decimalToBytes32(y[0]),
  ]);
}

function proofPackToGroth16Proof(pack: ProofPack): Groth16Proof {
  return {
    a: g1Bytes(pack.proof.pi_a),
    b: g2Bytes(pack.proof.pi_b),
    c: g1Bytes(pack.proof.pi_c),
  };
}

function signal(bytes: Uint8Array): string {
  return fieldFromBytes(bytes).toString();
}

function field(n: bigint | number | string): string {
  return toField(BigInt(n)).toString();
}

function noteFieldInputs(note: StoredNote) {
  return {
    noteAmount: field(note.amount),
    noteOwner: addressToField(note.owner).toString(),
    noteRandomness: signal(hexToBytes(note.randomness)),
    noteNullifierKey: signal(hexToBytes(note.nullifierKey)),
    nullifierSecret: signal(hexToBytes(note.nullifierSecret)),
  };
}

function zeroes(depth: number): bigint[] {
  const z = [0n];
  for (let i = 0; i < depth; i += 1) {
    z.push(poseidonHash([z[i], z[i]]));
  }
  return z;
}

function buildMerklePath(
  commitmentLeaves: string[],
  leafIndex: number,
  depth = TREE_DEPTH,
): MerklePath {
  if (leafIndex < 0 || leafIndex >= commitmentLeaves.length) {
    throw new Error("note leaf index missing from local tree");
  }
  const zeros = zeroes(depth);
  let level = commitmentLeaves.map((leaf) => fieldFromBytes(hexToBytes(leaf)));
  const pathElements: string[] = [];
  const pathIndices: string[] = [];
  let index = leafIndex;

  for (let d = 0; d < depth; d += 1) {
    const siblingIndex = index ^ 1;
    const sibling = siblingIndex < level.length ? level[siblingIndex] : zeros[d];
    pathElements.push(sibling.toString());
    pathIndices.push((index & 1).toString());

    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : zeros[d];
      next.push(poseidonHash([left, right]));
    }
    level = next.length > 0 ? next : [zeros[d + 1]];
    index = Math.floor(index / 2);
  }

  return {
    pathElements,
    pathIndices,
    root: bigintToBytes(level[0] ?? zeros[depth]),
  };
}

async function loadSnarkjs(): Promise<NonNullable<Window["snarkjs"]>> {
  if (window.snarkjs) return window.snarkjs;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="/vendor/snarkjs.min.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("failed to load snarkjs")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "/vendor/snarkjs.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("failed to load snarkjs"));
    document.head.appendChild(script);
  });
  if (!window.snarkjs) throw new Error("snarkjs global was not initialized");
  return window.snarkjs;
}

async function prove(input: Record<string, unknown>): Promise<ProofPack> {
  const snarkjs = await loadSnarkjs();
  const result = await snarkjs.groth16.fullProve(
    input,
    "/circuits/sct01.wasm",
    "/circuits/sct01_final.zkey",
  );
  return {
    proof: result.proof,
    publicSignals: result.publicSignals.map(String),
  };
}

function assertPublicSignals(pack: ProofPack, action: number, bindingHash: Uint8Array) {
  if (pack.publicSignals[0] !== action.toString()) {
    throw new Error("proof action public signal does not match operation");
  }
  if (pack.publicSignals[1] !== signal(bindingHash)) {
    throw new Error("proof binding public signal does not match operation");
  }
}

async function generateTransferProof(args: {
  assetId: string;
  merkleRoot: Uint8Array;
  note: StoredNote;
  merklePath: MerklePath;
  nullifier: Uint8Array;
  outAmount: bigint;
  outOwner: string;
  outRandomness: Uint8Array;
  outNullifierKey: Uint8Array;
  outputCommitment: Uint8Array;
  changeAmount: bigint;
  changeOwner: string;
  changeRandomness: Uint8Array;
  changeNullifierKey: Uint8Array;
  changeCommitment: Uint8Array;
  encryptedNoteHashes: Uint8Array[];
  bindingHash: Uint8Array;
}) {
  if (bytesToHex(args.merklePath.root) !== bytesToHex(args.merkleRoot)) {
    throw new Error("local Merkle path root does not match on-chain root");
  }
  const pack = await prove({
    action: "2",
    binding: signal(args.bindingHash),
    asset: addressToField(args.assetId).toString(),
    merkleRoot: signal(args.merkleRoot),
    nullifier: signal(args.nullifier),
    pathElements: args.merklePath.pathElements,
    pathIndices: args.merklePath.pathIndices,
    ...noteFieldInputs(args.note),
    outAmount: field(args.outAmount),
    outOwner: addressToField(args.outOwner).toString(),
    outRandomness: signal(args.outRandomness),
    outNullifierKey: signal(args.outNullifierKey),
    outputCommitment: signal(args.outputCommitment),
    changeAmount: field(args.changeAmount),
    changeOwner: addressToField(args.changeOwner).toString(),
    changeRandomness: signal(args.changeRandomness),
    changeNullifierKey: signal(args.changeNullifierKey),
    changeCommitment: signal(args.changeCommitment),
    encryptedNoteHash0: signal(args.encryptedNoteHashes[0]),
    encryptedNoteHash1: signal(args.encryptedNoteHashes[1]),
    recipient: "0",
    unwrapAmount: "0",
  });
  assertPublicSignals(pack, 2, args.bindingHash);
  return proofPackToGroth16Proof(pack);
}

async function generateUnwrapProof(args: {
  assetId: string;
  merkleRoot: Uint8Array;
  note: StoredNote;
  merklePath: MerklePath;
  nullifier: Uint8Array;
  recipient: string;
  amount: bigint;
  bindingHash: Uint8Array;
}) {
  if (bytesToHex(args.merklePath.root) !== bytesToHex(args.merkleRoot)) {
    throw new Error("local Merkle path root does not match on-chain root");
  }
  const pack = await prove({
    action: "3",
    binding: signal(args.bindingHash),
    asset: addressToField(args.assetId).toString(),
    merkleRoot: signal(args.merkleRoot),
    nullifier: signal(args.nullifier),
    pathElements: args.merklePath.pathElements,
    pathIndices: args.merklePath.pathIndices,
    ...noteFieldInputs(args.note),
    outAmount: "0",
    outOwner: "0",
    outRandomness: "0",
    outNullifierKey: "0",
    outputCommitment: "0",
    changeAmount: "0",
    changeOwner: "0",
    changeRandomness: "0",
    changeNullifierKey: "0",
    changeCommitment: "0",
    encryptedNoteHash0: "0",
    encryptedNoteHash1: "0",
    recipient: addressToField(args.recipient).toString(),
    unwrapAmount: field(args.amount),
  });
  assertPublicSignals(pack, 3, args.bindingHash);
  return proofPackToGroth16Proof(pack);
}

export function parseUsdAmount(displayAmount: string, decimals = 7): bigint {
  const value = Number.parseFloat(displayAmount);
  if (!Number.isFinite(value) || value <= 0) return 0n;
  return BigInt(Math.round(value * 10 ** decimals));
}

export function formatUsdAmount(amount: bigint, decimals = 7): string {
  return (Number(amount) / 10 ** decimals).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
