import React, { useState, useEffect } from 'react';
import { Camera, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PageGallery({ gallery }) {
  const [activeIdx, setActiveIdx] = useState(null);

  if (!gallery || !gallery.images || gallery.images.length === 0) {
    return null;
  }

  const { title, description, images } = gallery;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeIdx === null) return;
      if (e.key === 'Escape') setActiveIdx(null);
      if (e.key === 'ArrowLeft') setActiveIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      if (e.key === 'ArrowRight') setActiveIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIdx, images.length]);

  return (
    <section className="page-gallery-section" aria-label={title || 'Galerie foto'}>
      <div className="page-gallery-header">
        <div className="gallery-header-badge">
          <Camera size={18} />
          <span>GALERIE FOTO &amp; DOCUMENTE VIZUALE</span>
        </div>
        <h2>{title || 'Imagini reprezentative'}</h2>
        {description && <p className="gallery-desc">{description}</p>}
      </div>

      <div className="page-gallery-grid">
        {images.map((item, idx) => (
          <figure
            key={idx}
            className="gallery-card"
            onClick={() => setActiveIdx(idx)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveIdx(idx); } }}
            aria-label={`Mărește imaginea: ${item.title}`}
          >
            <div className="gallery-card-img-wrap">
              <img
                src={item.src}
                alt={item.title || 'Imagine Comuna Corcova'}
                loading="lazy"
              />
              <span className="gallery-card-overlay">
                <ZoomIn size={24} />
                <span>Mărește</span>
              </span>
            </div>
            <figcaption className="gallery-card-caption">
              <strong>{item.title}</strong>
              {item.caption && <small>{item.caption}</small>}
            </figcaption>
          </figure>
        ))}
      </div>

      {activeIdx !== null && images[activeIdx] && (
        <div
          className="gallery-lightbox-overlay"
          onClick={() => setActiveIdx(null)}
          role="dialog"
          aria-modal="true"
          aria-label={images[activeIdx].title}
        >
          <div
            className="gallery-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setActiveIdx(null)}
              aria-label="Închide fereastra"
            >
              <X size={24} />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox-nav-btn prev"
                  onClick={() => setActiveIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                  aria-label="Imaginea anterioară"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  className="lightbox-nav-btn next"
                  onClick={() => setActiveIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                  aria-label="Imaginea următoare"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            <div className="lightbox-img-wrapper">
              <img
                src={images[activeIdx].src}
                alt={images[activeIdx].title}
              />
            </div>

            <div className="lightbox-footer">
              <div className="lightbox-counter">
                {activeIdx + 1} / {images.length}
              </div>
              <div className="lightbox-details">
                <h3>{images[activeIdx].title}</h3>
                {images[activeIdx].caption && <p>{images[activeIdx].caption}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
