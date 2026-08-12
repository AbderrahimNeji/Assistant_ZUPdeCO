import * as React from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';

interface FileDropzoneProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  accept = '.csv',
  maxSize = 10 * 1024 * 1024,
  disabled = false,
  className,
}) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `Le fichier est trop volumineux (max: ${Math.round(maxSize / 1024 / 1024)}MB)`;
    }

    if (accept) {
      const acceptedExtensions = accept.split(',').map((ext) => ext.trim().toLowerCase());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedExtensions.includes(fileExtension)) {
        return `Format de fichier non accepté. Formats acceptés: ${accept}`;
      }
    }

    return null;
  };

  const handleFileSelection = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all duration-200',
          'min-h-[200px] flex flex-col items-center justify-center p-8',
          !disabled &&
            !isDragging &&
            !error &&
            'hover:border-[var(--color-2-nuance-1)] hover:bg-[color-mix(in_srgb,var(--color-2-nuance-1)_5%,transparent)]',
          isDragging &&
            !disabled &&
            'border-[var(--color-2-nuance-1)] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)] scale-[1.02]',
          error && 'border-[rgb(var(--color-error))] bg-[rgb(var(--color-error)_/_0.05)]',
          !error && !isDragging && 'border-[var(--color-1-nuance-3)]',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {selectedFile ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div
              className="flex items-center justify-center rounded-xl w-14 h-14"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
              }}
            >
              <FileText className="w-7 h-7" style={{ color: 'var(--color-2-nuance-1)' }} />
            </div>
            <div className="text-center flex-1">
              <p className="text-sm font-medium text-[var(--color-1-nuance-1)] mb-1">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
            {!disabled && (
              <Button
                variant="delete"
                size="sm"
                icon={X}
                iconOnly
                onClick={handleRemoveFile}
                className="absolute top-3 right-3"
                aria-label="Retirer le fichier"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className="flex items-center justify-center rounded-xl w-14 h-14 transition-all"
              style={{
                backgroundColor: isDragging
                  ? 'color-mix(in srgb, var(--color-2-nuance-1) 20%, transparent)'
                  : 'color-mix(in srgb, var(--color-1-nuance-3) 15%, transparent)',
              }}
            >
              <Upload
                className={cn('w-7 h-7 transition-all', isDragging && 'scale-110')}
                style={{
                  color: isDragging ? 'var(--color-2-nuance-1)' : 'var(--color-1-nuance-1)',
                }}
              />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-[var(--color-1-nuance-1)] mb-2">
                {isDragging ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier CSV ici'}
              </p>
              <p className="text-sm text-muted-foreground mb-3">ou</p>
              <Button
                variant="outline"
                size="md"
                icon={Upload}
                iconPosition="left"
                onClick={handleClick}
                disabled={disabled}
              >
                Parcourir les fichiers
              </Button>
              {accept && (
                <p className="text-xs text-muted-foreground mt-3">Formats acceptés: {accept}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-[rgb(var(--color-error)_/_0.08)] border border-[rgb(var(--color-error)_/_0.3)] rounded-lg">
          <p className="text-sm text-[rgb(var(--color-error))] font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};
