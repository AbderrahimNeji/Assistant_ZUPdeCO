"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useModalA11y } from "@/features/shared/hooks/use-modal-a11y";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmingLabel?: string;
  isConfirming?: boolean;
  confirmVariant?: "destructive" | "brand";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmingLabel = "Working…",
  isConfirming = false,
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useModalA11y({
    open,
    onClose: onCancel,
    closeDisabled: isConfirming,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => {
        if (!isConfirming) onCancel();
      }}
    >
      <Card
        ref={(node) => {
          dialogRef.current = node;
        }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        tabIndex={-1}
        className="w-full max-w-md shadow-card outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader>
          <CardTitle id="confirm-dialog-title">{title}</CardTitle>
          <CardDescription id="confirm-dialog-description">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t-0 bg-transparent">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isConfirming}
            aria-busy={isConfirming}
          >
            {isConfirming ? confirmingLabel : confirmLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
