import { cn } from "@/lib/utils";

interface ImageLogoProps {
  size?: "small" | "medium" | "large" | "hero";
  className?: string;
}

export const ImageLogo = ({ size = "medium", className }: ImageLogoProps) => {
  const sizeClasses = {
    small: "h-8 md:h-10",
    medium: "h-12 md:h-16 lg:h-20", 
    large: "h-16 md:h-20 lg:h-24",
    hero: "h-48 md:h-60 lg:h-72"
  };

  return (
    <img
      src="https://i.postimg.cc/4NFFnwN2/Untitled-design.png"
      alt="Ask Rita - AI Recruiting Assistant"
      className={cn(
        "w-auto object-contain select-none transition-all duration-300",
        sizeClasses[size],
        className
      )}
    />
  );
};