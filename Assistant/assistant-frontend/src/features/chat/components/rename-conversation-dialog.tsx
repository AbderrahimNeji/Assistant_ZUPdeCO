"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useModalA11y } from "@/features/shared/hooks/use-modal-a11y";

type RenameConversationDialogProps = {
  open: boolean;
  initialTitle: string;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (title: string) => void;
};

export function RenameConversationDialog({
  open,
  initialTitle,
  isSaving = false,
  onCancel,
  onSave,
}: RenameConversationDialogProps) {
  const titleId = useId();
  const errorId = `${titleId}-error`;
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useModalA11y({
    open,
    onClose: onCancel,
    closeDisabled: isSaving,
  });

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setError(null);
  }, [open, initialTitle]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = title.trim();
    if (!next) {
      setError("Title cannot be empty.");
      return;
    }
    setError(null);
    onSave(next.slice(0, 120));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => {
        if (!isSaving) onCancel();
      }}
    >
      <Card
        ref={(node) => {
          dialogRef.current = node;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-conversation-title"
        aria-describedby="rename-conversation-description"
        tabIndex={-1}
        className="w-full max-w-md shadow-card outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle id="rename-conversation-title">
              Rename conversation
            </CardTitle>
            <CardDescription id="rename-conversation-description">
              Choose a short title so you can find this thread later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <label
              htmlFor={titleId}
              className="block text-sm font-semibold text-foreground"
            >
              Title
            </label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value.slice(0, 120));
                if (error) setError(null);
              }}
              maxLength={120}
              disabled={isSaving}
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="h-11 rounded-xl"
            />
            {error ? (
              <p
                id={errorId}
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {title.trim().length}/120
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t-0 bg-transparent">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={isSaving || !title.trim()}
              aria-busy={isSaving}
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
