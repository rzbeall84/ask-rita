import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const FeatureCard = ({ title, description, icon: Icon }: FeatureCardProps) => {
  return (
    <div className="group relative">
      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300" />
      <div className="relative bg-gradient-card rounded-2xl p-8 border shadow-card hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
        <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-glow">
          <Icon className="w-7 h-7 text-primary-foreground" />
        </div>
        <h3 className="text-xl font-bold text-card-foreground mb-4">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
};