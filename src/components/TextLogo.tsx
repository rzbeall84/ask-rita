import { cn } from "@/lib/utils";

interface TextLogoProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

export const TextLogo = ({ size = "medium", className }: TextLogoProps) => {
  const sizeClasses = {
    small: "text-xl md:text-2xl",
    medium: "text-2xl md:text-3xl lg:text-4xl", 
    large: "text-3xl md:text-4xl lg:text-5xl"
  };

  return (
    <div className={cn(
      "font-bold bg-gradient-primary bg-clip-text text-transparent select-none transition-all duration-300",
      sizeClasses[size],
      className
    )}>
      Ask Rita
    </div>
  );
};