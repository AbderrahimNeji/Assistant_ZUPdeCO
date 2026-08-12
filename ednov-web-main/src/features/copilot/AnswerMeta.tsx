import * as React from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  answerBadgeFor,
  deriveAnswerMode,
  formatCitationLabel,
} from './answerMode';
import {
  copilotApi,
  type ChatSourceAttribution,
  type CopilotAnswerMode,
  type FeedbackCategory,
  type FeedbackRating,
} from './copilot.api';

const FEEDBACK_CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: 'incorrect', label: 'Incorrect' },
  { id: 'missing', label: 'Incomplet' },
  { id: 'wrong_source', label: 'Mauvaise source' },
  { id: 'hallucination', label: 'Invention' },
  { id: 'too_long', label: 'Trop long' },
  { id: 'too_short', label: 'Trop court' },
  { id: 'slow', label: 'Lent' },
];

type Props = {
  messageId: string;
  sources?: ChatSourceAttribution[];
  answerMode?: CopilotAnswerMode | null;
  initialRating?: FeedbackRating | null;
  disabled?: boolean;
};

export const AnswerMeta: React.FC<Props> = ({
  messageId,
  sources,
  answerMode,
  initialRating,
  disabled,
}) => {
  const mode = deriveAnswerMode(sources, answerMode);
  const badge = answerBadgeFor(mode);
  const visibleSources = (sources ?? []).filter(
    (source) => source.kind !== 'documentation_kb',
  );
  const [rating, setRating] = React.useState<FeedbackRating | null>(
    initialRating ?? null,
  );
  const [categories, setCategories] = React.useState<FeedbackCategory[]>([]);
  const [comment, setComment] = React.useState('');
  const [openDetails, setOpenDetails] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isLocal = messageId.startsWith('local-');
  const canRate = !disabled && !isLocal;

  const submit = async (
    nextRating: FeedbackRating,
    nextCategories: FeedbackCategory[] = categories,
  ) => {
    if (!canRate) return;
    setSaving(true);
    setError(null);
    try {
      await copilotApi.submitFeedback({
        messageId,
        rating: nextRating,
        categories: nextCategories.length ? nextCategories : undefined,
        comment: comment.trim() || undefined,
      });
      setRating(nextRating);
      setSaved(true);
      if (nextRating === 'HELPFUL') setOpenDetails(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feedback failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (id: FeedbackCategory) => {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  return (
    <div className="mt-1 flex max-w-full flex-col gap-1.5">
      {(badge || visibleSources.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {badge && badge.mode !== 'documentation' && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[10px] font-medium text-foreground"
              title={badge.title}
            >
              <span aria-hidden>{badge.emoji}</span>
              {badge.label}
            </span>
          )}
          {visibleSources.map((source, idx) => (
            <span
              key={`${source.kind}-${source.label}-${idx}`}
              className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              title={formatCitationLabel(source)}
            >
              <span aria-hidden>{source.icon || '•'}</span>
              <span className="truncate">{formatCitationLabel(source)}</span>
            </span>
          ))}
        </div>
      )}

      {canRate && (
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit('HELPFUL')}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground',
              rating === 'HELPFUL' &&
                'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            )}
            title="Utile"
            aria-label="Marquer comme utile"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setOpenDetails(true);
              void submit('NOT_HELPFUL');
            }}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground',
              rating === 'NOT_HELPFUL' &&
                'bg-destructive/10 text-destructive',
            )}
            title="Pas utile"
            aria-label="Marquer comme pas utile"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          {saved && (
            <span className="text-[10px] text-muted-foreground">Merci</span>
          )}
        </div>
      )}

      {openDetails && rating === 'NOT_HELPFUL' && canRate && (
        <div className="rounded-lg border bg-background p-2 text-left shadow-sm">
          <p className="mb-1.5 text-[11px] font-medium text-foreground">
            Que s’est-il mal passé ?
          </p>
          <div className="mb-2 flex flex-wrap gap-1">
            {FEEDBACK_CATEGORIES.map((cat) => {
              const active = categories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] transition',
                    active
                      ? 'border-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))] bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_12%,transparent)]'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Détail optionnel…"
            className="mb-2 w-full resize-none rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]"
          />
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setOpenDetails(false)}
            >
              Fermer
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={saving}
              onClick={() => void submit('NOT_HELPFUL', categories)}
            >
              Envoyer
            </Button>
          </div>
          {error && (
            <p className="mt-1 text-[10px] text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};
