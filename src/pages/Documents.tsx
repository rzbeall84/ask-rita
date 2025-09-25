import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Truck, IdCard, Briefcase, Users, Plus, FolderPlus, Eye, EyeOff, Trash2, Upload, FileText, ChevronLeft, CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { CreateFolderDialog } from "@/components/documents/CreateFolderDialog";
import { FolderCard } from "@/components/documents/FolderCard";
import { FileUploadZone } from "@/components/documents/FileUploadZone";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { useAuth } from "@/contexts/AuthContext";

const iconMap = {
  truck: Truck,
  'id-card': IdCard,
  briefcase: Briefcase,
  users: Users,
};

const Documents = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        setIsAdmin(profile?.role === 'admin');
      }
    };
    checkAdminStatus();
  }, [user]);

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["document-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_categories")
        .select("*")
        .order("created_at");
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch categories",
          variant: "destructive",
        });
        throw error;
      }
      return data;
    },
  });

  // Fetch folders for active category
  const { data: folders, refetch: refetchFolders } = useQuery({
    queryKey: ["document-folders", activeTab],
    queryFn: async () => {
      if (!activeTab) return [];
      
      const { data, error } = await supabase
        .from("document_folders")
        .select("*")
        .eq("category_id", activeTab)
        .order("created_at");
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch folders",
          variant: "destructive",
        });
        throw error;
      }
      return data;
    },
    enabled: !!activeTab,
  });

  // Fetch files for selected folder
  const { data: files, refetch: refetchFiles } = useQuery({
    queryKey: ["document-files", selectedFolder],
    queryFn: async () => {
      if (!selectedFolder) return [];
      
      const { data, error } = await supabase
        .from("document_files")
        .select("*")
        .eq("folder_id", selectedFolder)
        .order("created_at");
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch files",
          variant: "destructive",
        });
        throw error;
      }
      return data;
    },
    enabled: !!selectedFolder,
  });

  // Set initial active tab when categories load
  useEffect(() => {
    if (categories && categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].id);
    }
  }, [categories, activeTab]);

  const handleCreateFolder = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setCreateFolderOpen(true);
  };

  const handleFolderCreated = () => {
    refetchFolders();
    setCreateFolderOpen(false);
  };

  const handleToggleVisibility = async (folderId: string, isHidden: boolean) => {
    const { error } = await supabase
      .from("document_folders")
      .update({ is_hidden: !isHidden })
      .eq("id", folderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update folder visibility",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Folder ${!isHidden ? "hidden" : "shown"} successfully`,
    });
    refetchFolders();
  };

  const handleDeleteFolder = async (folderId: string) => {
    const { error } = await supabase
      .from("document_folders")
      .delete()
      .eq("id", folderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Folder deleted successfully",
    });
    refetchFolders();
    if (selectedFolder === folderId) {
      setSelectedFolder(null);
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase();
    if (ext.endsWith('.pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (ext.endsWith('.doc') || ext.endsWith('.docx')) return <FileText className="h-8 w-8 text-blue-500" />;
    if (ext.endsWith('.xls') || ext.endsWith('.xlsx') || ext.endsWith('.csv')) return <FileText className="h-8 w-8 text-green-500" />;
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  };

  const getProcessingStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Processed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (categoriesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading categories...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-black text-foreground mb-2">Documents</h1>
          <p className="text-lg text-muted-foreground">
            Organize and manage your recruiting documents for Rita's AI assistance
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {categories?.map((category) => {
              const Icon = iconMap[category.icon as keyof typeof iconMap] || Briefcase;
              return (
                <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{category.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories?.map((category) => {
            const Icon = iconMap[category.icon as keyof typeof iconMap] || Briefcase;
            const categoryFolders = folders?.filter(f => f.category_id === category.id) || [];
            
            return (
              <TabsContent key={category.id} value={category.id} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{category.name}</h2>
                      <p className="text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleCreateFolder(category.id)}
                    className="flex items-center gap-2"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Create Folder
                  </Button>
                </div>

                {selectedFolder ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedFolder(null)}
                      >
                        ← Back to Folders
                      </Button>
                      <div>
                        <h3 className="text-xl font-semibold">
                          {folders?.find(f => f.id === selectedFolder)?.name}
                        </h3>
                        <p className="text-muted-foreground">
                          {folders?.find(f => f.id === selectedFolder)?.description}
                        </p>
                      </div>
                    </div>

                    <FileUploadZone 
                      folderId={selectedFolder}
                      onFileUploaded={refetchFiles}
                    />

                    <div className="grid gap-4">
                      {files?.map((file) => (
                        <Card 
                          key={file.id} 
                          className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => setSelectedFile(file)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getFileIcon(file.file_name)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{file.file_name}</p>
                                  {getProcessingStatusBadge(file.processing_status || 'pending')}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {file.file_size 
                                    ? file.file_size > 1024 * 1024 
                                      ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB`
                                      : `${Math.round(file.file_size / 1024)} KB`
                                    : 'Unknown size'}
                                  {' • '}
                                  {file.file_type || 'Unknown type'}
                                  {' • '}
                                  {new Date(file.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedFile(file)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadFile(file.file_path, file.file_name)}
                              >
                                Download
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {files?.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          No files uploaded yet. Drag and drop files above to get started.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {categoryFolders.map((folder) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        onSelect={() => setSelectedFolder(folder.id)}
                        onToggleVisibility={() => handleToggleVisibility(folder.id, folder.is_hidden)}
                        onDelete={() => handleDeleteFolder(folder.id)}
                      />
                    ))}
                    
                    {categoryFolders.length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        No folders created yet. Click "Create Folder" to get started.
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <CreateFolderDialog
          open={createFolderOpen}
          onOpenChange={setCreateFolderOpen}
          categoryId={selectedCategoryId}
          onFolderCreated={handleFolderCreated}
        />

        {selectedFile && (
          <DocumentPreview
            fileId={selectedFile.id}
            fileName={selectedFile.file_name}
            fileType={selectedFile.file_type}
            processingStatus={selectedFile.processing_status}
            onClose={() => setSelectedFile(null)}
            onDelete={refetchFiles}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </Layout>
  );
};

export default Documents;