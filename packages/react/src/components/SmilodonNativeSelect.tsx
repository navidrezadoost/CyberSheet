import React, { useEffect, useMemo, useRef, useState } from 'react';

type NativeSelectChangeHandler = (event: any) => void;

export interface SmilodonNativeSelectProps {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: NativeSelectChangeHandler;
  onClick?: (event: any) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: any;
  'aria-label'?: string;
}

export interface SmilodonSelectItem {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SmilodonSelectCoreProps {
  items: SmilodonSelectItem[];
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  onClick?: (event: any) => void;
}

function optionLabel(node: any): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(optionLabel).join('');
  }

  return '';
}

function flattenOptionNodes(node: any): any[] {
  if (node === null || node === undefined || node === false) {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap(flattenOptionNodes);
  }

  return [node];
}

export const SmilodonSelectCore: React.FC<SmilodonSelectCoreProps> = ({
  items,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  id,
  className = '',
  style,
  ariaLabel,
  onClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hostRef = useRef(null);
  const selectedValue = value ?? defaultValue ?? items[0]?.value ?? '';
  const selectedItem = items.find((item) => String(item.value) === String(selectedValue));

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (hostRef.current && !hostRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  const selectValue = (nextValue: string | number, optionDisabled?: boolean) => {
    if (optionDisabled) return;
    onValueChange?.(String(nextValue));
    setIsOpen(false);
  };

  return (
    <span
      ref={hostRef}
      id={id}
      className={`cs-smilodon-select-host ${className}`.trim()}
      style={{ display: 'inline-flex', minWidth: 0, position: 'relative', ...style }}
      role="combobox"
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      aria-disabled={disabled}
      onClick={onClick}
    >
      <button
        type="button"
        className="cs-smilodon-select-trigger"
        disabled={disabled}
        style={{
          width: '100%',
          minWidth: 0,
          height: '24px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          padding: '0 6px 0 8px',
          border: '1px solid #8a8886',
          borderRadius: '2px',
          background: disabled ? '#f3f2f1' : '#ffffff',
          color: disabled ? '#a19f9d' : '#201f1e',
          fontFamily: '"Segoe UI", "Segoe UI Web", Arial, sans-serif',
          fontSize: '12px',
          lineHeight: '22px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxSizing: 'border-box',
          textAlign: 'left',
        }}
        onClick={(event: any) => {
          event.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
      >
        <span
          className="cs-smilodon-select-value"
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: disabled ? '#a19f9d' : '#201f1e',
          }}
        >
          {selectedItem?.label ?? ''}
        </span>
        <span className="cs-smilodon-select-arrow" aria-hidden="true" style={{ color: '#605e5c', flex: '0 0 auto' }}>
          ▾
        </span>
      </button>
      {isOpen && (
        <div
          className="cs-smilodon-select-menu"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            zIndex: 20000,
            minWidth: '100%',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '2px 0',
            border: '1px solid #8a8886',
            borderRadius: '2px',
            background: '#ffffff',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
            boxSizing: 'border-box',
          }}
        >
          {items.map((item) => {
            const isSelected = String(item.value) === String(selectedValue);

            return (
              <button
                key={String(item.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={item.disabled}
                className={`cs-smilodon-select-option${isSelected ? ' selected' : ''}`.trim()}
                style={{
                  width: '100%',
                  minHeight: '24px',
                  display: 'block',
                  padding: '4px 8px',
                  border: 0,
                  background: isSelected ? '#dbeafe' : '#ffffff',
                  color: item.disabled ? '#a19f9d' : '#201f1e',
                  fontFamily: '"Segoe UI", "Segoe UI Web", Arial, sans-serif',
                  fontSize: '12px',
                  lineHeight: '16px',
                  textAlign: 'left',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onClick={(event: any) => {
                  event.stopPropagation();
                  selectValue(item.value, item.disabled);
                }}
                onMouseEnter={(event: any) => {
                  if (!item.disabled && !isSelected) {
                    event.currentTarget.style.background = '#edebe9';
                  }
                }}
                onMouseLeave={(event: any) => {
                  if (!item.disabled && !isSelected) {
                    event.currentTarget.style.background = '#ffffff';
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
};

export const SmilodonNativeSelect: React.FC<SmilodonNativeSelectProps> = ({
  value,
  defaultValue,
  onChange,
  onClick,
  disabled = false,
  id,
  className = '',
  style,
  children,
  'aria-label': ariaLabel,
}) => {
  const items: SmilodonSelectItem[] = useMemo(() => {
    const optionChildren = flattenOptionNodes(children);

    return optionChildren
      .filter((child: any) => child?.props)
      .map((child: any) => {
        const props = child.props as {
          value?: string | number;
          disabled?: boolean;
          children?: any;
        };
        const label = optionLabel(props.children);

        return {
          value: props.value ?? label,
          label,
          disabled: props.disabled,
        };
      });
  }, [children]);

  return (
    <SmilodonSelectCore
      id={id}
      className={className}
      style={style}
      ariaLabel={ariaLabel}
      onClick={onClick}
      items={items}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onValueChange={(nextValue) => {
        onChange?.({
          target: { value: nextValue },
          currentTarget: { value: nextValue },
        } as any);
      }}
    />
  );
};
