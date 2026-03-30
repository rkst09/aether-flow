import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#FAFAFA" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ background: "#EEF2FF", border: "1.5px solid #C7D2FE" }}
          >
            <div className="h-4 w-4 rounded-sm bg-[#6366F1]" />
          </div>
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
