import React from 'react';

export interface ElasticPulseProps {
  size?: number;
  color?: string;
  gap?: number;
  className?: string;
}

const ElasticPulse: React.FC<ElasticPulseProps> = ({
  size = 12, // Reduced default size slightly
  color = '#ffffff', // Changed to white
  gap = 24, // Reduced gap slightly to match new size
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
          animation: elastic-pulse 1.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          will-change: transform, opacity, box-shadow;
          /* Base glow */
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.4); 
        }
        .elastic-pulse-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .elastic-pulse-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes elastic-pulse {
          0%, 100% {
            transform: scale(0.7);
            opacity: 0.4;
            box-shadow: 0 0 4px rgba(255, 255, 255, 0.2); /* Dim glow */
          }
          50% {
            transform: scale(1.3); /* Expand outward */
            opacity: 1;
            box-shadow: 0 0 16px rgba(255, 255, 255, 0.9); /* Bright glow */
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .elastic-pulse-dot {
            animation: none;
            opacity: 0.8;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
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