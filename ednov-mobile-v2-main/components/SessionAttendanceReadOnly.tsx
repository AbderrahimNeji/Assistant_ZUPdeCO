import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Themed';
import { borderRadius, CARD_PADDING_HORIZONTAL, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import type { ColorPalette } from '@/providers/BrandingProvider';
import {
  type AttendanceStatus,
  type SessionParticipant,
  filterParticipantsForViewerAssiduity,
  getAttendanceLabel,
  getSessionParticipantDisplayLabel,
} from '@/types/session';

function getAttendanceStatusColor(status: AttendanceStatus, colors: ColorPalette): string {
  switch (status) {
    case 'present':
      return colors.success;
    case 'absent':
      return colors.danger;
    case 'excused':
      return colors.warning;
    case 'pending':
    default:
      return colors.info;
  }
}

export interface SessionAttendanceReadOnlyProps {
  participants: SessionParticipant[];
  viewerUserId?: string | null;
  loading: boolean;
  colors: ColorPalette;
  isDark: boolean;
}

/**
 * Liste lecture seule des présences (séance) — statuts + motifs pour les comptes rendus.
 */
export function SessionAttendanceReadOnly({
  participants,
  viewerUserId,
  loading,
  colors,
  isDark,
}: SessionAttendanceReadOnlyProps) {
  const visibleParticipants = filterParticipantsForViewerAssiduity(
    participants,
    viewerUserId ?? undefined,
  );
  const tutorParticipants = visibleParticipants.filter(
    (p) => p.role === 'tutor' || p.role === 'volunteer',
  );
  const studentParticipants = visibleParticipants.filter((p) => p.role === 'student');
  const tutorSectionTitle =
    tutorParticipants.length === 1 ? 'Ma présence' : 'Tuteurs et bénévoles';

  const cardStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden' as const,
    marginBottom: spacing.md,
    ...getCardShadowPlatform(isDark),
  };

  const renderRow = (p: SessionParticipant, nameFallback: string, showBorderBottom: boolean) => {
    const name = getSessionParticipantDisplayLabel(p, nameFallback);
    const roleLabel = p.role === 'volunteer' ? 'Bénévole' : p.role === 'tutor' ? 'Tuteur' : 'Élève';
    const statusColor = getAttendanceStatusColor(p.attendanceStatus, colors);
    const justification = (p.absenceJustification ?? '').trim();
    const absenceComment = (p.absenceComment ?? '').trim();

    return (
      <View
        key={p.id}
        style={{
          paddingVertical: spacing.md,
          paddingHorizontal: CARD_PADDING_HORIZONTAL,
          borderBottomWidth: showBorderBottom ? 1 : 0,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }} numberOfLines={2}>
              {name}
            </Text>
            {justification !== '' ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 }}>
                Motif : {justification}
              </Text>
            ) : null}
            {absenceComment !== '' ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 16 }}>
                Commentaire : {absenceComment}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{roleLabel}</Text>
            </View>
            <View
              style={{
                backgroundColor: statusColor + '18',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: borderRadius.md,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: statusColor }}>
                {getAttendanceLabel(p.attendanceStatus, p.role)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
        <MaterialCommunityIcons name="account-check-outline" size={20} color={colors.tint} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Assiduité</Text>
      </View>
      <View style={cardStyle}>
        {loading ? (
          <View style={{ padding: spacing.lg, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Chargement de la présence…</Text>
          </View>
        ) : visibleParticipants.length === 0 ? (
          <View style={{ padding: spacing.lg }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Aucun participant sur cette séance.</Text>
          </View>
        ) : (
          <>
            {tutorParticipants.length > 0 ? (
              <>
                <View style={{ paddingHorizontal: CARD_PADDING_HORIZONTAL, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      color: colors.textSecondary,
                    }}
                  >
                    {tutorSectionTitle}
                  </Text>
                </View>
                {tutorParticipants.map((p, i) => renderRow(p, 'Tuteur', i < tutorParticipants.length - 1))}
              </>
            ) : null}
            {studentParticipants.length > 0 ? (
              <>
                {tutorParticipants.length > 0 ? (
                  <View
                    style={{
                      marginHorizontal: CARD_PADDING_HORIZONTAL,
                      marginTop: spacing.sm,
                      paddingTop: spacing.sm,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        color: colors.textSecondary,
                        marginBottom: spacing.xs,
                      }}
                    >
                      Élèves
                    </Text>
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: CARD_PADDING_HORIZONTAL, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        color: colors.textSecondary,
                      }}
                    >
                      Élèves
                    </Text>
                  </View>
                )}
                {studentParticipants.map((p, i) =>
                  renderRow(p, 'Élève', i < studentParticipants.length - 1),
                )}
              </>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
