import React from 'react';

const Logo = ({ size = 40, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Pin / Marker shape as a stylized 'G' */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bef264" />
          <stop offset="100%" stopColor="#65a30d" />
        </linearGradient>
      </defs>
      
      {/* Outer Marker Shape */}
      <path 
        d="M250 480C250 480 430 340 430 200C430 100.589 349.411 20 250 20C150.589 20 70 100.589 70 200C70 340 250 480 250 480Z" 
        fill="url(#logoGradient)" 
      />
      
      {/* The 'G' cut-out effect / Road perspective */}
      <path 
        d="M250 480L330 380H170L250 480Z" 
        fill="#15803d" 
        opacity="0.3"
      />
      
      {/* Road with Perspective */}
      <path 
        d="M250 450L300 350H200L250 450Z" 
        fill="white" 
      />
      <rect x="245" y="360" width="10" height="40" fill="#bef264" opacity="0.8" />
      <rect x="245" y="410" width="10" height="30" fill="#bef264" opacity="0.8" />

      {/* Bus Silhouette */}
      <g transform="translate(140, 120) scale(1.1)">
        {/* Main Body */}
        <path d="M20 20C20 9 29 0 40 0H160C171 0 180 9 180 20V140C180 151 171 160 160 160H40C29 160 20 151 20 140V20Z" fill="var(--brand-bus)" />
        
        {/* Windshield */}
        <path d="M35 15C35 10 40 5 45 5H155C160 5 165 10 165 15V80H35V15Z" fill="#334155" />
        <path d="M40 10H160V40H40V10Z" fill="white" opacity="0.1" />
        
        {/* Lights */}
        <circle cx="50" cy="130" r="12" fill="white" />
        <circle cx="150" cy="130" r="12" fill="white" />
        
        {/* Grill/Detail */}
        <path d="M90 140H110L100 155L90 140Z" fill="#84cc16" />
        
        {/* Mirrors */}
        <rect x="0" y="40" width="15" height="40" rx="5" fill="var(--brand-bus)" />
        <rect x="185" y="40" width="15" height="40" rx="5" fill="var(--brand-bus)" />
      </g>
    </svg>
  );
};

export default Logo;
