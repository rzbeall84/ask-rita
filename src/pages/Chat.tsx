import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageLogo } from "@/components/ImageLogo";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
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

  const handleSendMessage = async () => {
    if (!input.trim()) return;

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

    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to chat with Rita');
      }

      // Call Rita chat edge function with authentication
      const { data, error } = await supabase.functions.invoke('rita-chat', {
        body: { message: currentInput },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error calling rita-chat function:', error);
        throw error;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "I apologize, but I'm having trouble responding right now. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
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
          <h1 className="text-4xl font-black text-foreground mb-3">Chat with Rita</h1>
          <p className="text-lg text-muted-foreground">Your AI recruiting assistant for transportation industry expertise</p>
        </div>

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
                <div
                  key={message.id}
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
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted/50"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
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
                  placeholder="Ask Rita about your uploaded documents: carrier safety records, driver qualifications, job requirements, training materials..."
                  className="flex-1 resize-none bg-background border-border focus:border-primary/50 rounded-xl"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-lg transition-all self-end px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Chat;