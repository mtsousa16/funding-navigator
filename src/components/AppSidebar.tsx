import { Search, Network, Lightbulb, Trash2, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Feed", url: "/", icon: Search },
  { title: "Mapa Tático", url: "/investigation", icon: Network },
  { title: "Insights", url: "/insights", icon: Lightbulb },
];

interface AppSidebarProps {
  searchCount?: number;
  onClearInvestigation?: () => void;
}

export function AppSidebar({ searchCount = 0, onClearInvestigation }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Shield className="h-3 w-3" />
              GrandeIrmão
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50 transition-colors font-mono text-xs"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {!collapsed && item.url === "/investigation" && searchCount > 0 && (
                        <span className="ml-auto text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono">
                          {searchCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && searchCount > 0 && (
        <SidebarFooter>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-destructive font-mono text-xs"
            onClick={onClearInvestigation}
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Limpar dados
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
