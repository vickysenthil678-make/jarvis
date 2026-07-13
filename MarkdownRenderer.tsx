import ReactMarkdown from 'react-markdown';
import CodeBlock from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none text-neutral-800 dark:text-neutral-200">
      <ReactMarkdown
        components={{
          // Match and replace code blocks
          code({ className, children, ...props }) {
            // Check if it is a block code or inline code
            const contentString = String(children);
            const isBlock = contentString.includes('\n') || className?.startsWith('language-');
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (isBlock) {
              return (
                <CodeBlock
                  code={contentString}
                  language={language || 'code'}
                />
              );
            }

            return (
              <code 
                className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-sm text-rose-600 dark:text-rose-400" 
                {...props}
              >
                {children}
              </code>
            );
          },
          // Format structural blocks beautifully
          h1: ({ children }) => <h1 className="text-xl md:text-2xl font-bold mt-6 mb-3 text-neutral-900 dark:text-white leading-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg md:text-xl font-semibold mt-5 mb-2 text-neutral-900 dark:text-white leading-snug">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base md:text-lg font-semibold mt-4 mb-2 text-neutral-800 dark:text-neutral-100">{children}</h3>,
          p: ({ children }) => <p className="mb-4 leading-relaxed text-neutral-700 dark:text-neutral-300 text-[15px]">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1.5 text-neutral-700 dark:text-neutral-300">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-neutral-700 dark:text-neutral-300">{children}</ol>,
          li: ({ children }) => <li className="pl-1 text-[15px]">{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-neutral-50 dark:bg-neutral-900">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-4 py-3 text-left font-medium text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 font-normal">{children}</td>,
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              referrerPolicy="no-referrer"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 italic my-4 text-neutral-600 dark:text-neutral-400 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-r-lg">
              {children}
            </blockquote>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
