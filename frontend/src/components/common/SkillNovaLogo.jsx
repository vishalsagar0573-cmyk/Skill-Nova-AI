import React from 'react';
import { Link } from 'react-router-dom';

/**
 * SkillNovaLogo Component
 * Renders the official approved SkillNova AI logo asset with 100% preservation
 * of native proportions, transparency, colors, and AI badge.
 * 
 * Master asset: /assets/skillnova-logo.png (1024x572 RGBA)
 */
export default function SkillNovaLogo({ 
  size = 'md', 
  to = '/', 
  className = '', 
  withLink = true,
  alt = 'SkillNova AI' 
}) {
  // Height presets preserving natural 1024:572 (~1.79:1) aspect ratio
  const sizeClasses = {
    xs: 'h-7',
    sm: 'h-8 md:h-9',
    md: 'h-9 md:h-10',
    lg: 'h-11 md:h-12',
    xl: 'h-14 md:h-16',
  };

  const selectedHeight = sizeClasses[size] || sizeClasses.md;

  const imageElement = (
    <img
      src="/assets/skillnova-logo.png"
      alt={alt}
      className={`w-auto object-contain select-none transition-transform duration-200 ${selectedHeight} ${className}`}
      loading="eager"
      decoding="async"
    />
  );

  if (!withLink) {
    return <div className="inline-flex items-center">{imageElement}</div>;
  }

  return (
    <Link 
      to={to} 
      className="inline-flex items-center group transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      aria-label="SkillNova AI Home"
    >
      {imageElement}
    </Link>
  );
}
