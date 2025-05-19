"use client";

import { useState, useEffect, useCallback } from 'react';
import { summarizeTopic, type SummarizeTopicInput, type SummarizeTopicOutput } from '@/ai/flows/summarize-topic';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { History, Loader2, Trash2, BotMessageSquare } from 'lucide-react';

interface HistoryItem {
  id: string;
  topic: string;
  details: string;
  timestamp: number;
}

const MAX_HISTORY_ITEMS = 10;
const LOCAL_STORAGE_KEY = 'tldrGeniusHistory';

export default function TldrGeniusPage() {
  const [topic, setTopic] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      // Optionally, clear corrupted data or notify user
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history]);

  const addHistoryItem = useCallback((itemTopic: string, itemDetails: string) => {
    setHistory(prevHistory => {
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        topic: itemTopic,
        details: itemDetails,
        timestamp: Date.now(),
      };
      const updatedHistory = [newHistoryItem, ...prevHistory.filter(item => item.topic !== itemTopic || item.details !== itemDetails)];
      return updatedHistory.slice(0, MAX_HISTORY_ITEMS);
    });
  }, []);

  const handleSummarize = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    if (!details.trim()) {
      setError("Please provide some details about the topic.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const input: SummarizeTopicInput = { topic, details };
      const result: SummarizeTopicOutput = await summarizeTopic(input);
      setSummary(result.summary);
      addHistoryItem(topic, details);
      toast({
        title: "Summary Generated!",
        description: `Successfully summarized "${topic}".`,
      });
    } catch (e) {
      console.error("Error summarizing topic:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to generate summary: ${errorMessage}`);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: `Could not generate summary. ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setTopic(item.topic);
    setDetails(item.details);
    setSummary(null); // Clear previous summary
    setError(null); // Clear previous error
    toast({
      title: "Loaded from History",
      description: `Topic "${item.topic}" loaded into form.`,
    });
  };

  const clearHistory = () => {
    setHistory([]);
    toast({
      title: "History Cleared",
      description: "Your summarization history has been cleared.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-background">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center mb-2">
          <BotMessageSquare className="h-12 w-12 text-primary mr-3" />
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">TldrGenius</h1>
        </div>
        <p className="text-muted-foreground text-lg">Get concise summaries for any topic, powered by AI.</p>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Input and Summary Section */}
        <section className="md:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Describe Your Topic</CardTitle>
              <CardDescription>Provide a topic and some details to get a summary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="topic-input" className="block text-sm font-medium text-foreground mb-1">Topic</label>
                <Input
                  id="topic-input"
                  type="text"
                  placeholder="e.g., Photosynthesis, The French Revolution"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="text-base"
                />
              </div>
              <div>
                <label htmlFor="details-textarea" className="block text-sm font-medium text-foreground mb-1">Details</label>
                <Textarea
                  id="details-textarea"
                  placeholder="Provide as much detail as possible about the topic. What aspects are you interested in? What specific information should the summary include?"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={6}
                  className="text-base"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSummarize} disabled={isLoading} className="w-full text-base py-3">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  "Summarize Topic"
                )}
              </Button>
            </CardFooter>
          </Card>

          {error && (
            <Alert variant="destructive" className="shadow-md">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {summary && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-auto max-h-96 p-1">
                  <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">{summary}</p>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </section>

        {/* History Section */}
        <aside className="md:col-span-1">
          <Card className="shadow-lg h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center">
                <History className="h-6 w-6 mr-2 text-primary" />
                <CardTitle className="text-xl">History</CardTitle>
              </div>
              {history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearHistory} aria-label="Clear history">
                  <Trash2 className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No history yet. Summarize a topic to see it here!</p>
              ) : (
                <ScrollArea className="h-[calc(100vh-18rem)] md:h-[calc(100vh-14rem)] max-h-[500px] pr-3"> {/* Adjusted height */}
                  <ul className="space-y-3">
                    {history.map((item) => (
                      <li key={item.id}>
                        <Button
                          variant="outline"
                          className="w-full h-auto p-3 text-left flex flex-col items-start shadow-sm hover:bg-accent/50"
                          onClick={() => loadFromHistory(item)}
                        >
                          <span className="font-semibold text-sm text-primary-foreground truncate block w-full">{item.topic}</span>
                          <span className="text-xs text-muted-foreground mt-1 truncate block w-full">{item.details.substring(0, 60)}{item.details.length > 60 ? '...' : ''}</span>
                          <span className="text-xs text-muted-foreground mt-1 self-end">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </aside>
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TldrGenius. All rights reserved.</p>
      </footer>
    </div>
  );
}
