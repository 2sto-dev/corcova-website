import React from 'react';
import { ArrowRight, Compass, TrendingUp, Users } from 'lucide-react';
import { HOMEPAGE_MEDIA } from '../mediaData';

export default function CommunityPillars() {
  const { pillars, strategicFocus, leadership } = HOMEPAGE_MEDIA;

  return (
    <div className="community-showcase-container">
      {/* 1. Cei 4 Piloni de Dezvoltare */}
      <section className="container community-pillars-section" aria-label="Domenii principale de dezvoltare">
        <div className="section-title-wrap">
          <span className="eyebrow"><span />DOMENII PRINCIPALE</span>
          <h2>Dezvoltarea Comunei Corcova</h2>
          <p className="section-subtext">
            Direcțiile prioritare de acțiune pentru modernizarea infrastructurii, sprijinirea agriculturii și valorificarea tradiției locale.
          </p>
        </div>

        <div className="pillars-grid">
          {pillars.map((item, idx) => (
            <article key={idx} className="pillar-card">
              <a href={item.href} className="pillar-img-link" tabIndex={-1} aria-hidden="true">
                <img src={item.image} alt={item.title} loading="lazy" />
              </a>
              <div className="pillar-body">
                <h3>
                  <a href={item.href}>{item.title}</a>
                </h3>
                <p>{item.description}</p>
                <a href={item.href} className="pillar-more-link">
                  <span>Află detalii</span>
                  <ArrowRight size={16} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 2. Priorități Strategice și Buget */}
      <section className="strategic-focus-section" aria-label="Inițiative strategice">
        <div className="container">
          <div className="section-title-wrap text-center">
            <span className="eyebrow">TRANSPARENȚĂ &amp; VIZIUNE</span>
            <h2>Inițiative Strategice &amp; Finanțe Publice</h2>
          </div>

          <div className="strategic-grid">
            {strategicFocus.map((item, idx) => (
              <div key={idx} className="strategic-card">
                <div className="strategic-img-wrap">
                  <img src={item.image} alt={item.title} loading="lazy" />
                  <span className="strategic-badge">{item.badge}</span>
                </div>
                <div className="strategic-content">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <a href={item.href} className="button outline">
                    <span>Consultă documentele</span>
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Conducerea și Reprezentanții Locali */}
      <section className="container leadership-section" aria-label="Echipa administrativă">
        <div className="section-title-wrap">
          <span className="eyebrow"><Users size={14} style={{ display: 'inline', marginRight: 6 }} />ADMINISTRAȚIA LOCALĂ</span>
          <h2>Echipa Administrativă &amp; Consiliul Local</h2>
          <p className="section-subtext">
            Reprezentanții aleși și aparatul de specialitate dedicat bunei administrări a comunității Corcova.
          </p>
        </div>

        <div className="leadership-grid">
          {leadership.map((member) => (
            <div key={member.id} className="leadership-card">
              <div className="leadership-avatar">
                <img src={member.image} alt={member.name} loading="lazy" />
              </div>
              <div className="leadership-info">
                <span>{member.role}</span>
                <strong>{member.name}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
