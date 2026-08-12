import * as React from 'react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, type TabItem } from '@/components/ui/tabs';

interface ManagementPageTabsConfig<T extends string = string> {
  items: TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'colored';
  ariaLabel?: string;
  visible?: boolean;
}

interface ManagementPageProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  headerContent?: React.ReactNode;
  tabs?: ManagementPageTabsConfig;
  children: React.ReactNode;
}

export const ManagementPage: React.FC<ManagementPageProps> = ({
  title,
  subtitle,
  actions,
  contentRef,
  headerContent,
  tabs,
  children,
}) => {
  const renderHeader = () => {
    if (headerContent) {
      return headerContent;
    }

    if (tabs) {
      const showTabs = tabs.visible !== false;
      return (
        <div className={cn('management-page-header-with-tabs-bar', !showTabs && 'no-tabs')}>
          <PageHeader
            title={title || ''}
            subtitle={subtitle}
            actions={actions}
            contentRef={contentRef}
          />
          {showTabs && (
            <Tabs
              items={tabs.items}
              activeTab={tabs.activeTab}
              onTabChange={tabs.onTabChange}
              size={tabs.size}
              variant={tabs.variant}
              ariaLabel={tabs.ariaLabel}
            />
          )}
        </div>
      );
    }

    return (
      <PageHeader
        title={title || ''}
        subtitle={subtitle}
        actions={actions}
        contentRef={contentRef}
      />
    );
  };

  return (
    <div className="management-page">
      {renderHeader()}
      <div className="management-page-content">{children}</div>
    </div>
  );
};
