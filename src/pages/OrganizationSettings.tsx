import { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2, Building2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const OrganizationSettings = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (profile?.organization_id) {
      fetchOrganization();
    }
  }, [profile]);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile?.organization_id)
        .single();

      if (error) throw error;

      setOrganization(data);
      setOrganizationName(data.name || "");
      setLogoUrl(data.logo_url || "");
      setPreviewUrl(data.logo_url || "");
    } catch (error) {
      console.error("Error fetching organization:", error);
      toast({
        title: "Error",
        description: "Failed to load organization settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF)",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile || !organization) return null;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${organization.id}-${Date.now()}.${fileExt}`;
      const filePath = `organization-logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, logoFile, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload organization logo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      // Upload new logo if selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          finalLogoUrl = uploadedUrl;
        }
      }

      // Update organization
      const { error } = await supabase
        .from("organizations")
        .update({
          name: organizationName,
          logo_url: finalLogoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organization.id);

      if (error) throw error;

      setLogoUrl(finalLogoUrl);
      setLogoFile(null);
      
      toast({
        title: "Settings saved",
        description: "Organization settings have been updated successfully",
      });

      // Refresh organization data
      fetchOrganization();
    } catch (error) {
      console.error("Error saving organization:", error);
      toast({
        title: "Save failed",
        description: "Failed to save organization settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setPreviewUrl("");
    setLogoUrl("");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Only administrators can access organization settings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organization Settings</h1>
          <p className="text-muted-foreground">Manage your organization's profile and branding.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization Branding</CardTitle>
            <CardDescription>Customize your organization's appearance across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload Section */}
            <div className="space-y-4">
              <Label>Organization Logo</Label>
              <div className="flex items-start space-x-6">
                <Avatar className="h-24 w-24 border-2 border-border">
                  {previewUrl ? (
                    <AvatarImage src={previewUrl} alt="Organization logo" />
                  ) : (
                    <AvatarFallback className="bg-gradient-primary">
                      <Building2 className="h-12 w-12 text-primary-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                      disabled={uploading || saving}
                      data-testid="button-upload-logo"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    
                    {(previewUrl || logoUrl) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        disabled={uploading || saving}
                        data-testid="button-remove-logo"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Upload your organization's logo. Recommended size: 200x200px, Max size: 5MB
                  </p>
                  
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-logo-file"
                  />
                </div>
              </div>
            </div>

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter organization name"
                disabled={saving}
                data-testid="input-organization-name"
              />
            </div>

            {/* Organization Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Organization ID</span>
                <span className="text-sm font-mono" data-testid="text-organization-id">{organization?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">User Limit</span>
                <span className="text-sm" data-testid="text-user-limit">{organization?.user_limit || "Unlimited"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Monthly Query Cap</span>
                <span className="text-sm" data-testid="text-query-cap">{organization?.monthly_query_cap || "1000"}</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving || uploading || !organizationName}
                data-testid="button-save-settings"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible and potentially destructive actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Once you delete your organization, there is no going back. All data will be permanently removed.
                </p>
                <Button variant="destructive" disabled data-testid="button-delete-organization">
                  Delete Organization
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OrganizationSettings;