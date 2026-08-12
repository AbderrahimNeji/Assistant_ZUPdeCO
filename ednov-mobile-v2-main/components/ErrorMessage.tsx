import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';

export interface ErrorMessageProps {
  readonly title?: string;
  readonly message?: string;
  readonly onRetry?: () => void;
}

export function ErrorMessage({
  title = 'Erreur',
  message = 'Une erreur est survenue. Veuillez réessayer.',
  onRetry,
}: Readonly<ErrorMessageProps>) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const buttonTextOnTint = colorScheme === 'dark' ? colors.text : colors.background;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={48}
        color={colors.danger}
      />
      <Text style={[styles.title, { color: colors.danger }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      {onRetry && (
        <Button
          mode="contained"
          onPress={onRetry}
          style={styles.button}
          icon="refresh"
          buttonColor={colors.tint}
          textColor={buttonTextOnTint}
        >
          Réessayer
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  button: {
    marginTop: 8,
  },
});
