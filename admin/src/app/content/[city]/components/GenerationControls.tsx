"use client";

import { useState, useEffect } from "react";

interface GenerationConfig {
  tone: string;
  wordCount: number;
  keywords: string[];
}

interface GenerationControlsProps {
  defaults?: GenerationConfig;
  selectedQuestionCount: number;
  onGenerate: (config: GenerationConfig) => void;
  onSaveDefaults: (config: GenerationConfig) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const TONE_OPTIONS = [
  { value: "conversational", label: "Conversational", description: "Friendly, like chatting with a friend" },
  { value: "professional", label: "Professional", description: "Authoritative and well-researched" },
  { value: "enthusiastic", label: "Enthusiastic", description: "Vivid, passionate, and exciting" },
  { value: "practical", label: "Practical", description: "No-nonsense, actionable advice" },
  { value: "storytelling", label: "Storytelling", description: "Narrative style, paints vivid pictures" },
];

const WORD_COUNT_OPTIONS = [
  { value: 500, label: "500" },
  { value: 1000, label: "1,000" },
  { value: 1500, label: "1,500" },
  { value: 2000, label: "2,000" },
  { value: 2500, label: "2,500" },
  { value: 3000, label: "3,000" },
  { value: 3500, label: "3,500" },
  { value: 4000, label: "4,000" },
  { value: 4500, label: "4,500" },
  { value: 5000, label: "5,000" },
];

export default function GenerationControls({
  defaults,
  selectedQuestionCount,
  onGenerate,
  onSaveDefaults,
  isGenerating,
  disabled = false,
}: GenerationControlsProps) {
  const [tone, setTone] = useState(defaults?.tone || "conversational");
  const [wordCount, setWordCount] = useState(defaults?.wordCount || 3500);
  const [keywordsInput, setKeywordsInput] = useState(defaults?.keywords?.join(", ") || "");
  const [saveAsDefaults, setSaveAsDefaults] = useState(false);

  // Update local state when defaults change
  useEffect(() => {
    if (defaults) {
      setTone(defaults.tone);
      setWordCount(defaults.wordCount);
      setKeywordsInput(defaults.keywords?.join(", ") || "");
    }
  }, [defaults]);

  const handleGenerate = () => {
    const keywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const config: GenerationConfig = {
      tone,
      wordCount,
      keywords,
    };

    if (saveAsDefaults) {
      onSaveDefaults(config);
    }

    onGenerate(config);
  };

  const selectedTone = TONE_OPTIONS.find((t) => t.value === tone);

  return (
    <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-[var(--foreground)] mb-1">AI Generation Settings</h3>
        <p className="text-sm text-[var(--foreground-muted)]">
          Configure how the AI generates your content
        </p>
      </div>

      {/* Tone Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Content Tone
        </label>
        <div className="relative">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            disabled={disabled || isGenerating}
            className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] appearance-none cursor-pointer disabled:opacity-50"
          >
            {TONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {selectedTone && (
          <p className="text-xs text-[var(--foreground-muted)] mt-1.5">{selectedTone.description}</p>
        )}
      </div>

      {/* Word Count Slider */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Target Word Count: <span className="text-[var(--primary)]">{wordCount.toLocaleString()}</span>
        </label>
        <input
          type="range"
          min={500}
          max={5000}
          step={500}
          value={wordCount}
          onChange={(e) => setWordCount(parseInt(e.target.value))}
          disabled={disabled || isGenerating}
          className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((wordCount - 500) / 4500) * 100}%, var(--border) ${((wordCount - 500) / 4500) * 100}%, var(--border) 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-[var(--foreground-muted)] mt-1">
          <span>500</span>
          <span>5,000</span>
        </div>
      </div>

      {/* Keywords Input */}
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
          Target Keywords
        </label>
        <input
          type="text"
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
          disabled={disabled || isGenerating}
          placeholder="e.g., budget travel, street food, heritage sites"
          className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] disabled:opacity-50"
        />
        <p className="text-xs text-[var(--foreground-muted)] mt-1.5">
          Separate keywords with commas. These will be naturally incorporated into the content.
        </p>
      </div>

      {/* Save as defaults */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={saveAsDefaults}
          onChange={(e) => setSaveAsDefaults(e.target.checked)}
          disabled={disabled || isGenerating}
          className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)]"
        />
        <span className="text-sm text-[var(--foreground)]">Save as defaults for this hub</span>
      </label>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={disabled || isGenerating || selectedQuestionCount === 0}
        className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating Content...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Content
            {selectedQuestionCount > 0 && (
              <span className="text-sm opacity-80">({selectedQuestionCount} questions)</span>
            )}
          </>
        )}
      </button>

      {selectedQuestionCount === 0 && (
        <p className="text-xs text-center text-yellow-600 dark:text-yellow-400">
          Select at least one PAA question to generate content
        </p>
      )}
    </div>
  );
}
