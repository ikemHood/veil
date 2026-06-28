import { createContext, type PropsWithChildren, useContext, useMemo } from "react";
import { type VeilSession } from "../lib/auth/client";
import { useSession } from "../lib/auth/session";

export type AuthContextType = {
  session: VeilSession | null;
  user: VeilSession["user"] | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: false,
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const { session, loading } = useSession();
  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
