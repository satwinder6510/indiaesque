"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { marked } from "marked";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onAutoSave?: (value: string) => void;
  autoSaveInterval?: number; // in milliseconds
  placeholder?: string;
  disabled?: boolean;
}

type ViewMode = "edit" | "preview" | "split";

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function MarkdownEditor({
  value,
  onChange,
  onAutoSave,
  autoSaveInterval = 30000, // 30 seconds default
  placeholder = "Write your content in markdown...",
  disabled = false,
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedValue = useRef(value);

  // Calculate stats
  const wordCount = value.split(/\s+/).filter(w => w).length;
  const charCount = value.length;
  const readingTime = Math.ceil(wordCount / 200); // Average reading speed

  // Auto-save functionality
  useEffect(() => {
    if (!onAutoSave || !isDirty || disabled) return;

    const timer = setTimeout(() => {
      if (value !== lastSavedValue.current) {
        onAutoSave(value);
        lastSavedValue.current = value;
        setLastSavedAt(new Date());
        setIsDirty(false);
      }
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [value, isDirty, onAutoSave, autoSaveInterval, disabled]);

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      setIsDirty(true);
    },
    [onChange]
  );

  // Insert markdown formatting
  const insertFormat = useCallback(
    (before: string, after: string = before, placeholder: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || placeholder;

      const newValue =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      handleChange(newValue);

      // Set cursor position after insertion
      setTimeout(() => {
        textarea.focus();
        const cursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    },
    [value, handleChange]
  );

  const toolbarButtons = [
    { icon: "B", action: () => insertFormat("**", "**", "bold text"), title: "Bold (Ctrl+B)" },
    { icon: "I", action: () => insertFormat("*", "*", "italic text"), title: "Italic (Ctrl+I)" },
    { icon: "H1", action: () => insertFormat("\n# ", "\n", "Heading"), title: "Heading 1" },
    { icon: "H2", action: () => insertFormat("\n## ", "\n", "Heading"), title: "Heading 2" },
    { icon: "H3", action: () => insertFormat("\n### ", "\n", "Heading"), title: "Heading 3" },
    { icon: "Link", action: () => insertFormat("[", "](url)", "link text"), title: "Link" },
    { icon: "List", action: () => insertFormat("\n- ", "\n", "list item"), title: "Bullet List" },
    { icon: "1.", action: () => insertFormat("\n1. ", "\n", "list item"), title: "Numbered List" },
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textareaRef.current || document.activeElement !== textareaRef.current) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            insertFormat("**", "**", "bold text");
            break;
          case "i":
            e.preventDefault();
            insertFormat("*", "*", "italic text");
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [insertFormat]);

  const renderMarkdown = () => {
    try {
      return marked(value) as string;
    } catch {
      return "<p>Error rendering markdown</p>";
    }
  };

  return (
    <div className="bg-[var(--background-card)] rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)]">
        <div className="flex items-center gap-1">
          {toolbarButtons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              disabled={disabled || viewMode === "preview"}
              title={btn.title}
              className="px-2 py-1 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded transition-colors disabled:opacity-50"
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-[var(--background-card)] p-0.5 rounded-lg border border-[var(--border)]">
          {(["edit", "split", "preview"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === mode
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className={`flex-1 flex ${viewMode === "split" ? "divide-x divide-[var(--border)]" : ""}`} style={{ minHeight: "500px" }}>
        {/* Editor */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={`flex-1 ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              disabled={disabled}
              placeholder={placeholder}
              className="w-full h-full p-4 bg-transparent text-[var(--foreground)] font-mono text-sm resize-none focus:outline-none"
              style={{ minHeight: "500px" }}
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={`flex-1 ${viewMode === "split" ? "w-1/2" : "w-full"} overflow-y-auto`}>
            <div
              className="p-4 prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
            />
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--foreground-muted)] bg-[var(--background)]">
        <div className="flex items-center gap-4">
          <span>{wordCount.toLocaleString()} words</span>
          <span>{charCount.toLocaleString()} characters</span>
          <span>{readingTime} min read</span>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && <span className="text-yellow-500">Unsaved changes</span>}
          {lastSavedAt && !isDirty && (
            <span className="text-green-500">
              Saved {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
