import React, { useEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
  onClick?: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  onAction?: (actionId: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose, onAction }) => {
  const menuRef = useRef(null as HTMLDivElement | null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [submenuOpen, setSubmenuOpen] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x, y });

  // Adjust position if menu would go off-screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // If menu goes off right edge, shift left
      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 4;
      }

      // If menu goes off bottom edge, shift up
      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 4;
      }

      setMenuPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          {
            const nextIndex = (activeIndex + 1) % items.length;
            setActiveIndex(nextIndex >= items.length ? 0 : nextIndex);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          {
            const nextIndex = activeIndex - 1;
            setActiveIndex(nextIndex < 0 ? items.length - 1 : nextIndex);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (activeIndex >= 0 && items[activeIndex].submenu) {
            setSubmenuOpen(activeIndex);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSubmenuOpen(null);
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0) {
            const item = items[activeIndex];
            if (!item.disabled && !item.separator && item.onClick) {
              item.onClick();
              if (onAction) onAction(item.id);
              onClose();
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, items, onClose, onAction]);

  const handleItemClick = (item: ContextMenuItem, index: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (item.disabled || item.separator) return;

    if (item.submenu) {
      setSubmenuOpen(submenuOpen === index ? null : index);
    } else {
      if (item.onClick) item.onClick();
      if (onAction) onAction(item.id);
      onClose();
    }
  };

  return (
    <>
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          left: `${menuPosition.x}px`,
          top: `${menuPosition.y}px`,
          width: '240px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #C0C0C0',
          borderRadius: '4px',
          boxShadow: '2px 2px 6px rgba(0, 0, 0, 0.1)',
          padding: '4px 0',
          zIndex: 10002,
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '11pt',
          color: '#333333',
          userSelect: 'none',
        }}
      >
        {items.map((item, index) => {
          if (item.separator) {
            return (
              <div
                key={`separator-${index}`}
                style={{
                  height: '1px',
                  backgroundColor: '#E0E0E0',
                  margin: '4px 0',
                }}
              />
            );
          }

          const isActive = activeIndex === index;
          const hasSubmenu = !!item.submenu;

          return (
            <div
              key={item.id}
              style={{
                position: 'relative',
                height: '32px',
                padding: '0 24px 0 8px',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isActive ? '#E8E8E8' : 'transparent',
                cursor: item.disabled ? 'default' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
              }}
              onMouseEnter={() => {
                setActiveIndex(index);
                if (hasSubmenu) {
                  setSubmenuOpen(index);
                } else {
                  setSubmenuOpen(null);
                }
              }}
              onClick={(e: React.MouseEvent) => handleItemClick(item, index, e)}
            >
              {/* Icon */}
              {item.icon && (
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </span>
              )}

              {/* Label */}
              <span style={{ flex: 1 }}>{item.label}</span>

              {/* Shortcut */}
              {item.shortcut && (
                <span
                  style={{
                    fontSize: '9pt',
                    color: '#999999',
                    marginLeft: '16px',
                  }}
                >
                  {item.shortcut}
                </span>
              )}

              {/* Submenu indicator */}
              {hasSubmenu && (
                <span
                  style={{
                    position: 'absolute',
                    right: '8px',
                    fontSize: '10px',
                  }}
                >
                  ▶
                </span>
              )}

              {/* Submenu */}
              {hasSubmenu && submenuOpen === index && item.submenu && (
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '0',
                    width: '240px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #C0C0C0',
                    borderRadius: '4px',
                    boxShadow: '2px 2px 6px rgba(0, 0, 0, 0.1)',
                    padding: '4px 0',
                    zIndex: 1,
                  }}
                >
                  {item.submenu.map((subItem) => (
                    <div
                      key={subItem.id}
                      style={{
                        height: '32px',
                        padding: '0 24px 0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: subItem.disabled ? 'default' : 'pointer',
                        opacity: subItem.disabled ? 0.5 : 1,
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.currentTarget.style.backgroundColor = '#E8E8E8';
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                        if (!subItem.disabled && subItem.onClick) {
                          subItem.onClick();
                          if (onAction) onAction(subItem.id);
                          onClose();
                        }
                      }}
                    >
                      {subItem.icon && (
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            marginRight: '8px',
                            fontSize: '14px',
                          }}
                        >
                          {subItem.icon}
                        </span>
                      )}
                      <span>{subItem.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
