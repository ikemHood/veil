// SCT-01 SDK - Contract Client
//
// Client for the SCT-01 Confidential Transfer Adapter and verifier contracts.
// Matches the live dApp transaction shape used on testnet.
import * as StellarSdk from "@stellar/stellar-sdk";
import { sha256 } from "../crypto/hash.js";
function scBytes(bytes) {
    return StellarSdk.nativeToScVal(bytes, { type: "bytes" });
}
function scVec(values) {
    return StellarSdk.xdr.ScVal.scvVec(values);
}
function scMap(entries) {
    return StellarSdk.xdr.ScVal.scvMap(entries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol(key),
        val,
    })));
}
function scGroth16Proof(proof) {
    return scMap([
        ["a", scBytes(proof.a)],
        ["b", scBytes(proof.b)],
        ["c", scBytes(proof.c)],
    ]);
}
/**
 * Contract client for SCT-01 adapter calls.
 */
export class ContractClient {
    rpc;
    horizon;
    config;
    constructor(config) {
        this.config = config;
        this.rpc = new StellarSdk.rpc.Server(config.rpcUrl);
        this.horizon = new StellarSdk.Horizon.Server(config.horizonUrl);
    }
    /**
     * Deposit: lock public tokens and create a confidential note.
     */
    async deposit(sourceAddress, amount, commitment, encryptedNote, signTransaction) {
        const contract = new StellarSdk.Contract(this.config.wrapperContractId);
        return this.submitOperation(sourceAddress, contract.call("wrap", StellarSdk.Address.fromString(sourceAddress).toScVal(), StellarSdk.nativeToScVal(amount, { type: "i128" }), scBytes(commitment), scBytes(encryptedNote)), signTransaction);
    }
    /**
     * Confidential transfer: spend one note, create recipient and change notes.
     */
    async transfer(sourceAddress, proof, merkleRoot, assetId, nullifiers, outputCommitments, encryptedNotes, signTransaction) {
        const contract = new StellarSdk.Contract(this.config.wrapperContractId);
        const encryptedNoteHashes = encryptedNotes.map((note) => sha256(note));
        const publicInputs = scMap([
            ["merkle_root", scBytes(merkleRoot)],
            ["asset_id", StellarSdk.Address.fromString(assetId).toScVal()],
            ["output_commitments", scVec(outputCommitments.map(scBytes))],
            ["encrypted_note_hashes", scVec(encryptedNoteHashes.map(scBytes))],
        ]);
        return this.submitOperation(sourceAddress, contract.call("confidential_transfer", scGroth16Proof(proof), publicInputs, scVec(nullifiers.map(scBytes)), scVec(outputCommitments.map(scBytes)), scVec(encryptedNotes.map(scBytes))), signTransaction);
    }
    /**
     * Withdraw: spend a confidential note and release public tokens.
     */
    async withdraw(sourceAddress, proof, nullifier, recipient, amount, merkleRoot, assetId, signTransaction) {
        const contract = new StellarSdk.Contract(this.config.wrapperContractId);
        const publicInputs = scMap([
            ["merkle_root", scBytes(merkleRoot)],
            ["asset_id", StellarSdk.Address.fromString(assetId).toScVal()],
            ["recipient", StellarSdk.Address.fromString(recipient).toScVal()],
            ["amount", StellarSdk.nativeToScVal(amount, { type: "i128" })],
        ]);
        return this.submitOperation(sourceAddress, contract.call("unwrap", scGroth16Proof(proof), publicInputs, scBytes(nullifier), StellarSdk.Address.fromString(recipient).toScVal(), StellarSdk.nativeToScVal(amount, { type: "i128" })), signTransaction);
    }
    /**
     * Keypair convenience wrapper for Node scripts.
     */
    async wrap(sourceKeypair, amount, commitment, encryptedNote) {
        return this.deposit(sourceKeypair.publicKey(), amount, commitment, encryptedNote, async (xdr) => this.signXdr(xdr, sourceKeypair));
    }
    /**
     * Keypair convenience wrapper for Node scripts.
     */
    async confidentialTransfer(sourceKeypair, proof, merkleRoot, assetId, nullifiers, outputCommitments, encryptedNotes) {
        return this.transfer(sourceKeypair.publicKey(), proof, merkleRoot, assetId, nullifiers, outputCommitments, encryptedNotes, async (xdr) => this.signXdr(xdr, sourceKeypair));
    }
    /**
     * Keypair convenience wrapper for Node scripts.
     */
    async unwrap(sourceKeypair, proof, nullifier, recipient, amount, merkleRoot, assetId) {
        return this.withdraw(sourceKeypair.publicKey(), proof, nullifier, recipient, amount, merkleRoot, assetId, async (xdr) => this.signXdr(xdr, sourceKeypair));
    }
    async isSpent(sourceAddress, nullifier) {
        try {
            const result = await this.invokeViewFunction(sourceAddress, "is_spent", [
                scBytes(nullifier),
            ]);
            return StellarSdk.scValToNative(result);
        }
        catch {
            return false;
        }
    }
    async commitmentExists(sourceAddress, commitment) {
        try {
            const result = await this.invokeViewFunction(sourceAddress, "commitment_exists", [scBytes(commitment)]);
            return StellarSdk.scValToNative(result);
        }
        catch {
            return false;
        }
    }
    async getRoot(sourceAddress) {
        const result = await this.invokeViewFunction(sourceAddress, "root", []);
        return StellarSdk.scValToNative(result);
    }
    async getNoteCount(sourceAddress) {
        const result = await this.invokeViewFunction(sourceAddress, "note_count", []);
        return Number(StellarSdk.scValToNative(result));
    }
    async getCommitmentAt(sourceAddress, index) {
        const result = await this.invokeViewFunction(sourceAddress, "commitment_at", [
            StellarSdk.nativeToScVal(BigInt(index), { type: "u64" }),
        ]);
        return StellarSdk.scValToNative(result);
    }
    async getCommitments(sourceAddress, start = 0, limit = 200) {
        const result = await this.invokeViewFunction(sourceAddress, "commitments", [
            StellarSdk.nativeToScVal(BigInt(start), { type: "u64" }),
            StellarSdk.nativeToScVal(limit, { type: "u32" }),
        ]);
        return StellarSdk.scValToNative(result);
    }
    async getMetadata(sourceAddress) {
        const result = await this.invokeViewFunction(sourceAddress, "metadata", []);
        const native = StellarSdk.scValToNative(result);
        return {
            name: native.name,
            symbol: native.symbol,
            decimals: native.decimals,
            underlyingAsset: native.underlying_asset,
            version: native.version,
            circuitVersion: native.circuit_version,
            verifier: native.verifier,
            privacyModel: native.privacy_model,
        };
    }
    async getPublicBalance(address) {
        try {
            const account = await this.horizon.loadAccount(address);
            const native = account.balances.find((b) => b.asset_type === "native");
            return native?.balance || "0";
        }
        catch {
            return "0";
        }
    }
    async getEvents(startLedger, eventTypes = ["wrap", "conf_transfer", "unwrap"]) {
        const filters = eventTypes.map((type) => ({
            type: "contract",
            contractIds: [this.config.wrapperContractId],
            topics: [[StellarSdk.xdr.ScVal.scvSymbol(type).toXDR("base64")]],
        }));
        return this.rpc.getEvents({
            startLedger,
            filters,
        });
    }
    async submitOperation(sourceAddress, operation, signTransaction) {
        const account = await this.rpc.getAccount(sourceAddress);
        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: this.config.networkPassphrase,
        })
            .addOperation(operation)
            .setTimeout(180)
            .build();
        const simulation = await this.rpc.simulateTransaction(tx);
        if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
            throw new Error(`Simulation failed: ${simulation.error}`);
        }
        const assembled = StellarSdk.rpc.assembleTransaction(tx, simulation).build();
        const signedXdr = await signTransaction(assembled.toXDR());
        const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, this.config.networkPassphrase);
        const response = await this.rpc.sendTransaction(signedTx);
        if (response.status === "ERROR") {
            throw new Error(`Transaction failed: ${response.errorResult}`);
        }
        return this.pollTransaction(response.hash);
    }
    signXdr(xdr, keypair) {
        const tx = StellarSdk.TransactionBuilder.fromXDR(xdr, this.config.networkPassphrase);
        tx.sign(keypair);
        return tx.toXDR();
    }
    async pollTransaction(hash) {
        let response = await this.rpc.getTransaction(hash);
        let attempts = 0;
        while (response.status === "NOT_FOUND" && attempts < 30) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            response = await this.rpc.getTransaction(hash);
            attempts++;
        }
        if (response.status === "SUCCESS")
            return hash;
        throw new Error(`Transaction failed: ${response.status}`);
    }
    async invokeViewFunction(sourceAddress, method, args) {
        const contract = new StellarSdk.Contract(this.config.wrapperContractId);
        const account = await this.rpc.getAccount(sourceAddress);
        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: this.config.networkPassphrase,
        })
            .addOperation(contract.call(method, ...args))
            .setTimeout(30)
            .build();
        const simulation = await this.rpc.simulateTransaction(tx);
        if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
            throw new Error(`${method} query failed: ${simulation.error}`);
        }
        if (!simulation.result) {
            throw new Error(`${method} query returned no result`);
        }
        return simulation.result.retval;
    }
}
//# sourceMappingURL=client.js.map