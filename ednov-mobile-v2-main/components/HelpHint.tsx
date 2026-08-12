import React from 'react';
import { Platform, View } from 'react-native';
import { IconButton, Tooltip } from 'react-native-paper';

import { useDynamicColors } from '@/providers/BrandingProvider';

type Props = Readonly<{
  message: string;
  accessibilityLabel?: string;
}>;

/** react-native-web maps `title` to the DOM for native browser tooltips. */
type WebTooltipViewProps = React.ComponentProps<typeof View> & { title?: string };

/**
 * Contextual help: native browser title on web (full text), Paper tooltip on native (long-press).
 */
export function HelpHint({ message, accessibilityLabel = 'Aide' }: Props) {
  const colors = useDynamicColors();
  const WebView = View as React.ComponentType<WebTooltipViewProps>;

  const button = (
    <IconButton
      icon="information-outline"
      size={18}
      style={{ margin: 0, width: 32, height: 32 }}
      iconColor={colors.textSecondary}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={message}
    />
  );

  if (Platform.OS === 'web') {
    return (
      <WebView title={message} style={{ justifyContent: 'center', alignItems: 'center' }}>
        {button}
      </WebView>
    );
  }

  return <Tooltip title={message}>{button}</Tooltip>;
}
