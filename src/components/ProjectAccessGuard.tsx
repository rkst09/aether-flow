import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FolderSearch } from "lucide-react";
import { supabase } from "@/lib/supabase";
import NotFound from "@/pages/NotFound";

type GuardState = "checking" | "ready" | "missing";

export function ProjectAccessGuard({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<GuardState>("checking");

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setState("missing");
      return () => {
        cancelled = true;
      };
    }

    setState("checking");

    supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setState(!error && data ? "ready" : "missing");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
            <FolderSearch className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Checking project access</p>
            <p className="text-xs">Making sure this project exists and belongs to your workspace.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "missing") {
    return <NotFound />;
  }

  return <>{children}</>;
}
