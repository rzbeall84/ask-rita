import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";

export const DemoTab = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 right-6 z-50">
      {/* Expanded Demo Card */}
      {isExpanded && (
        <div className="mb-4 bg-background/95 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-2xl max-w-sm animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Try Rita Demo</h3>
                <p className="text-xs text-muted-foreground">See the full app in action</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Experience the complete admin dashboard with realistic data. Explore document management, user administration, billing, and AI chat features.
          </p>
          
          <div className="space-y-2">
            <Link to="/admin-demo" className="block">
              <Button 
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 text-sm"
                onClick={() => setIsExpanded(false)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Explore Admin Demo
              </Button>
            </Link>
            <p className="text-xs text-center text-muted-foreground">
              No signup required
            </p>
          </div>
        </div>
      )}

      {/* Demo Tab Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`bg-gradient-primary hover:shadow-glow transition-all duration-300 shadow-lg border-0 ${
          isExpanded ? 'rounded-full h-12 w-12 p-0' : 'rounded-full px-4 py-3 h-auto'
        }`}
        data-testid="button-demo-tab"
      >
        {isExpanded ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold text-sm">Demo</span>
          </div>
        )}
      </Button>
    </div>
  );
};