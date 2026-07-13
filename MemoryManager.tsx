import { useState, useEffect } from 'react';
import { X, Brain, Trash2, Plus, Sparkles, Loader } from 'lucide-react';
import { MemoryItem } from '../types';

interface MemoryManagerProps {
  onClose: () => void;
}

export default function MemoryManager({ onClose }: MemoryManagerProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Fetch memories from API
  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMemoryText.trim() }),
      });
      if (res.ok) {
        setNewMemoryText('');
        fetchMemories();
      }
    } catch (err) {
      console.error('Failed to create memory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl animate-scale-in max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 px-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">Long-term AI Memory</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">View facts and details stored semantically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-950/20 rounded-xl p-3 mb-4 flex items-start gap-2.5 shrink-0">
          <Sparkles className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
          <p className="text-[12px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            Memories are automatically embedded with <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">gemini-embedding-2-preview</span> to retrieve critical contextual details on relevant chat turns.
          </p>
        </div>

        {/* Form to manual add */}
        <form onSubmit={handleAddMemory} className="flex gap-2 mb-4 shrink-0">
          <input
            type="text"
            placeholder="Remember: I am learning Go, or I have a cat named Whiskers"
            value={newMemoryText}
            onChange={(e) => setNewMemoryText(e.target.value)}
            disabled={loading}
            className="flex-1 bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !newMemoryText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 select-none shadow-xs transition-colors"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>Remember</span>
          </button>
        </form>

        {/* List of Memories */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[160px] scrollbar-thin">
          {fetching ? (
            <div className="h-full flex flex-col justify-center items-center py-10 gap-2">
              <Loader className="h-5 w-5 animate-spin text-neutral-400 animate-pulse" />
              <span className="text-xs text-neutral-400 font-medium">Recalling saved memories...</span>
            </div>
          ) : memories.length === 0 ? (
            <div className="h-full flex flex-col text-center justify-center items-center py-12 px-4">
              <div className="w-10 h-10 rounded-full border border-dashed border-neutral-300 dark:border-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                <Brain className="h-5 w-5 text-neutral-300 dark:text-neutral-700" />
              </div>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Memory index is empty</p>
              <p className="text-xs text-neutral-400 max-w-xs mt-1">Specify new details above or chat with the assistant to establish personalized context.</p>
            </div>
          ) : (
            memories.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3 p-3.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-900 rounded-xl transition-all hover:bg-neutral-100/50 dark:hover:bg-neutral-950"
              >
                <div className="space-y-1">
                  <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-normal">{m.content}</p>
                  <p className="text-[10px] font-mono text-neutral-400">
                    Saved {new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteMemory(m.id)}
                  className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 rounded-lg transition-colors shrink-0"
                  title="Forget memory"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
