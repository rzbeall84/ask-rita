import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, Sparkles, Briefcase, FolderPlus, Shield, Upload, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ImageLogo } from "@/components/ImageLogo";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

const Demo = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        content: "👋 Hello! I'm Rita, your AI recruiting assistant for the transportation industry. This demo shows how I work with your uploaded company files. Try the sample questions below to see me in action! For personalized answers with your own documents, you'll need to sign up and upload your files. What demo question would you like to try?",
        role: "assistant",
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: userInput,
      role: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = userInput;
    setUserInput("");
    setIsLoading(true);

    // Define demo questions
    const demoQuestions = [
      "Does Blue Ridge Logistics hire within 75 miles of Tulsa OK for regional reefer job BR-2317?",
      "What is IronSparrow Freight's DUI and accident policy?",
      "What's the average weekly pay and home time for Riverbend Carriers southeast regional job RB-339?",
      "Driver doesn't want inward-facing cameras. Which carriers allow no cameras?"
    ];

    // Check if the question is one of the demo questions (allowing for some variation)
    const isDemoQuestion = demoQuestions.some(demoQ => 
      demoQ.toLowerCase().includes(currentInput.toLowerCase().slice(0, 20)) ||
      currentInput.toLowerCase().includes(demoQ.toLowerCase().slice(0, 20))
    );

    if (!isDemoQuestion) {
      // Show message directing to demo questions
      const restrictionMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "This is a demo version with limited sample questions. Please try one of the sample questions from the sidebar, or sign up to upload your own files and ask unlimited questions about your company's recruiting practices! 🚀",
        role: "assistant",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, restrictionMessage]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('rita-demo', {
        body: { message: currentInput }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting demo response:', error);
      
      // Fallback to demo response
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm Rita, your AI recruiting assistant demo! I help with transportation industry recruiting questions. Due to high demo usage, I'm currently using backup responses. The full version provides instant, personalized answers with access to your company data. Would you like to try asking about CDL requirements, DOT compliance, or driver recruiting strategies?",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Home</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-500">DEMO MODE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Interface */}
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        
        {/* Interactive Demo Header */}
        <Card className="mb-8 p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Experience Rita in Action</h1>
            </div>
            <p className="text-lg text-muted-foreground mb-2">
              Type your recruiting questions below and see how Rita's AI responds instantly
            </p>
            <p className="text-sm text-primary font-medium">
              ✨ This is a live demo - your questions get real AI responses!
            </p>
          </div>
        </Card>

        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col bg-card/50 backdrop-blur-sm border-border/50 shadow-xl min-h-[600px]">
              
              {/* Chat Header */}
              <div className="p-6 border-b border-border/50 bg-gradient-subtle">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shadow-lg">
                     <ImageLogo size="small" />
                   </div>
                   <div>
                     <h2 className="text-xl font-bold text-foreground">Ask Rita</h2>
                     <p className="text-sm text-muted-foreground">AI Recruiting Assistant Demo</p>
                   </div>
                 </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[400px]">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                     {message.role === "assistant" && (
                       <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 shadow-md">
                          <ImageLogo size="small" />
                       </div>
                     )}
                    
                    <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-md ${
                          message.role === "user"
                            ? "bg-gradient-primary text-primary-foreground ml-auto"
                            : "bg-muted/80 text-foreground border border-border/30"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 px-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                        U
                      </div>
                    )}
                  </div>
                ))}
                
                 {isLoading && (
                   <div className="flex gap-4 justify-start">
                     <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                       <ImageLogo size="small" />
                     </div>
                     <div className="bg-muted/80 rounded-2xl px-4 py-3 border border-border/30">
                       <div className="flex space-x-1">
                         <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                         <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                         <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                       </div>
                     </div>
                   </div>
                 )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-border/50 bg-gradient-subtle">
                <div className="flex gap-3">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Rita about transportation recruiting..."
                    className="flex-1 min-h-[50px] resize-none bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-colors"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!userInput.trim() || isLoading}
                    size="lg"
                    className="px-6 bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Sample Questions */}
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <h3 className="font-semibold text-foreground mb-4">Try asking Rita:</h3>
              <div className="space-y-3">
                {[
                  "Does Blue Ridge Logistics hire within 75 miles of Tulsa OK for regional reefer job BR-2317?",
                  "What is IronSparrow Freight's DUI and accident policy?",
                  "What's the average weekly pay and home time for Riverbend Carriers southeast regional job RB-339?",
                  "Driver doesn't want inward-facing cameras. Which carriers allow no cameras?"
                ].map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setUserInput(question)}
                    className="w-full text-left p-3 text-sm rounded-lg bg-muted/50 hover:bg-muted/80 border border-border/30 hover:border-primary/30 transition-all duration-200 text-muted-foreground hover:text-foreground"
                  >
                    "{question}"
                  </button>
                ))}
              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* Document Management Preview Section */}
      <section className="bg-gradient-to-br from-muted/20 via-background to-muted/10 py-12 mt-4">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Upload & Organize Your Documents
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              In the full version, upload your company documents and let Rita provide accurate, 
              company-specific answers. Organize by category and give Rita strict instructions 
              on what information should remain private.
            </p>
          </div>

          {/* Mock Document Categories */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Left: Folder Categories Demo */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                  <Briefcase className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Recruiting Practices</h3>
                  <p className="text-muted-foreground">Your recruiting processes and guidelines</p>
                </div>
              </div>

              {/* Mock Folder Cards */}
              <div className="grid gap-4">
                {[
                  {
                    name: "Current Recruiter List & Contact Info",
                    description: "Active recruiter contacts, territories, and performance metrics",
                    instructions: "Don't share personal contact details or performance data - keep confidential",
                    isPrivate: true
                  },
                  {
                    name: "Recruiting Scripts", 
                    description: "Phone scripts and email templates for candidate outreach",
                    instructions: "Share these scripts freely with recruiters to maintain consistency"
                  },
                  {
                    name: "Johnson Trucking Benefits",
                    description: "Healthcare, retirement, and other benefit information",
                    instructions: "Share benefit details but not costs or negotiation room"
                  }
                ].map((folder, index) => (
                  <Card key={index} className="relative overflow-hidden transition-all duration-300 hover:shadow-lg group cursor-pointer bg-gradient-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <FolderPlus className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              {folder.name}
                              {folder.isPrivate && (
                                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                                  Private
                                </Badge>
                              )}
                            </CardTitle>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-3">
                        {folder.description}
                      </p>
                      
                      <div className="bg-primary/5 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-primary">Privacy Instructions</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {folder.instructions}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>3 files uploaded</span>
                        <span className="text-primary font-medium">Demo folder</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right: File Upload Demo */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">Upload Files</h3>
                <p className="text-muted-foreground">Drag and drop your documents for Rita to reference</p>
              </div>

              {/* Mock Upload Zone */}
              <Card className="border-2 border-dashed border-primary/30 p-8 text-center bg-primary/5">
                <Upload className="mx-auto h-12 w-12 mb-4 text-primary" />
                <h4 className="text-lg font-semibold mb-2">Upload Your Documents</h4>
                <p className="text-muted-foreground mb-4">
                  Drag files here or click to browse
                </p>
                <Button disabled className="bg-gradient-primary text-primary-foreground opacity-50">
                  Choose Files (Demo Only)
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported: PDF, DOC, DOCX, XLS, XLSX, CSV, PNG, JPG
                </p>
              </Card>

              {/* Sample Uploaded Files */}
              <Card className="p-4">
                <h4 className="font-semibold mb-4">Sample Uploaded Files</h4>
                <div className="space-y-3">
                  {[
                    { name: "Johnson_Trucking_Benefits_2024.pdf", size: "245 KB", type: "PDF" },
                    { name: "Recruiting_Scripts.docx", size: "89 KB", type: "Word Doc" },
                    { name: "Commission_Structure.xlsx", size: "156 KB", type: "Excel" }
                  ].map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.size} • {file.type}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Demo</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Privacy Controls Highlight */}
              <Card className="p-6 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-amber-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Privacy & Security Controls</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Set folder-level instructions for what Rita can share</li>
                      <li>• Mark sensitive documents as "Internal Only"</li>
                      <li>• Control which information recruiters can access</li>
                      <li>• All data encrypted and secure</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-8 border border-primary/10">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready to Transform Your Recruiting with Custom Company Data?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join the waitlist for early access to upload documents, 
              create secure folders, and train Rita on your company's unique recruiting processes and policies.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/pricing">
                <Button size="lg" className="text-lg px-8 py-6 h-auto bg-gradient-primary hover:shadow-glow transition-all duration-300 group">
                  View Pricing Plans
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/waitlist">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300">
                  Join Wait List
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Demo;