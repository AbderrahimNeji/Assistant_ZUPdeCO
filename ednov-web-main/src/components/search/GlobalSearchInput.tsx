import * as React from 'react';
import { Search, X } from 'lucide-react';
import { useGlobalSearchContext } from '@/contexts/GlobalSearchContext';
import { GlobalSearchDropdown } from './GlobalSearchDropdown';
import { cn } from '@/lib/utils';

export const GlobalSearchInput: React.FC = () => {
  const { searchQuery, setSearchQuery, showDropdown, setShowDropdown, clearSearch } =
    useGlobalSearchContext();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowDropdown(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowDropdown]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowDropdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClear = () => {
    clearSearch();
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (searchQuery.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleClose = () => {
    setShowDropdown(false);
    clearSearch();
    inputRef.current?.blur();
  };

  return (
    <div className="navbar-search hidden md:block" ref={containerRef}>
      <Search className="navbar-search-icon" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Rechercher... (Ctrl+K)"
        className="navbar-search-input"
        value={searchQuery}
        onChange={handleChange}
        onFocus={handleFocus}
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {showDropdown && <GlobalSearchDropdown onClose={handleClose} />}
    </div>
  );
};
