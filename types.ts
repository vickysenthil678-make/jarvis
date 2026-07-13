export interface SourceCitation {
  title: string;
  url: string;
  index?: number;
}

export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  extractedText?: string;
  previewUrl?: string; // for image base64
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: SourceCitation[];
  file?: AttachedFile;
  audioBase64?: string; // Optional TTS generation
  isThinking?: boolean; // UI flag
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  searchGrounding: boolean;
  createdAt: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  timestamp: string;
  embedding?: number[];
  associatedThreadId?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  voiceEnabled: boolean;
  currentVoice: 'Kore' | 'Zephyr' | 'Charon' | 'Puck' | 'Fenrir';
  autoSpeak: boolean;
  temperature: number;
}

export interface AIModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  isPaid: boolean;
  capabilities: string[];
}

export const AVAILABLE_MODELS: AIModelInfo[] = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'Google',
    description: 'Fast, highly efficient, intelligent general-purpose model with real-time web search grounding.',
    isPaid: false,
    capabilities: ['Chat', 'Search', 'Vision', 'Multimodal']
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Preview)',
    provider: 'Google',
    description: 'Premier reasoning core for coding, highly complex logical tasks, and precise analyses.',
    isPaid: true,
    capabilities: ['Chat', 'Reasoning', 'Coding', 'Multi-turn']
  }
];
