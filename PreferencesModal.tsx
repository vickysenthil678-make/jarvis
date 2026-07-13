import { X, Moon, Sun, Volume2, Sliders } from 'lucide-react';
import { UserPreferences } from '../types';

interface PreferencesModalProps {
  preferences: UserPreferences;
  onClose: () => void;
  onUpdate: (updated: Partial<UserPreferences>) => void;
}

const VOICES = [
  { id: 'Zephyr', name: 'Zephyr (Deep & Cool)' },
  { id: 'Kore', name: 'Kore (Balanced & Professional)' },
  { id: 'Charon', name: 'Charon (Warm & Friendly)' },
  { id: 'Puck', name: 'Puck (Lively & Animated)' },
  { id: 'Fenrir', name: 'Fenrir (Vibrant & Expressive)' },
];

export default function PreferencesModal({ preferences, onClose, onUpdate }: PreferencesModalProps) {
  const toggleTheme = () => {
    onUpdate({ theme: preferences.theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">Settings & Tuning</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-6">
          {/* Theme Setup */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Visual Mode</label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Choose between light and dark canvas</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm font-medium text-neutral-800 dark:text-neutral-200 transition-all shadow-xs"
            >
              {preferences.theme === 'light' ? (
                <>
                  <Moon className="h-4 w-4" />
                  <span>Dark Theme</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>Light Theme</span>
                </>
              )}
            </button>
          </div>

          <hr className="border-neutral-100 dark:border-neutral-800" />

          {/* Voice Speech setup */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Volume2 className="h-4 w-4 text-indigo-500" />
                  Voice Assist TTS
                </label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Synthesize human audio answers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.voiceEnabled}
                  onChange={(e) => onUpdate({ voiceEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {preferences.voiceEnabled && (
              <div className="grid gap-2 animate-fade-in pl-1">
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Prebuilt Speaking Voice</label>
                <select
                  value={preferences.currentVoice}
                  onChange={(e) => onUpdate({ currentVoice: e.target.value as any })}
                  className="w-full text-sm px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-2 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.autoSpeak}
                    onChange={(e) => onUpdate({ autoSpeak: e.target.checked })}
                    className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Automatically play audio voice summaries on query completion</span>
                </label>
              </div>
            )}
          </div>

          <hr className="border-neutral-100 dark:border-neutral-800" />

          {/* Model Temperature config */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Model Temperature</label>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                {preferences.temperature}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={preferences.temperature}
              onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
              className="w-full h-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Precise & Analytical</span>
              <span>Creative & Imaginative</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-lg shadow-sm transition-all"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
