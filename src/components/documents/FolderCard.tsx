import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, Eye, EyeOff, Trash2, FileText } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    description?: string;
    openai_instructions?: string;
    is_hidden: boolean;
    created_at: string;
  };
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

export const FolderCard = ({ folder, onSelect, onToggleVisibility, onDelete }: FolderCardProps) => {
  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg group cursor-pointer ${
      folder.is_hidden ? 'opacity-60 bg-muted/50' : 'bg-gradient-card'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Folder className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {folder.name}
                {folder.is_hidden && (
                  <Badge variant="secondary" className="text-xs">
                    Hidden
                  </Badge>
                )}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility();
              }}
              className="h-8 w-8 p-0"
            >
              {folder.is_hidden ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{folder.name}"? This action cannot be undone and will also delete all files in this folder.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent 
        className="pt-0 cursor-pointer"
        onClick={onSelect}
      >
        {folder.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {folder.description}
          </p>
        )}
        
        {folder.openai_instructions && (
          <div className="bg-primary/5 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Rita Instructions</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {folder.openai_instructions}
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Created {new Date(folder.created_at).toLocaleDateString()}</span>
          <div className="flex items-center gap-1 text-primary font-medium">
            <span>Open folder</span>
            <Folder className="h-3 w-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};