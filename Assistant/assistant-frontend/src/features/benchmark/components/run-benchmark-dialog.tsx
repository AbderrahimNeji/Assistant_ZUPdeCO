"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, RefreshCw } from "lucide-react";

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

type RunBenchmarkDialogProps = {
  open: boolean;
  datasets: string[];
  isLoadingDatasets?: boolean;
  isDatasetsError?: boolean;
  onRetryDatasets?: () => void;
  isRunning?: boolean;
  onConfirm: (dataset: string) => void;
  onCancel: () => void;
};

export function RunBenchmarkDialog({
  open,
  datasets,
  isLoadingDatasets = false,
  isDatasetsError = false,
  onRetryDatasets,
  isRunning = false,
  onConfirm,
  onCancel,
}: RunBenchmarkDialogProps) {
  const [dataset, setDataset] = useState("");
  const dialogRef = useModalA11y({
    open,
    onClose: onCancel,
    closeDisabled: isRunning,
  });

  useEffect(() => {
    if (!open) return;
    setDataset((current) => current || datasets[0] || "");
  }, [open, datasets]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => {
        if (!isRunning) onCancel();
      }}
    >
      <Card
        ref={(node) => {
          dialogRef.current = node;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-benchmark-title"
        aria-describedby="run-benchmark-description"
        tabIndex={-1}
        className="w-full max-w-md shadow-card outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader>
          <CardTitle id="run-benchmark-title">Run benchmark</CardTitle>
          <CardDescription id="run-benchmark-description">
            This may take several minutes. The assistant will answer every
            question in the selected dataset.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-foreground">Dataset</span>
            {isLoadingDatasets ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading datasets…
              </p>
            ) : isDatasetsError ? (
              <div className="space-y-2" role="alert">
                <p className="text-sm text-destructive">
                  Couldn’t load datasets. Please try again.
                </p>
                {onRetryDatasets ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRetryDatasets}
                    disabled={isRunning}
                  >
                    <RefreshCw className="size-3.5" aria-hidden />
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : datasets.length === 0 ? (
              <p className="text-sm text-destructive">
                No datasets available from the backend.
              </p>
            ) : (
              <select
                value={dataset}
                onChange={(event) => setDataset(event.target.value)}
                disabled={isRunning}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                aria-label="Benchmark dataset"
              >
                {datasets.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}
          </label>
        </CardContent>

        <CardFooter className="justify-end gap-2 border-t-0 bg-transparent">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isRunning}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() => onConfirm(dataset)}
            disabled={isRunning || !dataset || isDatasetsError}
            aria-busy={isRunning}
          >
            {isRunning ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Play className="size-4" aria-hidden />
            )}
            {isRunning ? "Running…" : "Confirm & run"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
