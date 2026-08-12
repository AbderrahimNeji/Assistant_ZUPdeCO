import * as React from 'react';
import axios from 'axios';
import {
  Bot,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  Minus,
  SendHorizontal,
  Sparkles,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { helpChatTurnsForApi, postHelpChat, type HelpChatTurn } from '@/services/help-chat.service';

const RECOMMENDATIONS: { label: string; prompt: string }[] = [
  {
    label: 'Navigation',
    prompt: 'Comment naviguer dans la plateforme et où trouver le calendrier ?',
  },
  { label: 'Programmes', prompt: 'À quoi sert un programme et comment fonctionne-t-il ?' },
  {
    label: 'Établissements & matières',
    prompt: 'Quelle est la relation entre établissements et matières ?',
  },
  { label: 'Séances', prompt: 'Comment fonctionnent les séances et le suivi ?' },
  {
    label: 'Gamification',
    prompt: 'Comment fonctionne la gamification (XP, badges, classement) ?',
  },
  { label: 'Droits d’accès', prompt: "Pourquoi je n'ai pas accès à certaines pages ?" },
];

export const HelpAssistantChat: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<HelpChatTurn[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [maximized, setMaximized] = React.useState(false);
  /** True after user clicks minimize — FAB becomes “resume” until they reopen. */
  const [docked, setDocked] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  const hasConversation = messages.length > 0;

  React.useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading]);

  const startNewConversation = () => {
    setMessages([]);
    setInput('');
    setError(null);
    setLoading(false);
  };

  const minimizePanel = () => {
    setOpen(false);
    setMaximized(false);
    setDocked(true);
  };

  const openPanel = () => {
    setOpen(true);
    setDocked(false);
  };

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput('');
    setError(null);
    const prior = helpChatTurnsForApi(messages.slice(-4));
    setMessages((m) => [...m, { role: 'user', content: trimmed }]);
    setLoading(true);

    try {
      const { reply, relatedSections } = await postHelpChat({ message: trimmed, messages: prior });
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: reply,
          relatedSections: relatedSections?.length ? relatedSections : undefined,
        },
      ]);
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      if (axios.isAxiosError(e)) {
        const raw = (e.response?.data as { message?: string | string[] })?.message;
        const msg = Array.isArray(raw) ? raw.join(' ') : raw;
        setError(
          e.response?.status === 503
            ? "L'assistant n'est pas disponible pour le moment. Réessayez plus tard ou contactez le support."
            : typeof msg === 'string' && msg.trim()
              ? msg
              : 'Impossible d’obtenir une réponse.',
        );
      } else {
        setError('Impossible d’obtenir une réponse.');
      }
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    await sendText(input);
  };

  const onKeyDown = (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      void send();
    }
  };

  return (
    <>
      {/* Launcher: compact FAB or resume strip (history preserved when docked) */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-[1050] flex flex-col items-end gap-2">
          {docked && hasConversation && (
            <div
              className={cn(
                'flex max-w-[min(100vw-5rem,320px)] items-center gap-2 rounded-2xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm',
                'animate-in fade-in slide-in-from-bottom-2 duration-200',
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-xs font-medium text-foreground">Assistant d’aide</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {messages.length} message{messages.length > 1 ? 's' : ''} — cliquez pour reprendre
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 bg-[var(--color-1-nuance-1)] text-white hover:brightness-105"
                onClick={openPanel}
              >
                Reprendre
              </Button>
            </div>
          )}
          {/* <button
            type="button"
            aria-label="Ouvrir l’assistant d’aide"
            onClick={() => {
              if (docked && hasConversation) openPanel();
              else setOpen(true);
            }}
            className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform',
              'bg-[var(--color-1-nuance-1)] text-white hover:scale-105 hover:brightness-105',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-1-nuance-1)] focus-visible:ring-offset-2',
              docked && hasConversation && 'ring-2 ring-[var(--color-1-nuance-1)]/40 ring-offset-2',
            )}
          >
            <Sparkles className="h-7 w-7" aria-hidden />
            {hasConversation && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-2-nuance-1)] px-1 text-[10px] font-bold text-white">
                {messages.length > 9 ? '9+' : messages.length}
              </span>
            )}
          </button> */}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setMaximized(false);
            // Fermeture (X ou overlay) : garde l’historique mais sans barre « Reprendre » — seul le bouton flottant affiche le badge
            setDocked(false);
          }
        }}
      >
        <DialogContent
          className={cn(
            'dialog-content flex flex-col gap-0 overflow-hidden p-0 max-w-none z-[1100]',
            'rounded-3xl border border-[color-mix(in_srgb,var(--color-2-nuance-3)_35%,transparent)] shadow-2xl',
            'bg-gradient-to-b from-background via-background to-[color-mix(in_srgb,var(--color-2-nuance-3)_6%,transparent)]',
            maximized
              ? [
                  'fixed left-1/2 top-1/2 w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[100vw]',
                  'h-[min(calc(100dvh-1.5rem),calc(100svh-1.5rem))] sm:h-[min(calc(100dvh-2.5rem),calc(100svh-2.5rem))]',
                  '-translate-x-1/2 -translate-y-1/2',
                  'px-2 pt-2 pb-2 sm:px-4 sm:pb-3 sm:pt-3',
                ]
              : [
                  'fixed left-auto top-auto right-6 bottom-6 translate-x-0 translate-y-0',
                  'h-[min(72vh,600px)] w-[min(100vw-2rem,520px)]',
                ],
          )}
        >
          <div
            className={cn(
              'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
              maximized && 'w-full max-w-none rounded-2xl border border-border/30 sm:rounded-3xl',
            )}
          >
            {/* Header tools */}
            <div
              className={cn(
                'absolute right-11 top-2.5 z-[1] flex items-center gap-0.5 rounded-full border border-border/50 bg-muted/50 p-0.5 shadow-sm backdrop-blur-sm',
                'sm:right-[3.25rem] sm:top-3',
              )}
            >
              <button
                type="button"
                onClick={startNewConversation}
                disabled={loading}
                title="Nouvelle conversation"
                aria-label="Nouvelle conversation"
                className={cn(
                  'rounded-full p-2 text-muted-foreground transition-colors',
                  'hover:bg-background hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-1-nuance-1)] focus-visible:ring-offset-2',
                  'disabled:pointer-events-none disabled:opacity-30',
                )}
              >
                <MessageSquarePlus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={minimizePanel}
                title="Réduire (conserver la conversation)"
                aria-label="Réduire le panneau sans effacer la conversation"
                className={cn(
                  'rounded-full p-2 text-muted-foreground transition-colors',
                  'hover:bg-background hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-1-nuance-1)] focus-visible:ring-offset-2',
                )}
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setMaximized((m) => !m)}
                aria-label={maximized ? 'Réduire la taille du panneau' : 'Agrandir le panneau'}
                title={maximized ? 'Taille normale' : 'Plein espace'}
                className={cn(
                  'rounded-full p-2 text-muted-foreground transition-colors',
                  'hover:bg-background hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-1-nuance-1)] focus-visible:ring-offset-2',
                )}
              >
                {maximized ? (
                  <Minimize2 className="h-4 w-4" aria-hidden />
                ) : (
                  <Maximize2 className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>

            <DialogHeader
              className={cn(
                'shrink-0 space-y-0 border-b border-border/60 bg-gradient-to-br from-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)] to-transparent py-4 text-left',
                'px-6 pr-[6.5rem] sm:px-7 sm:pr-[7.25rem]',
                maximized && 'rounded-t-2xl',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                    'bg-[var(--color-1-nuance-1)] text-white shadow-md shadow-[color-mix(in_srgb,var(--color-1-nuance-1)_35%,transparent)]',
                  )}
                >
                  <Sparkles className="h-[18px] w-[18px]" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1 pt-0.5">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-foreground sm:text-[1.05rem]">
                    Assistant d’aide
                  </DialogTitle>
                  <DialogDescription className="text-[13px] leading-snug text-muted-foreground">
                    Aide à la navigation et au métier · Réponses basées sur la doc — en cas de
                    doute, contactez le support.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div
              ref={listRef}
              className={cn(
                'help-chat-scroll min-h-0 flex-1 overflow-y-auto scroll-smooth',
                'py-5 [scrollbar-gutter:stable]',
                maximized ? 'px-4 sm:px-6' : 'px-4 sm:px-5',
              )}
            >
              {messages.length === 0 && !loading && (
                <div className="mx-auto max-w-lg space-y-5">
                  <div className="rounded-2xl border border-border/70 bg-card/50 px-6 py-6 text-center shadow-sm ring-1 ring-border/40">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-1-nuance-1)_12%,transparent)]">
                      <Sparkles className="h-6 w-6 text-[var(--color-1-nuance-1)]" aria-hidden />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Par où commencer ?</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      Posez une question libre ou touchez une suggestion pour l’envoyer tout de
                      suite.
                    </p>
                  </div>
                  <div>
                    <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Suggestions
                    </p>
                    <div className="flex flex-wrap justify-center gap-2.5">
                      {RECOMMENDATIONS.map((r) => (
                        <button
                          key={r.label}
                          type="button"
                          disabled={loading}
                          onClick={() => void sendText(r.prompt)}
                          className={cn(
                            'rounded-full border border-[color-mix(in_srgb,var(--color-1-nuance-1)_40%,transparent)]',
                            'bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)] px-4 py-2 text-[13px] font-medium',
                            'text-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow-md',
                            'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_18%,transparent)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-1-nuance-1)]',
                            'active:translate-y-0 disabled:opacity-50',
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.length > 0 && (
                <div className="flex w-full flex-col space-y-5">
                  {messages.map((msg, i) => (
                    <div
                      key={`${i}-${msg.role}-${msg.content.slice(0, 12)}`}
                      className={cn(
                        'flex w-full',
                        msg.role === 'user' ? 'justify-end' : 'justify-start',
                      )}
                    >
                      <div
                        className={cn(
                          'flex gap-3',
                          msg.role === 'user'
                            ? 'max-w-[min(100%,18rem)] flex-row-reverse sm:max-w-[min(100%,22rem)]'
                            : 'w-full min-w-0 max-w-full flex-row lg:max-w-[min(100%,58rem)]',
                        )}
                      >
                        <div
                          className={cn(
                            'mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-border/40',
                            msg.role === 'user'
                              ? 'bg-[color-mix(in_srgb,var(--color-1-nuance-1)_18%,transparent)] text-[var(--color-1-nuance-1)]'
                              : 'bg-muted/80 text-muted-foreground',
                          )}
                          aria-hidden
                        >
                          {msg.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div
                          className={cn(
                            'min-w-0 pt-0.5',
                            msg.role === 'assistant' && 'min-w-0 flex-1',
                          )}
                        >
                          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {msg.role === 'user' ? 'Vous' : 'Assistant'}
                          </span>
                          <div
                            className={cn(
                              'rounded-2xl px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap',
                              msg.role === 'user'
                                ? 'rounded-tr-md bg-[var(--color-1-nuance-1)] text-white shadow-md shadow-[color-mix(in_srgb,var(--color-1-nuance-1)_25%,transparent)]'
                                : 'rounded-tl-md border border-border/50 bg-background text-foreground shadow-sm ring-1 ring-border/30',
                            )}
                          >
                            {msg.content}
                          </div>
                          {msg.role === 'assistant' &&
                            msg.relatedSections &&
                            msg.relatedSections.length > 0 && (
                              <div className="mt-2.5">
                                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Voir aussi
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.relatedSections.map((sectionTitle) => (
                                    <button
                                      key={`${i}-${sectionTitle}`}
                                      type="button"
                                      disabled={loading}
                                      onClick={() =>
                                        void sendText(
                                          `Que dit la section « ${sectionTitle} » dans l’aide ?`,
                                        )
                                      }
                                      className={cn(
                                        'max-w-full truncate rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-left text-[11px] font-medium',
                                        'text-foreground transition-colors hover:border-[color-mix(in_srgb,var(--color-1-nuance-1)_45%,transparent)]',
                                        'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)]',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-1-nuance-1)]',
                                        'disabled:opacity-50',
                                      )}
                                      title={sectionTitle}
                                    >
                                      {sectionTitle}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loading && (
                <div className="mt-2 flex w-full justify-start">
                  <div className="flex w-full min-w-0 max-w-full gap-3 lg:max-w-[min(100%,58rem)]">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/80 ring-1 ring-border/40">
                      <Bot className="h-4 w-4 animate-pulse text-muted-foreground" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border/50 bg-muted/40 px-5 py-4 shadow-sm ring-1 ring-border/20">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-1-nuance-1)] [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-1-nuance-1)] [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-1-nuance-1)]" />
                        <span className="ml-2 text-xs text-muted-foreground">Rédaction…</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-2 w-full rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm leading-snug text-destructive lg:max-w-[min(100%,58rem)]">
                  {error}
                </div>
              )}
            </div>

            <div
              className={cn(
                'shrink-0 border-t border-border/60 bg-gradient-to-t from-muted/25 to-background/95 backdrop-blur-md',
                'px-5 pb-[max(1rem,calc(0.5rem+env(safe-area-inset-bottom,0px)))] pt-4 sm:px-7 sm:pb-6 sm:pt-5',
              )}
            >
              <div className="w-full">
                {hasConversation && (
                  <div className="mb-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Autres idées
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                      {RECOMMENDATIONS.map((r) => (
                        <button
                          key={`footer-${r.label}`}
                          type="button"
                          disabled={loading}
                          onClick={() => void sendText(r.prompt)}
                          className={cn(
                            'shrink-0 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-medium',
                            'text-foreground shadow-sm transition-colors hover:border-[color-mix(in_srgb,var(--color-1-nuance-1)_45%,transparent)]',
                            'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_8%,transparent)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-1-nuance-1)]',
                            'disabled:opacity-50',
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border/50 bg-muted/20 p-2 shadow-inner ring-1 ring-border/20">
                  <div className="flex gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Écrivez votre question…"
                      rows={maximized ? 3 : 2}
                      disabled={loading}
                      className={cn(
                        'min-h-[2.75rem] flex-1 resize-none rounded-xl border-0 bg-transparent px-3 py-2.5 text-[14px]',
                        'placeholder:text-muted-foreground/80',
                        'focus-visible:outline-none focus-visible:ring-0',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-11 w-11 shrink-0 self-end rounded-xl bg-[var(--color-1-nuance-1)] text-white shadow-md transition-transform hover:brightness-105 active:scale-[0.98]"
                      onClick={() => void send()}
                      disabled={loading || !input.trim()}
                      aria-label="Envoyer"
                    >
                      <SendHorizontal className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {hasConversation && (
                  <div className="mt-3 flex justify-between gap-2 text-[12px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={startNewConversation}
                      disabled={loading}
                      className="rounded-md font-medium underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                    >
                      Nouvelle conversation
                    </button>
                    <span className="hidden text-right sm:inline">
                      Entrée pour envoyer · Maj+Entrée pour la ligne
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
