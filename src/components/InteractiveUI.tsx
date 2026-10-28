import React, { useState, useRef, useCallback } from 'react';
import { soundEngine } from '../utils/sound';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  accentColor?: string;
  soundFreq?: number;
  children: React.ReactNode;
}

/**
 * Mandatory Liquid Shockwave Ripple Button with Web Audio API feedback
 */
export const RippleButton: React.FC<RippleButtonProps> = ({
  accentColor = 'rgba(255, 255, 255, 0.45)',
  soundFreq = 520,
  onClick,
  className = '',
  children,
  ...props
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const id = nextId.current++;

      setRipples((prev) => [...prev, { id, x, y, size }]);
      soundEngine.playClick(soundFreq);

      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 650);

      if (onClick) {
        onClick(e);
      }
    },
    [onClick, soundFreq]
  );

  return (
    <button
      onClick={handleClick}
      className={`relative overflow-hidden select-none transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${className}`}
      {...props}
    >
      {children}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        {ripples.map((r) => (
          <span
            key={r.id}
            style={{
              left: r.x,
              top: r.y,
              width: r.size,
              height: r.size,
              background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
            }}
            className=" absolute rounded-full animate-[rippleShockwave_650ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
          />
        ))}
      </span>
    </button>
  );
};

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number;
  onClick?: () => void;
}

/**
 * Mandatory 3D Perspective Hover Card with mouse tracking & soft specular highlight
 */
export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  glowColor = '6, 182, 212',
  intensity = 7,
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState(
    'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
  );
  const [specularPos, setSpecularPos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      const rotateY = (relX - 0.5) * intensity * 2;
      const rotateX = (0.5 - relY) * intensity * 2;

      setTransformStyle(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`
      );
      setSpecularPos({
        x: relX * 100,
        y: relY * 100,
        opacity: 0.16,
      });
    },
    [intensity]
  );

  const handleMouseLeave = useCallback(() => {
    setTransformStyle(
      'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    );
    setSpecularPos((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition:
          specularPos.opacity > 0
            ? 'transform 90ms linear'
            : 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`relative rounded-2xl bg-[#0c1018]/90 border border-white/10 ${className}`}
    >
      {/* Dynamic Specular Highlight Overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200"
        style={{
          opacity: specularPos.opacity,
          background: `radial-gradient(420px circle at ${specularPos.x}% ${specularPos.y}%, rgba(${glowColor}, 0.32), rgba(255,255,255,0.06) 45%, transparent 75%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};
