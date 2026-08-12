import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { useDynamicColors } from '@/providers/BrandingProvider';
import type { CompteRenduStatus } from '@/types/compteRendu';
import type { SessionStatus } from '@/types/session';
import {
  getSessionStatusColor,
  getSessionStatusLabel,
  getSessionStatusResolvedColor,
} from '@/utils/sessionDates';

export type CrStatus = 'submitted' | 'pending';

const SESSION_STATUSES: SessionStatus[] = ['planned', 'in_progress', 'completed', 'closed', 'cancelled'];

type StatusBadgeProps = {
  status: SessionStatus | CrStatus | CompteRenduStatus;
  size?: 'sm' | 'md';
  /** Use v1-style labels/colors for session status (À venir, En cours, Réalisée, Annulée). */
  variant?: 'session' | 'default';
};

function getStatusConfig(
  status: SessionStatus | CrStatus | CompteRenduStatus,
  colors: ColorPalette,
  variant: 'session' | 'default'
): { label: string; color: string } {
  if (variant === 'session' && SESSION_STATUSES.includes(status as SessionStatus)) {
    const key = getSessionStatusColor(status as SessionStatus);
    const color = getSessionStatusResolvedColor(key, colors);
    return { label: getSessionStatusLabel(status as SessionStatus), color };
  }
  switch (status) {
    case 'planned':
      return { label: 'Prévue', color: colors.warning };
    case 'completed':
      return { label: 'Terminée', color: colors.success };
    case 'cancelled':
      return { label: 'Annulée', color: colors.danger };
    case 'submitted':
      return { label: 'Soumis', color: colors.success };
    case 'pending':
    case 'draft':
      return { label: 'À remplir', color: colors.warning };
    default:
      return { label: String(status), color: colors.info };
  }
}

export function StatusBadge({ status, size = 'md', variant = 'default' }: StatusBadgeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const { label, color } = getStatusConfig(status, colors, variant);

  const paddingH = size === 'sm' ? 8 : 12;
  const paddingV = size === 'sm' ? 3 : 5;
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: color + '20',
        paddingHorizontal: paddingH,
        paddingVertical: paddingV,
        alignSelf: 'flex-start',
      }}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Statut : ${label}`}
    >
      <Text
        style={{
          color,
          fontSize,
          fontWeight: '600',
          lineHeight: fontSize * 1.4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
