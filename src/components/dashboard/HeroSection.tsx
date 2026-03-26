import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

interface HeroSectionProps {
  currentPhase: number;
  phaseName: string;
  phaseDescription: string;
}

export function HeroSection({ currentPhase, phaseName, phaseDescription }: HeroSectionProps) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Let's move your design forward
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Continue your workflow with the next step
        </p>
      </div>

      <motion.div
        whileHover={{ scale: 1.01, y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-accent/20 bg-card p-6 shadow-elevated cursor-pointer group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent-soft to-transparent opacity-60" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-md gradient-accent flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-accent-foreground" strokeWidth={2} />
            </div>
            <span className="text-xs font-medium text-accent uppercase tracking-wider">
              Phase {String(currentPhase).padStart(2, "0")}
            </span>
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-1">
            {phaseName}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mb-5">
            {phaseDescription}
          </p>

          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-accent text-accent-foreground text-sm font-medium transition-all group-hover:shadow-lg group-hover:shadow-accent/20">
            Start Now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
          </button>
        </div>
      </motion.div>
    </section>
  );
}
