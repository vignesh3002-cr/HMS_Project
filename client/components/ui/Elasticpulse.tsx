import React from 'react';

export interface ElasticPulseProps {
  /** Diameter of the dots in pixels */
  size?: number;
  /** CSS color value (hex, rgb, etc.) */
  color?: string;
  /** Space between dots in pixels */
  gap?: number;
  /** Optional className for the container */
  className?: string;
}

const ElasticPulse: React.FC<ElasticPulseProps> = ({
  size = 16,
  color = '#004ac6',
  gap = 32,
  className = '',
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: `${gap}px`,
  };

  const dotStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color,
    borderRadius: '9999px',
  };

  return (
    <>
      <style>{`
        .elastic-pulse-dot {
          animation: elastic-pulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          will-change: transform, opacity;
        }
        .elastic-pulse-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .elastic-pulse-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes elastic-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(2.2);
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .elastic-pulse-dot {
            animation: none;
            opacity: 0.6;
          }
        }
      `}</style>

      <div
        className={`elastic-pulse-container ${className}`}
        style={containerStyle}
        role="status"
        aria-label="Loading"
      >
        <span className="elastic-pulse-dot" style={dotStyle} />
        <span className="elastic-pulse-dot" style={dotStyle} />
        <span className="elastic-pulse-dot" style={dotStyle} />
      </div>
    </>
  );
};

export default ElasticPulse;