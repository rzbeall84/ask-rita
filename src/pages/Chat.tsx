import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Send, Bot, User, MessageSquare, AlertTriangle, TrendingUp, Search, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageLogo } from "@/components/ImageLogo";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  sources?: string[];
  documentsSearched?: number;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm Rita, your AI recruiting assistant. I can answer questions based on the documents you've uploaded to your organization - including carrier information, job descriptions, recruiter training materials, and driver qualification files. Upload documents in the Documents section, then ask me anything about their contents. How can I help you today?",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const { usageStats, refreshUsageStats } = useSubscription();
  const { 
    enforceQueryLimit, 
    getRemainingQueries, 
    getUsagePercentage, 
    canMakeQueries,
    isFreePlan 
  } = useSubscriptionLimits();

  // Refresh usage stats on mount
  useEffect(() => {
    refreshUsageStats();
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Check query limit before sending
    if (!canMakeQueries()) {
      toast({
        title: "Query Limit Reached",
        description: "You've reached your monthly query limit. Please upgrade your plan.",
        variant: "destructive",
        action: <Button onClick={() => navigate('/pricing')}>Upgrade</Button>,
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    // Add searching status message
    const searchingMessage: Message = {
      id: Date.now().toString() + "-search",
      content: "Searching through your organization's documents...",
      role: "system",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, searchingMessage]);

    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to chat with Rita');
      }

      // Track the query usage
      const canProceed = await enforceQueryLimit(currentInput);
      
      if (!canProceed) {
        // Add limit reached message
        const limitMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "I apologize, but you've reached your monthly query limit. Please upgrade your plan to continue using Rita.",
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, limitMessage]);
        setIsLoading(false);
        return;
      }

      // Call Rita chat edge function with authentication
      const { data, error } = await supabase.functions.invoke('rita-chat', {
        body: { message: currentInput },
        headers: getAuthHeaders(),
      });

      if (error) {
        console.error('Error calling rita-chat function:', error);
        throw error;
      }

      // Remove searching message
      setMessages(prev => prev.filter(msg => msg.role !== "system"));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "I apologize, but I'm having trouble responding right now. Please try again.",
        role: "assistant",
        timestamp: new Date(),
        sources: data.sources || [],
        documentsSearched: data.documentsSearched || 0,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Refresh usage stats after successful query
      await refreshUsageStats();

      // Show warning if approaching limit
      const remaining = getRemainingQueries();
      if (remaining > 0 && remaining <= 10) {
        toast({
          title: "Query Limit Warning",
          description: `You have ${remaining} queries remaining this month.`,
        });
      }
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMsg = error.message === 'Please log in to chat with Rita' 
        ? "Please log in to chat with Rita"
        : "Sorry, I'm having trouble responding. Please try again.";
        
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      
      // Remove searching message if error occurs
      setMessages(prev => prev.filter(msg => msg.role !== "system"));
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: error.message === 'Please log in to chat with Rita' 
          ? "Please log in to start chatting with me. I can only access your organization's uploaded documents when you're authenticated."
          : "I apologize, but I'm experiencing technical difficulties. Please try your question again.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-6">
          <h1 className="text-4xl font-black text-foreground mb-3" data-testid="text-page-title">Chat with Rita</h1>
          <p className="text-lg text-muted-foreground">Your AI recruiting assistant for transportation industry expertise</p>
        </div>

        {/* Query Usage Card */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Monthly Query Usage
              </CardTitle>
              {isFreePlan() ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/pricing')}
                  data-testid="button-upgrade-queries"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Upgrade
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Queries Used</span>
              <span className="font-medium" data-testid="text-queries-count">
                {usageStats?.queries.current || 0} / {usageStats?.queries.limit || 100}
              </span>
            </div>
            <Progress 
              value={getUsagePercentage('queries')} 
              className="h-2"
              data-testid="progress-queries"
            />
            {!canMakeQueries() && (
              <Alert className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Monthly query limit reached. <Button
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate('/pricing')}
                  >
                    Upgrade your plan
                  </Button> to continue using Rita.
                </AlertDescription>
              </Alert>
            )}
            {getRemainingQueries() > 0 && getRemainingQueries() <= 20 && (
              <Alert className="py-2">
                <AlertDescription className="text-xs">
                  {getRemainingQueries()} queries remaining this month.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col bg-gradient-card border-0 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <ImageLogo size="small" />
              </div>
              Conversation
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === "system" ? (
                    <div className="flex justify-center my-2">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{message.content}</span>
                        <Search className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex gap-4 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center shadow-glow flex-shrink-0">
                          <ImageLogo size="small" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[80%] ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground ml-auto"
                            : "bg-muted/50"
                        } p-4 rounded-2xl`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        
                        {/* Show sources if available */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-medium">Sources:</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {message.sources.map((source, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded bg-background/50 text-muted-foreground"
                                  data-testid={`text-source-${idx}`}
                                >
                                  {source}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Show documents searched count */}
                        {message.documentsSearched !== undefined && message.documentsSearched > 0 && (
                          <div className="mt-2 flex items-center gap-1">
                            <Search className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground" data-testid="text-documents-searched">
                              Searched {message.documentsSearched} relevant document{message.documentsSearched !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
                        <p className={`text-xs mt-2 ${
                          message.role === "user" 
                            ? "text-primary-foreground/70" 
                            : "text-muted-foreground"
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      
                      {message.role === "user" && (
                        <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center shadow-glow flex-shrink-0">
                    <ImageLogo size="small" />
                  </div>
                  <div className="bg-muted/50 p-4 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse animation-delay-200"></div>
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse animation-delay-400"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t bg-background/50 p-6">
              <div className="flex gap-4">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={canMakeQueries() 
                    ? "Ask Rita about your uploaded documents: carrier safety records, driver qualifications, job requirements, training materials..."
                    : "You've reached your monthly query limit. Please upgrade to continue."
                  }
                  disabled={!canMakeQueries()}
                  className="flex-1 resize-none bg-background border-border focus:border-primary/50 rounded-xl"
                  rows={2}
                  data-testid="textarea-chat-input"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading || !canMakeQueries()}
                  className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-lg transition-all self-end px-6"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {!canMakeQueries() && (
                <div className="text-center mt-4">
                  <Button 
                    onClick={() => navigate('/pricing')}
                    className="bg-gradient-primary text-primary-foreground"
                    data-testid="button-upgrade-to-continue"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Upgrade to Continue Chatting
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Chat;