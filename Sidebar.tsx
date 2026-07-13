import { Brain, Plus, MessageSquare, Trash2, Sliders, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChatThread } from '../types';

interface SidebarProps {
  threads: any[];
  currentThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteThread: (id: string) => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function Sidebar({
  threads,
  currentThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onOpenSettings,
  onOpenMemory,
  isOpen,
  onToggleOpen,
}: SidebarProps) {
  return (
    <div className={`relative flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-900 transition-all duration-300 select-none shrink-0 ${isOpen ? 'w-64 md:w-72' : 'w-0 overflow-hidden'}`}>
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-900">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-black text-sm">
            AI
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">Cognitive Core</h1>
            <span className="text-[10px] text-green-500 font-mono tracking-wider font-semibold uppercase flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Synchronized
            </span>
          </div>
        </div>
      </div>

      {/* Spawners */}
      <div className="p-3">
        <button
          onClick={onNewThread}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 bg-linear-to-r hover:bg-linear-to-br shadow-sm transition-all shadow-indigo-100 dark:shadow-none"
        >
          <Plus className="h-4 w-4" />
          <span>New Discussion</span>
        </button>
      </div>

      {/* Mid Sections: Thread lists */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5 scrollbar-thin">
        <div className="px-2 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase mb-1">
          Discussions
        </div>
        
        {threads.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            No active discussions
          </div>
        ) : (
          threads.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectThread(t.id)}
              className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-all ${t.id === currentThreadId ? 'bg-neutral-200/60 dark:bg-neutral-900 font-medium text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900/40'}`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                <MessageSquare className={`h-4 w-4 shrink-0 ${t.id === currentThreadId ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 group-hover:text-neutral-500'}`} />
                <span className="truncate text-[13px]">{t.title}</span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteThread(t.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-rose-500 text-neutral-400 p-0.5 rounded-md hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all shrink-0"
                title="Delete thread"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-900 space-y-1 bg-neutral-100/50 dark:bg-neutral-950/20">
        <button
          onClick={onOpenMemory}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-900/60 transition-colors"
        >
          <Brain className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
          <span>Long-term memory</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-900/60 transition-colors"
        >
          <Sliders className="h-4.5 w-4.5 text-neutral-500 shrink-0" />
          <span>Settings & Tuning</span>
        </button>
      </div>

      {/* Floating Panel Tab Open/Close Button */}
      <button
        onClick={onToggleOpen}
        className="absolute top-1/2 -right-3.5 z-10 hidden md:flex items-center justify-center p-0.5 w-3.5 h-16 bg-neutral-200 dark:bg-neutral-900 rounded-r-lg border border-l-0 border-neutral-300 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer shadow-sm"
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
    </div>
  );
}
