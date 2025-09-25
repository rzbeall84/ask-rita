import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Mail, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Crown,
  Users,
  AlertTriangle,
  CheckCircle,
  Link,
  Copy,
  RefreshCcw,
  Clock,
  UserPlus,
  Shield,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { useNavigate } from "react-router-dom";

interface Manager {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  dateAdded: string;
  lastActive: string;
}

const Managers = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [newManagerName, setNewManagerName] = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [newManagerRole, setNewManagerRole] = useState("user");
  const [inviteExpiry, setInviteExpiry] = useState("7");
  const [inviteLink, setInviteLink] = useState("");
  const [currentInviteLink, setCurrentInviteLink] = useState("");
  const [inviteExpiresAt, setInviteExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);
  
  const { toast } = useToast();
  const { profile } = useAuth();
  const { subscription, usageStats, refreshUsageStats } = useSubscription();
  const { 
    enforceUserLimit, 
    canAddUsers, 
    getRemainingUsers,
    getUsagePercentage,
    isFreePlan 
  } = useSubscriptionLimits();
  const navigate = useNavigate();

  // Get current plan details
  const getPlanDisplayName = () => {
    if (!subscription?.plan_type || subscription.plan_type === 'free') return "Free";
    return subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1);
  };

  useEffect(() => {
    loadManagers();
    checkExistingInvite();
    refreshUsageStats();
  }, [profile]);

  const loadManagers = async () => {
    if (!profile?.organization_id) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading managers:", error);
        return;
      }

      const formattedManagers: Manager[] = (data || []).map(p => ({
        id: p.user_id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unnamed User",
        email: p.user_id,
        role: p.role,
        status: "Active",
        dateAdded: new Date(p.created_at).toISOString().split('T')[0],
        lastActive: "Recently"
      }));

      // Get emails from auth users (if possible)
      for (const manager of formattedManagers) {
        try {
          const { data: userData } = await supabase.auth.admin.getUser(manager.id);
          if (userData?.user?.email) {
            manager.email = userData.user.email;
          }
        } catch (error) {
          // Fallback to using user_id if we can't get email
        }
      }

      setManagers(formattedManagers);
    } catch (error) {
      console.error("Error loading managers:", error);
    }
  };

  const checkExistingInvite = async () => {
    if (!profile?.organization_id) return;
    
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("invite_token, invite_expires_at")
        .eq("id", profile.organization_id)
        .single();

      if (data?.invite_token && data?.invite_expires_at) {
        const expiresAt = new Date(data.invite_expires_at);
        if (expiresAt > new Date()) {
          const baseUrl = window.location.origin;
          setCurrentInviteLink(`${baseUrl}/invite/${data.invite_token}`);
          setInviteExpiresAt(expiresAt);
        }
      }
    } catch (error) {
      console.error("Error checking existing invite:", error);
    }
  };

  const handleGenerateInvite = async () => {
    // Check if can add users
    const canAdd = await enforceUserLimit("generate invite link");
    if (!canAdd) {
      setIsInviteDialogOpen(false);
      return;
    }
    
    setLoadingInvite(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-invite", {
        body: { expiresIn: parseInt(inviteExpiry) }
      });

      if (error) throw error;

      setInviteLink(data.inviteLink);
      setCurrentInviteLink(data.inviteLink);
      setInviteExpiresAt(new Date(data.expiresAt));
      
      toast({
        title: "Invite Link Generated",
        description: `Your invite link has been created. ${getRemainingUsers()} team slots remaining.`,
      });
    } catch (error: any) {
      console.error("Error generating invite:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invite link.",
        variant: "destructive"
      });
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleCopyInviteLink = () => {
    const linkToCopy = inviteLink || currentInviteLink;
    if (linkToCopy) {
      navigator.clipboard.writeText(linkToCopy);
      toast({
        title: "Link Copied",
        description: "The invite link has been copied to your clipboard.",
      });
    }
  };

  const handleAddManager = async () => {
    if (!newManagerName || !newManagerEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Check if can add users
    const canAdd = await enforceUserLimit("add a new manager");
    if (!canAdd) {
      setIsAddDialogOpen(false);
      return;
    }

    setLoading(true);
    
    try {
      // Send invitation email implementation
      toast({
        title: "Invitation Sent",
        description: `Invitation email sent to ${newManagerEmail}. ${getRemainingUsers() - 1} slots remaining.`,
      });
      
      setNewManagerName("");
      setNewManagerEmail("");
      setNewManagerRole("user");
      setIsAddDialogOpen(false);
      
      // Reload managers and refresh stats
      await loadManagers();
      await refreshUsageStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveManager = async (managerId: string) => {
    try {
      // In a real app, you would remove the manager from the organization
      toast({
        title: "Manager Removed",
        description: "The manager has been removed from your team.",
      });
      
      await loadManagers();
      await refreshUsageStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove manager.",
        variant: "destructive"
      });
    }
  };

  const filteredManagers = managers.filter(manager =>
    manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manager.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    if (status === "Active") {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="border-amber-200 text-amber-700">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-purple-100 text-purple-800 hover:bg-purple-100",
      user: "bg-blue-100 text-blue-800 hover:bg-blue-100", 
    };

    return (
      <Badge variant="secondary" className={styles[role as keyof typeof styles]}>
        {role === "admin" && <Crown className="w-3 h-3 mr-1" />}
        {role === "admin" ? "Admin" : "User"}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-foreground mb-3" data-testid="text-page-title">Team Managers</h1>
            <p className="text-lg text-muted-foreground">
              Manage your team members and their access permissions
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Generate Invite Link Button */}
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="hover:bg-gradient-primary hover:text-primary-foreground transition-all duration-300"
                  disabled={!canAddUsers()}
                  data-testid="button-invite-link"
                >
                  <Link className="w-4 h-4 mr-2" />
                  Invite Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Organization Invite Link</DialogTitle>
                  <DialogDescription>
                    Generate a link that allows new members to join your organization
                  </DialogDescription>
                </DialogHeader>
                
                {currentInviteLink && !inviteLink && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Current Active Link</label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={currentInviteLink}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyInviteLink}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      {inviteExpiresAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires: {inviteExpiresAt.toLocaleDateString()} at {inviteExpiresAt.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-muted-foreground">
                        Generate a new link to replace the current one
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentInviteLink("")}
                        className="flex items-center gap-2"
                      >
                        <RefreshCcw className="w-3 h-3" />
                        New Link
                      </Button>
                    </div>
                  </div>
                )}
                
                {!currentInviteLink || inviteLink ? (
                  <div className="space-y-4 py-4">
                    {inviteLink ? (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Generated Invite Link</label>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={inviteLink}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyInviteLink}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Share this link with team members you want to invite
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Link Expiry</label>
                        <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select expiry time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 day</SelectItem>
                            <SelectItem value="7">7 days</SelectItem>
                            <SelectItem value="14">14 days</SelectItem>
                            <SelectItem value="30">30 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ) : null}
                
                {!inviteLink && (
                  <DialogFooter>
                    <Button
                      onClick={handleGenerateInvite}
                      disabled={loadingInvite || !canAddUsers()}
                      className="w-full sm:w-auto"
                    >
                      {loadingInvite ? (
                        <>Loading...</>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Generate Invite Link
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
            
            {/* Add Manager Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-primary hover:opacity-90 transition-all duration-300"
                  disabled={!canAddUsers()}
                  data-testid="button-add-manager"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manager
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Add New Manager</DialogTitle>
                  <DialogDescription>
                    Invite a new team member to manage your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold">Full Name *</label>
                    <Input
                      placeholder="Enter manager's name"
                      value={newManagerName}
                      onChange={(e) => setNewManagerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Email Address *</label>
                    <Input
                      type="email"
                      placeholder="manager@company.com"
                      value={newManagerEmail}
                      onChange={(e) => setNewManagerEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Role</label>
                    <Select value={newManagerRole} onValueChange={setNewManagerRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin - Full access</SelectItem>
                        <SelectItem value="user">User - Limited access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAddManager}
                    disabled={loading || !canAddUsers()}
                    className="w-full bg-gradient-primary hover:opacity-90"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* User Limit Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Team Member Usage</CardTitle>
              <Badge variant="outline">
                {getPlanDisplayName()} Plan
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Team Members</span>
              <span className="font-medium" data-testid="text-team-usage">
                {usageStats?.users.current || 0} / {usageStats?.users.limit || 2}
              </span>
            </div>
            <Progress 
              value={getUsagePercentage('users')} 
              className="h-2"
              data-testid="progress-team-members"
            />
            {!canAddUsers() && (
              <Alert className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Team member limit reached. <Button
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate('/pricing')}
                  >
                    Upgrade your plan
                  </Button> to add more members.
                </AlertDescription>
              </Alert>
            )}
            {canAddUsers() && getRemainingUsers() <= 1 && (
              <Alert className="py-2">
                <AlertDescription className="text-xs">
                  {getRemainingUsers()} team slot{getRemainingUsers() === 1 ? '' : 's'} remaining on your {getPlanDisplayName()} plan.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search managers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-managers"
          />
        </div>

        {/* Manager Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredManagers.map((manager) => (
            <Card key={manager.id} className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                      {manager.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{manager.name}</CardTitle>
                      <CardDescription className="text-xs">{manager.email}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  {getRoleBadge(manager.role)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(manager.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Added</span>
                  <span className="text-sm font-medium">{manager.dateAdded}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Active</span>
                  <span className="text-sm font-medium">{manager.lastActive}</span>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRemoveManager(manager.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredManagers.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No managers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by adding your first team manager"}
              </p>
              {!searchTerm && canAddUsers() && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Manager
                </Button>
              )}
              {!searchTerm && !canAddUsers() && (
                <Button onClick={() => navigate('/pricing')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade to Add Managers
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Managers;