import React, { useId } from 'react';

type LogoGearXProps = {
  size?: number;
  className?: string;
  title?: string;
  // Optional style controls
  variant?: 'mark' | 'wordmark';
  glow?: boolean;
  tone?: 'indigo' | 'gear5';
  motion?: 'none' | 'pulse' | 'drift';
};

/**
 * GearX Mark
 * - Lightweight inline SVG (no external assets)
 * - Gradient gear ring with subtle teeth and a bold "X"
 * - Tiny "steam" puffs hinting at Luffy's Gear transformations
 * - Dark/light friendly, motion-safe
 */
export default function LogoGearX({
  size = 28,
  className = '',
  title = 'GearX',
  variant = 'mark',
  glow = false,
  tone = 'indigo',
  motion = 'none',
}: LogoGearXProps) {
  const gid = useId(); // ensures unique gradient/filter ids per instance

  const stops =
    tone === 'gear5'
      ? ['#fb923c', '#ef4444', '#fb7185'] // orange-400 → red-500 → rose-400
      : ['#6366F1', '#A855F7', '#22D3EE']; // indigo-500 → fuchsia-500 → cyan-400

  // Build 8 simple teeth around the circle (minimal DOM)
  const teeth = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i * 360) / 8;
    return (
      <rect
        key={i}
        x="11.1"
        y="1.5"
        rx="0.8"
        ry="0.8"
        width="1.8"
        height="3.2"
        transform={`rotate(${angle} 12 12)`}
        fill={`url(#gxGrad-${gid})`}
        opacity="0.85"
      />
    );
  });

  const rotateClass = motion === 'drift' ? 'gx-anim-rotate' : '';
  const steamClass = motion === 'drift' ? 'gx-anim-steam' : motion === 'pulse' ? 'animate-pulse' : '';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        {/* Main brand gradient */}
        <linearGradient id={`gxGrad-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="55%" stopColor={stops[1]} />
          <stop offset="100%" stopColor={stops[2]} />
        </linearGradient>

        {/* Subtle inner glow for dark backgrounds */}
        <radialGradient id={`gxGlow-${gid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Optional outer glow/aura */}
      {glow && (
        <>
          <circle cx="12" cy="12" r="10.5" fill={`url(#gxGrad-${gid})`} opacity="0.08" />
          <circle cx="12" cy="12" r="9.8" fill={`url(#gxGrad-${gid})`} opacity="0.06" />
        </>
      )}

      {/* Gear group with optional slow drift rotation */}
      <g className={`motion-reduce:animate-none ${rotateClass}`}>
        {/* Outer gear ring */}
        <circle
          cx="12"
          cy="12"
          r="8.2"
          fill="none"
          stroke={`url(#gxGrad-${gid})`}
          strokeWidth="2"
        />

        {/* Teeth */}
        {teeth}

        {/* Inner soft glow (very subtle) */}
        <circle cx="12" cy="12" r="5.8" fill={`url(#gxGlow-${gid})`} opacity="0.18" />

        {/* Bold "X" */}
        <path
          d="M8.2 8.2 L15.8 15.8 M15.8 8.2 L8.2 15.8"
          stroke={`url(#gxGrad-${gid})`}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>

      {/* Steam puffs surrounding the gear (motion-safe) */}
      <g className="motion-reduce:animate-none">
        {
          // Distribute steam around the ring (slight outward radius)
          [10, 55, 110, 160, 200, 250, 300, 340].map((deg, idx) => {
            const rad = (deg * Math.PI) / 180;
            const R = 9.2;
            const cx = 12 + R * Math.cos(rad);
            const cy = 12 - R * Math.sin(rad);
            const sizes = [0.9, 0.7, 0.75, 0.8, 0.6, 0.65, 0.7, 0.6];
            const opac =  [0.75,0.6,0.55,0.65,0.5,0.55,0.6,0.5];
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={sizes[idx % sizes.length]}
                fill={`url(#gxGrad-${gid})`}
                opacity={opac[idx % opac.length]}
                className={steamClass}
                style={{ animationDelay: `${idx * 120}ms` }}
              />
            );
          })
        }
      </g>

      {/* Local keyframes for subtle motion */}
      <style>
        {`
          @keyframes gx-rotate {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          .gx-anim-rotate { animation: gx-rotate 16s linear infinite; }

          @keyframes gx-steam {
            0%   { transform: translate(0, 0); opacity: 0.55; }
            50%  { transform: translate(0.6px, -1.2px); opacity: 0.9; }
            100% { transform: translate(0, 0); opacity: 0.55; }
          }
          .gx-anim-steam { animation: gx-steam 2.8s ease-in-out infinite; }

          @media (prefers-reduced-motion: reduce) {
            .gx-anim-rotate, .gx-anim-steam { animation: none !important; }
          }
        `}
      </style>
    </svg>
  );
}