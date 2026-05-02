import React from "react";
import { Link, useLocation } from "wouter";
import { 
  TerminalSquare, 
  Files, 
  Eye, 
  LayoutTemplate, 
  History as HistoryIcon,
  Activity,
  Server
} from "lucide-react";
import { useGetAgentStatus, getGetAgentStatusQueryKey } from "@workspace/api-client-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { data: status } = useGetAgentStatus({
    query: {
      queryKey: getGetAgentStatusQueryKey(),
      refetchInterval: 5000, // keep status fresh
    }
  });

  const links = [
    { href: "/", label: "Console", icon: TerminalSquare },
    { href: "/outputs", label: "Outputs", icon: Files },
    { href: "/preview", label: "Preview", icon: Eye },
    { href: "/templates", label: "Templates", icon: LayoutTemplate },
    { href: "/history", label: "History", icon: HistoryIcon },
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-full flex flex-col text-sidebar-foreground">
      <div className="p-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
          <TerminalSquare className="w-5 h-5" />
          AGENT_OS
        </h1>
        <div className="mt-2 text-xs text-muted-foreground font-mono flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status?.ready ? 'bg-primary animate-pulse' : 'bg-destructive'}`} />
          {status?.ready ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location === link.href;
          const Icon = link.icon;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                isActive 
                  ? "bg-sidebar-accent text-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {status && (
        <div className="p-4 border-t border-sidebar-border font-mono text-xs space-y-2">
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> Outputs</span>
            <span className="text-foreground">{status.totalOutputs}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="flex items-center gap-2"><Server className="w-3 h-3" /> Commands</span>
            <span className="text-foreground">{status.totalCommandsProcessed}</span>
          </div>
          {status.systemInfo?.nodeVersion && (
            <div className="text-muted-foreground pt-2 mt-2 border-t border-sidebar-border/50">
              v{status.systemInfo.nodeVersion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
