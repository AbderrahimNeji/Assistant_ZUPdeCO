"use client";

import {
  BookOpen,
  FileText,
  GraduationCap,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ChatSuggestion = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Text inserted into the composer when selected. */
  prompt: string;
};

export const DEFAULT_CHAT_SUGGESTIONS: ChatSuggestion[] = [
  {
    id: "tutor",
    label: "Become a tutor",
    description: "Learn how volunteer tutoring works",
    icon: GraduationCap,
    prompt:
      "How can I become a volunteer tutor with ZUPdeCO?",
  },
  {
    id: "documents",
    label: "Find a document",
    description: "Ask about knowledge-base resources",
    icon: FileText,
    prompt: "Help me find a document in the knowledge base about tutoring.",
  },
  {
    id: "program",
    label: "Explore programs",
    description: "Understand HomeClasse and mentoring",
    icon: BookOpen,
    prompt: "Explain the HomeClasse and mentoring programs.",
  },
  {
    id: "enroll",
    label: "Enroll a student",
    description: "Get guidance on family registration",
    icon: HeartHandshake,
    prompt: "What are the steps to enroll a student with ZUPdeCO?",
  },
];

type SuggestionCardProps = {
  suggestion: ChatSuggestion;
  onSelect?: (suggestion: ChatSuggestion) => void;
};

export function SuggestionCard({ suggestion, onSelect }: SuggestionCardProps) {
  const Icon = suggestion.icon;
  const label = `${suggestion.label}: ${suggestion.description}`;
  const className = cn(
    "flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card ednov-transition",
    onSelect
      ? "hover:border-brand-orange/45 hover:bg-brand-peach/40 hover:-translate-y-0.5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none active:translate-y-0"
      : "cursor-default",
  );

  const content = (
    <>
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-peach text-brand-orange">
        <Icon className="size-5 stroke-[1.75]" aria-hidden />
      </span>
      <span className="space-y-1">
        <span className="block font-display text-sm font-semibold text-foreground">
          {suggestion.label}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground">
          {suggestion.description}
        </span>
      </span>
    </>
  );

  if (!onSelect) {
    return (
      <div className={className} aria-label={label}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
      aria-label={`Use suggestion: ${suggestion.label}`}
      className={className}
    >
      {content}
    </button>
  );
}

type ChatWelcomeProps = {
  suggestions?: ChatSuggestion[];
  onSuggestionSelect?: (suggestion: ChatSuggestion) => void;
  className?: string;
};

export function ChatWelcome({
  suggestions = DEFAULT_CHAT_SUGGESTIONS,
  onSuggestionSelect,
  className,
}: ChatWelcomeProps) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center gap-8 px-2 py-8 text-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5">
        <div
          className="relative flex size-20 items-center justify-center rounded-2xl bg-brand-orange text-white shadow-glow"
          aria-hidden
        >
          <svg
            viewBox="0 0 48 48"
            className="size-10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 18c0-5.523 4.477-10 10-10h4c5.523 0 10 4.477 10 10v2c0 5.523-4.477 10-10 10h-1.2L18 36v-6.2C14.5 28.2 12 24.4 12 20v-2z"
              fill="currentColor"
              opacity="0.95"
            />
            <circle cx="20" cy="20" r="1.8" fill="#1f2f55" />
            <circle cx="28" cy="20" r="1.8" fill="#1f2f55" />
            <path
              d="M20 25c1.4 1.2 6.6 1.2 8 0"
              stroke="#1f2f55"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="max-w-lg space-y-3">
          <h2 className="ednov-title md:text-3xl">
            How can I help you today?
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Your ZUPdeCO AI assistant for documents, tutoring workflows,
            and platform guidance. Choose a suggestion or type your own question
            below — a conversation will be created when you send.
          </p>
        </div>
      </div>

      <ul
        className="grid w-full gap-3 sm:grid-cols-2"
        aria-label="Suggested prompts"
      >
        {suggestions.map((suggestion) => (
          <li key={suggestion.id} className="min-h-0">
            <SuggestionCard
              suggestion={suggestion}
              onSelect={onSuggestionSelect}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
