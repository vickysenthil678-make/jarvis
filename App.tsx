import { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Sliders,
  Sparkles,
  Search,
  Paperclip,
  Mic,
  MicOff,
  Send,
  Loader,
  HelpCircle,
  Copy,
  Volume2,
  VolumeX,
  X,
  FileText,
  Image as ImageIcon,
  ArrowUpRight,
  Menu,
  Check,
  RotateCcw
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import PreferencesModal from './components/PreferencesModal';
import MemoryManager from './components/MemoryManager';
import MarkdownRenderer from './components/MarkdownRenderer';
import { ChatThread, Message, UserPreferences, AttachedFile, AVAILABLE_MODELS } from './types';

// Native Web Speech Recognition types for compiler safety
type SpeechRecognition = any;
declare var webkitSpeechRecognition: any;

export default function App() {
  // Navigation & Drawer states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

  // UI Themes & preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
    voiceEnabled: false,
    currentVoice: 'Zephyr',
    autoSpeak: false,
    temperature: 0.7
  });

  // Database / Thread states
  const [threads, setThreads] = useState<any[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(false);

  // Search, input, and file attachment states
  const [inputText, setInputText] = useState('');
  const [searchGrounding, setSearchGrounding] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Speech & Voice Synthesizing states
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechMsgId, setActiveSpeechMsgId] = useState<string | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [speechSupportError, setSpeechSupportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Synchronize layout dark classes
  useEffect(() => {
    if (preferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.theme]);

  // Scroll to bottom on updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentThread?.messages, loading]);

  // Load preferences and thread index on startup
  useEffect(() => {
    const loadAppData = async () => {
      try {
        const prefRes = await fetch('/api/preferences');
        if (prefRes.ok) {
          const prefData = await prefRes.json();
          setPreferences(prefData);
        }

        const threadsRes = await fetch('/api/threads');
        if (threadsRes.ok) {
          const threadsList = await threadsRes.json();
          setThreads(threadsList);
          
          if (threadsList.length > 0) {
            setCurrentThreadId(threadsList[0].id);
          } else {
            // Create default initial thread
            handleNewThread();
          }
        }
      } catch (err) {
        console.error('Failed to load initial application state:', err);
      }
    };
    loadAppData();
  }, []);

  // Fetch complete details of currently active thread
  useEffect(() => {
    if (!currentThreadId) {
      setCurrentThread(null);
      return;
    }
    const fetchThreadDetail = async () => {
      try {
        const res = await fetch(`/api/threads/${currentThreadId}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentThread(data);
          // Sync thread configurations to main panel
          setSelectedModel(data.modelId);
          setSearchGrounding(data.searchGrounding);
        }
      } catch (err) {
        console.error('Failed to fetch thread detail:', err);
      }
    };
    fetchThreadDetail();
  }, [currentThreadId]);

  // Create a brand new Thread session
  const handleNewThread = async () => {
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Chat',
          modelId: selectedModel,
          searchGrounding: searchGrounding
        })
      });
      if (res.ok) {
        const newThread = await res.json();
        setThreads((prev) => [newThread, ...prev]);
        setCurrentThreadId(newThread.id);
        setAttachedFile(null);
      }
    } catch (err) {
      console.error('Failed to create new thread:', err);
    }
  };

  // Sync thread configurations back-end side on config updates
  const handleSyncThreadConfig = async (model: string, searchVal: boolean) => {
    if (!currentThreadId) return;
    try {
      await fetch(`/api/threads/${currentThreadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model,
          searchGrounding: searchVal
        })
      });
    } catch (err) {
      console.error('Failed to sync thread config:', err);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    handleSyncThreadConfig(model, searchGrounding);
  };

  const handleSearchToggle = (searchVal: boolean) => {
    setSearchGrounding(searchVal);
    handleSyncThreadConfig(selectedModel, searchVal);
  };

  // Delete Thread session
  const handleDeleteThread = async (id: string) => {
    try {
      const res = await fetch(`/api/threads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = threads.filter((t) => t.id !== id);
        setThreads(updated);
        if (currentThreadId === id) {
          if (updated.length > 0) {
            setCurrentThreadId(updated[0].id);
          } else {
            handleNewThread();
          }
        }
      }
    } catch (err) {
      console.error('Deleted thread error:', err);
    }
  };

  // Update Settings
  const handleUpdatePreferences = async (updated: Partial<UserPreferences>) => {
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const fullPrefs = await res.json();
        setPreferences(fullPrefs);
      }
    } catch (err) {
      console.error('Update preferences failed:', err);
    }
  };

  // Document/File selection upload dispatcher
  const handleFileUpload = async (file: File) => {
    if (uploadingFile) return;
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setAttachedFile({
          name: data.name,
          type: data.type,
          size: data.size,
          extractedText: data.extractedText,
          previewUrl: data.previewUrl
        });
      } else {
        const error = await res.json();
        alert(`Upload error: ${error.error}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Speech-to-text voice recognition logic using native Web Speech
  const toggleSpeechRecognition = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setSpeechSupportError('Web Speech Recognition API is not supported in this browser. Please try Chrome/Edge.');
      setTimeout(() => setSpeechSupportError(null), 4000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognitionClass();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      if (resultText) {
        setInputText((prev) => prev + (prev ? ' ' : '') + resultText);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  // Text-to-speech speaker logic
  const handleSpeakResponse = async (text: string, msgId: string) => {
    // If already playing this, pause it
    if (activeSpeechMsgId === msgId) {
      audioRef.current?.pause();
      setActiveSpeechMsgId(null);
      return;
    }

    try {
      setActiveSpeechMsgId(msgId);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: preferences.currentVoice
        })
      });

      if (res.ok) {
        const data = await res.json();
        const base64Audio = data.audioBase64;
        
        // Convert base64 to Blob URL
        const binaryString = window.atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        setAudioBlobUrl(url);
        
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          audioRef.current.onended = () => {
            setActiveSpeechMsgId(null);
          };
        }
      }
    } catch (err) {
      console.error('Failed to speak text:', err);
      setActiveSpeechMsgId(null);
    }
  };

  // Copy individual message text to clipboard
  const handleCopyText = async (text: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2500);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  // Submit conversational query
  const handleSubmitPrompt = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const activePrompt = customPrompt || inputText;
    if (!activePrompt.trim() || loading || !currentThreadId) return;

    setInputText('');
    setLoading(true);

    // Sync input text UI thread instantly
    const simulatedUserMsg: Message = {
      id: 'sim_u',
      role: 'user',
      content: activePrompt,
      timestamp: new Date().toISOString(),
      file: attachedFile || undefined
    };

    setCurrentThread((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, simulatedUserMsg]
      };
    });

    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: currentThreadId,
          prompt: activePrompt,
          history: currentThread ? currentThread.messages : [],
          searchGrounding,
          modelId: selectedModel,
          temperature: preferences.temperature,
          attachedFile
        })
      });

      if (chatRes.ok) {
        const data = await chatRes.json();
        
        // Reload detail of thread
        const detailRes = await fetch(`/api/threads/${currentThreadId}`);
        if (detailRes.ok) {
          const fullThread = await detailRes.json();
          setCurrentThread(fullThread);

          // Refresh sidebar list
          const listRes = await fetch('/api/threads');
          if (listRes.ok) {
            const listData = await listRes.json();
            setThreads(listData);
          }

          // Auto play the model response if preferences dictate
          if (preferences.voiceEnabled && preferences.autoSpeak) {
            const lastMsg = fullThread.messages[fullThread.messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              handleSpeakResponse(lastMsg.content, lastMsg.id);
            }
          }
        }
        setAttachedFile(null); // Reset attachments
      } else {
        const errData = await chatRes.json();
        alert(`Error: ${errData.error}`);
        // Reset simulated message on failure
        const fullRes = await fetch(`/api/threads/${currentThreadId}`);
        if (fullRes.ok) {
          setCurrentThread(await fullRes.json());
        }
      }
    } catch (err: any) {
      console.error('Dispatch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Quick Starter Cards click
  const handleQuickStarter = (starterText: string, requireSearch: boolean) => {
    if (requireSearch) {
      setSearchGrounding(true);
      handleSyncThreadConfig(selectedModel, true);
    }
    handleSubmitPrompt(undefined, starterText);
  };

  return (
    <div className="flex h-screen w-full bg-linear-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950 text-neutral-800 dark:text-neutral-100 overflow-hidden font-sans">
      
      {/* Hidden audio tag for TTS generation playback */}
      <audio ref={audioRef} className="hidden" />

      {/* Main Drawer Navigation Column */}
      <Sidebar
        threads={threads}
        currentThreadId={currentThreadId}
        onSelectThread={setCurrentThreadId}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
        onOpenSettings={() => setShowSettings(true)}
        onOpenMemory={() => setShowMemory(true)}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Panel Content screen */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header navbar */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-900 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-md z-30 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 md:hidden rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              title="Expand conversation list"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-neutral-700 dark:text-neutral-300 hidden md:inline">Core Engine</span>
              
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isPaid ? '✦' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search grounded quick indication state */}
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1 md:py-1.5 rounded-full border text-xs font-semibold select-none transition-colors ${searchGrounding ? 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-neutral-100/50 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400'}`}
              title="Internet search status"
            >
              <Search className="h-3 w-3" />
              <span>Web Search: {searchGrounding ? 'On' : 'Off'}</span>
            </div>

            {/* Config quick triggers */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              title="Tuning settings"
            >
              <Sliders className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Floating Error Notice banner */}
        {speechSupportError && (
          <div className="mx-6 mt-4 p-3 rounded-lg border border-rose-200 bg-rose-50/70 dark:bg-rose-950/20 text-xs font-medium text-rose-600 dark:text-rose-400 transition-all flex items-center gap-2">
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span>{speechSupportError}</span>
          </div>
        )}

        {/* Conversation Dialog body */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 scrollbar-thin">
          {!currentThread || currentThread.messages.length === 0 ? (
            /* Intro Screen (Empty State) */
            <div className="max-w-2xl mx-auto h-full flex flex-col justify-center select-none py-12">
              <div className="text-center space-y-4 mb-10">
                <div className="inline-flex h-14 w-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/15 items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                    Cognitive Assistant
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                    A multi-model AI system with real-time web search citations, semantic memories, and document ingestion.
                  </p>
                </div>
              </div>

              {/* Quick Starters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  onClick={() => handleQuickStarter("Search web for recent news on Mars exploratory robotics and outline what was discovered", true)}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 hover:bg-neutral-100/40 dark:hover:bg-neutral-900 transition-all cursor-pointer shadow-xs scale-98 active:scale-95 group text-left"
                >
                  <Search className="h-4 w-4 mb-2 text-indigo-500" />
                  <h4 className="font-semibold text-[13px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                    Mars Exploration News
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1 lines-2">Analyze real-time search events and return cites.</p>
                </div>

                <div 
                  onClick={() => handleQuickStarter("Explain quantum computing in extremely easy terms with a structured analogy", false)}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 hover:bg-neutral-100/40 dark:hover:bg-neutral-900 transition-all cursor-pointer shadow-xs scale-98 active:scale-95 group text-left"
                >
                  <Brain className="h-4 w-4 mb-2 text-indigo-500" />
                  <h4 className="font-semibold text-[13px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                    Quantum Analogy
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1 lines-2">Break down deep reasoning concepts into human metaphors.</p>
                </div>

                <div 
                  onClick={() => handleQuickStarter("Generate a complete Python script to fetch price index changes, parsing arrays with pandas", false)}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 hover:bg-neutral-100/40 dark:hover:bg-neutral-900 transition-all cursor-pointer shadow-xs scale-98 active:scale-95 group text-left"
                >
                  <Sliders className="h-4 w-4 mb-2 text-indigo-500" />
                  <h4 className="font-semibold text-[13px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                    Python Price Tracker
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1 lines-2">Generate optimized algorithms with rich code explanation.</p>
                </div>

                <div 
                  onClick={() => handleQuickStarter("Guide me step-by-step on debugging React re-rendering issues and provide a stabilized state hook pattern", false)}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40 hover:bg-neutral-100/40 dark:hover:bg-neutral-900 transition-all cursor-pointer shadow-xs scale-98 active:scale-95 group text-left"
                >
                  <HelpCircle className="h-4 w-4 mb-2 text-indigo-500" />
                  <h4 className="font-semibold text-[13px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                    Debug React Hook
                    <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1 lines-2">Audit framework render cycles with optimal patterns.</p>
                </div>
              </div>
            </div>
          ) : (
            /* Message listing */
            <div className="max-w-3xl mx-auto space-y-6">
              {currentThread.messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} gap-1.5`}>
                  
                  {/* Sender title banner */}
                  <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase px-1 select-none">
                    {m.role === 'user' ? 'Client' : `${m.role === 'assistant' ? 'Assistant' : 'System'}`}
                  </span>

                  {/* Bubble Container */}
                  <div className={`group relative w-full rounded-2xl p-4 md:p-5 border transition-all ${m.role === 'user' ? 'bg-indigo-50/40 dark:bg-indigo-950/15 border-indigo-100 dark:border-indigo-950/60 text-neutral-800 dark:text-neutral-100' : 'bg-neutral-50 dark:bg-neutral-950/40 border-neutral-100 dark:border-neutral-900'}`}>
                    
                    {/* User file attachments if present */}
                    {m.file && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-200/50 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-3 block select-none">
                        {m.file.type.startsWith('image/') ? (
                          <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        )}
                        <span className="truncate max-w-[150px]">{m.file.name}</span>
                        <span className="text-[10px] opacity-60">({(m.file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}

                    {/* Content Rendering block */}
                    {m.role === 'assistant' ? (
                      <MarkdownRenderer content={m.content} />
                    ) : (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    )}

                    {/* Citation block for Perplexity-style web searches */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-5 border-t border-neutral-100 dark:border-neutral-900 pt-4 animate-fade-in select-none">
                        <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2.5 flex items-center gap-1">
                          <Search className="h-3 w-3" /> Grounded Search Citations
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {m.sources.map((src) => (
                            <a
                              key={src.url}
                              href={src.url}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-800 bg-linear-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-950 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-neutral-600 dark:text-neutral-400 group shadow-xs hover:shadow-xs"
                            >
                              <span className="h-4 w-4 rounded bg-neutral-100 dark:bg-neutral-900 font-mono text-[10px] flex items-center justify-center font-bold text-neutral-500 border border-neutral-200 dark:border-neutral-800 select-none">
                                {src.index || 1}
                              </span>
                              <span className="truncate max-w-[120px]">{src.title}</span>
                              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Panel items footer (appear on hover) */}
                    {m.role === 'assistant' && (
                      <div className="mt-4 flex items-center gap-2 self-start animate-fade-in text-neutral-400">
                        <button
                          onClick={() => handleCopyText(m.content, m.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors select-none"
                          title="Copy reply text"
                        >
                          {copiedMessageId === m.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy text</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleSpeakResponse(m.content, m.id)}
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors select-none ${activeSpeechMsgId === m.id ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-neutral-600 dark:hover:text-neutral-200'}`}
                          title={activeSpeechMsgId === m.id ? 'Stop voice readout' : 'Voice audio synthesizer'}
                        >
                          {activeSpeechMsgId === m.id ? (
                            <>
                              <VolumeX className="h-3 w-3 text-indigo-500 animate-pulse" />
                              <span className="text-indigo-500 font-bold">Mute readout</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" />
                              <span>Listen audio</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              ))}

              {/* Loader indicator turn details */}
              {loading && (
                <div className="flex flex-col items-start gap-1.5">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest pl-1 select-none flex items-center gap-1">
                    <Loader className="h-3 w-3 animate-spin text-neutral-400" />
                    Synthesizing reply...
                  </span>
                  <div className="w-full bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl p-5 border border-dashed border-neutral-300 dark:border-neutral-800">
                    <div className="flex flex-col gap-2.5">
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-900 rounded-lg w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-900 rounded-lg w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Dynamic Drag and drop area block overlay */}
        {uploadingFile && (
          <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none select-none select-none">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col items-center gap-3 shadow-2xl animate-scale-in">
              <Loader className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 leading-none">Scanning document corpus...</p>
            </div>
          </div>
        )}

        {/* Input tray panel footer */}
        <footer className="px-4 md:px-8 py-4 bg-linear-to-t from-white to-transparent dark:from-neutral-950">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmitPrompt} className="relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-2 shadow-lg hover:shadow-xl transition-all">
              
              {/* Attachment Pill Capsule preview display */}
              {attachedFile && (
                <div className="flex items-center justify-between gap-1.5 px-3 py-2 border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/15 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2 select-none animate-scale-in">
                  <div className="flex items-center gap-2 min-w-0">
                    {attachedFile.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 shrink-0 text-indigo-500" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                    )}
                    <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                    <span className="text-[10px] opacity-60 font-semibold text-neutral-400">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Text Area layout box */}
              <div className="flex items-center">
                <textarea
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitPrompt();
                    }
                  }}
                  disabled={loading || !currentThreadId}
                  placeholder={
                    !currentThreadId 
                      ? 'Create discussion thread first...' 
                      : searchGrounding 
                        ? 'Submit query with real-time Perplexity-style web indexing...' 
                        : 'Submit standard prompt or upload PDF/images...'
                  }
                  className="flex-1 min-h-[38px] max-h-36 py-2 px-3 text-sm focus:outline-none bg-transparent placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-800 dark:text-neutral-200 leading-relaxed resize-none font-sans scrollbar-thin overflow-y-auto"
                />
              </div>

              {/* Tool Tray operations row */}
              <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-900 pt-2 px-2.5 select-none shrink-0">
                
                {/* Left controls: Toggles web grounding, files, recognition */}
                <div className="flex items-center gap-1.5">
                  
                  {/* Paperclip attach */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.txt,.csv,image/*"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || !currentThreadId}
                    className="p-2 rounded-xl text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50 shrink-0"
                    title="Upload context document: PDF, Word, TXT, CSV, or Image"
                  >
                    <Paperclip className="h-4.5 w-4.5" />
                  </button>

                  {/* Speech to text */}
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    disabled={loading || !currentThreadId}
                    className={`p-2 rounded-xl transition-all disabled:opacity-50 shrink-0 ${isListening ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400 animate-pulse font-bold' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
                    title={isListening ? 'Stop recording voice dictation' : 'Speech-to-text voice input'}
                  >
                    {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                  </button>

                  {/* Perplexity-style toggle */}
                  <button
                    type="button"
                    onClick={() => handleSearchToggle(!searchGrounding)}
                    disabled={loading || !currentThreadId}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold select-none transition-all ${searchGrounding ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-900 text-indigo-400' : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-500'}`}
                    title="Toggle Google Search Real-Time Citations"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Search Web</span>
                  </button>

                </div>

                {/* Right controls: Submit arrow */}
                <button
                  type="submit"
                  disabled={loading || !inputText.trim() || !currentThreadId}
                  className="p-2 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-400 dark:disabled:text-neutral-600 transition-colors shadow-xs"
                >
                  <span>Submit</span>
                  <Send className="h-3.5 w-3.5" />
                </button>

              </div>

            </form>
            <p className="text-[10px] text-neutral-400 text-center mt-2.5 select-none">
              Answers are generated using Google Gemini & live searches. Citation list items point directly to original indexed pages.
            </p>
          </div>
        </footer>

      </div>

      {/* MODAL WINDOWS */}
      {showSettings && (
        <PreferencesModal
          preferences={preferences}
          onClose={() => setShowSettings(false)}
          onUpdate={handleUpdatePreferences}
        />
      )}

      {showMemory && (
        <MemoryManager
          onClose={() => setShowMemory(false)}
        />
      )}

    </div>
  );
}
