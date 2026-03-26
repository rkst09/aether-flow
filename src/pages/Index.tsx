import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { WorkflowStepper } from "@/components/dashboard/WorkflowStepper";
import { QuickTools } from "@/components/dashboard/QuickTools";
import { RecentProjects } from "@/components/dashboard/RecentProjects";

const Index = () => {
  const currentPhase = 1;
  const completedPhases: number[] = [];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
              <HeroSection
                currentPhase={currentPhase}
                phaseName="Start Phase 01: Design Intake"
                phaseDescription="Define personas, map journeys, and uncover opportunities to lay the foundation for your design system."
              />

              <WorkflowStepper
                currentPhase={currentPhase}
                completedPhases={completedPhases}
              />

              <QuickTools />

              <RecentProjects />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
