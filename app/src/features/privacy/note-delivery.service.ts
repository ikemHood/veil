import { apiRequest } from "../../lib/api/client";
import { stellarConfig } from "../contracts/soroban.client";
import { mergeNotesState } from "./note-store";
import type { StoredNote } from "./privacy.types";

type InboxNote = {
  commitment: string;
  txHash?: string | null;
  note: StoredNote;
};

function wrapperContractId() {
  if (!stellarConfig.wrapperContractId) throw new Error("Missing wrapper contract");
  return stellarConfig.wrapperContractId;
}

export async function deliverPrivateNote({
  note,
  recipientWalletAddress,
  senderWalletAddress,
  txHash,
}: {
  note: StoredNote;
  recipientWalletAddress: string;
  senderWalletAddress: string;
  txHash: string;
}) {
  await apiRequest<{ delivered: boolean }>("/api/v1/veil/notes/deliver", {
    method: "POST",
    body: JSON.stringify({
      recipientWalletAddress,
      senderWalletAddress,
      wrapperContractId: wrapperContractId(),
      commitment: note.commitment,
      txHash,
      note,
    }),
  });
}

export async function importDeliveredNotes(owner: string) {
  const notes = await apiRequest<InboxNote[]>(
    `/api/v1/veil/notes/inbox?wrapperContractId=${encodeURIComponent(wrapperContractId())}`,
  );
  const owned = notes
    .map((item) => ({ ...item.note, creationTxHash: item.note.creationTxHash ?? item.txHash ?? undefined }))
    .filter((note) => note.owner === owner && note.commitment);
  if (owned.length === 0) return;
  await mergeNotesState(owned);
}
