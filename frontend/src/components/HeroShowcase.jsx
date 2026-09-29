import React, { useState } from 'react';
import { MapPin, Image as ImageIcon } from 'lucide-react';
import { HOMEPAGE_MEDIA } from '../mediaData';

export default function HeroShowcase() {
  const slides = HOMEPAGE_MEDIA.heroSlides;
  const [currentIdx, setCurrentIdx] = useState(0);

  const active = slides[currentIdx] || slides[0];

  return (
    <div className="hero-showcase-box">
      <div className="hero-main-photo-wrap">
        <img
          src={active.src}
          alt={active.title}
          className="hero-main-photo"
          loading="eager"
        />
        <div className="hero-photo-gradient" />

        <div className="hero-photo-meta">
          <span className="hero-photo-badge">{active.tag}</span>
          <h3 className="hero-photo-title">{active.title}</h3>
          <p className="hero-photo-caption">{active.caption}</p>
        </div>

        <div className="hero-location-chip">
          <MapPin size={14} />
          <span>Corcova • Mehedinți</span>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="hero-thumbs-row" role="tablist" aria-label="Alege imaginea de prezentare">
          {slides.map((s, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === currentIdx}
              className={`hero-thumb-btn ${idx === currentIdx ? 'active' : ''}`}
              onClick={() => setCurrentIdx(idx)}
              aria-label={`Vezi ${s.title}`}
            >
              <img src={s.src} alt="" aria-hidden="true" />
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
