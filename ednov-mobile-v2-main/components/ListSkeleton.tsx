import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, spacing } from '@/constants/DesignTokens';

const DEFAULT_CARD_COUNT = 6;

export function ListSkeleton({ count = DEFAULT_CARD_COUNT }: { count?: number }) {
  const colors = useDynamicColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
              marginBottom: spacing.md,
              opacity,
            },
          ]}
        >
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <View style={[styles.lineShort, { backgroundColor: colors.border }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    flex: 1,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: 80,
  },
  line: {
    height: 16,
    borderRadius: 4,
    marginBottom: spacing.sm,
    width: '80%',
  },
  lineShort: {
    height: 12,
    borderRadius: 4,
    width: '50%',
  },
});
