import * as React from 'react';
import { PostIt, PostItPermission } from '@/types/post-it.types';
import { Clock, Star, Trash2, Share2, RotateCcw, CheckCircle, Undo2, Users } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import '@/styles/postit.css';
import pushpinImage from '@/assets/images/pushpin-3d.png';
import { COLOR_MAP, ICON_COLOR_MAP, TEXT_COLOR_MAP, THEMATIC_ICONS } from './postit-config';

interface PostItCardProps {
  postIt: PostIt;
  permission: PostItPermission;
  height?: number;
  editMode?: boolean;
  onDelete?: () => void;
  onTogglePriority?: () => void;
  onToggleStatus?: () => void;
  onShare?: () => void;
  onRestore?: () => void;
  onTrack?: () => void;
  isInTrash?: boolean;
  isDragging?: boolean;
  isDeleting?: boolean;
  isTogglingPriority?: boolean;
  isTogglingStatus?: boolean;
  isSharing?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  hasActiveSelection?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  footerBadge?: string;
}

export const PostItCard: React.FC<PostItCardProps> = ({
  postIt,
  permission,
  height = 200,
  editMode = false,
  onDelete,
  onTogglePriority,
  onToggleStatus,
  onShare,
  onRestore,
  onTrack,
  isInTrash = false,
  isDragging = false,
  isDeleting = false,
  isTogglingPriority = false,
  isTogglingStatus = false,
  isSharing = false,
  isSelectable = false,
  isSelected = false,
  hasActiveSelection = false,
  onSelect,
  onEdit,
  footerBadge,
}) => {
  // Stable rotation - computed once on mount
  const [rotation] = React.useState(() => {
    const rotations = [-2, -1, 0, 1, 2];
    return rotations[Math.floor(Math.random() * rotations.length)];
  });

  const colorClass =
    postIt.status === 'depasse' ? 'bg-postit-rouge' : COLOR_MAP[postIt.color] || 'bg-postit-jaune';

  const isOverdue = postIt.status === 'depasse';

  // Get adaptive colors based on post-it color
  const currentColor = isOverdue ? 'rouge' : postIt.color;
  const iconColorClass = ICON_COLOR_MAP[currentColor] || ICON_COLOR_MAP.jaune;
  const textColorClass = TEXT_COLOR_MAP[currentColor] || TEXT_COLOR_MAP.jaune;

  const getStatusLabel = () => {
    if (postIt.status === 'en_cours') return 'En cours';
    if (postIt.status === 'depasse') return 'Dépassé';
    return 'Terminé';
  };

  return (
    <article
      className={cn(
        'postit-card postit-texture rounded-lg p-4 cursor-pointer animate-fade-in-up',
        'flex flex-col',
        colorClass,
        // Add brown border for blanc-casse post-its
        postIt.color === 'blanc-casse' && !isOverdue && 'border-2',
        isDragging && 'postit-dragging',
        editMode && 'postit-edit-mode',
        isSelectable && isSelected && 'postit-selected',
        isSelectable && !isSelected && hasActiveSelection && 'postit-dimmed',
      )}
      style={
        {
          '--postit-rotation': `${rotation}deg`,
          transform: `rotate(${rotation}deg)`,
          height: `${height}px`,
          minHeight: `${height}px`,
          maxHeight: `${height}px`,
          // Add border color for blanc-casse post-its
          ...(postIt.color === 'blanc-casse' &&
            !isOverdue && {
              borderColor: `rgb(var(--postit-blanc-casse-text))`,
            }),
        } as React.CSSProperties
      }
      aria-label={`Post-it: ${postIt.title}`}
      aria-pressed={isSelectable ? isSelected : undefined}
      onClick={isSelectable && onSelect ? onSelect : !isSelectable && onEdit ? onEdit : undefined}
    >
      <span className="sr-only">Statut: {getStatusLabel()}</span>
      <span className="sr-only">Thématique: {postIt.thematic}</span>
      {postIt.isPriority && <span className="sr-only">Prioritaire</span>}

      {/* Pin Icon - 3D Pushpin Image */}
      <div className="absolute -top-1 -right-0.5 z-20" aria-hidden="true">
        <img src={pushpinImage} alt="" className="w-6 h-6 postit-pushpin" />
      </div>

      {/* Priority Star */}
      {postIt.isPriority && (
        <div className="absolute top-1.5 left-1.5 z-10" aria-hidden="true">
          <Star className="w-4 h-4 fill-[#f59e0b] text-[#f59e0b] drop-shadow-sm" />
        </div>
      )}

      {/* Thematic Icon */}
      <div className="absolute top-1.5 right-7 text-xl drop-shadow-sm" aria-hidden="true">
        {THEMATIC_ICONS[postIt.thematic] || '📌'}
      </div>

      {/* Content - espace optimise (plan: mt-4, mb-2) */}
      <div className="mt-4 mb-2 postit-content flex-1 overflow-hidden">
        <h3
          className={cn(
            'font-caveat text-2xl font-bold mb-1 line-clamp-1 postit-title',
            textColorClass,
          )}
        >
          {postIt.title}
        </h3>
        <p className={cn('font-caveat text-lg line-clamp-2', textColorClass)}>{postIt.content}</p>
      </div>

      {/* Deadline */}
      {postIt.deadline && (
        <div className={cn('flex items-center gap-1.5 mt-4 mb-2 text-xs', textColorClass)}>
          <Clock className="w-3.5 h-3.5" />
          <span className="font-caveat">
            {format(new Date(postIt.deadline), 'dd MMM yyyy HH:mm', { locale: fr })}
          </span>
        </div>
      )}

      {/* Footer - espace reduit */}
      <div
        className="flex items-center justify-between mt-auto pt-2 border-t-2 flex-shrink-0"
        style={{ borderColor: `rgba(var(--postit-${currentColor}-button), 0.3)` }}
      >
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className={cn('text-xs opacity-70', textColorClass)}>{postIt.createdByName}</span>
          {footerBadge && (
            <span className={cn('text-xs opacity-60 truncate', textColorClass)}>{footerBadge}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1 flex-shrink-0">
          {(permission !== 'read' || postIt.isDefault) && onTogglePriority && (
            <Button
              preset="postit-card-action"
              icon={Star}
              tooltipText={postIt.isPriority ? 'Retirer la priorité' : 'Prioritaire'}
              onClick={(e) => {
                e.stopPropagation();
                if (!isTogglingPriority) onTogglePriority();
              }}
              disabled={isTogglingPriority || isDeleting || isTogglingStatus || isSharing}
              loading={isTogglingPriority}
              className={cn(iconColorClass, postIt.isPriority && '[&_svg]:fill-current')}
              aria-label={postIt.isPriority ? 'Retirer la priorité' : 'Prioritaire'}
            />
          )}
          {permission === 'owner' && onShare && (
            <Button
              preset="postit-card-action"
              icon={Share2}
              tooltipText="Partager"
              onClick={(e) => {
                e.stopPropagation();
                if (!isSharing) onShare();
              }}
              disabled={isSharing || isDeleting || isTogglingPriority || isTogglingStatus}
              loading={isSharing}
              className={iconColorClass}
              aria-label="Partager"
            />
          )}
          {onTrack && (
            <Button
              preset="postit-card-action"
              icon={Users}
              tooltipText="Suivi des assignations"
              onClick={(e) => {
                e.stopPropagation();
                onTrack();
              }}
              disabled={isDeleting || isTogglingPriority || isTogglingStatus || isSharing}
              className={iconColorClass}
              aria-label="Suivi des assignations"
            />
          )}
          {!isInTrash && (permission !== 'read' || postIt.isDefault) && onToggleStatus && (
            <Button
              preset="postit-card-action"
              icon={postIt.status === 'done' ? RotateCcw : CheckCircle}
              tooltipText={
                postIt.status === 'done' ? 'Marquer comme en cours' : 'Marquer comme terminé'
              }
              onClick={(e) => {
                e.stopPropagation();
                if (!isTogglingStatus) onToggleStatus();
              }}
              disabled={isTogglingStatus || isDeleting || isTogglingPriority || isSharing}
              loading={isTogglingStatus}
              className={iconColorClass}
              aria-label={
                postIt.status === 'done' ? 'Marquer comme en cours' : 'Marquer comme terminé'
              }
            />
          )}
          {isInTrash && onRestore && (
            <Button
              preset="postit-card-action"
              icon={Undo2}
              tooltipText="Restaurer"
              onClick={(e) => {
                e.stopPropagation();
                if (!isTogglingStatus) onRestore();
              }}
              disabled={isTogglingStatus || isDeleting}
              loading={isTogglingStatus}
              className={iconColorClass}
              aria-label="Restaurer"
            />
          )}
          {permission === 'owner' && onDelete && (
            <Button
              preset="postit-card-action"
              icon={Trash2}
              tooltipText={isInTrash ? 'Supprimer définitivement' : 'Supprimer'}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDeleting) onDelete();
              }}
              disabled={isDeleting || isTogglingPriority || isTogglingStatus || isSharing}
              loading={isDeleting}
              className={isOverdue ? iconColorClass : 'text-error'}
              aria-label={isInTrash ? 'Supprimer définitivement' : 'Supprimer'}
            />
          )}
        </div>
      </div>
    </article>
  );
};
