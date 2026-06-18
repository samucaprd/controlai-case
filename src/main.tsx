import { createRoot } from "react-dom/client";
import { captureStripeCheckoutFromUrl } from "@/features/billing/use-checkout-return";
import { clearInvalidAuthStorage } from "@/lib/supabase/ensure-active-session";
import App from "./App.tsx";
import "./index.css";

captureStripeCheckoutFromUrl();
void clearInvalidAuthStorage();

createRoot(document.getElementById("root")!).render(<App />);
