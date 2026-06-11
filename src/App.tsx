import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import AcceptInvite from "./pages/auth/AcceptInvite";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/reset-password";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Colaborador from "./pages/dashboard/Colaborador";
import AgentesIA from "./pages/dashboard/AgentesIA";
import Admin from "./pages/dashboard/Admin";
import Master from "./pages/dashboard/Master";
import NotFound from "./pages/NotFound";
import { SessionProvider } from "@/features/auth/session-context";
import { RequireAuth } from "@/features/auth/require-auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/accept-invite" element={<AcceptInvite />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="colaborador" element={<Colaborador />} />
            <Route path="agentes-ia" element={<AgentesIA />} />
            <Route path="admin" element={<Admin />} />
            <Route path="master" element={<Master />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </SessionProvider>
  </QueryClientProvider>
);

export default App;
