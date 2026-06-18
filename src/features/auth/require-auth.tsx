import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CHECKOUT_PENDING_STORAGE_KEY, captureStripeCheckoutFromUrl } from "@/features/billing/use-checkout-return";
import { useSession } from "./session-context";

interface RequireAuthProps {
  children: ReactNode;
}

function hasPendingStripeCheckout(): boolean {
  try {
    return Boolean(sessionStorage.getItem(CHECKOUT_PENDING_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function RequireAuth({ children }: RequireAuthProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, isSupabaseMode } = useSession();
  const [awaitingCheckoutReturn, setAwaitingCheckoutReturn] = useState(() => {
    captureStripeCheckoutFromUrl();
    return hasPendingStripeCheckout();
  });

  useEffect(() => {
    if (!hasPendingStripeCheckout()) {
      setAwaitingCheckoutReturn(false);
      return;
    }
    setAwaitingCheckoutReturn(true);
    const timeout = window.setTimeout(() => setAwaitingCheckoutReturn(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, [location.search]);

  useEffect(() => {
    if (isAuthenticated) {
      setAwaitingCheckoutReturn(false);
    }
  }, [isAuthenticated]);

  const showLoading = isSupabaseMode && (isLoading || awaitingCheckoutReturn);

  useEffect(() => {
    if (showLoading) return;
    if (!isAuthenticated) {
      navigate("/auth/login", {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [isAuthenticated, showLoading, isSupabaseMode, navigate, location.pathname]);

  if (showLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">
          {awaitingCheckoutReturn ? "Restaurando sessão após pagamento…" : "Carregando sessão…"}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
