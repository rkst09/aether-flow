import { Search, FileEdit, BookOpen, ArrowRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tools = [
  {
    title: "UX Audit",
    icon: Search,
    description: "Evaluate usability, detect friction, and uncover experience gaps.",
    cta: "Run Audit",
    href: "/tools/ux-audit",
    active: true,
  },
  {
    title: "UX Copywriting",
    icon: FileEdit,
    description: "Improve clarity, tone, and conversion of your product copy.",
    cta: "Improve Copy",
    href: "/tools/ux-copywriting",
    active: true,
  },
  {
    title: "Research",
    icon: BookOpen,
    description: "Explore insights",
    cta: null,
    href: null,
    active: false,
  },
];

export function QuickTools() {
  const navigate = useNavigate();
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Quick Tools</h3>
      <div className="grid grid-cols-3 gap-3">
        {tools.map((tool) => (
          <button
            key={tool.title}
            onClick={() => tool.href && navigate(tool.href)}
            disabled={!tool.active}
            className={[
              "surface-elevated rounded-xl p-4 shadow-soft text-left transition-all group relative",
              tool.active
                ? "hover:shadow-elevated hover:border-accent/30 cursor-pointer"
                : "opacity-60 cursor-not-allowed",
            ].join(" ")}
          >
            <tool.icon
              className={[
                "h-4 w-4 mb-2.5 transition-colors",
                tool.active ? "text-accent" : "text-muted-foreground",
              ].join(" ")}
              strokeWidth={1.5}
            />
            <p className="text-[13px] font-medium text-foreground">{tool.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              {tool.description}
            </p>
            {tool.active && tool.cta ? (
              <p className="text-[11px] font-semibold text-accent mt-2.5 flex items-center gap-1">
                {tool.cta}
                <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-2.5 flex items-center gap-1">
                <Lock className="h-3 w-3" strokeWidth={1.5} />
                Coming soon
              </p>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
