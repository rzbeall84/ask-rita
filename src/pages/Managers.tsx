import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Plus, 
  Search, 
  Mail, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Crown,
  Users,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for managers
const mockManagers = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "Admin",
    status: "Active",
    dateAdded: "2024-01-15",
    lastActive: "2 hours ago"
  },
  {
    id: 2,
    name: "Mike Chen",
    email: "mike.chen@company.com",
    role: "Manager",
    status: "Active",
    dateAdded: "2024-01-20",
    lastActive: "1 day ago"
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    email: "emily.rodriguez@company.com",
    role: "Viewer",
    status: "Pending",
    dateAdded: "2024-01-22",
    lastActive: "Never"
  }
];

// Mock user plan - in real app this would come from user's subscription
const currentPlan = {
  name: "Starter",
  maxManagers: 3,
  isUnlimited: false
};

const Managers = () => {
  const [managers, setManagers] = useState(mockManagers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newManagerName, setNewManagerName] = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [newManagerRole, setNewManagerRole] = useState("Manager");
  const { toast } = useToast();

  const filteredManagers = managers.filter(manager =>
    manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manager.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAtLimit = !currentPlan.isUnlimited && managers.length >= currentPlan.maxManagers;

  const handleAddManager = () => {
    if (!newManagerName || !newManagerEmail) {
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
        description: `Your ${currentPlan.name} plan allows up to ${currentPlan.maxManagers} managers. Upgrade to Pro for unlimited managers.`,
        variant: "destructive"
      });
      return;
    }

    const newManager = {
      id: managers.length + 1,
      name: newManagerName,
      email: newManagerEmail,
      role: newManagerRole,
      status: "Pending",
      dateAdded: new Date().toISOString().split('T')[0],
      lastActive: "Never"
    };

    setManagers([...managers, newManager]);
    setNewManagerName("");
    setNewManagerEmail("");
    setNewManagerRole("Manager");
    setIsAddDialogOpen(false);

    toast({
      title: "Manager Added",
      description: `Invitation sent to ${newManagerEmail}`,
    });
  };

  const handleRemoveManager = (managerId: number) => {
    setManagers(managers.filter(m => m.id !== managerId));
    toast({
      title: "Manager Removed",
      description: "The manager has been removed from your team.",
    });
  };

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
      Admin: "bg-purple-100 text-purple-800 hover:bg-purple-100",
      Manager: "bg-blue-100 text-blue-800 hover:bg-blue-100", 
      Viewer: "bg-gray-100 text-gray-800 hover:bg-gray-100"
    };

    return (
      <Badge variant="secondary" className={styles[role as keyof typeof styles]}>
        {role === "Admin" && <Crown className="w-3 h-3 mr-1" />}
        {role}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-foreground mb-3">Team Managers</h1>
            <p className="text-lg text-muted-foreground">
              Manage your team members and their access permissions
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                disabled={isAtLimit}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Manager
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add New Manager</DialogTitle>
                <DialogDescription>
                  Invite a new team member to manage your recruiting operations.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-semibold">
                    Full Name *
                  </label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    value={newManagerName}
                    onChange={(e) => setNewManagerName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-semibold">
                    Email Address *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={newManagerEmail}
                    onChange={(e) => setNewManagerEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="role" className="text-sm font-semibold">
                    Role
                  </label>
                  <select
                    id="role"
                    value={newManagerRole}
                    onChange={(e) => setNewManagerRole(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddManager}
                  className="bg-gradient-primary hover:shadow-glow"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plan Limits Card */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Plan Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-black text-foreground">
                  {managers.length}
                  {!currentPlan.isUnlimited && (
                    <span className="text-base font-medium text-muted-foreground">
                      /{currentPlan.maxManagers}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">
                    {currentPlan.isUnlimited ? "Unlimited" : "Managers"} on {currentPlan.name} Plan
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
                  placeholder="Search managers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Managers Table */}
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Team Members</CardTitle>
            <CardDescription className="text-base">
              Manage your team members and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredManagers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {managers.length === 0 ? "No managers yet" : "No managers found"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {managers.length === 0 
                    ? "Start building your team by adding your first manager" 
                    : "Try adjusting your search terms"}
                </p>
                {managers.length === 0 && !isAtLimit && (
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-gradient-primary hover:shadow-glow"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Manager
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Manager</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredManagers.map((manager) => (
                      <TableRow key={manager.id}>
                        <TableCell>
                          <div>
                            <div className="font-semibold text-card-foreground">
                              {manager.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {manager.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(manager.role)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(manager.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(manager.dateAdded).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {manager.lastActive}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveManager(manager.id)}
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

export default Managers;