import * as React from 'react';
import { Upload, Download, X, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { Button } from '@/components/forms/Button';
import { FileDropzone } from '@/components/common/FileDropzone';
import { importStudentsCsv } from '@/services/students.service';
import { toast } from '@/lib/toast';

interface ImportStudentsModalProps {
  open: boolean;
  onClose: () => void;
  onImportStart?: () => void;
  onImportEnd?: () => void;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  open,
  onClose,
  onImportStart,
  onImportEnd,
}) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);

  const templateUrl = import.meta.env.VITE_STUDENTS_CSV_TEMPLATE_URL;

  const handleDownloadTemplate = () => {
    if (!templateUrl) {
      toast.error('URL du modèle CSV non configurée');
      return;
    }

    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = 'modele_import_eleves.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier CSV');
      return;
    }

    setIsImporting(true);
    onImportStart?.();

    try {
      const result = await importStudentsCsv(selectedFile);

      if (result.importedCount > 0) {
        toast.success(
          `Import réussi ! ${result.importedCount} élève(s) importé(s)${
            result.skippedExistingEmailCount > 0
              ? `, ${result.skippedExistingEmailCount} doublons ignorés`
              : ''
          }`,
        );
      } else if (result.skippedExistingEmailCount > 0) {
        toast.info(
          `Aucun nouvel élève importé. ${result.skippedExistingEmailCount} doublons ignorés.`,
        );
      } else {
        toast.warning('Aucun élève importé.');
      }

      if (result.errors.length > 0) {
        console.warn('Import errors:', result.errors);
        toast.error(
          `${result.invalidCount} ligne(s) invalide(s). Consultez la console pour plus de détails.`,
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['users', 'student'] });

      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error("Erreur lors de l'import du fichier CSV");
    } finally {
      setIsImporting(false);
      onImportEnd?.();
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setSelectedFile(null);
      onClose();
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={handleClose}
      size="lg"
      closeOnOutsideClick={!isImporting}
      closeOnEscape={!isImporting}
      header={{
        icon: Upload,
        iconSize: 'md',
        title: 'Importer des élèves par CSV',
        subtitle: 'Téléchargez le modèle, remplissez-le et importez-le',
      }}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="cancel"
            size="md"
            icon={X}
            iconPosition="left"
            onClick={handleClose}
            disabled={isImporting}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={isImporting ? undefined : Check}
            iconPosition="left"
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            loading={isImporting}
          >
            {isImporting ? 'Import en cours...' : 'Importer'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Bouton télécharger le modèle */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[var(--color-1-nuance-1)]">
            1. Téléchargez le modèle CSV
          </p>
          <Button
            variant="outline"
            size="md"
            icon={Download}
            iconPosition="left"
            onClick={handleDownloadTemplate}
            disabled={!templateUrl || isImporting}
            fullWidth
          >
            Télécharger le modèle CSV
          </Button>
          {!templateUrl && (
            <p className="text-xs text-[rgb(var(--color-error))]">
              L'URL du modèle n'est pas configurée dans les variables d'environnement
            </p>
          )}
        </div>

        {/* Séparateur : libellé au-dessus de la ligne pour éviter le chevauchement */}
        <div className="flex flex-col items-center gap-1.5 -mt-1">
          <span className="text-xs uppercase text-muted-foreground">Puis</span>
          <div className="w-full border-t border-[var(--color-1-nuance-3)]" />
        </div>

        {/* Dropzone */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[var(--color-1-nuance-1)]">
            2. Importez votre fichier CSV rempli
          </p>
          <FileDropzone
            onFileSelect={setSelectedFile}
            accept=".csv"
            maxSize={10 * 1024 * 1024}
            disabled={isImporting}
          />
        </div>

        {/* Instructions */}
        <div className="p-3 bg-[color-mix(in_srgb,var(--color-2-nuance-1)_5%,transparent)] border border-[var(--color-2-nuance-1)]/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong className="text-[var(--color-2-nuance-1)]">Format requis :</strong> Le fichier
            CSV doit contenir les colonnes suivantes :{' '}
            <code className="text-[var(--color-2-nuance-1)]">firstName</code>,{' '}
            <code className="text-[var(--color-2-nuance-1)]">lastName</code>,{' '}
            <code className="text-[var(--color-2-nuance-1)]">email</code>,{' '}
            <code className="text-[var(--color-2-nuance-1)]">establishmentId</code>
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
