import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle, Loader2, Copy, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DocumentPreviewProps {
  fileId: string;
  fileName: string;
  fileType?: string;
  processingStatus?: string;
  onClose: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}

export const DocumentPreview = ({ 
  fileId, 
  fileName, 
  fileType, 
  processingStatus,
  onClose,
  onDelete,
  isAdmin = false
}: DocumentPreviewProps) => {
  const { toast } = useToast();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchDocumentContent();
  }, [fileId]);

  const fetchDocumentContent = async () => {
    try {
      setLoading(true);
      
      // Fetch document content
      const { data: contentData, error: contentError } = await supabase
        .from("document_content")
        .select("*")
        .eq("file_id", fileId)
        .single();

      if (contentError && contentError.code !== 'PGRST116') {
        throw contentError;
      }

      if (contentData) {
        setContent(contentData.content_text);
        setMetadata({
          character_count: contentData.content_text?.length || 0,
          word_count: contentData.content_text?.split(/\s+/).filter((word: string) => word.length > 0).length || 0,
          extracted_at: contentData.extracted_at
        });
      } else if (processingStatus === 'processing') {
        setContent("Document is still being processed. Please check back in a few moments.");
      } else if (processingStatus === 'failed') {
        setContent("Failed to extract content from this document. The file might be corrupted or in an unsupported format.");
      } else {
        setContent("No content available for this document yet.");
      }
    } catch (error: any) {
      console.error("Error fetching document content:", error);
      toast({
        title: "Error",
        description: "Failed to fetch document content",
        variant: "destructive",
      });
      setContent("Error loading document content.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Document content copied to clipboard",
    });
  };

  const handleDownloadContent = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_content.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    try {
      // Delete from storage first
      const { data: fileData } = await supabase
        .from("document_files")
        .select("file_path")
        .eq("id", fileId)
        .single();

      if (fileData?.file_path) {
        await supabase.storage
          .from("documents")
          .remove([fileData.file_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from("document_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      setShowDeleteDialog(false);
      if (onDelete) onDelete();
      onClose();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    switch (processingStatus) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Processed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <DialogTitle className="text-xl">
                  {fileName}
                </DialogTitle>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyContent}
                  disabled={!content || loading}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadContent}
                  disabled={!content || loading}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="content" className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="content">
                <Eye className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="metadata">
                <FileText className="h-4 w-4 mr-2" />
                Metadata
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="flex-1 mt-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[50vh] w-full rounded-md border p-4">
                  {content ? (
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {content}
                    </pre>
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      No content available
                    </div>
                  )}
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="metadata" className="mt-4">
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Type:</span>
                    <span>{fileType || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Status:</span>
                    <span>{processingStatus || 'Unknown'}</span>
                  </div>
                  {metadata && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Character Count:</span>
                        <span>{metadata.character_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Word Count:</span>
                        <span>{metadata.word_count || 0}</span>
                      </div>
                      {metadata.extracted_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Extracted At:</span>
                          <span>{new Date(metadata.extracted_at).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileName}"? This will permanently remove the file and all associated content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};