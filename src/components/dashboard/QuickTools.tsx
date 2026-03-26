import { Search, FileEdit, BookOpen } from "lucide-react";

const tools = [
  { title: "UX Audit", icon: Search, description: "Review usability" },
  { title: "UX Copywriting", icon: FileEdit, description: "Refine your copy" },
  { title: "Research", icon: BookOpen, description: "Explore insights" },
];

export function QuickTools() {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Quick Tools</h3>
      <div className="grid grid-cols-3 gap-3">
        {tools.map((tool) => (
          <button
            key={tool.title}
            className="surface-elevated rounded-xl p-4 shadow-soft text-left hover:shadow-elevated hover:border-accent/20 transition-all group"
          >
            <tool.icon
              className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors mb-2.5"
              strokeWidth={1.5}
            />
            <p className="text-[13px] font-medium text-foreground">{tool.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tool.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
