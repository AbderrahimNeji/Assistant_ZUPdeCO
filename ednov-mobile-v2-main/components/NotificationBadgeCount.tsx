import React from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { getNotificationBadgeDisplay } from '@/utils/formatNotificationCount';

type Props = Readonly<{
  count: number;
  style?: TextStyle;
  plusStyle?: TextStyle;
}>;

/** Compte badge : chiffre normal, « + » plus grand à partir de 10 notifications. */
export function NotificationBadgeCount({ count, style, plusStyle }: Props) {
  const display = getNotificationBadgeDisplay(count);
  if (display.kind === 'exact') {
    return <Text style={style}>{display.text}</Text>;
  }
  return (
    <Text style={style}>
      9<Text style={[styles.plus, plusStyle]}>+</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  plus: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 11,
  },
});
