import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/constants/DesignTokens';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Wrap content in ScrollView. Default true. */
  scrollable?: boolean;
  /** Wrap in KeyboardAvoidingView. Default false. */
  keyboardAvoiding?: boolean;
  /** Background color; defaults to theme background from caller. */
  backgroundColor?: string;
}

/**
 * v1-style screen wrapper: SafeArea (top/left/right), optional ScrollView, optional KeyboardAvoidingView.
 * Bottom safe area is typically handled by tab bar; scroll bottom padding uses useScrollContentBottomPadding().
 */
export function ScreenContainer({
  children,
  scrollable = true,
  keyboardAvoiding = false,
  backgroundColor,
}: ScreenContainerProps) {
  const scrollBottom = useScrollContentBottomPadding();
  const content = scrollable ? (
    <ScrollView
      style={[{ flex: 1 }, backgroundColor ? { backgroundColor } : undefined]}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: scrollBottom }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: spacing.md }, backgroundColor ? { backgroundColor } : undefined]}>
      {children}
    </View>
  );

  const wrappedContent = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView
      style={[{ flex: 1 }, backgroundColor ? { backgroundColor } : undefined]}
      edges={['top', 'left', 'right']}
    >
      {wrappedContent}
    </SafeAreaView>
  );
}
