import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Sliders,
  Plus,
  ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Files", url: "/files", icon: FileText },
  { title: "Customization", url: "/customization", icon: Sliders },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className={collapsed ? "px-2 py-5" : "px-4 py-5"}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-accent-foreground">A</span>
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">
              Aether
            </span>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center mx-auto cursor-pointer">
                <span className="text-sm font-bold text-accent-foreground">A</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Aether</TooltipContent>
          </Tooltip>
        )}
      </SidebarHeader>

      <SidebarContent className={collapsed ? "px-1" : "px-2"}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild className="h-9 rounded-lg">
                          <NavLink
                            to={item.url}
                            end
                            className="flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            activeClassName="bg-secondary text-foreground font-medium"
                          >
                            <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild className="h-9 rounded-lg">
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        activeClassName="bg-secondary text-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        <span className="text-[13px]">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className={`${collapsed ? "mx-1" : "mx-3"} my-3 h-px bg-border`} />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton className="h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Quick Action</TooltipContent>
                  </Tooltip>
                ) : (
                  <SidebarMenuButton className="h-9 rounded-lg px-3 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span className="text-[13px]">Quick Action</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={collapsed ? "px-1 py-4" : "px-3 py-4"}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex items-center justify-center w-full py-2 rounded-lg hover:bg-secondary transition-colors">
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-foreground">R</span>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Rakshit</TooltipContent>
          </Tooltip>
        ) : (
          <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
            <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-foreground">R</span>
            </div>
            <span className="text-[13px] text-foreground font-medium flex-1 text-left">
              Rakshit
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
