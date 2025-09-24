import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { ImageLogo } from "./ImageLogo";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, MessageSquare } from "lucide-react";

export const UserNavigation = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/dashboard/chat" className="flex items-center group">
          <ImageLogo size="medium" className="transition-all duration-300 group-hover:scale-105" />
        </Link>

        <div className="flex items-center space-x-6">
          <Link to="/dashboard/chat">
            <Button variant="ghost" className="font-semibold flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="font-semibold flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>

          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
              {profile?.first_name?.charAt(0) || profile?.role?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};