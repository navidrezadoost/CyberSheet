import * as React from 'react';

export interface GradientEffect {
  type: 'one-color' | 'two-colors' | 'preset';
  color1: string;
  color2?: string;
  preset?: string;
  style: 'horizontal' | 'vertical' | 'diagonal-up' | 'diagonal-down' | 'corner' | 'center';
  variant: number; // 0-3
}

export interface FillEffectsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (effect: GradientEffect) => void;
  initialEffect?: GradientEffect;
}

const SHADING_STYLES: Array<{ id: GradientEffect['style']; label: string }> = [
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'vertical', label: 'Vertical' },
  { id: 'diagonal-up', label: 'Diagonal Up' },
  { id: 'diagonal-down', label: 'Diagonal Down' },
  { id: 'corner', label: 'From Corner' },
  { id: 'center', label: 'From Center' }
];

const PRESET_GRADIENTS = [
  'Early Sunset',
  'Late Sunset',
  'Nightfall',
  'Daybreak',
  'Horizon',
  'Desert',
  'Ocean',
  'Fire',
  'Fog'
];

const FillEffectsDialog: React.FC<FillEffectsDialogProps> = ({
  isOpen,
  onClose,
  onApply,
  initialEffect
}) => {
  const [type, setType] = React.useState<GradientEffect['type']>('two-colors');
  const [color1, setColor1] = React.useState('#ffffff');
  const [color2, setColor2] = React.useState('#0078d4');
  const [preset, setPreset] = React.useState(PRESET_GRADIENTS[0]);
  const [style, setStyle] = React.useState<GradientEffect['style']>('horizontal');
  const [variant, setVariant] = React.useState(0);
  
  React.useEffect(() => {
    if (isOpen && initialEffect) {
      setType(initialEffect.type);
      setColor1(initialEffect.color1);
      setColor2(initialEffect.color2 || '#0078d4');
      setPreset(initialEffect.preset || PRESET_GRADIENTS[0]);
      setStyle(initialEffect.style);
      setVariant(initialEffect.variant);
    }
  }, [isOpen, initialEffect]);
  
  const handleOk = () => {
    onApply({
      type,
      color1,
      color2: type === 'two-colors' ? color2 : undefined,
      preset: type === 'preset' ? preset : undefined,
      style,
      variant
    });
    onClose();
  };
  
  const handleCancel = () => {
    onClose();
  };
  
  const handleBackdropClick = (e: any) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };
  
  // Generate sample gradient CSS
  const getSampleGradient = (): string => {
    const col1 = type === 'preset' ? '#0078d4' : color1;
    const col2 = type === 'preset' ? '#005a9e' : color2;
    
    switch (style) {
      case 'horizontal':
        return `linear-gradient(to right, ${col1}, ${col2})`;
      case 'vertical':
        return `linear-gradient(to bottom, ${col1}, ${col2})`;
      case 'diagonal-up':
        return `linear-gradient(45deg, ${col1}, ${col2})`;
      case 'diagonal-down':
        return `linear-gradient(135deg, ${col1}, ${col2})`;
      case 'corner':
        return `radial-gradient(circle at top left, ${col1}, ${col2})`;
      case 'center':
        return `radial-gradient(circle, ${col1}, ${col2})`;
      default:
        return `linear-gradient(to right, ${col1}, ${col2})`;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div
      className="fill-effects-dialog-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        animation: 'fadeIn 200ms ease-out'
      }}
    >
      <div
        onClick={(e: any) => e.stopPropagation()}
        style={{
          width: '480px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleIn 200ms ease-out'
        }}
      >
        {/* Dialog Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Fill Effects
          </h2>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
              color: '#666',
              lineHeight: 1
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        {/* Dialog Content */}
        <div style={{ padding: '20px' }}>
          {/* Type selection */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="radio"
                  checked={type === 'one-color'}
                  onChange={() => setType('one-color')}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                One color
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="radio"
                  checked={type === 'two-colors'}
                  onChange={() => setType('two-colors')}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                Two colors
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="radio"
                  checked={type === 'preset'}
                  onChange={() => setType('preset')}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                Preset
              </label>
            </div>
          </div>
          
          {/* Color selection */}
          {type !== 'preset' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, width: '80px' }}>
                  Color 1:
                </label>
                <input
                  type="color"
                  value={color1}
                  onChange={(e: any) => setColor1(e.target.value)}
                  style={{
                    width: '40px',
                    height: '32px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '13px', color: '#666' }}>
                  {color1.toUpperCase()}
                </span>
              </div>
              
              {type === 'two-colors' && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, width: '80px' }}>
                    Color 2:
                  </label>
                  <input
                    type="color"
                    value={color2}
                    onChange={(e: any) => setColor2(e.target.value)}
                    style={{
                      width: '40px',
                      height: '32px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#666' }}>
                    {color2.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Preset selection */}
          {type === 'preset' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                Preset:
              </label>
              <select
                value={preset}
                onChange={(e: any) => setPreset(e.target.value)}
                style={{
                  width: '200px',
                  padding: '6px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                {PRESET_GRADIENTS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Shading styles */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
                Shading styles:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {SHADING_STYLES.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      checked={style === s.id}
                      onChange={() => setStyle(s.id)}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            
            {/* Sample preview */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
                Sample
              </label>
              <div
                style={{
                  width: '180px',
                  height: '120px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  background: getSampleGradient()
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Dialog Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 24px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleOk}
            style={{
              padding: '8px 24px',
              border: 'none',
              backgroundColor: '#0078d4',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default FillEffectsDialog;
