import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchResultItem as SearchResultItemType } from '@/types/search.types';

interface SearchResultItemProps {
  result: SearchResultItemType;
  onClick?: () => void;
  isActive?: boolean;
}

const IconsMap = Icons as unknown as Record<string, LucideIcon>;

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  onClick,
  isActive = false,
}) => {
  const navigate = useNavigate();
  const Icon = IconsMap[result.icon] || Icons.Search;

  const handleClick = () => {
    navigate(result.route);
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn('global-search-result-item', isActive && 'active')}
    >
      <div className={cn('global-search-result-icon', `icon-${result.iconColor}`)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="global-search-result-content">
        <div className="global-search-result-label">{result.label}</div>
        <div className="global-search-result-sublabel">{result.sublabel}</div>
      </div>
    </button>
  );
};
