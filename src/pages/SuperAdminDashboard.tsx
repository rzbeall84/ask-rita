import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Search, 
  MoreVertical, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Settings,
  Key,
  Mail,
  Crown,
  Database,
  Activity
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Organization {
  id: number;
  name: string;
  owner_email: string;
  plan_type: string;
  status: string;
  monthly_query_limit: number;
  queries_used: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  user_count: number;
  user_limit: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  organization_id: number;
  role: string;
  last_login: string;
  created_at: string;
}

const SuperAdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const { toast } = useToast();

  const queryClient = useQueryClient();

  // Fetch organizations using react-query
  const { data: organizations = [], isLoading: orgsLoading, refetch: refetchOrgs } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard/organizations`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch organizations');
      const data = await response.json();
      return data;
    }
  });

  // Fetch users using react-query
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard/users`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return data;
    }
  });

  // Fetch dashboard stats using react-query
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return data;
    }
  });

  const isLoading = orgsLoading || usersLoading;

  // Refresh all data
  const handleRefresh = () => {
    refetchOrgs();
    refetchUsers();
    refetchStats();
    queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: "bg-green-100 text-green-800 hover:bg-green-200",
      trial_expired: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
      payment_failed: "bg-red-100 text-red-800 hover:bg-red-200",
      suspended: "bg-gray-100 text-gray-800 hover:bg-gray-200"
    };

    const statusIcons = {
      active: <CheckCircle className="h-3 w-3" />,
      trial_expired: <Clock className="h-3 w-3" />,
      payment_failed: <XCircle className="h-3 w-3" />,
      suspended: <AlertTriangle className="h-3 w-3" />
    };

    return (
      <Badge className={`${statusColors[status as keyof typeof statusColors]} flex items-center space-x-1`}>
        {statusIcons[status as keyof typeof statusIcons]}
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  const getPlanBadge = (plan: string) => {
    const planColors = {
      free: "bg-gray-100 text-gray-800",
      starter: "bg-blue-100 text-blue-800",
      pro: "bg-purple-100 text-purple-800",
      enterprise: "bg-yellow-100 text-yellow-800"
    };

    return (
      <Badge className={`${planColors[plan as keyof typeof planColors]} capitalize`}>
        {plan}
      </Badge>
    );
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-dashboard/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, newPassword })
      });
      if (!response.ok) throw new Error('Failed to reset password');
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset",
        description: `Password successfully reset for ${selectedUser?.email}`,
      });
      setResetPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset password.",
        variant: "destructive"
      });
    }
  });

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password.",
        variant: "destructive"
      });
      return;
    }

    resetPasswordMutation.mutate({ userId: selectedUser.id, newPassword });
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 999999999) return 0; // Unlimited
    return Math.round((used / limit) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalOrganizations = stats?.totalOrganizations || organizations.length;
  const activeOrganizations = stats?.activeOrganizations || organizations.filter(org => org.status === 'active').length;
  const totalUsers = stats?.totalUsers || users.length;
  const totalRevenue = stats?.monthlyRevenue || organizations.reduce((sum, org) => {
    const planValues = { free: 0, starter: 29, pro: 99, enterprise: 299 };
    return sum + (planValues[org.plan_type as keyof typeof planValues] || 0);
  }, 0);
  const systemHealth = stats?.systemHealth || 98.9;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage all organizations and users</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-purple-100 text-purple-800">
              <Shield className="h-3 w-3 mr-1" />
              Super Admin
            </Badge>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {activeOrganizations} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue}</div>
              <p className="text-xs text-muted-foreground">
                From active subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{systemHealth}%</div>
              <p className="text-xs text-muted-foreground">
                Uptime this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Organizations Management</CardTitle>
            <CardDescription>Monitor and manage all customer organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search organizations or users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-organizations"
                />
              </div>
              <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Organizations Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Query Usage</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-gray-500">{org.owner_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(org.plan_type)}</TableCell>
                      <TableCell>{getStatusBadge(org.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {org.user_count} / {org.user_limit === 999999999 ? '∞' : org.user_limit}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm">
                            {org.queries_used.toLocaleString()} / {org.monthly_query_limit === 999999999 ? '∞' : org.monthly_query_limit.toLocaleString()}
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min(getUsagePercentage(org.queries_used, org.monthly_query_limit), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {org.storage_used_mb}MB / {org.storage_limit_mb === 999999999 ? '∞' : `${org.storage_limit_mb}MB`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {formatDate(org.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${org.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedOrg(org)}>
                              <Settings className="mr-2 h-4 w-4" />
                              Manage Organization
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                const orgUsers = users.filter(u => u.organization_id === org.id);
                                console.log('Users for org:', orgUsers);
                              }}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              View Users ({users.filter(u => u.organization_id === org.id).length})
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Database className="mr-2 h-4 w-4" />
                              Usage Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Suspend Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Users Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage individual user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const userOrg = organizations.find(org => org.id === user.organization_id);
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{userOrg?.name || 'Unknown'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {formatDate(user.last_login)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {formatDate(user.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-user-actions-${user.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedUser(user);
                                  setResetPasswordDialogOpen(true);
                                }}
                              >
                                <Key className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <XCircle className="mr-2 h-4 w-4" />
                                Suspend User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Password Reset Dialog */}
        <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  data-testid="input-new-password"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleResetPassword} data-testid="button-reset-password">
                  Reset Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;