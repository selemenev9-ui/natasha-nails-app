import useMagnetic from '../hooks/useMagnetic';

export default function MagneticButton({ children, className, onClick, style, disabled }) {
  const { ref, onMouseMove, onMouseLeave } = useMagnetic(0.3);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ display: 'inline-block', ...style }}
    >
      <button className={className} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    </div>
  );
}
