"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FeedbackRating } from "@/features/chat/services/evaluation.api";
import { useModalA11y } from "@/features/shared/hooks/use-modal-a11y";
import { cn } from "@/lib/utils";

type MessageFeedbackControlsProps = {
  messageId: string;
  rating?: FeedbackRating;
  disabled?: boolean;
  onRate: (input: {
    messageId: string;
    rating: FeedbackRating;
    comment?: string;
  }) => Promise<void> | void;
};

export function MessageFeedbackControls({
  messageId,
  rating,
  disabled = false,
  onRate,
}: MessageFeedbackControlsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(next: FeedbackRating, nextComment?: string) {
    if (disabled || submitting) return;
    setSubmitting(true);
    try {
      await onRate({
        messageId,
        rating: next,
        comment: nextComment,
      });
      setDialogOpen(false);
      setComment("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="mt-3 flex items-center gap-1 border-t border-border/50 pt-2.5"
        aria-label="Message feedback"
      >
        <span className="mr-1 text-[11px] text-muted-foreground">
          Was this helpful?
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={disabled || submitting}
          className={cn(
            "size-7 rounded-lg text-muted-foreground hover:bg-brand-peach hover:text-brand-orange",
            rating === "HELPFUL" && "bg-brand-peach/70 text-brand-orange",
          )}
          aria-label="Helpful"
          aria-pressed={rating === "HELPFUL"}
          onClick={() => {
            void submit("HELPFUL");
          }}
        >
          <ThumbsUp className="size-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={disabled || submitting}
          className={cn(
            "size-7 rounded-lg text-muted-foreground hover:bg-brand-peach hover:text-brand-orange",
            rating === "NOT_HELPFUL" && "bg-brand-peach/70 text-brand-orange",
          )}
          aria-label="Not helpful"
          aria-pressed={rating === "NOT_HELPFUL"}
          onClick={() => {
            if (rating === "NOT_HELPFUL") return;
            setDialogOpen(true);
          }}
        >
          <ThumbsDown className="size-3.5" aria-hidden />
        </Button>
      </div>

      <FeedbackCommentDialog
        open={dialogOpen}
        comment={comment}
        submitting={submitting}
        onCommentChange={setComment}
        onCancel={() => {
          if (submitting) return;
          setDialogOpen(false);
          setComment("");
        }}
        onSkip={() => {
          void submit("NOT_HELPFUL");
        }}
        onSubmit={() => {
          void submit("NOT_HELPFUL", comment.trim() || undefined);
        }}
      />
    </>
  );
}

function FeedbackCommentDialog({
  open,
  comment,
  submitting,
  onCommentChange,
  onCancel,
  onSkip,
  onSubmit,
}: {
  open: boolean;
  comment: string;
  submitting: boolean;
  onCommentChange: (value: string) => void;
  onCancel: () => void;
  onSkip: () => void;
  onSubmit: () => void;
}) {
  const dialogRef = useModalA11y({
    open,
    onClose: onCancel,
    closeDisabled: submitting,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => {
        if (!submitting) onCancel();
      }}
    >
      <Card
        ref={(node) => {
          dialogRef.current = node;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        aria-describedby="feedback-dialog-description"
        tabIndex={-1}
        className="w-full max-w-md shadow-card outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader>
          <CardTitle id="feedback-dialog-title">What was wrong?</CardTitle>
          <CardDescription id="feedback-dialog-description">
            Optional — tell us what went wrong so we can improve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            maxLength={2000}
            rows={4}
            disabled={submitting}
            placeholder="Tell us what was wrong…"
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-brand-orange/30 focus:ring-2"
          />
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t-0 bg-transparent">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={onSkip}
          >
            Skip
          </Button>
          <Button
            type="button"
            variant="brand"
            disabled={submitting}
            onClick={onSubmit}
          >
            {submitting ? "Sending…" : "Submit"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
