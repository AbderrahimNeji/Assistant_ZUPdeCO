import { Text, View } from 'react-native';

import { useDynamicColors } from '@/providers/BrandingProvider';
import { spacing } from '@/constants/DesignTokens';

interface EmptyListProps {
  message: string;
}

export function EmptyList({ message }: Readonly<EmptyListProps>) {
  const colors = useDynamicColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl }}>
      <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 15 }}>{message}</Text>
    </View>
  );
}
