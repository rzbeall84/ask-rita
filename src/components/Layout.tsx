import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, X, MessageCircle, MessageSquare, FileText, Users, UserCheck, User, CreditCard, Building2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ImageLogo } from "./ImageLogo";
import { useAuth } from "@/contexts/AuthContext";
import { UserNavigation } from "./UserNavigation";
import { SubscriptionStatusBanner } from "./SubscriptionStatusBanner";

interface LayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { name: "Dashboard", icon: MessageCircle, href: "/dashboard" },
  { name: "Chat", icon: MessageSquare, href: "/dashboard/chat" },
  { name: "Documents", icon: FileText, href: "/dashboard/documents" },
  { name: "Managers", icon: Users, href: "/dashboard/managers" },
  { name: "Users", icon: UserCheck, href: "/dashboard/users" },
  { name: "Organization", icon: Building2, href: "/organization/settings" },
  { name: "Profile", icon: User, href: "/profile" },
  { name: "Billing", icon: CreditCard, href: "/billing" },
];

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { profile } = useAuth();

  // For regular users, show simple top navigation
  if (profile?.role === 'user') {
    return (
      <div className="min-h-screen bg-background">
        <UserNavigation />
        <main className="p-8">
          {children}
        </main>
      </div>
    );
  }

  // For admin users, show full sidebar layout
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden rounded-xl"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <Link to="/dashboard" className="flex items-center group">
              <ImageLogo size="medium" className="transition-all duration-300 group-hover:scale-105" />
            </Link>
          </div>

          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
              {profile?.first_name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 top-20 z-40 w-72 bg-gradient-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <nav className="h-full px-6 py-8 space-y-3">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-4 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isActive ? "bg-white/20" : "bg-primary/10 group-hover:bg-primary/20"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-base">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-8">
          <SubscriptionStatusBanner />
          {children}
        </main>
      </div>
    </div>
  );
};