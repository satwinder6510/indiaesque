"use client";

import { useState, useEffect, useMemo } from "react";
import { buildGeneratePrompt, buildExpandPrompt } from "@/lib/promptBuilder";

interface GenerationConfig {
  tone: string;
  wordCount: number;
  keywords: string[];
}

interface ExpandConfig {
  expandDirection: string;
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
  cityName: string;
  selectedQuestions: { question: string }[];
  existingContent: string;
  onExpand: (config: ExpandConfig) => void;
  isExpanding: boolean;
}

const TONE_OPTIONS = [
  { value: "conversational", label: "Conversational", description: "Friendly, like chatting with a friend" },
  { value: "professional", label: "Professional", description: "Authoritative and well-researched" },
  { value: "enthusiastic", label: "Enthusiastic", description: "Vivid, passionate, and exciting" },
  { value: "practical", label: "Practical", description: "No-nonsense, actionable advice" },
  { value: "storytelling", label: "Storytelling", description: "Narrative style, paints vivid pictures" },
];

export default function GenerationControls({
  defaults,
  selectedQuestionCount,
  onGenerate,
  onSaveDefaults,
  isGenerating,
  disabled = false,
  cityName,
  selectedQuestions,
  existingContent,
  onExpand,
  isExpanding,
}: GenerationControlsProps) {
  const [tone, setTone] = useState(defaults?.tone || "professional");
  const [wordCount, setWordCount] = useState(defaults?.wordCount || 3500);
  const [keywordsInput, setKeywordsInput] = useState(defaults?.keywords?.join(", ") || "");
  const [saveAsDefaults, setSaveAsDefaults] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Expand state
  const [expandDirection, setExpandDirection] = useState("");
  const [expandWordCount, setExpandWordCount] = useState(500);
  const [showExpandPromptPreview, setShowExpandPromptPreview] = useState(false);

  // Update local state when defaults change
  useEffect(() => {
    if (defaults) {
      setTone(defaults.tone);
      setWordCount(defaults.wordCount);
      setKeywordsInput(defaults.keywords?.join(", ") || "");
    }
  }, [defaults]);

  const parsedKeywords = useMemo(() => {
    return keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }, [keywordsInput]);

  const currentPrompt = useMemo(() => {
    if (selectedQuestions.length === 0) return "";
    return buildGeneratePrompt({
      cityName,
      tone,
      wordCount,
      keywords: parsedKeywords,
      questions: selectedQuestions,
    });
  }, [cityName, tone, wordCount, parsedKeywords, selectedQuestions]);

  const currentExpandPrompt = useMemo(() => {
    if (!existingContent || !expandDirection.trim()) return "";
    return buildExpandPrompt({
      cityName,
      existingContent,
      expandDirection,
      tone,
      targetAdditionalWords: expandWordCount,
      keywords: parsedKeywords,
    });
  }, [cityName, existingContent, expandDirection, tone, expandWordCount, parsedKeywords]);

  const handleGenerate = () => {
    const config: GenerationConfig = {
      tone,
      wordCount,
      keywords: parsedKeywords,
    };

    if (saveAsDefaults) {
      onSaveDefaults(config);
    }

    onGenerate(config);
  };

  const handleExpand = () => {
    onExpand({
      expandDirection,
      tone,
      wordCount: expandWordCount,
      keywords: parsedKeywords,
    });
  };

  const selectedTone = TONE_OPTIONS.find((t) => t.value === tone);
  const hasExistingContent = existingContent && existingContent.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Main Generation Card */}
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
              disabled={disabled || isGenerating || isExpanding}
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
            disabled={disabled || isGenerating || isExpanding}
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
            disabled={disabled || isGenerating || isExpanding}
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
            disabled={disabled || isGenerating || isExpanding}
            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)]"
          />
          <span className="text-sm text-[var(--foreground)]">Save as defaults for this hub</span>
        </label>

        {/* Prompt Preview */}
        {selectedQuestionCount > 0 && (
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[var(--background)] transition-colors"
            >
              <span className="text-sm font-medium text-[var(--foreground)]">
                View Prompt
              </span>
              <svg
                className={`w-4 h-4 text-[var(--foreground-muted)] transition-transform ${showPromptPreview ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showPromptPreview && (
              <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
                <pre className="text-xs text-[var(--foreground-muted)] whitespace-pre-wrap font-mono max-h-80 overflow-y-auto leading-relaxed">
                  {currentPrompt}
                </pre>
                <p className="text-xs text-[var(--foreground-muted)] mt-2 pt-2 border-t border-[var(--border)]">
                  {currentPrompt.split(/\s+/).length} words in prompt
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={disabled || isGenerating || isExpanding || selectedQuestionCount === 0}
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

      {/* Expand Content Card */}
      {hasExistingContent && (
        <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-[var(--foreground)] mb-1">Expand Existing Content</h3>
            <p className="text-sm text-[var(--foreground-muted)]">
              Add new sections or expand existing topics without duplicating content.
              Uses the tone and keywords settings above.
            </p>
          </div>

          {/* Expansion Direction */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              What should be added?
            </label>
            <textarea
              value={expandDirection}
              onChange={(e) => setExpandDirection(e.target.value)}
              disabled={disabled || isGenerating || isExpanding}
              rows={3}
              placeholder="e.g., Add a section about monsoon festivals, Expand the food section with vegetarian restaurants, Add practical visa information..."
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] disabled:opacity-50 resize-none"
            />
          </div>

          {/* Additional Words Slider */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Target additional words: <span className="text-green-600 dark:text-green-400">{expandWordCount.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min={200}
              max={2000}
              step={100}
              value={expandWordCount}
              onChange={(e) => setExpandWordCount(parseInt(e.target.value))}
              disabled={disabled || isGenerating || isExpanding}
              className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, #16a34a 0%, #16a34a ${((expandWordCount - 200) / 1800) * 100}%, var(--border) ${((expandWordCount - 200) / 1800) * 100}%, var(--border) 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-[var(--foreground-muted)] mt-1">
              <span>200</span>
              <span>2,000</span>
            </div>
          </div>

          {/* Expand Prompt Preview */}
          {expandDirection.trim() && (
            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowExpandPromptPreview(!showExpandPromptPreview)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[var(--background)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--foreground)]">
                  View Expand Prompt
                </span>
                <svg
                  className={`w-4 h-4 text-[var(--foreground-muted)] transition-transform ${showExpandPromptPreview ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showExpandPromptPreview && (
                <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
                  <pre className="text-xs text-[var(--foreground-muted)] whitespace-pre-wrap font-mono max-h-80 overflow-y-auto leading-relaxed">
                    {currentExpandPrompt}
                  </pre>
                  <p className="text-xs text-[var(--foreground-muted)] mt-2 pt-2 border-t border-[var(--border)]">
                    {currentExpandPrompt.split(/\s+/).length} words in prompt (includes existing content)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Expand Button */}
          <button
            onClick={handleExpand}
            disabled={disabled || isGenerating || isExpanding || !expandDirection.trim()}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isExpanding ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Expanding Content...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Expand Content
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
