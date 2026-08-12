import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Card } from 'react-native-paper';

const CLIP_RADIUS = 24;

type Props = Readonly<{
  style?: StyleProp<ViewStyle>;
  backgroundColor: string;
  children: React.ReactNode;
}>;

/**
 * react-native-paper Card uses Surface + shadow; overflow:hidden on Surface breaks shadows and logs a warning.
 * Clipping is applied on an inner View instead.
 */
export function AuthPaperCard({ style, backgroundColor, children }: Props) {
  return (
    <Card style={[{ borderRadius: CLIP_RADIUS, backgroundColor }, style]}>
      <View style={{ borderRadius: CLIP_RADIUS, overflow: 'hidden' }}>{children}</View>
    </Card>
  );
}
