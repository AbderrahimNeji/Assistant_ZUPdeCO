import * as React from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchResultItem } from './SearchResultItem';
import { useGlobalSearchContext } from '@/contexts/GlobalSearchContext';

interface GlobalSearchDropdownProps {
  onClose: () => void;
}

export const GlobalSearchDropdown: React.FC<GlobalSearchDropdownProps> = ({ onClose }) => {
  const {
    isLoadingData,
    hasApiResponded,
    allDataResults,
    allMenuResultsMapped,
    paginatedMenuResults,
    hasDataResults,
    hasMenuResults,
    searchQuery,
    menuPage,
    setMenuPage,
    dataPage,
    setDataPage,
    totalDataCount,
  } = useGlobalSearchContext();

  const [activeIndex, setActiveIndex] = React.useState(-1);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const allItems = React.useMemo(
    () => [...allDataResults, ...paginatedMenuResults],
    [allDataResults, paginatedMenuResults],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < allItems.length) {
      e.preventDefault();
      const selectedItem = allItems[activeIndex];
      if (selectedItem) {
        window.location.href = selectedItem.route;
        onClose();
      }
    }
  };

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  if (searchQuery.length < 2) {
    return (
      <div className="global-search-dropdown">
        <div className="global-search-min-length-hint">
          <Search className="h-4 w-4 global-search-icon" />
          <span>Tapez au moins 2 caractères pour rechercher</span>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="global-search-dropdown">
        <div className="global-search-loader">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-2-nuance-1)' }} />
          <span className="global-search-loader-text">Recherche en cours...</span>
        </div>
      </div>
    );
  }

  if (searchQuery.length >= 2 && hasApiResponded && !hasDataResults && !hasMenuResults) {
    return (
      <div className="global-search-dropdown">
        <div className="global-search-empty">
          <Search className="global-search-empty-icon" />
          <p className="global-search-empty-title">Aucun résultat trouvé</p>
          <p className="global-search-empty-description">Essayez avec d'autres mots-clés</p>
        </div>
      </div>
    );
  }

  if (!hasApiResponded && searchQuery.length >= 2) {
    return null;
  }

  return (
    <div className="global-search-dropdown" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <div className="global-search-scrollable scrollbar-thin">
        {hasDataResults && (
          <div className="global-search-section">
            <div className="global-search-section-header">
              <div className="global-search-section-header-icon">
                <Search className="h-4 w-4" />
              </div>
              <span className="global-search-section-title">Données</span>
            </div>
            <div className="global-search-results">
              {allDataResults.map((result, index) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  onClick={onClose}
                  isActive={index === activeIndex}
                />
              ))}
            </div>
            {totalDataCount > 5 && (
              <div className="global-search-pagination">
                <span className="global-search-pagination-info">
                  {(dataPage - 1) * 5 + 1}-{Math.min(dataPage * 5, totalDataCount)} sur{' '}
                  {totalDataCount}
                </span>
                <div className="global-search-pagination-buttons">
                  <button
                    type="button"
                    onClick={() => setDataPage(dataPage - 1)}
                    disabled={dataPage === 1}
                    className="global-search-pagination-button"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataPage(dataPage + 1)}
                    disabled={dataPage * 5 >= totalDataCount}
                    className="global-search-pagination-button"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {hasDataResults && hasMenuResults && <div className="global-search-divider" />}

        {hasMenuResults && (
          <div className="global-search-section">
            <div className="global-search-section-header">
              <div className="global-search-section-header-icon">
                <Search className="h-4 w-4" />
              </div>
              <span className="global-search-section-title">Menus</span>
            </div>
            <div className="global-search-results">
              {paginatedMenuResults.map((result, index) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  onClick={onClose}
                  isActive={allDataResults.length + index === activeIndex}
                />
              ))}
            </div>
            {allMenuResultsMapped.length > 5 && (
              <div className="global-search-pagination">
                <span className="global-search-pagination-info">
                  {(menuPage - 1) * 5 + 1}-{Math.min(menuPage * 5, allMenuResultsMapped.length)} sur{' '}
                  {allMenuResultsMapped.length}
                </span>
                <div className="global-search-pagination-buttons">
                  <button
                    type="button"
                    onClick={() => setMenuPage(menuPage - 1)}
                    disabled={menuPage === 1}
                    className="global-search-pagination-button"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuPage(menuPage + 1)}
                    disabled={menuPage * 5 >= allMenuResultsMapped.length}
                    className="global-search-pagination-button"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
