import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import aetherLogo from "@/assets/aether-logo.png";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#FAFAFA" }}
      >
        <div className="flex flex-col items-center gap-4">
          <img
            src={aetherLogo}
            alt="Aether"
            className="h-10 w-10 object-contain rounded-xl"
            style={{ background: "#EEF2FF", padding: "6px" }}
          />
          <div
            className="h-1 w-20 rounded-full overflow-hidden"
            style={{ background: "#E5E7EB" }}
          >
            <div
              className="h-full rounded-full bg-[#6366F1]"
              style={{
                width: "50%",
                animation: "pulse-bar 1.4s ease-in-out infinite",
              }}
            />
          </div>
        </div>
        <style>{`
          @keyframes pulse-bar {
            0%, 100% { width: 30%; opacity: 0.6; }
            50% { width: 70%; opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
