import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Plus, Check, Circle, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

type PhaseStatus = "done" | "in-progress" | "pending";

interface Project {
  name: string;
  lastEdited: string;
  phases: PhaseStatus[];
}

const phaseLabels = ["Intake", "Screens", "Prototype", "Audit", "Copy", "Docs"];

const projects: Project[] = [
  {
    name: "Housewise",
    lastEdited: "2h ago",
    phases: ["done", "in-progress", "pending", "pending", "pending", "pending"],
  },
  {
    name: "Flick Connect",
    lastEdited: "5h ago",
    phases: ["done", "done", "done", "in-progress", "pending", "pending"],
  },
  {
    name: "Coates EiN",
    lastEdited: "1d ago",
    phases: ["done", "done", "done", "done", "done", "in-progress"],
  },
];

function PhaseIndicator({ status, index }: { status: PhaseStatus; index: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-col items-center">
        {index > 0 && (
          <div
            className={`w-px h-3 -mb-0.5 ${
              status === "done"
                ? "bg-[hsl(var(--success))]"
                : status === "in-progress"
                ? "bg-accent"
                : "bg-border"
            }`}
          />
        )}
        <div
          className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${
            status === "done"
              ? "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]"
              : status === "in-progress"
              ? "bg-accent-soft text-accent"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {status === "done" ? (
            <Check className="h-3 w-3" strokeWidth={2} />
          ) : status === "in-progress" ? (
            <Circle className="h-2.5 w-2.5 fill-current" />
          ) : (
            <span>{index + 1}</span>
          )}
        </div>
        {index < 5 && (
          <div
            className={`w-px h-3 -mt-0.5 ${
              status === "done"
                ? "bg-[hsl(var(--success))]"
                : "bg-border"
            }`}
          />
        )}
      </div>
      <span
        className={`text-[12px] leading-none ${
          status === "done"
            ? "text-foreground"
            : status === "in-progress"
            ? "text-accent font-medium"
            : "text-muted-foreground"
        }`}
      >
        {phaseLabels[index]}
        {status === "done" && (
          <span className="text-muted-foreground ml-1.5">Done</span>
        )}
        {status === "in-progress" && (
          <span className="text-accent ml-1.5">In Progress</span>
        )}
      </span>
    </div>
  );
}

function ProjectCard({ project, index, onClick }: { project: Project; index: number; onClick: () => void }) {
  const completedCount = project.phases.filter((p) => p === "done").length;
  const progress = Math.round((completedCount / 6) * 100);

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="surface-elevated rounded-xl p-5 shadow-soft text-left hover:shadow-elevated transition-shadow group w-full"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
        <span className="text-[11px] text-muted-foreground">{project.lastEdited}</span>
      </div>

      <div className="space-y-0">
        {project.phases.map((status, i) => (
          <PhaseIndicator key={i} status={status} index={i} />
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-secondary rounded-full mt-4 overflow-hidden">
        <div
          className="h-full gradient-accent rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.button>
  );
}

const Projects = () => {
  const navigate = useNavigate();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
              {/* Start New Project */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.02, y: -1 }}
                onClick={() => navigate("/project/intake")}
                className="surface-elevated rounded-xl px-5 py-4 shadow-soft hover:shadow-elevated transition-shadow flex items-center gap-3 group"
              >
                <div className="h-9 w-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                  <Plus className="h-4 w-4 text-accent" strokeWidth={1.5} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Start New Project</p>
                  <p className="text-[12px] text-muted-foreground">Begin a new 6-phase design workflow</p>
                </div>
              </motion.button>

              {/* Projects Grid */}
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-foreground">Your Projects</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project, i) => (
                    <ProjectCard
                      key={project.name}
                      project={project}
                      index={i}
                      onClick={() =>
                        navigate(`/project/${project.name.toLowerCase().replace(/\s+/g, "-")}`)
                      }
                    />
                  ))}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Projects;
