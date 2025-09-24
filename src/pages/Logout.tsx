import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { ImageLogo } from "@/components/ImageLogo";
import { useAuth } from "@/contexts/AuthContext";

const Logout = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleSignOut = async () => {
      await signOut();
    };
    handleSignOut();
  }, [signOut]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-6">
            <ImageLogo size="medium" className="transition-all duration-300 hover:scale-105" />
          </div>
          <CardTitle className="text-2xl">Come back soon!</CardTitle>
          <CardDescription>
            You have been successfully logged out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link to="/login">
            <Button className="w-full" size="lg">
              Sign In Again
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="w-full" size="lg">
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Logout;