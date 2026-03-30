import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public entry */}
          <Route path="/"        element={<Landing />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/signup"  element={<Signup />} />
          {/* App (post-auth) */}
          <Route path="/dashboard"              element={<Index />} />
          <Route path="/projects"               element={<Projects />} />
          <Route path="/project/intake"         element={<ProjectIntake />} />
          <Route path="/project/:id"            element={<ProjectDetail />} />
          <Route path="/project/phase/01"       element={<PersonaStudio />} />
          <Route path="/project/phase/01/journey" element={<JourneyMapping />} />
          <Route path="/project/phase/01/backlog" element={<DesignBacklog />} />
          <Route path="/project/phase/02"       element={<ScreenDerivation />} />
          <Route path="/project/phase/03"       element={<PrototypePage />} />
          <Route path="/project/phase/04"       element={<UXAudit />} />
          <Route path="/project/phase/05"       element={<UXCopyReview />} />
          <Route path="/project/phase/06"       element={<DesignDocumentation />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
