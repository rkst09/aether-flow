import { motion } from "framer-motion";

interface Project {
  name: string;
  lastEdited: string;
  phase: number;
  phaseLabel: string;
  progress: number;
}

const projects: Project[] = [
  { name: "Housewise", lastEdited: "2h ago", phase: 3, phaseLabel: "Prototype", progress: 50 },
  { name: "Flick Connect", lastEdited: "5h ago", phase: 2, phaseLabel: "Screens", progress: 33 },
  { name: "Coates EiN", lastEdited: "1d ago", phase: 1, phaseLabel: "Intake", progress: 16 },
];

export function RecentProjects() {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Recent Projects</h3>
      <div className="grid grid-cols-3 gap-3">
        {projects.map((project, i) => (
          <motion.button
            key={project.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="surface-elevated rounded-xl p-4 shadow-soft text-left hover:shadow-elevated transition-all group"
          >
            {/* Thumbnail placeholder */}
            <div className="h-20 w-full rounded-lg bg-secondary mb-3 flex items-center justify-center">
              <div className="h-6 w-10 rounded bg-accent-muted" />
            </div>

            <p className="text-[13px] font-medium text-foreground truncate">{project.name}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-muted-foreground">{project.lastEdited}</span>
              <span className="text-[10px] font-medium text-accent bg-accent-soft px-1.5 py-0.5 rounded-md">
                Phase {String(project.phase).padStart(2, "0")}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-full bg-secondary rounded-full mt-3 overflow-hidden">
              <div
                className="h-full gradient-accent rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
