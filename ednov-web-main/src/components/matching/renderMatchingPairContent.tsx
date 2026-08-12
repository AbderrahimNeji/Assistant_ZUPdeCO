import * as React from 'react';
import {
  HeartHandshake,
  User,
  GraduationCap,
  Calendar,
  MapPin,
  Building2,
  TrendingUp,
  Clock,
  Minus,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { DetailBadge } from '@/components/common/details/DetailBadge';
import { EmptyPlaceholder } from '@/components/common/details/EmptyPlaceholder';
import { PAIR_TYPE_CONFIG } from './pair-configs';
import type { SessionStudentTutorPair } from '@/types/matching.types';

/**
 * Render content for matching pair details view.
 * Displays student, tutor, session info, assignment source, and statistics.
 */
export const renderMatchingPairContent = (pair: SessionStudentTutorPair): React.ReactNode => {
  // Format date avec gestion try-catch
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (Number.isNaN(d.getTime())) return '-';
      return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return '-';
    }
  };

  // Format time avec gestion null-safe
  const formatTime = (time: string | undefined | null) => {
    if (!time) return '';
    return time.slice(0, 5); // "HH:MM"
  };

  const typeConfig = PAIR_TYPE_CONFIG[pair.assignmentSource] || PAIR_TYPE_CONFIG.manual;
  const TypeIcon = typeConfig.icon;

  // Source color mapping (updated per user request)
  const sourceColors: Record<string, 'color-2' | 'color-1' | 'color-3' | 'error'> = {
    manual: 'color-2',
    auto_binome_coeur: 'error',
    auto_balanced: 'color-1',
    auto_history: 'color-3',
  };

  const sourceColorName = sourceColors[pair.assignmentSource] || 'color-2';

  return (
    <>
      {/* Header with inline badges */}
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <HeartHandshake className="w-7 h-7 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="text-2xl font-bold text-[var(--color-1-nuance-1)]">
                Couple Élève-Tuteur
              </h3>
              <DetailBadge
                label={typeConfig.label}
                icon={TypeIcon}
                colorName={sourceColorName}
                variant="filled"
              />
            </div>
            <p className="text-base text-[var(--color-1-nuance-2)]">
              {pair.studentUser?.displayName || '-'}
              {' ↔ '}
              {`${pair.tutorUser?.firstName || ''} ${pair.tutorUser?.lastName || ''}`.trim() || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Modern Grid Layout */}
      <div className="details-view-grid">
        {/* Élève Card */}
        <SectionCard icon={User} title="Élève" colorName="color-3" colSpan={1}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Nom</p>
              <p className="text-base font-semibold text-foreground">
                {pair.studentUser?.displayName || '-'}
              </p>
            </div>
            {pair.studentUser?.userProfiles && pair.studentUser.userProfiles.length > 0 && (
              <>
                {pair.studentUser.userProfiles.some((p) => p.level) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Niveau</p>
                    <div className="flex flex-wrap gap-2">
                      {pair.studentUser.userProfiles.map((profile) =>
                        profile.level ? (
                          <span
                            key={profile.level.id}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)] text-[var(--color-1-nuance-1)] border border-[var(--color-1-nuance-1)]"
                          >
                            {profile.level.label}
                          </span>
                        ) : null,
                      )}
                    </div>
                  </div>
                )}
                {pair.studentUser.userProfiles.some(
                  (p) => p.subjectNames && p.subjectNames.length > 0,
                ) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Matières</p>
                    <div className="flex flex-wrap gap-2">
                      {pair.studentUser.userProfiles.map((profile, idx) =>
                        profile.subjectNames?.map((subjectName, subIdx) => (
                          <span
                            key={`${idx}-${subIdx}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[color-mix(in_srgb,var(--color-3-nuance-1)_10%,transparent)] text-[var(--color-3-nuance-1)] border border-[var(--color-3-nuance-1)]"
                          >
                            {subjectName}
                          </span>
                        )),
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SectionCard>

        {/* Tuteur Card */}
        <SectionCard icon={GraduationCap} title="Tuteur" colorName="color-2" colSpan={1}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Nom</p>
              <p className="text-base font-semibold text-foreground">
                {`${pair.tutorUser?.firstName || ''} ${pair.tutorUser?.lastName || ''}`.trim() ||
                  '-'}
              </p>
            </div>
            {pair.tutorUser?.userProfiles && pair.tutorUser.userProfiles.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Matières enseignées
                </p>
                <div className="flex flex-wrap gap-2">
                  {pair.tutorUser.userProfiles.flatMap((profile) =>
                    ((profile.subjects as Array<{ id: string; label: string }>) || []).map(
                      (subject) => (
                        <span
                          key={subject.id}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border"
                          style={{
                            background:
                              'color-mix(in srgb, var(--color-3-nuance-1) 10%, transparent)',
                            color: 'var(--color-3-nuance-1)',
                            borderColor: 'var(--color-3-nuance-1)',
                          }}
                        >
                          {subject.label}
                        </span>
                      ),
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Statistiques du pair */}
        <SectionCard icon={TrendingUp} title="Statistiques" colorName="color-1" colSpan="full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Nombre de séances</p>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center px-4 py-2 rounded-lg text-2xl font-bold border-2"
                  style={{
                    background: 'color-mix(in srgb, var(--color-2-nuance-1) 10%, transparent)',
                    color: 'var(--color-2-nuance-1)',
                    borderColor: 'var(--color-2-nuance-1)',
                  }}
                >
                  {pair.sessionCount ?? 0}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Dernière séance</p>
              {pair.lastSession ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--color-1-nuance-1)]" />
                    <span className="text-sm font-semibold text-foreground">
                      {format(new Date(pair.lastSession.sessionDate), 'd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatTime(pair.lastSession.startTime)} -{' '}
                      {formatTime(pair.lastSession.endTime)}
                    </span>
                  </div>
                </div>
              ) : (
                <EmptyPlaceholder message="Aucune séance passée" />
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Prochaine séance</p>
              {pair.nextSession ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--color-3-nuance-1)]" />
                    <span className="text-sm font-semibold text-foreground">
                      {format(new Date(pair.nextSession.sessionDate), 'd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatTime(pair.nextSession.startTime)} -{' '}
                      {formatTime(pair.nextSession.endTime)}
                    </span>
                  </div>
                </div>
              ) : (
                <EmptyPlaceholder message="Aucune séance à venir" />
              )}
            </div>
          </div>
        </SectionCard>

        {/* Séance actuelle Card */}
        <SectionCard icon={Calendar} title="Séance actuelle" colorName="color-2" colSpan="full">
          {pair.session ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Date</p>
                  <p className="text-base font-semibold text-foreground capitalize">
                    {formatDate(pair.session.sessionDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Horaires</p>
                  <div className="time-pill">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(pair.session.startTime)} - {formatTime(pair.session.endTime)}
                    </span>
                  </div>
                </div>
              </div>

              {pair.session.establishment && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Établissement</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[var(--color-1-nuance-1)]" />
                    <p className="text-base font-semibold text-foreground">
                      {pair.session.establishment.name}
                    </p>
                  </div>
                </div>
              )}

              {pair.session.room && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Salle</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{pair.session.room.name}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyPlaceholder message="Aucune information de séance disponible" />
          )}
        </SectionCard>
      </div>

      {/* System Info Footer */}
      {pair.createdAt && (
        <div className="mt-8 pt-4 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Créé le {new Date(pair.createdAt).toLocaleDateString('fr-FR')}</span>
            <Minus className="w-3 h-3" />
            <span className="font-mono">{pair.id}</span>
          </div>
        </div>
      )}
    </>
  );
};
