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

      {/* 3. Conducerea Executivă & Aparatul de Specialitate */}
      <section className="container leadership-section" aria-label="Echipa administrativă">
        <div className="leadership-header-flex">
          <div className="section-title-wrap">
            <span className="eyebrow">
              <Users size={14} style={{ display: 'inline', marginRight: 6 }} />
              ADMINISTRAȚIA LOCALĂ
            </span>
            <h2>Conducerea Executivă &amp; Aparatul de Specialitate</h2>
            <p className="section-subtext">
              Reprezentanții aleși și corpul administrativ al Primăriei Comunei Corcova, responsabili de buna administrare și dezvoltarea comunității.
            </p>
          </div>
          <div className="leadership-header-action">
            <a href="#/organigrama" className="button outline organigrama-link">
              <span>Organigramă completă</span>
              <ArrowRight size={16} />
            </a>
          </div>
        </div>

        <div className="leadership-grid">
          {leadership.map((member) => (
            <div
              key={member.id}
              className={`leadership-card ${member.isMayor ? 'is-mayor' : ''}`}
            >
              <div className="leadership-avatar-col">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="leadership-photo"
                    loading="lazy"
                  />
                ) : (
                  <div className="leadership-monogram" aria-hidden="true">
                    {member.initials}
                  </div>
                )}
              </div>
              <div className="leadership-info-col">
                <span className={`leadership-status-badge ${member.isMayor ? 'badge-mayor' : ''}`}>
                  {member.status}
                </span>
                <h3 className="leadership-name">{member.name}</h3>
                <div className="leadership-role">{member.role}</div>
                <div className="leadership-dept">{member.dept}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
