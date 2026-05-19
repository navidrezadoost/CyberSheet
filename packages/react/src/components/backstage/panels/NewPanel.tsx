// src/components/backstage/panels/NewPanel.tsx

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { FileOperations, Template } from '@cyber-sheet/core';
import { Workbook } from '@cyber-sheet/core';

export interface NewPanelProps {
  fileOperations: FileOperations;
  onWorkbookLoaded?: (workbook: Workbook) => void;
  onCreateBlank: () => void;
  onCreateFromTemplate: (templateId: string) => void;
}

interface TemplateCategory {
  id: string;
  label: string;
  icon: string;
}

// In production, templates would come from FileOperations or an API
const FEATURED_TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank Workbook',
    category: 'general',
    thumbnail: '📊',
    description: 'Start with a clean slate. A fresh workbook with one worksheet.',
    isBuiltIn: true,
  },
  {
    id: 'budget',
    name: 'Monthly Budget',
    category: 'business',
    thumbnail: '💰',
    description: 'Track income, expenses, and savings with pre-built formulas.',
    isBuiltIn: true,
  },
  {
    id: 'calendar',
    name: 'Calendar',
    category: 'planners',
    thumbnail: '📅',
    description: 'Monthly and yearly calendar templates with customizable dates.',
    isBuiltIn: true,
  },
  {
    id: 'invoice',
    name: 'Invoice',
    category: 'business',
    thumbnail: '🧾',
    description: 'Professional invoice with automatic tax and total calculations.',
    isBuiltIn: true,
  },
  {
    id: 'planner',
    name: 'Weekly Planner',
    category: 'planners',
    thumbnail: '📋',
    description: 'Plan your week with time blocks, priorities, and task tracking.',
    isBuiltIn: true,
  },
  {
    id: 'timeline',
    name: 'Project Timeline',
    category: 'business',
    thumbnail: '📈',
    description: 'Gantt-style project timeline with milestones and dependencies.',
    isBuiltIn: true,
  },
  {
    id: 'gradebook',
    name: 'Grade Book',
    category: 'education',
    thumbnail: '📚',
    description: 'Track student grades with weighted categories and auto-averaging.',
    isBuiltIn: true,
  },
  {
    id: 'inventory',
    name: 'Inventory List',
    category: 'business',
    thumbnail: '📦',
    description: 'Manage stock levels, reorder points, and supplier information.',
    isBuiltIn: true,
  },
  {
    id: 'mealplanner',
    name: 'Meal Planner',
    category: 'personal',
    thumbnail: '🍽️',
    description: 'Plan weekly meals, generate shopping lists, and track nutrition.',
    isBuiltIn: true,
  },
  {
    id: 'scheduler',
    name: 'Shift Scheduler',
    category: 'business',
    thumbnail: '🕐',
    description: 'Employee shift scheduling with conflict detection and hour tracking.',
    isBuiltIn: true,
  },
  {
    id: 'expense',
    name: 'Expense Report',
    category: 'business',
    thumbnail: '💳',
    description: 'Track business expenses with categories, receipts, and approval workflow.',
    isBuiltIn: true,
  },
  {
    id: 'checklist',
    name: 'Checklist',
    category: 'personal',
    thumbnail: '✅',
    description: 'Simple to-do list with checkboxes, priorities, and completion tracking.',
    isBuiltIn: true,
  },
];

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'all', label: 'All', icon: '📂' },
  { id: 'featured', label: 'Featured', icon: '⭐' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'personal', label: 'Personal', icon: '🏠' },
  { id: 'planners', label: 'Planners', icon: '📅' },
  { id: 'education', label: 'Education', icon: '🎓' },
];

const SEARCH_SUGGESTIONS = [
  'Business',
  'Personal',
  'Education',
  'Lists',
  'Budgets',
  'Calendars',
];

export const NewPanel: React.FC<NewPanelProps> = ({
  fileOperations,
  onWorkbookLoaded,
  onCreateBlank,
  onCreateFromTemplate,
}) => {
  const [activeCategory, setActiveCategory] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuggestionLabels, setShowSuggestionLabels] = useState(true);
  
  const searchInputRef = useRef(null as HTMLInputElement | null);
  const searchDebounceRef = useRef(null as NodeJS.Timeout | null);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = [...FEATURED_TEMPLATES];
    
    // Remove blank from category filtering (it's always shown separately)
    const blankTemplate = templates.find(t => t.id === 'blank');
    templates = templates.filter(t => t.id !== 'blank');
    
    // Category filter
    if (activeCategory === 'featured') {
      templates = templates.slice(0, 6); // Show first 6 as featured
    } else if (activeCategory !== 'all') {
      templates = templates.filter(t => t.category === activeCategory);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      );
    }
    
    // Add blank template back at the beginning for non-search views
    if (!searchQuery.trim() && (activeCategory === 'all' || activeCategory === 'featured')) {
      if (blankTemplate) {
        templates.unshift(blankTemplate);
      }
    }
    
    return templates;
  }, [activeCategory, searchQuery]);

  const handleSearch = useCallback((value: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      setShowSuggestionLabels(false);
    }, 250);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setShowSuggestionLabels(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    // Delay hiding to allow click on suggestions
    setTimeout(() => setShowSuggestionLabels(false), 200);
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestionLabels(false);
    if (searchInputRef.current) {
      searchInputRef.current.value = suggestion;
    }
  }, []);

  const handleTemplateClick = useCallback((template: Template) => {
    if (template.id === 'blank') {
      setSelectedTemplate('blank');
      setIsCreating(true);
      setTimeout(() => {
        // Create blank workbook if callback is available
        if (onWorkbookLoaded) {
          const blank = new Workbook();
          blank.addSheet('Sheet1');
          onWorkbookLoaded(blank);
        }
        onCreateBlank();
        setIsCreating(false);
        setSelectedTemplate(null);
      }, 400);
    } else {
      setSelectedTemplate(template.id);
      setIsCreating(true);
      setTimeout(() => {
        onCreateFromTemplate(template.id);
        setIsCreating(false);
        setSelectedTemplate(null);
      }, 400);
    }
  }, [onWorkbookLoaded, onCreateBlank, onCreateFromTemplate]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // ─── Styles ──────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    padding: '32px 48px',
    maxWidth: 800,
    animation: 'fadeInUp 250ms ease-out',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 600,
    color: '#1F1F1F',
    marginBottom: 8,
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
  };

  // Search area
  const searchContainerStyle: React.CSSProperties = {
    position: 'relative',
    marginBottom: 20,
  };

  const searchIconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 16,
    color: '#999999',
    pointerEvents: 'none',
    zIndex: 1,
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px 12px 40px',
    fontSize: 14,
    border: '1px solid #D1D1D1',
    borderRadius: 24,
    outline: 'none',
    transition: 'all 200ms ease',
    boxSizing: 'border-box',
    backgroundColor: '#F9F9F9',
  };

  const suggestionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap' as const,
    opacity: showSuggestionLabels ? 1 : 0,
    transition: 'opacity 200ms',
    pointerEvents: showSuggestionLabels ? 'auto' as const : 'none' as const,
  };

  const suggestionChipStyle: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: 12,
    color: '#0078D4',
    backgroundColor: '#E8F4FD',
    border: '1px solid #C7E0F4',
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'all 150ms',
    fontWeight: 500,
  };

  // Category tabs
  const tabsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 4,
    marginBottom: 24,
    borderBottom: '1px solid #E8E8E8',
    paddingBottom: 0,
    overflow: 'auto' as const,
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#0078D4' : '#555555',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: isActive ? '3px solid #0078D4' : '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 150ms',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: -1,
    whiteSpace: 'nowrap' as const,
  });

  // Template cards grid
  const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  };

  const cardStyle = (isHovered: boolean, isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column' as const,
    padding: 20,
    border: isSelected ? '2px solid #0078D4' : isHovered ? '1px solid #C0C0C0' : '1px solid #E8E8E8',
    borderRadius: 10,
    cursor: 'pointer',
    backgroundColor: isSelected ? '#F0F7FF' : '#FFFFFF',
    transition: 'all 180ms ease',
    boxShadow: isHovered 
      ? '0 4px 16px rgba(0,0,0,0.08)' 
      : '0 1px 3px rgba(0,0,0,0.04)',
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
    position: 'relative' as const,
    height: '100%',
    boxSizing: 'border-box' as const,
  });

  const blankCardStyle = (isHovered: boolean, isSelected: boolean): React.CSSProperties => ({
    ...cardStyle(isHovered, isSelected),
    backgroundColor: isSelected ? '#F0F7FF' : isHovered ? '#F0F6FF' : '#F5F9FF',
    border: isSelected ? '2px solid #0078D4' : isHovered ? '1.5px solid #0078D4' : '1.5px solid #C7E0F4',
    boxShadow: isHovered 
      ? '0 4px 20px rgba(0,120,212,0.15)' 
      : '0 1px 3px rgba(0,120,212,0.06)',
  });

  const cardIconStyle = (isBlank: boolean): React.CSSProperties => ({
    fontSize: 36,
    width: 56,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isBlank ? '#0078D4' : '#F0F0F0',
    borderRadius: 12,
    marginBottom: 14,
    color: isBlank ? '#FFFFFF' : undefined,
    transition: 'transform 200ms',
  });

  const cardNameStyle = (isBlank: boolean): React.CSSProperties => ({
    fontSize: 15,
    fontWeight: isBlank ? 700 : 600,
    color: isBlank ? '#0078D4' : '#1F1F1F',
    marginBottom: 6,
  });

  const cardDescStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#888888',
    lineHeight: 1.5,
    flex: 1,
  };

  const cardBadgeStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: '#107C10',
    backgroundColor: '#E8F5E9',
    padding: '3px 10px',
    borderRadius: 10,
    display: 'inline-block',
    marginTop: 10,
    alignSelf: 'flex-start' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  const creatingOverlayStyle: React.CSSProperties = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    color: '#0078D4',
    gap: 8,
  };

  const spinnerStyle: React.CSSProperties = {
    width: 18,
    height: 18,
    border: '2.5px solid #D0E4F7',
    borderTopColor: '#0078D4',
    borderRadius: '50%',
    animation: 'spin 600ms linear infinite',
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#999999',
    gridColumn: '1 / -1',
  };

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>New</h1>
      <p style={subheadingStyle}>
        Create a blank workbook or start from a template.
      </p>

      {/* Search */}
      <div style={searchContainerStyle}>
        <span style={searchIconStyle}>
          {searchQuery ? '🔍' : '✨'}
        </span>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for templates..."
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          style={searchInputStyle}
          onFocusCapture={(e: React.FocusEvent<HTMLInputElement>) => {
            e.currentTarget.style.borderColor = '#0078D4';
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0,120,212,0.12)';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
          onBlurCapture={(e: React.FocusEvent<HTMLInputElement>) => {
            e.currentTarget.style.borderColor = '#D1D1D1';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.backgroundColor = '#F9F9F9';
          }}
          aria-label="Search online templates"
        />
        
        {/* Search suggestions */}
        {!searchQuery && (
          <div style={suggestionsStyle}>
            <span style={{ fontSize: 12, color: '#999999', padding: '6px 0' }}>
              Suggested:
            </span>
            {SEARCH_SUGGESTIONS.map(suggestion => (
              <button
                key={suggestion}
                style={suggestionChipStyle}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = '#D0E4F7';
                  e.currentTarget.style.borderColor = '#0078D4';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = '#E8F4FD';
                  e.currentTarget.style.borderColor = '#C7E0F4';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div style={tabsContainerStyle} role="tablist">
        {TEMPLATE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            style={tabStyle(activeCategory === cat.id)}
            onClick={() => setActiveCategory(cat.id)}
            role="tab"
            aria-selected={activeCategory === cat.id}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (activeCategory !== cat.id) {
                e.currentTarget.style.color = '#333333';
                e.currentTarget.style.backgroundColor = '#FAFAFA';
              }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (activeCategory !== cat.id) {
                e.currentTarget.style.color = '#555555';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: 14 }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template cards */}
      <div style={cardGridStyle}>
        {filteredTemplates.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              No templates found
            </div>
            <div style={{ fontSize: 13 }}>
              Try a different search term or category
            </div>
          </div>
        ) : (
          filteredTemplates.map((template: Template) => {
            const isBlank = template.id === 'blank';
            const isHovered = hoveredTemplate === template.id;
            const isSelected = selectedTemplate === template.id;
            const isCurrentCreating = isSelected && isCreating;

            return (
              <div
                key={template.id}
                style={isBlank ? blankCardStyle(isHovered, isSelected) : cardStyle(isHovered, isSelected)}
                onClick={() => !isCreating && handleTemplateClick(template)}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTemplateClick(template);
                  }
                }}
                aria-label={`Create ${template.name}`}
              >
                {/* Template icon */}
                <div style={cardIconStyle(isBlank)}>
                  {template.thumbnail}
                </div>

                {/* Template name */}
                <div style={cardNameStyle(isBlank)}>
                  {template.name}
                </div>

                {/* Description */}
                <div style={cardDescStyle}>
                  {template.description}
                </div>

                {/* New badge for featured templates */}
                {!isBlank && template.isBuiltIn && template.category === 'featured' && (
                  <span style={cardBadgeStyle}>Popular</span>
                )}

                {/* Creating overlay */}
                {isCurrentCreating && (
                  <div style={creatingOverlayStyle}>
                    <div style={spinnerStyle} />
                    Creating...
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
