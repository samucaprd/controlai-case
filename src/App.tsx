import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Colaborador from "./pages/dashboard/Colaborador";
import Admin from "./pages/dashboard/Admin";
import Master from "./pages/dashboard/Master";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/features/auth/auth-context";
import { RequireAuth } from "@/features/auth/require-auth";
import { RequireRole } from "@/features/auth/require-role";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />

            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route element={<RequireRole allowed={["user"]} />}>
                  <Route path="colaborador" element={<Colaborador />} />
                </Route>
                <Route element={<RequireRole allowed={["admin"]} />}>
                  <Route path="admin" element={<Admin />} />
                </Route>
                <Route element={<RequireRole allowed={["master"]} />}>
                  <Route path="master" element={<Master />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
