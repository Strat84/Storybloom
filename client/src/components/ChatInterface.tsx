import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SendIcon, SparklesIcon, UserIcon, BookOpenIcon } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface StoryWithPages {
  story: {
    id: string;
    title: string;
    author: string;
    status: string;
    totalPages: number;
  };
  pages: Array<{
    id: string;
    storyId: string;
    pageNumber: number;
    text: string;
    imagePrompt: string;
    imageUrl?: string | null;
  }>;
}

interface ChatInterfaceProps {
  onStoryGenerated?: (storyData: StoryWithPages) => void;
}

export default function ChatInterface({ onStoryGenerated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm here to help you create an amazing storybook. What kind of story would you like to create? You can tell me about characters, themes, or just share a simple idea!",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [selectedPageCount, setSelectedPageCount] = useState<number>(10);

  const createStoryMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/stories", {
        prompt: prompt,
        totalPages: selectedPageCount
      });
      return await response.json() as StoryWithPages;
    },
    onSuccess: (data) => {
      const aiResponse: Message = {
        id: Date.now().toString(),
        content: `Perfect! I've created your story "${data.story.title}" with ${data.story.totalPages} pages. Each page has engaging text and I'm ready to generate beautiful illustrations. Let's edit and customize your story!`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      onStoryGenerated?.(data);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `I'm sorry, there was an error creating your story: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a different story idea.`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim() || createStoryMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const prompt = inputValue.trim();
    setInputValue('');

    // Start story generation
    createStoryMutation.mutate(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-br from-primary to-chart-2 rounded-lg flex items-center justify-center">
            <SparklesIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Story Assistant</h3>
            <p className="text-xs text-muted-foreground">Let's create your storybook together</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.isUser 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {message.isUser ? (
                  <UserIcon className="h-4 w-4" />
                ) : (
                  <SparklesIcon className="h-4 w-4" />
                )}
              </div>
              
              <div className={`max-w-[80%] ${message.isUser ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 rounded-lg font-story ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {message.content}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {createStoryMutation.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 animate-pulse" />
              </div>
              <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm">Creating your magical story...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-card-border">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="page-count" className="text-sm font-medium">
                Story Length:
              </Label>
            </div>
            <Select 
              value={selectedPageCount.toString()} 
              onValueChange={(value) => setSelectedPageCount(parseInt(value))}
              disabled={createStoryMutation.isPending}
            >
              <SelectTrigger 
                id="page-count"
                data-testid="select-page-count"
                className="w-32"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 pages</SelectItem>
                <SelectItem value="15">15 pages</SelectItem>
                <SelectItem value="20">20 pages</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Input
              data-testid="input-story-idea"
              placeholder="Describe your story idea... (e.g., 'A brave little mouse who saves the forest')"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={createStoryMutation.isPending}
              className="font-story"
            />
            <Button
              data-testid="button-send-message"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || createStoryMutation.isPending}
              size="icon"
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send • Be creative and specific for better results
        </p>
      </div>
    </Card>
  );
}