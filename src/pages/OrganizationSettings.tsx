import { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, Building2, Save, Database, TestTube, RefreshCw, Trash2, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
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

  // Integrations state
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [showQuickbaseForm, setShowQuickbaseForm] = useState(false);
  const [quickbaseForm, setQuickbaseForm] = useState({
    userToken: '',
    realmHostname: '',
    appId: '',
    tableId: ''
  });
  const [showToken, setShowToken] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingData, setSyncingData] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchOrganization();
      fetchIntegrations();
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

  // Integrations functions
  const fetchIntegrations = async () => {
    setIntegrationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_integrations')
        .select('id, org_id, provider, meta, status, sync_status, last_sync_at, created_at, updated_at')
        .eq('org_id', profile?.organization_id);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({
        title: "Error",
        description: "Failed to load integrations",
        variant: "destructive",
      });
    } finally {
      setIntegrationsLoading(false);
    }
  };

  const testQuickbaseConnection = async () => {
    if (!quickbaseForm.userToken || !quickbaseForm.realmHostname || !quickbaseForm.appId) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return false;
    }

    setTestingConnection(true);
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/test-quickbase-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userToken: quickbaseForm.userToken,
          realmHostname: quickbaseForm.realmHostname,
          appId: quickbaseForm.appId,
          tableId: quickbaseForm.tableId
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Connection successful",
          description: "Successfully connected to Quickbase",
        });
        return true;
      } else {
        toast({
          title: "Connection failed",
          description: result.message || "Failed to connect to Quickbase",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Connection failed",
        description: "Unable to test Quickbase connection",
        variant: "destructive",
      });
      return false;
    } finally {
      setTestingConnection(false);
    }
  };

  const saveQuickbaseIntegration = async () => {
    if (!await testQuickbaseConnection()) {
      return;
    }

    try {
      // Encrypt the token before saving
      const encryptResponse = await fetch(`${supabase.supabaseUrl}/functions/v1/encrypt-quickbase-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'encrypt',
          token: quickbaseForm.userToken
        }),
      });

      const encryptResult = await encryptResponse.json();
      if (!encryptResult.success) {
        throw new Error('Failed to encrypt token');
      }

      const { error } = await supabase
        .from('org_integrations')
        .upsert({
          org_id: profile?.organization_id,
          provider: 'quickbase',
          api_key: encryptResult.result,
          meta: {
            realm_hostname: quickbaseForm.realmHostname,
            app_id: quickbaseForm.appId,
            table_id: quickbaseForm.tableId
          },
          is_active: true,
          sync_status: 'pending'
        }, { onConflict: 'org_id,provider' });

      if (error) throw error;

      toast({
        title: "Integration saved",
        description: "Quickbase integration has been configured successfully",
      });

      setShowQuickbaseForm(false);
      setQuickbaseForm({
        userToken: '',
        realmHostname: '',
        appId: '',
        tableId: ''
      });
      fetchIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({
        title: "Save failed",
        description: "Failed to save Quickbase integration",
        variant: "destructive",
      });
    }
  };

  const syncQuickbaseData = async (integrationId: string) => {
    setSyncingData(true);
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/sync-quickbase-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integrationId,
          orgId: profile?.organization_id
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Sync started",
          description: "Data sync has been initiated in the background",
        });
        fetchIntegrations();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({
        title: "Sync failed",
        description: "Failed to start data sync",
        variant: "destructive",
      });
    } finally {
      setSyncingData(false);
    }
  };

  const deleteIntegration = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('org_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: "Integration deleted",
        description: "Quickbase integration has been removed",
      });

      fetchIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete integration",
        variant: "destructive",
      });
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Synced</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const maskToken = (token: string) => {
    if (token.length <= 4) return '****';
    return '*'.repeat(token.length - 4) + token.slice(-4);
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
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organization Settings</h1>
          <p className="text-muted-foreground">Manage your organization's profile, branding, and integrations.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="general">

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
          </TabsContent>

          <TabsContent value="integrations">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Quickbase Integration
                  </CardTitle>
                  <CardDescription>
                    Connect your Quickbase apps to import data for AI-powered search and chat.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {integrationsLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : integrations.length > 0 ? (
                    <div className="space-y-4">
                      {integrations.map((integration) => (
                        <div key={integration.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">Quickbase Connection</h4>
                              {getSyncStatusBadge(integration.sync_status)}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => syncQuickbaseData(integration.id)}
                                disabled={syncingData}
                                data-testid="button-sync-now"
                              >
                                {syncingData ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                Sync Now
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteIntegration(integration.id)}
                                data-testid="button-delete-integration"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Realm:</span>
                              <span className="ml-2 font-mono" data-testid="text-realm">{integration.meta?.realm_hostname}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">App ID:</span>
                              <span className="ml-2 font-mono" data-testid="text-app-id">{integration.meta?.app_id}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Table ID:</span>
                              <span className="ml-2 font-mono" data-testid="text-table-id">{integration.meta?.table_id || 'All tables'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Token:</span>
                              <span className="ml-2 font-mono" data-testid="text-masked-token">{maskToken(integration.api_key)}</span>
                            </div>
                          </div>

                          {integration.sync_error && (
                            <Alert className="mt-3">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                {integration.sync_error}
                              </AlertDescription>
                            </Alert>
                          )}

                          {integration.last_sync_at && (
                            <p className="text-sm text-muted-foreground mt-3">
                              Last synced: {new Date(integration.last_sync_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Integrations Connected</h3>
                      <p className="text-muted-foreground mb-4">
                        Connect your Quickbase apps to import data for AI-powered search.
                      </p>
                    </div>
                  )}

                  {!showQuickbaseForm && integrations.length === 0 && (
                    <div className="flex justify-center">
                      <Button
                        onClick={() => setShowQuickbaseForm(true)}
                        data-testid="button-connect-quickbase"
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Connect Quickbase
                      </Button>
                    </div>
                  )}

                  {integrations.length > 0 && !showQuickbaseForm && (
                    <div className="flex justify-center mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowQuickbaseForm(true)}
                        data-testid="button-add-integration"
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Update Integration
                      </Button>
                    </div>
                  )}

                  {showQuickbaseForm && (
                    <div className="border-t pt-6 mt-6 space-y-4">
                      <h4 className="font-medium">Quickbase Connection Details</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="userToken">User Token *</Label>
                          <div className="relative">
                            <Input
                              id="userToken"
                              type={showToken ? "text" : "password"}
                              value={quickbaseForm.userToken}
                              onChange={(e) => setQuickbaseForm({...quickbaseForm, userToken: e.target.value})}
                              placeholder="QB-USER-TOKEN..."
                              data-testid="input-user-token"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                              onClick={() => setShowToken(!showToken)}
                              data-testid="button-toggle-token"
                            >
                              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="realmHostname">Realm Hostname *</Label>
                          <Input
                            id="realmHostname"
                            value={quickbaseForm.realmHostname}
                            onChange={(e) => setQuickbaseForm({...quickbaseForm, realmHostname: e.target.value})}
                            placeholder="yourcompany.quickbase.com"
                            data-testid="input-realm-hostname"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="appId">App ID *</Label>
                          <Input
                            id="appId"
                            value={quickbaseForm.appId}
                            onChange={(e) => setQuickbaseForm({...quickbaseForm, appId: e.target.value})}
                            placeholder="bxxxxxxxx"
                            data-testid="input-app-id"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tableId">Table ID (optional)</Label>
                          <Input
                            id="tableId"
                            value={quickbaseForm.tableId}
                            onChange={(e) => setQuickbaseForm({...quickbaseForm, tableId: e.target.value})}
                            placeholder="bxxxxxxxx (leave empty for all tables)"
                            data-testid="input-table-id"
                          />
                        </div>
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Your User Token will be encrypted and stored securely. Only the last 4 characters will be visible after saving.
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowQuickbaseForm(false);
                            setQuickbaseForm({
                              userToken: '',
                              realmHostname: '',
                              appId: '',
                              tableId: ''
                            });
                          }}
                          data-testid="button-cancel-form"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          onClick={testQuickbaseConnection}
                          disabled={testingConnection}
                          data-testid="button-test-connection"
                        >
                          {testingConnection ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <TestTube className="mr-2 h-4 w-4" />
                              Test Connection
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={saveQuickbaseIntegration}
                          disabled={!quickbaseForm.userToken || !quickbaseForm.realmHostname || !quickbaseForm.appId}
                          data-testid="button-save-integration"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save Integration
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default OrganizationSettings;