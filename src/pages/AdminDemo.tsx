import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Menu, 
  X, 
  MessageCircle, 
  MessageSquare, 
  FileText, 
  Users, 
  UserCheck, 
  User, 
  CreditCard, 
  Building2,
  ArrowUpRight,
  Activity,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Download,
  Settings,
  Loader2,
  HardDrive,
  Calendar,
  ExternalLink,
  Save,
  Upload,
  Trash2,
  Shield,
  UserX,
  Briefcase,
  FolderPlus,
  Ban,
  MoreHorizontal,
  Edit2,
  Phone,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Demo data
const DEMO_ORG = {
  id: "demo-org-123",
  name: "Demo Logistics Inc",
  logo_url: "/api/placeholder/200/200",
  user_limit: 50,
  monthly_query_cap: 10000,
  created_at: "2024-01-15",
};

const DEMO_METRICS = {
  totalQueries: 8247,
  documents: 156,
  successRate: 96.8,
  activeUsers: 24,
  storageUsed: 38.2,
  queriesThisMonth: 2834,
  monthlyLimit: 10000,
};

const DEMO_USERS = [
  {
    id: "user-1",
    first_name: "Sarah",
    last_name: "Chen",
    email: "sarah.chen@demologistics.com",
    role: "admin",
    status: "active",
    has_access: true,
    last_sign_in: "2024-03-15T10:30:00Z",
    created_at: "2024-01-20T08:00:00Z",
    phone_number: "+1-555-0123",
  },
  {
    id: "user-2",
    first_name: "Marcus",
    last_name: "Rodriguez",
    email: "marcus.rodriguez@demologistics.com",
    role: "manager",
    status: "active",
    has_access: true,
    last_sign_in: "2024-03-15T09:45:00Z",
    created_at: "2024-02-01T09:00:00Z",
    phone_number: "+1-555-0124",
  },
  {
    id: "user-3",
    first_name: "Jennifer",
    last_name: "Park",
    email: "jennifer.park@demologistics.com",
    role: "user",
    status: "active",
    has_access: true,
    last_sign_in: "2024-03-14T16:20:00Z",
    created_at: "2024-02-10T11:00:00Z",
    phone_number: "+1-555-0125",
  },
  {
    id: "user-4",
    first_name: "David",
    last_name: "Thompson",
    email: "david.thompson@demologistics.com",
    role: "user",
    status: "pending",
    has_access: true,
    last_sign_in: null,
    created_at: "2024-03-10T14:00:00Z",
    phone_number: "+1-555-0126",
  },
  {
    id: "user-5",
    first_name: "Lisa",
    last_name: "Johnson",
    email: "lisa.johnson@demologistics.com",
    role: "user",
    status: "inactive",
    has_access: false,
    last_sign_in: "2024-03-01T12:00:00Z",
    created_at: "2024-01-25T10:00:00Z",
    phone_number: "+1-555-0127",
  },
];

const DEMO_DOCUMENTS = [
  {
    id: "doc-1",
    folder_name: "Driver Training Materials",
    files: [
      { name: "CDL Training Manual 2024.pdf", size: "2.1 MB", type: "PDF", created_at: "2024-02-15", status: "completed" },
      { name: "Safety Protocol Guidelines.docx", size: "856 KB", type: "Word", created_at: "2024-02-20", status: "completed" },
      { name: "Hazmat Certification Guide.pdf", size: "1.8 MB", type: "PDF", created_at: "2024-03-01", status: "completed" },
    ],
  },
  {
    id: "doc-2",
    folder_name: "Job Descriptions",
    files: [
      { name: "Long Haul Driver JD.pdf", size: "245 KB", type: "PDF", created_at: "2024-01-30", status: "completed" },
      { name: "Local Delivery Driver JD.pdf", size: "198 KB", type: "PDF", created_at: "2024-02-05", status: "completed" },
      { name: "Fleet Manager JD.docx", size: "312 KB", type: "Word", created_at: "2024-02-12", status: "completed" },
    ],
  },
  {
    id: "doc-3",
    folder_name: "Company Policies",
    files: [
      { name: "Employee Handbook 2024.pdf", size: "3.2 MB", type: "PDF", created_at: "2024-01-15", status: "completed" },
      { name: "Drug Testing Policy.pdf", size: "567 KB", type: "PDF", created_at: "2024-01-20", status: "completed" },
      { name: "Benefits Package Overview.pdf", size: "1.1 MB", type: "PDF", created_at: "2024-02-01", status: "completed" },
    ],
  },
  {
    id: "doc-4",
    folder_name: "Compliance Documents",
    files: [
      { name: "DOT Regulations Summary.pdf", size: "4.5 MB", type: "PDF", created_at: "2024-03-05", status: "processing" },
      { name: "OSHA Safety Requirements.pdf", size: "2.8 MB", type: "PDF", created_at: "2024-03-08", status: "completed" },
    ],
  },
];

const DEMO_ACTIVITIES = [
  {
    id: "act-1",
    action: "Asked about DOT physical requirements for new drivers",
    user: "Marcus Rodriguez",
    timestamp: "2 minutes ago",
    type: "query",
  },
  {
    id: "act-2",
    action: "Uploaded new driver training manual",
    user: "Sarah Chen",
    timestamp: "1 hour ago",
    type: "document",
  },
  {
    id: "act-3",
    action: "Generated compliance report for Q1 2024",
    user: "Jennifer Park",
    timestamp: "3 hours ago",
    type: "report",
  },
  {
    id: "act-4",
    action: "Invited new user: David Thompson",
    user: "Sarah Chen",
    timestamp: "1 day ago",
    type: "user",
  },
  {
    id: "act-5",
    action: "Asked about carrier liability insurance requirements",
    user: "Lisa Johnson",
    timestamp: "2 days ago",
    type: "query",
  },
];

const DEMO_SUBSCRIPTION = {
  plan_type: "pro",
  status: "active",
  current_period_end: "2024-04-15T00:00:00Z",
  users: { current: 24, limit: 50, percentage: 48 },
  queries: { current: 2834, limit: 10000, percentage: 28.3, extra_purchased: 0, reset_date: "2024-04-01T00:00:00Z" },
  storage: { used_gb: 38.2, limit_gb: 100, percentage: 38.2 },
};

const sidebarItems = [
  { name: "Dashboard", icon: MessageCircle, key: "dashboard" },
  { name: "Documents", icon: FileText, key: "documents" },
  { name: "Team Members", icon: Users, key: "users" },
  { name: "Organization", icon: Building2, key: "settings" },
  { name: "Billing", icon: CreditCard, key: "billing" },
];

const AdminDemo = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Get active section from URL (supports both query params and hash), default to "dashboard"
  const getActiveSectionFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const hashParam = window.location.hash.slice(1); // Remove the # symbol
    const validSections = ["dashboard", "documents", "users", "settings", "billing"];
    
    // Priority: query parameter > hash > default
    if (tabParam && validSections.includes(tabParam)) {
      return tabParam;
    }
    if (hashParam && validSections.includes(hashParam)) {
      return hashParam;
    }
    return "dashboard";
  };

  const [activeSection, setActiveSection] = useState(getActiveSectionFromUrl());

  // Update URL when section changes (supports both query params and hash)
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSidebarOpen(false);
    
    // Update URL - prefer query parameters for better SEO and bookmarking
    const url = new URL(window.location.href);
    url.hash = ''; // Clear any existing hash
    
    if (section === "dashboard") {
      // For dashboard, clear the tab parameter to keep URL clean
      url.searchParams.delete('tab');
    } else {
      // Set the tab query parameter
      url.searchParams.set('tab', section);
    }
    
    // Update the URL without triggering a page reload
    window.history.pushState(null, "", url.toString());
  };

  // Listen for URL changes (browser back/forward navigation)
  useEffect(() => {
    const handleUrlChange = () => {
      const newSection = getActiveSectionFromUrl();
      setActiveSection(newSection);
    };

    // Listen for both hash changes and popstate (back/forward button)
    window.addEventListener("hashchange", handleUrlChange);
    window.addEventListener("popstate", handleUrlChange);
    
    // Set initial section from URL on component mount
    const initialSection = getActiveSectionFromUrl();
    setActiveSection(initialSection);

    return () => {
      window.removeEventListener("hashchange", handleUrlChange);
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, []);

  const showToast = (title: string, description: string) => {
    toast({ title, description });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'word':
        return <FileText className="h-6 w-6 text-blue-500" />;
      default:
        return <FileText className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getProcessingStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Processed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredUsers = DEMO_USERS.filter(user =>
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDashboard = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-foreground mb-3" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Welcome to Demo Logistics Inc! Here's what's happening with your recruiting.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden bg-gradient-card border-0 shadow-card hover:shadow-lg transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-5 rounded-full -mr-16 -mt-16 group-hover:opacity-10 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Queries</CardTitle>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black text-foreground" data-testid="text-total-queries">{DEMO_METRICS.totalQueries.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-success">
              <ArrowUpRight className="w-3 h-3" />
              <span className="font-medium">+18% from last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-card border-0 shadow-card hover:shadow-lg transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-5 rounded-full -mr-16 -mt-16 group-hover:opacity-10 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Documents</CardTitle>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black text-foreground" data-testid="text-total-documents">{DEMO_METRICS.documents}</div>
            <div className="flex items-center gap-1 text-xs text-success">
              <ArrowUpRight className="w-3 h-3" />
              <span className="font-medium">+12 this week</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-card border-0 shadow-card hover:shadow-lg transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-5 rounded-full -mr-16 -mt-16 group-hover:opacity-10 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Success Rate</CardTitle>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black text-foreground" data-testid="text-success-rate">{DEMO_METRICS.successRate}%</div>
            <div className="flex items-center gap-1 text-xs text-success">
              <ArrowUpRight className="w-3 h-3" />
              <span className="font-medium">+2.8% from last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-card border-0 shadow-card hover:shadow-lg transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-5 rounded-full -mr-16 -mt-16 group-hover:opacity-10 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Active Users</CardTitle>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-black text-foreground" data-testid="text-active-users">{DEMO_METRICS.activeUsers}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              <span className="font-medium">8 online now</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
            <CardDescription className="text-base">Latest interactions with Rita</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {DEMO_ACTIVITIES.map((activity, index) => (
                <div key={activity.id} className={`flex items-start space-x-4 p-4 rounded-2xl ${index === 0 ? 'bg-primary/5 border border-primary/10' : 'bg-muted/30'}`}>
                  <div className="w-3 h-3 bg-gradient-primary rounded-full mt-2 shadow-glow"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-card-foreground" data-testid={`text-activity-${activity.id}`}>{activity.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{activity.timestamp} • {activity.user}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
            <CardDescription className="text-base">Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div 
                className="p-6 border-2 border-border rounded-2xl hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all duration-300 group"
                onClick={() => handleSectionChange("documents")}
                data-testid="button-quick-documents"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow group-hover:shadow-lg">
                    <FileText className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1 text-card-foreground">Manage Documents</h4>
                    <p className="text-sm text-muted-foreground">Upload and organize training materials</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div 
                className="p-6 border-2 border-border rounded-2xl hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all duration-300 group"
                onClick={() => handleSectionChange("users")}
                data-testid="button-quick-users"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow group-hover:shadow-lg">
                    <Users className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1 text-card-foreground">Manage Team</h4>
                    <p className="text-sm text-muted-foreground">Add and manage team member access</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div 
                className="p-6 border-2 border-border rounded-2xl hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all duration-300 group"
                onClick={() => showToast("Feature Demo", "This would open Rita's AI chat interface")}
                data-testid="button-quick-chat"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow group-hover:shadow-lg">
                    <MessageSquare className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1 text-card-foreground">Chat with Rita</h4>
                    <p className="text-sm text-muted-foreground">Ask about recruiting or compliance</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-foreground mb-2" data-testid="text-documents-title">Documents</h1>
          <p className="text-lg text-muted-foreground">
            Organize and manage your recruiting documents for Rita's AI assistance
          </p>
        </div>
        <Button 
          onClick={() => showToast("Feature Demo", "This would open the document upload interface")}
          className="flex items-center gap-2"
          data-testid="button-create-folder"
        >
          <FolderPlus className="h-4 w-4" />
          Create Folder
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {DEMO_DOCUMENTS.map((folder) => (
          <Card key={folder.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                  <Briefcase className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground" data-testid={`text-folder-${folder.id}`}>{folder.folder_name}</h3>
                  <p className="text-sm text-muted-foreground">{folder.files.length} files</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" data-testid={`button-folder-menu-${folder.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {folder.files.slice(0, 3).map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-file-${folder.id}-${index}`}>{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size} • {file.created_at}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getProcessingStatusBadge(file.status)}
                  </div>
                </div>
              ))}
              {folder.files.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm" data-testid={`button-view-all-${folder.id}`}>
                    View all {folder.files.length} files
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground mb-3" data-testid="text-users-title">Team Members</h1>
          <p className="text-lg text-muted-foreground">
            Manage user access and send invitations to join your platform
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            onClick={() => showToast("Feature Demo", "This would open the user invitation dialog")}
            data-testid="button-invite-user"
          >
            <Mail className="w-4 h-4 mr-2" />
            Invite User
          </Button>
          <Button 
            variant="outline"
            className="hover:bg-gradient-primary hover:text-primary-foreground border-primary"
            onClick={() => showToast("Feature Demo", "This would open the manual user creation dialog")}
            data-testid="button-add-user"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User Manually
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-users"
          />
        </div>
      </div>

      {/* Usage info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Team Usage</p>
                <p className="text-sm text-blue-700">{DEMO_USERS.length} of 50 team members used</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900" data-testid="text-team-usage">{DEMO_USERS.length}/50</p>
              <Progress value={(DEMO_USERS.length / 50) * 100} className="w-24 h-2 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage access and permissions for your team</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{user.first_name.charAt(0)}{user.last_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user.phone_number}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-user-email-${user.id}`}>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize" data-testid={`badge-user-role-${user.id}`}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{getAccessBadge(user.has_access)}</TableCell>
                  <TableCell data-testid={`text-user-login-${user.id}`}>
                    {user.last_sign_in ? formatDate(user.last_sign_in) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => showToast("Feature Demo", `This would edit ${user.first_name}'s details`)}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => showToast("Feature Demo", `This would toggle access for ${user.first_name}`)}
                        data-testid={`button-toggle-access-${user.id}`}
                      >
                        {user.has_access ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-billing-title">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and track usage.</p>
      </div>

      {/* Main Subscription Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Subscription
            </CardTitle>
            <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>
          </div>
          <CardDescription>Your current plan and billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-xl font-bold text-primary" data-testid="text-current-plan">Pro Plan</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Cost</p>
              <p className="text-xl font-bold" data-testid="text-monthly-cost">$499</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Next Billing</p>
              <p className="text-sm font-medium" data-testid="text-next-billing">{formatDate(DEMO_SUBSCRIPTION.current_period_end)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-sm font-medium capitalize" data-testid="text-subscription-status">{DEMO_SUBSCRIPTION.status}</p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => showToast("Feature Demo", "This would open the Stripe customer portal")}
              data-testid="button-manage-subscription"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
            <Button 
              variant="outline" 
              onClick={() => showToast("Feature Demo", "This would show the pricing page")}
              data-testid="button-change-plan"
            >
              Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users Usage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team Members
              </span>
              <span className="text-sm text-muted-foreground" data-testid="text-billing-users-usage">
                {DEMO_SUBSCRIPTION.users.current} / {DEMO_SUBSCRIPTION.users.limit}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress 
              value={DEMO_SUBSCRIPTION.users.percentage} 
              className="h-2"
              data-testid="progress-billing-users"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{DEMO_SUBSCRIPTION.users.current} used</span>
              <span>{DEMO_SUBSCRIPTION.users.limit - DEMO_SUBSCRIPTION.users.current} available</span>
            </div>
          </CardContent>
        </Card>

        {/* Queries Usage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                AI Queries
              </span>
              <span className="text-sm text-muted-foreground" data-testid="text-billing-queries-usage">
                {DEMO_SUBSCRIPTION.queries.current} / {DEMO_SUBSCRIPTION.queries.limit}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress 
              value={DEMO_SUBSCRIPTION.queries.percentage} 
              className="h-2"
              data-testid="progress-billing-queries"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{DEMO_SUBSCRIPTION.queries.current} used</span>
              <span>{DEMO_SUBSCRIPTION.queries.limit - DEMO_SUBSCRIPTION.queries.current} remaining</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Resets {formatDate(DEMO_SUBSCRIPTION.queries.reset_date)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Storage
              </span>
              <span className="text-sm text-muted-foreground" data-testid="text-billing-storage-usage">
                {DEMO_SUBSCRIPTION.storage.used_gb}GB / {DEMO_SUBSCRIPTION.storage.limit_gb}GB
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress 
              value={DEMO_SUBSCRIPTION.storage.percentage} 
              className="h-2"
              data-testid="progress-billing-storage"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{DEMO_SUBSCRIPTION.storage.used_gb}GB used</span>
              <span>{DEMO_SUBSCRIPTION.storage.limit_gb - DEMO_SUBSCRIPTION.storage.used_gb}GB available</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Comparison</CardTitle>
          <CardDescription>Compare features across different plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Feature</th>
                  <th className="text-center py-2">Starter</th>
                  <th className="text-center py-2 bg-primary/5">Pro (Current)</th>
                  <th className="text-center py-2">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Team Members</td>
                  <td className="text-center">5</td>
                  <td className="text-center bg-primary/5 font-medium">50</td>
                  <td className="text-center">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">AI Queries/Month</td>
                  <td className="text-center">1,000</td>
                  <td className="text-center bg-primary/5 font-medium">10,000</td>
                  <td className="text-center">50,000</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Storage</td>
                  <td className="text-center">20 GB</td>
                  <td className="text-center bg-primary/5 font-medium">100 GB</td>
                  <td className="text-center">1 TB</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Price/Month</td>
                  <td className="text-center">$199</td>
                  <td className="text-center bg-primary/5 font-medium">$499</td>
                  <td className="text-center">$1,200</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-settings-title">Organization Settings</h1>
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
                <AvatarFallback className="bg-gradient-primary">
                  <Building2 className="h-12 w-12 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showToast("Feature Demo", "This would open the file upload dialog")}
                    data-testid="button-upload-org-logo"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Upload your organization's logo. Recommended size: 200x200px, Max size: 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={DEMO_ORG.name}
              placeholder="Enter organization name"
              readOnly
              data-testid="input-org-name"
            />
          </div>

          {/* Organization Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Organization ID</span>
              <span className="text-sm font-mono" data-testid="text-org-id">{DEMO_ORG.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">User Limit</span>
              <span className="text-sm" data-testid="text-org-user-limit">{DEMO_ORG.user_limit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Monthly Query Cap</span>
              <span className="text-sm" data-testid="text-org-query-cap">{DEMO_ORG.monthly_query_cap.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm" data-testid="text-org-created">{formatDate(DEMO_ORG.created_at)}</span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => showToast("Feature Demo", "Organization settings saved successfully")}
              data-testid="button-save-org-settings"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
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
              <Button 
                variant="destructive" 
                disabled
                onClick={() => showToast("Feature Demo", "This would initiate organization deletion")}
                data-testid="button-delete-org"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Organization
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboard();
      case "documents":
        return renderDocuments();
      case "users":
        return renderUsers();
      case "billing":
        return renderBilling();
      case "settings":
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden rounded-xl"
              data-testid="button-toggle-sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <div className="flex items-center group">
              <div className="text-2xl font-black text-primary">Rita</div>
              <div className="ml-3 px-3 py-1 bg-gradient-primary text-primary-foreground text-xs font-semibold rounded-full">
                DEMO
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground hidden sm:block">
              {DEMO_ORG.name}
            </div>
            <Avatar className="w-10 h-10 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                SC
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 top-20 z-40 w-72 bg-gradient-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <nav className="h-full px-6 py-8 space-y-3">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              
              return (
                <button
                  key={item.name}
                  onClick={() => handleSectionChange(item.key)}
                  className={cn(
                    "w-full flex items-center space-x-4 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                  )}
                  data-testid={`button-nav-${item.key}`}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    isActive ? "bg-white/20" : "bg-primary/10 group-hover:bg-primary/20"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-base">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            data-testid="overlay-sidebar"
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDemo;