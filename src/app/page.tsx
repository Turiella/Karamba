
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { summarizeTopic, type SummarizeTopicInput, type SummarizeTopicOutput } from '@/ai/flows/summarize-topic';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { History, Loader2, Trash2, BotMessageSquare, Languages, Mic, MicOff } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface HistoryItem {
  id: string;
  topic: string;
  details: string;
  timestamp: number;
}

const MAX_HISTORY_ITEMS = 10;
const LOCAL_STORAGE_KEY = 'tldrGeniusHistory';

// Type guard for SpeechRecognition
interface CustomWindow extends Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}
declare const window: CustomWindow;


export default function TldrGeniusPage() {
  const [topic, setTopic] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { toast } = useToast();
  const { locale, setLocale, t } = useLocale();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const [isListeningTopic, setIsListeningTopic] = useState<boolean>(false);
  const [isListeningDetails, setIsListeningDetails] = useState<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);


  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
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
      setError(t('errorPleaseEnterTopic'));
      return;
    }
    if (!details.trim()) {
      setError(t('errorPleaseProvideDetails'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const input: SummarizeTopicInput = { topic, details, language: locale };
      const result: SummarizeTopicOutput = await summarizeTopic(input);
      setSummary(result.summary);
      addHistoryItem(topic, details);
      toast({
        title: t('toastSummaryGeneratedTitle'),
        description: t('toastSummaryGeneratedDescription', { topic }),
      });
    } catch (e) {
      console.error("Error summarizing topic:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(t('errorFailedToGenerateSummary', { errorMessage }));
      toast({
        variant: "destructive",
        title: t('toastErrorTitle'),
        description: t('toastErrorDescription', { errorMessage }),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setTopic(item.topic);
    setDetails(item.details);
    setSummary(null);
    setError(null);
    toast({
      title: t('toastLoadedFromHistoryTitle'),
      description: t('toastLoadedFromHistoryDescription', { topic: item.topic }),
    });
  };

  const clearHistory = () => {
    setHistory([]);
    toast({
      title: t('toastHistoryClearedTitle'),
      description: t('toastHistoryClearedDescription'),
    });
  };

  const handleVoiceInput = (targetField: 'topic' | 'details') => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      toast({ variant: "destructive", title: t('errorAlertTitle'), description: t('errorSpeechRecognitionNotSupported') });
      return;
    }

    const isCurrentlyListening = targetField === 'topic' ? isListeningTopic : isListeningDetails;
    const setIsListening = targetField === 'topic' ? setIsListeningTopic : setIsListeningDetails;
    const setValue = targetField === 'topic' ? setTopic : setDetails;

    if (isCurrentlyListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    recognitionRef.current = new SpeechRecognitionAPI();
    recognitionRef.current.lang = locale;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setValue(speechResult);
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      let errorMessageKey = 'errorSpeechRecognitionGeneric';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMessageKey = 'errorMicrophonePermissionDenied';
      } else if (event.error === 'no-speech') {
        errorMessageKey = 'errorNoSpeechDetected';
      }
      toast({ variant: "destructive", title: t('errorAlertTitle'), description: t(errorMessageKey) });
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
        recognitionRef.current.start();
    } catch (e) {
        console.error("Error starting speech recognition:", e);
        toast({ variant: "destructive", title: t('errorAlertTitle'), description: t('errorSpeechRecognitionGeneric') });
        setIsListening(false);
    }
  };


  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-background relative">
        <Button
          onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
          variant="outline"
          size="sm"
          className="absolute top-4 right-4 flex items-center gap-2"
        >
          <Languages className="h-4 w-4" />
          {locale === 'en' ? t('switchToSpanish') : t('switchToEnglish')}
        </Button>

        <header className="mb-8 text-center pt-12 md:pt-0">
          <div className="flex items-center justify-center mb-2">
            <BotMessageSquare className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">{t('pageTitle')}</h1>
          </div>
          <p className="text-muted-foreground text-lg">{t('pageSubtitle')}</p>
        </header>

        <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="md:col-span-2 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">{t('describeTopicCardTitle')}</CardTitle>
                <CardDescription>{t('describeTopicCardDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="topic-input" className="block text-sm font-medium text-foreground mb-1">{t('topicLabel')}</label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="topic-input"
                      type="text"
                      placeholder={t('topicPlaceholder')}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="text-base flex-grow"
                      disabled={isListeningTopic || isListeningDetails}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleVoiceInput('topic')}
                          disabled={isListeningDetails || isLoading}
                          aria-label={isListeningTopic ? t('listeningTooltip') : t('voiceInputTopicTooltip')}
                        >
                          {isListeningTopic ? <MicOff className="h-5 w-5 animate-pulse text-destructive" /> : <Mic className="h-5 w-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isListeningTopic ? t('listeningTooltip') : t('voiceInputTopicTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div>
                  <label htmlFor="details-textarea" className="block text-sm font-medium text-foreground mb-1">{t('detailsLabel')}</label>
                   <div className="flex items-start gap-2">
                    <Textarea
                      id="details-textarea"
                      placeholder={t('detailsPlaceholder')}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={6}
                      className="text-base flex-grow"
                      disabled={isListeningTopic || isListeningDetails}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleVoiceInput('details')}
                          disabled={isListeningTopic || isLoading}
                          aria-label={isListeningDetails ? t('listeningTooltip') : t('voiceInputDetailsTooltip')}
                        >
                          {isListeningDetails ? <MicOff className="h-5 w-5 animate-pulse text-destructive" /> : <Mic className="h-5 w-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isListeningDetails ? t('listeningTooltip') : t('voiceInputDetailsTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSummarize} disabled={isLoading || isListeningTopic || isListeningDetails} className="w-full text-base py-3">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('summarizingButton')}
                    </>
                  ) : (
                    t('summarizeButton')
                  )}
                </Button>
              </CardFooter>
            </Card>

            {error && (
              <Alert variant="destructive" className="shadow-md">
                <AlertTitle>{t('errorAlertTitle')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {summary && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">{t('summaryCardTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-auto max-h-96 p-1">
                    <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">{summary}</p>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </section>

          <aside className="md:col-span-1">
            <Card className="shadow-lg h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center">
                  <History className="h-6 w-6 mr-2 text-primary" />
                  <CardTitle className="text-xl">{t('historyCardTitle')}</CardTitle>
                </div>
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearHistory} aria-label={t('clearHistoryButton')}>
                    <Trash2 className="h-4 w-4 mr-1" /> {t('clearHistoryButton')}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('noHistoryMessage')}</p>
                ) : (
                  <ScrollArea className="h-[calc(100vh-18rem)] md:h-[calc(100vh-14rem)] max-h-[500px] pr-3">
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
          {currentYear !== null && <p>{t('footerText', { year: currentYear })}</p>}
        </footer>
      </div>
    </TooltipProvider>
  );
}
