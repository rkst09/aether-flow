import { LayoutDashboard, FolderKanban, ChevronDown, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import aetherLogo from "@/assets/aether-logo.png";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects",  url: "/projects",  icon: FolderKanban    },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const collapsed = state === "collapsed";

  const displayName = user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r bg-white"
      style={{ borderColor: "#E5E7EB" }}
    >
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <SidebarHeader className={cn("py-5", collapsed ? "px-2" : "px-5")}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <img
              src={aetherLogo}
              alt="Aether"
              className="h-7 w-7 rounded-lg object-contain flex-shrink-0"
              style={{ background: "#EEF2FF", padding: "3px" }}
            />
            <span className="text-[14px] font-semibold text-[#0F172A] tracking-tight">Aether</span>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center mx-auto cursor-pointer">
                <img
                  src={aetherLogo}
                  alt="Aether"
                  className="h-7 w-7 rounded-lg object-contain"
                  style={{ background: "#EEF2FF", padding: "3px" }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Aether</TooltipContent>
          </Tooltip>
        )}
      </SidebarHeader>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <SidebarContent className={cn("pt-1", collapsed ? "px-1" : "px-3")}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            asChild
                            className={cn(
                              "h-9 rounded-lg transition-all duration-150",
                              isActive ? "bg-[#EEF2FF]" : "hover:bg-[#F8FAFC]",
                            )}
                          >
                            <NavLink to={item.url} end className="flex items-center justify-center">
                              <item.icon
                                className={cn("h-[18px] w-[18px] shrink-0 transition-colors")}
                                style={{ color: isActive ? "#4338CA" : "#475569" }}
                                strokeWidth={1.75}
                              />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.title}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "h-9 rounded-lg transition-all duration-150 relative overflow-hidden",
                          isActive ? "bg-[#EEF2FF]" : "hover:bg-[#F8FAFC]",
                        )}
                      >
                        <NavLink to={item.url} end className="flex items-center gap-3 px-3">
                          {isActive && (
                            <span
                              className="absolute left-0 top-[7px] bottom-[7px] w-[2.5px] rounded-r-full"
                              style={{ background: "#6366F1" }}
                            />
                          )}
                          <item.icon
                            className="h-[18px] w-[18px] shrink-0 transition-colors"
                            style={{ color: isActive ? "#4338CA" : "#475569" }}
                            strokeWidth={1.75}
                          />
                          <span
                            className={cn("text-[13px] transition-colors", isActive ? "font-medium" : "")}
                            style={{ color: isActive ? "#4338CA" : "#475569" }}
                          >
                            {item.title}
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── User Profile ──────────────────────────────────────────────── */}
      <SidebarFooter className={cn("py-4", collapsed ? "px-1" : "px-3")}>
        {collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center justify-center w-full py-2 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: "#EEF2FF" }}>
                      <span className="text-[12px] font-semibold text-[#6366F1]">{avatarLetter}</span>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{displayName}</TooltipContent>
              </Tooltip>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="rounded-xl min-w-[160px]">
              <DropdownMenuItem
                onClick={() => signOut()}
                className="gap-2 cursor-pointer text-sm text-rose-600 focus:text-rose-600 focus:bg-rose-50"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#F8FAFC] transition-colors group">
                <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#EEF2FF" }}>
                  <span className="text-[12px] font-semibold text-[#6366F1]">{avatarLetter}</span>
                </div>
                <span className="text-[13px] font-medium text-[#0F172A] flex-1 text-left truncate">{displayName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8] group-hover:text-[#64748B] transition-colors" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="rounded-xl min-w-[160px]">
              <DropdownMenuItem
                onClick={() => signOut()}
                className="gap-2 cursor-pointer text-sm text-rose-600 focus:text-rose-600 focus:bg-rose-50"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
