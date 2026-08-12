import * as React from 'react';
import {
  Building2,
  Calendar,
  ChevronDown,
  FileText,
  GraduationCap,
  Pin,
  School,
  User,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import {
  conversationScope,
  focusBadgeLabel,
  focusTypeLabel,
  pageEntities,
  sameEntity,
} from './focus';
import { useApplicationContextStore } from './store';
import type { EntityRef } from './types';

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? 'h-3.5 w-3.5';
  switch (type) {
    case 'student':
      return <User className={cls} aria-hidden />;
    case 'tutor':
      return <GraduationCap className={cls} aria-hidden />;
    case 'session':
      return <Calendar className={cls} aria-hidden />;
    case 'report':
      return <FileText className={cls} aria-hidden />;
    case 'establishment':
      return <School className={cls} aria-hidden />;
    case 'company':
      return <Building2 className={cls} aria-hidden />;
    default:
      return <Users className={cls} aria-hidden />;
  }
}

function EntityChip({
  entity,
  onClear,
  compare,
}: {
  entity: EntityRef;
  onClear?: () => void;
  compare?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-[14rem] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
        compare
          ? 'border-border bg-muted/60 text-foreground'
          : 'border-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-1-nuance-1,#e85d04)_8%,transparent)] text-foreground',
      )}
      title={`${focusTypeLabel(entity.type)} · ${focusBadgeLabel(entity)}`}
    >
      <TypeIcon type={entity.type} />
      <span className="truncate font-medium">{focusBadgeLabel(entity)}</span>
      {onClear && (
        <button
          type="button"
          className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
          onClick={onClear}
          aria-label="Retirer du comparatif"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/**
 * Compact focus strip above the chat: current entity, pin, clear, change, compare.
 */
export const FocusBadge: React.FC = () => {
  const context = useApplicationContextStore((s) => s.context);
  const focus = useApplicationContextStore((s) => s.focus);
  const setManualFocus = useApplicationContextStore((s) => s.setManualFocus);
  const toggleCompareEntity = useApplicationContextStore((s) => s.toggleCompareEntity);
  const pinFocus = useApplicationContextStore((s) => s.pinFocus);
  const clearFocus = useApplicationContextStore((s) => s.clearFocus);

  const scope = conversationScope(focus);
  const pageRefs = pageEntities(context);
  const recents = focus.recents;
  const picker = [
    ...pageRefs,
    ...recents.filter((r) => !pageRefs.some((p) => sameEntity(p, r))),
  ];

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-b bg-muted/20 px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Current Context
        </span>
        <span
          className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground"
          title="Portée de la conversation"
        >
          {scope === 'global'
            ? 'Conversation Scope · Global'
            : scope === 'comparison'
              ? 'Conversation Scope · Comparison'
              : 'Conversation Scope · Entity'}
        </span>
        {focus.pinned && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]">
            <Pin className="h-3 w-3 fill-current" />
            Épinglé
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {scope === 'global' || !focus.primary ? (
          <span className="text-[11px] text-muted-foreground">
            Mode global — ouvrez une fiche ou choisissez un focus.
          </span>
        ) : (
          <>
            <EntityChip entity={focus.primary} />
            {(focus.extras ?? []).map((extra) => (
              <EntityChip
                key={`${extra.type}-${extra.id}`}
                entity={extra}
                compare
                onClear={() => toggleCompareEntity(extra)}
              />
            ))}
          </>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
              >
                Changer
                <ChevronDown className="ml-0.5 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="z-[1200] w-56"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              {picker.length === 0 && (
                <DropdownMenuItem disabled>
                  Aucune entité récente — ouvrez une fiche
                </DropdownMenuItem>
              )}
              {picker.map((ref) => (
                <DropdownMenuItem
                  key={`${ref.type}-${ref.id}`}
                  onSelect={() => setManualFocus(ref)}
                >
                  <TypeIcon type={ref.type} className="mr-2 h-3.5 w-3.5" />
                  <span className="truncate">
                    {focusTypeLabel(ref.type)} · {focusBadgeLabel(ref)}
                  </span>
                </DropdownMenuItem>
              ))}
              {picker.length > 1 && focus.primary && (
                <>
                  <DropdownMenuSeparator />
                  {picker
                    .filter((r) => !sameEntity(r, focus.primary))
                    .map((ref) => (
                      <DropdownMenuItem
                        key={`cmp-${ref.type}-${ref.id}`}
                        onSelect={() => toggleCompareEntity(ref)}
                      >
                        Comparer avec {focusBadgeLabel(ref)}
                      </DropdownMenuItem>
                    ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={focus.pinned ? 'Désépingler le focus' : 'Épingler le focus'}
            onClick={() => pinFocus()}
            disabled={!focus.primary && !focus.pinned}
          >
            <Pin
              className={cn(
                'h-3.5 w-3.5',
                focus.pinned &&
                  'fill-current text-[var(--brand-primary,var(--color-1-nuance-1,#e85d04))]',
              )}
            />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Effacer le focus (mode global)"
            onClick={() => clearFocus()}
            disabled={scope === 'global'}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
