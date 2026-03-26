import { Check, Lock } from "lucide-react";
import { motion } from "framer-motion";

const phases = [
  { id: 1, label: "Intake" },
  { id: 2, label: "Screens" },
  { id: 3, label: "Prototype" },
  { id: 4, label: "Audit" },
  { id: 5, label: "Copy" },
  { id: 6, label: "Docs" },
];

interface WorkflowStepperProps {
  currentPhase: number;
  completedPhases: number[];
}

export function WorkflowStepper({ currentPhase, completedPhases }: WorkflowStepperProps) {
  const totalCompleted = completedPhases.length;
  const progress = Math.round((totalCompleted / phases.length) * 100);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Workflow Progress</h3>
        <span className="text-xs text-muted-foreground">{progress}% complete</span>
      </div>

      <div className="surface-elevated rounded-xl p-4 shadow-soft">
        {/* Progress bar */}
        <div className="h-1 w-full bg-secondary rounded-full mb-5 overflow-hidden">
          <motion.div
            className="h-full gradient-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between">
          {phases.map((phase, i) => {
            const isCompleted = completedPhases.includes(phase.id);
            const isCurrent = phase.id === currentPhase;
            const isLocked = !isCompleted && !isCurrent;

            return (
              <div key={phase.id} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`
                    h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                    ${isCompleted ? "gradient-accent text-accent-foreground" : ""}
                    ${isCurrent ? "bg-accent-soft text-accent ring-2 ring-accent/30" : ""}
                    ${isLocked ? "bg-secondary text-muted-foreground" : ""}
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : isLocked ? (
                    <Lock className="h-3 w-3" strokeWidth={2} />
                  ) : (
                    phase.id
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {phase.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
