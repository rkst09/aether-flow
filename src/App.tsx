import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { ProjectAccessGuard } from "@/components/ProjectAccessGuard";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { getRouteMetadata } from "@/lib/route-metadata";
import { captureClientError } from "@/lib/telemetry";

// ── Eagerly loaded (critical path) ──────────────────────────────────────────
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";

// ── Lazily loaded (split per route) ─────────────────────────────────────────
const Login                = lazy(() => import("./pages/Login.tsx"));
const Signup               = lazy(() => import("./pages/Signup.tsx"));
const ResetPassword        = lazy(() => import("./pages/ResetPassword.tsx"));
const Index                = lazy(() => import("./pages/Index.tsx"));
const Projects             = lazy(() => import("./pages/Projects.tsx"));
const ProjectDetail        = lazy(() => import("./pages/ProjectDetail.tsx"));
const ProjectIntake        = lazy(() => import("./pages/ProjectIntake.tsx"));
const PersonaStudio        = lazy(() => import("./pages/PersonaStudio.tsx"));
const JourneyMapping       = lazy(() => import("./pages/JourneyMapping.tsx"));
const DesignBacklog        = lazy(() => import("./pages/DesignBacklog.tsx"));
const ScreenDerivation     = lazy(() => import("./pages/ScreenDerivation.tsx"));
const PrototypePage        = lazy(() => import("./pages/PrototypePage.tsx"));
const UXAudit              = lazy(() => import("./pages/UXAudit.tsx"));
const UXCopyReview         = lazy(() => import("./pages/UXCopyReview.tsx"));
const DesignDocumentation  = lazy(() => import("./pages/DesignDocumentation.tsx"));
const UXAuditTool          = lazy(() => import("./pages/tools/UXAuditTool.tsx"));
const UXCopywritingTool    = lazy(() => import("./pages/tools/UXCopywritingTool.tsx"));

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent/40 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  </div>
);

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const ProjectP = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <ProjectAccessGuard>{children}</ProjectAccessGuard>
  </ProtectedRoute>
);

const RouteRuntime = () => {
  const location = useLocation();

  useEffect(() => {
    const meta = getRouteMetadata(location.pathname);
    document.title = meta.title;

    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      document.head.appendChild(description);
    }
    description.setAttribute("content", meta.description);
  }, [location.pathname]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      captureClientError(event.message || "Unhandled window error", {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      captureClientError(reason || "Unhandled promise rejection");
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return <NetworkStatusBanner />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteRuntime />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Public ──────────────────────────────────────────────── */}
              <Route path="/"              element={<Landing />} />
              <Route path="/login"          element={<Login />} />
              <Route path="/signup"         element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* ── Protected ───────────────────────────────────────────── */}
              <Route path="/dashboard"                    element={<P><Index /></P>} />
              <Route path="/projects"                     element={<P><Projects /></P>} />
              <Route path="/project/intake"               element={<P><ProjectIntake /></P>} />
              <Route path="/project/:id"                  element={<ProjectP><ProjectDetail /></ProjectP>} />
              <Route path="/project/:id/phase/01"         element={<ProjectP><PersonaStudio /></ProjectP>} />
              <Route path="/project/:id/phase/01/journey" element={<ProjectP><JourneyMapping /></ProjectP>} />
              <Route path="/project/:id/phase/01/backlog" element={<ProjectP><DesignBacklog /></ProjectP>} />
              <Route path="/project/:id/phase/02"         element={<ProjectP><ScreenDerivation /></ProjectP>} />
              <Route path="/project/:id/phase/03"         element={<ProjectP><PrototypePage /></ProjectP>} />
              <Route path="/project/:id/phase/04"         element={<ProjectP><UXAudit /></ProjectP>} />
              <Route path="/project/:id/phase/05"         element={<ProjectP><UXCopyReview /></ProjectP>} />
              <Route path="/project/:id/phase/06"         element={<ProjectP><DesignDocumentation /></ProjectP>} />

              {/* ── Standalone Tools ────────────────────────────────────── */}
              <Route path="/tools/ux-audit"       element={<P><UXAuditTool /></P>} />
              <Route path="/tools/ux-copywriting" element={<P><UXCopywritingTool /></P>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
