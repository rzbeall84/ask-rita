import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, FileText, TrendingUp, Users, ArrowUpRight, Activity, Clock, Target } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-black text-foreground mb-3">Dashboard</h1>
          <p className="text-lg text-muted-foreground">Welcome back! Here's what's happening with your recruiting.</p>
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
              <div className="text-3xl font-black text-foreground">1,234</div>
              <div className="flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="w-3 h-3" />
                <span className="font-medium">+12% from last month</span>
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
              <div className="text-3xl font-black text-foreground">23</div>
              <div className="flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="w-3 h-3" />
                <span className="font-medium">+3 this week</span>
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
              <div className="text-3xl font-black text-foreground">94.2%</div>
              <div className="flex items-center gap-1 text-xs text-success">
                <ArrowUpRight className="w-3 h-3" />
                <span className="font-medium">+2.1% from last month</span>
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
              <div className="text-3xl font-black text-foreground">8</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="w-3 h-3" />
                <span className="font-medium">2 online now</span>
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
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="w-3 h-3 bg-gradient-primary rounded-full mt-2 shadow-glow"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-card-foreground">Asked about carrier compliance requirements</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-muted/30">
                  <div className="w-3 h-3 bg-gradient-primary rounded-full mt-2 shadow-glow"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-card-foreground">Uploaded new driver training manual</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-muted/30">
                  <div className="w-3 h-3 bg-gradient-primary rounded-full mt-2 shadow-glow"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-card-foreground">Generated recruitment report</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">3 hours ago</p>
                    </div>
                  </div>
                </div>
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
                <Link to="/dashboard/chat" className="block">
                  <div className="p-6 border-2 border-border rounded-2xl hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all duration-300 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow group-hover:shadow-lg">
                        <MessageCircle className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold mb-1 text-card-foreground">Start New Chat</h4>
                        <p className="text-sm text-muted-foreground">Ask Rita about recruiting, training, or compliance</p>
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
                <Link to="/dashboard/documents" className="block">
                  <div className="p-6 border-2 border-border rounded-2xl hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all duration-300 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow group-hover:shadow-lg">
                        <FileText className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold mb-1 text-card-foreground">Upload Documents</h4>
                        <p className="text-sm text-muted-foreground">Add new training materials or job descriptions</p>
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
                <div className="p-6 border-2 border-border rounded-2xl hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all duration-300 group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow group-hover:shadow-lg">
                      <Target className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold mb-1 text-card-foreground">View Reports</h4>
                      <p className="text-sm text-muted-foreground">Generate insights on your recruiting performance</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;