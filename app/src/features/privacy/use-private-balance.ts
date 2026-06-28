import { useEffect, useState } from "react";
import { getPrivateBalance, subscribeNotesChanged } from "./note-store";

export function usePrivateBalance() {
  const [balance, setBalance] = useState(() => getPrivateBalance());

  useEffect(() => {
    const refresh = () => setBalance(getPrivateBalance());
    refresh();
    return subscribeNotesChanged(refresh);
  }, []);

  return balance;
}
