import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface FileUploadZoneProps {
  folderId: string;
  onFileUploaded: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export const FileUploadZone = ({ folderId, onFileUploaded }: FileUploadZoneProps) => {
  const { toast } = useToast();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = async (files: File[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files",
        variant: "destructive",
      });
      return;
    }

    const newUploadFiles: UploadFile[] = files.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadFiles(prev => [...prev, ...newUploadFiles]);

    // Upload each file
    for (const uploadFile of newUploadFiles) {
      try {
        const fileName = `${user.id}/${folderId}/${Date.now()}-${uploadFile.file.name}`;
        
        // Simulate progress for UI feedback
        const progressInterval = setInterval(() => {
          setUploadFiles(prev => 
            prev.map(f => 
              f.id === uploadFile.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          );
        }, 100);

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, uploadFile.file);

        clearInterval(progressInterval);

        if (uploadError) {
          throw uploadError;
        }

        // Save file metadata to database
        const { data: fileData, error: dbError } = await supabase
          .from('document_files')
          .insert({
            user_id: user.id,
            folder_id: folderId,
            file_name: uploadFile.file.name,
            file_path: fileName,
            file_size: uploadFile.file.size,
            file_type: uploadFile.file.type,
            processing_status: 'pending',
          })
          .select()
          .single();

        if (dbError) {
          throw dbError;
        }

        setUploadFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'success' as const, progress: 100 }
              : f
          )
        );

        // Trigger document text extraction
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.functions.invoke('extract-document-text', {
              body: { fileId: fileData.id },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            console.log('Document extraction initiated for:', uploadFile.file.name);
          }
        } catch (extractionError) {
          console.error('Error initiating document extraction:', extractionError);
          // Don't fail the upload if extraction fails
        }

        onFileUploaded();

      } catch (error: any) {
        console.error('Upload error:', error);
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'error' as const, error: error.message }
              : f
          )
        );

        toast({
          title: "Upload Error",
          description: `Failed to upload ${uploadFile.file.name}: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status === 'uploading'));
  };

  return (
    <div className="space-y-4">
      <Card 
        className={`border-2 border-dashed p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
        <h3 className="text-lg font-semibold mb-2">Upload Files</h3>
        <p className="text-muted-foreground mb-4">
          Drag and drop files here, or click to browse
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
          accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
        />
        <label htmlFor="file-input">
          <Button className="cursor-pointer">
            Choose Files
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-2">
          Supported formats: PDF, DOC, DOCX, TXT, XLS, XLSX, CSV, PNG, JPG, JPEG
        </p>
      </Card>

      {uploadFiles.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Upload Progress</h4>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCompleted}
              disabled={!uploadFiles.some(f => f.status !== 'uploading')}
            >
              Clear Completed
            </Button>
          </div>
          
          <div className="space-y-3">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center gap-3">
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">
                      {uploadFile.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {uploadFile.status === 'uploading' && (
                        <span className="text-xs text-muted-foreground">
                          {uploadFile.progress}%
                        </span>
                      )}
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {uploadFile.status === 'uploading' && (
                    <Progress value={uploadFile.progress} className="h-2" />
                  )}
                  
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-red-500">{uploadFile.error}</p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {Math.round(uploadFile.file.size / 1024)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};