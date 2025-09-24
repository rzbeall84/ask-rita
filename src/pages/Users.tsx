import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  UserCheck,
  Users as UsersIcon,
  AlertTriangle,
  CheckCircle,
  UserX,
  Shield,
  Phone,
  Copy,
  Link,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface AppUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  has_access: boolean;
  status: string | null;
  invited_by: string | null;
  auth_user_id: string | null;
  invite_token: string | null;
  invite_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const Users = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: ""
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const { toast } = useToast();
  const { subscription } = useSubscription();

  // Get current plan details from subscription
  const currentPlan = {
    name: subscription?.plan_type === "pro" ? "Pro" : "Starter",
    maxUsers: subscription?.plan_type === "pro" ? Infinity : 10,
    isUnlimited: subscription?.plan_type === "pro"
  };

  // Load users from database
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('invited_by', currentUser.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        toast({
          title: "Error",
          description: "Failed to load users. Please try again.",
          variant: "destructive"
        });
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone_number && user.phone_number.includes(searchTerm));
    
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesAccess = accessFilter === "all" || 
      (accessFilter === "has_access" && user.has_access) ||
      (accessFilter === "no_access" && !user.has_access);
    
    return matchesSearch && matchesStatus && matchesAccess;
  });

  const isAtLimit = !currentPlan.isUnlimited && users.length >= currentPlan.maxUsers;
  const activeUsersCount = users.filter(user => user.has_access && user.status === "active").length;

  const handleInviteUser = async () => {
    if (!newUser.first_name || !newUser.last_name || !newUser.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (isAtLimit) {
      toast({
        title: "Plan Limit Reached",
        description: `Your ${currentPlan.name} plan allows up to ${currentPlan.maxUsers} users. Upgrade to Pro for unlimited users.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      // Check for duplicate email
      const { data: existingUsers } = await supabase
        .from('app_users')
        .select('email')
        .eq('email', newUser.email);

      if (existingUsers && existingUsers.length > 0) {
        toast({
          title: "Error",
          description: "A user with this email already exists.",
          variant: "destructive"
        });
        return;
      }

      // Add user to database
      const { data: addedUser, error: dbError } = await supabase
        .from('app_users')
        .insert({
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          email: newUser.email,
          phone_number: newUser.phone_number || null,
          has_access: true,
          status: 'pending',
          invited_by: currentUser.user.id
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        toast({
          title: "Error",
          description: "Failed to add user. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          to_email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          invited_by: "You" // You could get this from current user's profile
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        toast({
          title: "User Added",
          description: "User added successfully, but email invitation failed. You can manually share the signup link.",
          variant: "default"
        });
      } else {
        toast({
          title: "User Invited",
          description: `Invitation sent to ${newUser.email}`,
        });
      }

      // Reset form and reload users
      setNewUser({ first_name: "", last_name: "", email: "", phone_number: "" });
      setIsInviteDialogOpen(false);
      loadUsers();

    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddUserManually = async () => {
    if (!newUser.first_name || !newUser.last_name || !newUser.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (isAtLimit) {
      toast({
        title: "Plan Limit Reached",
        description: `Your ${currentPlan.name} plan allows up to ${currentPlan.maxUsers} users. Upgrade to Pro for unlimited users.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      // Check for duplicate email
      const { data: existingUsers } = await supabase
        .from('app_users')
        .select('email')
        .eq('email', newUser.email);

      if (existingUsers && existingUsers.length > 0) {
        toast({
          title: "Error",
          description: "A user with this email already exists.",
          variant: "destructive"
        });
        return;
      }

      // Generate invite token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_invite_token');

      if (tokenError) {
        console.error('Token generation error:', tokenError);
        toast({
          title: "Error",
          description: "Failed to generate invite token. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Add user to database with invite token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

      const { data: addedUser, error: dbError } = await supabase
        .from('app_users')
        .insert({
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          email: newUser.email,
          phone_number: newUser.phone_number || null,
          has_access: true,
          status: 'pending',
          invited_by: currentUser.user.id,
          invite_token: tokenData,
          invite_expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        toast({
          title: "Error",
          description: "Failed to add user. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Generate shareable link
      const signupLink = `${window.location.origin}/signup?invite=${tokenData}`;
      setGeneratedLink(signupLink);
      setShowLink(true);

      // Reset form and reload users
      setNewUser({ first_name: "", last_name: "", email: "", phone_number: "" });
      loadUsers();

      toast({
        title: "User Added",
        description: `${newUser.first_name} ${newUser.last_name} added successfully. Share the link to let them sign up.`,
      });

    } catch (error) {
      console.error('Error adding user manually:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleToggleAccess = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      const { error } = await supabase
        .from('app_users')
        .update({ has_access: !user.has_access })
        .eq('id', userId);

      if (error) {
        console.error('Error toggling access:', error);
        toast({
          title: "Error",
          description: "Failed to update user access. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, has_access: !u.has_access }
          : u
      ));
      
      toast({
        title: "Access Updated",
        description: `${user.first_name} ${user.last_name}'s access has been ${user.has_access ? 'disabled' : 'enabled'}.`,
      });

    } catch (error) {
      console.error('Error toggling access:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error removing user:', error);
        toast({
          title: "Error",
          description: "Failed to remove user. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setUsers(users.filter(u => u.id !== userId));
      
      toast({
        title: "User Removed",
        description: `${user.first_name} ${user.last_name} has been removed.`,
      });

    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Signup link copied to clipboard.",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy link. Please copy it manually.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-200 text-amber-700">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="outline" className="border-red-200 text-red-700">
            <UserX className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        );
      default:
        return null;
    }
  };

  const getAccessBadge = (hasAccess: boolean) => {
    return (
      <Badge 
        variant={hasAccess ? "default" : "secondary"} 
        className={hasAccess 
          ? "bg-blue-100 text-blue-800 hover:bg-blue-100" 
          : "bg-gray-100 text-gray-800 hover:bg-gray-100"
        }
      >
        {hasAccess ? <Shield className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
        {hasAccess ? "Has Access" : "No Access"}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-foreground mb-3">App Users</h1>
            <p className="text-lg text-muted-foreground">
              Manage user access and send invitations to join your platform
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Invite User Dialog */}
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  disabled={isAtLimit}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Invite New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to your platform and send them an email invitation.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="inviteFirstName" className="text-sm font-semibold">
                        First Name *
                      </Label>
                      <Input
                        id="inviteFirstName"
                        placeholder="First name"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="inviteLastName" className="text-sm font-semibold">
                        Last Name *
                      </Label>
                      <Input
                        id="inviteLastName"
                        placeholder="Last name"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inviteEmail" className="text-sm font-semibold">
                      Email Address *
                    </Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="Enter email address"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="invitePhone" className="text-sm font-semibold">
                      Phone Number
                    </Label>
                    <Input
                      id="invitePhone"
                      type="tel"
                      placeholder="+1-555-0123"
                      value={newUser.phone_number}
                      onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleInviteUser}
                    className="bg-gradient-primary hover:shadow-glow"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add User Manually Dialog */}
            <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="hover:bg-gradient-primary hover:text-primary-foreground border-primary"
                  disabled={isAtLimit}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User Manually
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Add User Manually</DialogTitle>
                  <DialogDescription>
                    Add a user and get a shareable signup link instead of sending an email.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="manualFirstName" className="text-sm font-semibold">
                        First Name *
                      </Label>
                      <Input
                        id="manualFirstName"
                        placeholder="First name"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="manualLastName" className="text-sm font-semibold">
                        Last Name *
                      </Label>
                      <Input
                        id="manualLastName"
                        placeholder="Last name"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="manualEmail" className="text-sm font-semibold">
                      Email Address *
                    </Label>
                    <Input
                      id="manualEmail"
                      type="email"
                      placeholder="Enter email address"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="manualPhone" className="text-sm font-semibold">
                      Phone Number
                    </Label>
                    <Input
                      id="manualPhone"
                      type="tel"
                      placeholder="+1-555-0123"
                      value={newUser.phone_number}
                      onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsManualDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddUserManually}
                    className="bg-gradient-primary hover:shadow-glow"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Shareable Link Dialog */}
        <Dialog open={showLink} onOpenChange={setShowLink}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Link className="w-5 h-5 text-primary" />
                User Added Successfully
              </DialogTitle>
              <DialogDescription>
                Share this link with the user to let them sign up and complete their account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label className="text-sm font-semibold">Shareable Signup Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedLink)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800 mb-1">Important Notes:</p>
                    <ul className="text-amber-700 space-y-1">
                      <li>• This link expires in 7 days</li>
                      <li>• The user can only use this link once to sign up</li>
                      <li>• Keep this link secure and only share it with the intended user</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => {
                  setShowLink(false);
                  setIsManualDialogOpen(false);
                  setGeneratedLink("");
                }}
                className="bg-gradient-primary hover:shadow-glow"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Plan Usage Card */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-primary" />
              Plan Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-black text-foreground">
                    {users.length}
                    {!currentPlan.isUnlimited && (
                      <span className="text-base font-medium text-muted-foreground">
                        /{currentPlan.maxUsers}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-card-foreground">
                    Total Users
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-green-600">
                    {activeUsersCount}
                  </div>
                  <p className="text-sm font-semibold text-card-foreground">
                    Active Users
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">
                    {currentPlan.name} Plan
                  </p>
                  {isAtLimit && (
                    <p className="text-xs text-amber-600 font-medium">
                      You've reached your plan limit
                    </p>
                  )}
                </div>
              </div>
              {!currentPlan.isUnlimited && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="hover:bg-gradient-primary hover:text-primary-foreground"
                  onClick={() => window.location.href = "/pricing"}
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={accessFilter} onValueChange={setAccessFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Access" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Access</SelectItem>
                    <SelectItem value="has_access">Has Access</SelectItem>
                    <SelectItem value="no_access">No Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold">User Directory</CardTitle>
            <CardDescription className="text-base">
              Manage user access and permissions for your platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {users.length === 0 ? "No users yet" : "No users found"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {users.length === 0 
                    ? "Start building your user base by inviting your first user" 
                    : "Try adjusting your search and filter criteria"}
                </p>
                {users.length === 0 && !isAtLimit && (
                  <Button 
                    onClick={() => setIsInviteDialogOpen(true)}
                    className="bg-gradient-primary hover:shadow-glow"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Invite First User
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Invited By</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-semibold text-card-foreground">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {user.phone_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getAccessBadge(user.has_access)}
                            <Switch
                              checked={user.has_access}
                              onCheckedChange={() => handleToggleAccess(user.id)}
                              aria-label={`Toggle access for ${user.first_name} ${user.last_name}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.invited_by}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveUser(user.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Users;