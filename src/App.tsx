import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import Index from "./pages/Index.tsx";
import Projects from "./pages/Projects.tsx";
import ProjectDetail from "./pages/ProjectDetail.tsx";
import ProjectIntake from "./pages/ProjectIntake.tsx";
import PersonaStudio from "./pages/PersonaStudio.tsx";
import JourneyMapping from "./pages/JourneyMapping.tsx";
import DesignBacklog from "./pages/DesignBacklog.tsx";
import ScreenDerivation from "./pages/ScreenDerivation.tsx";
import PrototypePage from "./pages/PrototypePage.tsx";
import UXAudit from "./pages/UXAudit.tsx";
import UXCopyReview from "./pages/UXCopyReview.tsx";
import DesignDocumentation from "./pages/DesignDocumentation.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ── Public ──────────────────────────────────────────────── */}
            <Route path="/"       element={<Landing />} />
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* ── Protected ───────────────────────────────────────────── */}
            <Route path="/dashboard"                element={<P><Index /></P>} />
            <Route path="/projects"                 element={<P><Projects /></P>} />
            <Route path="/project/intake"           element={<P><ProjectIntake /></P>} />
            <Route path="/project/:id"              element={<P><ProjectDetail /></P>} />
            <Route path="/project/phase/01"         element={<P><PersonaStudio /></P>} />
            <Route path="/project/phase/01/journey" element={<P><JourneyMapping /></P>} />
            <Route path="/project/phase/01/backlog" element={<P><DesignBacklog /></P>} />
            <Route path="/project/phase/02"         element={<P><ScreenDerivation /></P>} />
            <Route path="/project/phase/03"         element={<P><PrototypePage /></P>} />
            <Route path="/project/phase/04"         element={<P><UXAudit /></P>} />
            <Route path="/project/phase/05"         element={<P><UXCopyReview /></P>} />
            <Route path="/project/phase/06"         element={<P><DesignDocumentation /></P>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
