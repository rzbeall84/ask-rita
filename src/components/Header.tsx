import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { ImageLogo } from "./ImageLogo";

interface HeaderProps {
  showAuthButtons?: boolean;
  showUserMenu?: boolean;
}

export const Header = ({ showAuthButtons = false, showUserMenu = false }: HeaderProps) => {
  return (
    <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <ImageLogo size="medium" className="transition-all duration-300 group-hover:scale-105" />
        </Link>

        <div className="flex items-center space-x-4">
          {showAuthButtons && (
            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost" className="font-semibold">Login</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
          
          {showUserMenu && (
            <Avatar className="w-10 h-10 border-2 border-primary/20">
              <img 
                src="https://i.postimg.cc/Gm6LPkzq/Copy-of-Untitled.png" 
                alt="Ask Rita" 
                className="w-full h-full object-cover rounded-full"
              />
            </Avatar>
          )}
        </div>
      </div>
    </header>
  );
};