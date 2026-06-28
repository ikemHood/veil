import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import { FiLock } from "react-icons/fi";
import { PinPad } from "../../features/onboarding/pin-pad";
import { setTransactionPin } from "../../features/onboarding/onboarding.store";

export const Route = createFileRoute("/onboarding/pin")({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: "/" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="onboarding-card">
      <FiLock className="hero-icon" />
      <h1>Set transaction PIN</h1>
      <p>Your PIN approves private sends, withdrawals, and disclosure receipts.</p>
      <PinPad
        error={error}
        onChange={(value) => {
          setPin(value);
          setError("");
        }}
        onComplete={(value) => {
          const userId = auth.session?.user.id;
          if (!userId) {
            setError("Sign in required");
            return;
          }
          setTransactionPin(userId, value)
            .then(() => navigate({ to: "/onboarding/username" }))
            .catch((caught: unknown) => {
              const message = caught instanceof Error ? caught.message : "PIN setup failed";
              setPin("");
              toast.error(message);
              setError(message);
            });
        }}
        value={pin}
      />
    </div>
  );
}
