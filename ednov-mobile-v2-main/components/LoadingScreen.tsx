import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useDynamicColors } from '@/context/BrandingContext';
import { spacing } from '@/constants/DesignTokens';

interface LoadingScreenProps {
  readonly message?: string;
  readonly backgroundColor?: string;
}

export function LoadingScreen({ message, backgroundColor }: Readonly<LoadingScreenProps>) {
  const colors = useDynamicColors();
  const bgColor = backgroundColor ?? colors.background;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ActivityIndicator size="large" color={colors.tint} />
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  message: {
    marginTop: spacing.sm + 4,
    fontSize: 14,
    textAlign: 'center',
  },
});
