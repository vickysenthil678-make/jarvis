import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = 'javascript' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <div className="relative group my-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-900 overflow-hidden font-mono text-sm leading-relaxed text-neutral-100 shadow-sm max-w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950 border-b border-neutral-800 select-none">
        <span className="text-xs font-semibold text-neutral-400 capitalize tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-md transition-colors"
          title="Copy signature"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400 animate-scale-in" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="overflow-x-auto p-4 scrollbar-thin scrollbar-thumb-neutral-800">
        <pre><code className="block select-text">{code.trim()}</code></pre>
      </div>
    </div>
  );
}
