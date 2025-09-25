import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

interface FileUploadZoneProps {
  folderId: string;
  onFileUploaded: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'validating' | 'uploading' | 'processing' | 'success' | 'error';
  error?: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'text/csv': '.csv',
  'text/plain': '.txt'
};

const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit (${Math.round(file.size / 1024 / 1024)}MB)`
    };
  }

  // Check file type
  const isSupported = Object.keys(SUPPORTED_FILE_TYPES).includes(file.type) ||
    Object.values(SUPPORTED_FILE_TYPES).some(ext => file.name.toLowerCase().endsWith(ext));
  
  if (!isSupported) {
    return {
      valid: false,
      error: `Unsupported file type. Please upload PDF, Word, Excel, or text files.`
    };
  }

  return { valid: true };
};

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

    // Validate files before uploading
    const validatedFiles: UploadFile[] = [];
    for (const file of files) {
      const validation = validateFile(file);
      const uploadFile: UploadFile = {
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
        status: validation.valid ? 'validating' : 'error',
        error: validation.error
      };
      validatedFiles.push(uploadFile);
      
      if (!validation.valid) {
        toast({
          title: "Invalid File",
          description: `${file.name}: ${validation.error}`,
          variant: "destructive",
        });
      }
    }

    setUploadFiles(prev => [...prev, ...validatedFiles]);

    // Only upload valid files
    const filesToUpload = validatedFiles.filter(f => f.status !== 'error');

    // Upload each valid file
    for (const uploadFile of filesToUpload) {
      // Update status to uploading
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading' as const }
            : f
        )
      );
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

        // Update status to processing
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'processing' as const, progress: 100, processingStatus: 'processing' }
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
            
            // Update to success after extraction is initiated
            setUploadFiles(prev => 
              prev.map(f => 
                f.id === uploadFile.id 
                  ? { ...f, status: 'success' as const, processingStatus: 'completed' }
                  : f
              )
            );
          }
        } catch (extractionError) {
          console.error('Error initiating document extraction:', extractionError);
          // Update status but don't fail the upload
          setUploadFiles(prev => 
            prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, status: 'success' as const, processingStatus: 'failed' }
                : f
            )
          );
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
    setUploadFiles(prev => prev.filter(f => f.status === 'uploading' || f.status === 'validating' || f.status === 'processing'));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (ext.endsWith('.doc') || ext.endsWith('.docx')) return <FileText className="h-5 w-5 text-blue-500" />;
    if (ext.endsWith('.xls') || ext.endsWith('.xlsx') || ext.endsWith('.csv')) return <FileText className="h-5 w-5 text-green-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
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
          accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv"
        />
        <label htmlFor="file-input">
          <Button className="cursor-pointer">
            Choose Files
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-2">
          Supported formats: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), CSV, TXT • Max size: 10MB per file
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
                {getFileIcon(uploadFile.file.name)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      {uploadFile.status === 'processing' && (
                        <Badge variant="secondary" className="text-xs">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Processing
                        </Badge>
                      )}
                      {uploadFile.processingStatus === 'failed' && (
                        <Badge variant="destructive" className="text-xs">
                          Processing Failed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {uploadFile.status === 'validating' && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
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
                  
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                    <Progress value={uploadFile.progress} className="h-2" />
                  )}
                  
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-red-500">{uploadFile.error}</p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {uploadFile.file.size > 1024 * 1024 
                      ? `${(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB`
                      : `${Math.round(uploadFile.file.size / 1024)} KB`}
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