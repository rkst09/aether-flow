import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type PhaseErrorDetails } from "@/lib/request-errors";

interface PhaseErrorStateProps {
  details: PhaseErrorDetails;
  onRetry: () => void;
}

export function PhaseErrorState({ details, onRetry }: PhaseErrorStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-border/60 bg-card/95 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
        </div>

        <h2 className="text-lg font-semibold text-foreground">{details.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{details.summary}</p>

        <div className="mt-6 rounded-2xl border border-border/50 bg-secondary/35 px-4 py-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recovery Steps</p>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-foreground/90">
            {details.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {details.command && (
          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background px-4 py-3 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Backend Command</p>
            <code className="mt-2 block overflow-x-auto whitespace-pre-wrap break-all text-xs leading-5 text-foreground">
              {details.command}
            </code>
          </div>
        )}

        <Button
          size="sm"
          className="mt-6 rounded-xl gradient-accent text-accent-foreground text-xs gap-1.5"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Retry
        </Button>
      </div>
    </div>
  );
}
