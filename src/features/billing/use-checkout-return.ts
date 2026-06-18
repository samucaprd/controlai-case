import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/features/auth/session-context";
import {
  syncCheckoutSession,
  type SyncCheckoutResult,
  StripeApiError,
} from "@/lib/api/stripe";
import { toast } from "sonner";

const PENDING_CHECKOUT_KEY = "controlia_checkout_pending";
export const CHECKOUT_PENDING_STORAGE_KEY = PENDING_CHECKOUT_KEY;
const CHECKOUT_SUCCESS_KEY = "controlia_checkout_success";
const PENDING_MAX_AGE_MS = 60 * 60 * 1000;

interface PendingCheckout {
  stripeSession: string;
  savedAt: number;
}

function readPendingCheckout(): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckout;
    if (!parsed.stripeSession || Date.now() - parsed.savedAt > PENDING_MAX_AGE_MS) {
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function savePendingCheckout(stripeSession: string) {
  const payload: PendingCheckout = { stripeSession, savedAt: Date.now() };
  sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(payload));
}

function clearPendingCheckout() {
  sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
}

function saveCheckoutSuccess(result: SyncCheckoutResult) {
  sessionStorage.setItem(CHECKOUT_SUCCESS_KEY, JSON.stringify(result));
}

function readCheckoutSuccess(): SyncCheckoutResult | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_SUCCESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SyncCheckoutResult;
  } catch {
    return null;
  }
}

function clearCheckoutSuccess() {
  sessionStorage.removeItem(CHECKOUT_SUCCESS_KEY);
}

function extractStripeSessionId(searchParams: URLSearchParams): string | null {
  return (
    searchParams.get("stripe_session") ??
    searchParams.get("session_id") ??
    null
  );
}

/** Captura o retorno do Stripe antes da hidratação React (evita perda de sessão). */
export function captureStripeCheckoutFromUrl(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("checkout") !== "success") return false;

  const stripeSession = extractStripeSessionId(params);
  if (!stripeSession) return false;

  savePendingCheckout(stripeSession);
  return true;
}

export function useCheckoutReturn(onSynced?: () => Promise<void>) {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutSuccess, setCheckoutSuccess] = useState<SyncCheckoutResult | null>(
    () => readCheckoutSuccess(),
  );
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const handledRef = useRef<string | null>(null);

  const clearUrlParams = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("stripe_session");
    next.delete("session_id");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const dismissSuccess = useCallback(() => {
    setCheckoutSuccess(null);
    clearCheckoutSuccess();
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const stripeSession = extractStripeSessionId(searchParams);

    if (checkout === "success" && stripeSession) {
      savePendingCheckout(stripeSession);
      clearUrlParams();
      return;
    }

    if (checkout === "cancel") {
      toast.message("Checkout cancelado.");
      clearUrlParams();
    }
  }, [searchParams, clearUrlParams]);

  useEffect(() => {
    if (sessionLoading || !isAuthenticated) return;

    const pending = readPendingCheckout();
    if (!pending) return;
    if (handledRef.current === pending.stripeSession) return;

    handledRef.current = pending.stripeSession;

    const run = async () => {
      setSyncingCheckout(true);
      try {
        const result = await syncCheckoutSession(pending.stripeSession);
        saveCheckoutSuccess(result);
        setCheckoutSuccess(result);
        clearPendingCheckout();
        await onSynced?.();
        toast.success(result.message ?? "Assinatura atualizada com sucesso!");
      } catch (err) {
        const message =
          err instanceof StripeApiError
            ? err.message
            : "Não foi possível confirmar o pagamento. Tente atualizar a página.";
        toast.error(message);
        await onSynced?.();
        clearPendingCheckout();
      } finally {
        setSyncingCheckout(false);
      }
    };

    void run();
  }, [sessionLoading, isAuthenticated, onSynced]);

  return {
    checkoutSuccess,
    syncingCheckout,
    dismissSuccess,
  };
}
