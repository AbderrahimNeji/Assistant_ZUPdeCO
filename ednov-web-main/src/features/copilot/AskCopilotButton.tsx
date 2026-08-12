import * as React from 'react';

import { Button } from '@/components/forms/Button';

import { useAssistantLauncher } from './ApplicationContextProvider';

type Props = {
  prompt?: string;
  autoSend?: boolean;
  label?: string;
};

/** Opens Copilot with the current page entity already in focus. */
export const AskCopilotButton: React.FC<Props> = ({
  prompt,
  autoSend = false,
  label = 'Demander à ZUPdeCo Assistant',
}) => {
  const { openAssistant } = useAssistantLauncher();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() =>
        openAssistant({
          prompt,
          autoSend: autoSend && Boolean(prompt?.trim()),
        })
      }
    >
      {label}
    </Button>
  );
};
