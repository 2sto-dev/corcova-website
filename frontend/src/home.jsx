import React from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, FileText, Landmark, Mail, MapPin, Phone, Sprout, UsersRound } from 'lucide-react';
import { siteApi, useApi } from './api';
import HeroShowcase from './components/HeroShowcase';
import CommunityPillars from './components/CommunityPillars';
import { cleanInternalHref } from './routing';

const icons = {
  file: FileText,
  users: UsersRound,
  landmark: Landmark,
  book: BookOpen
};

export const safeHref = value => cleanInternalHref(value);

export default function Home({ presentation = {}, site = {}, illustration }) {
  const latest = useApi(`${siteApi}/documents/?page_size=4&ordering=-published_at`);
  const { hero = {}, news = {}, panel = {}, community = {}, quick_links = [] } = presentation;
  const email = site?.email || 'primaria.corcova@gmail.com';
  const phone = site?.phone || '0252 383 464';
  const phoneClean = phone.replace(/[\s.]/g, '');

  return (
    <div className="home-page">
      <section className="hero relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-sky-50">
        <div className="container hero-inner relative">
          <div className="hero-copy">
            <div className="eyebrow text-sky-800">
              <span/>{hero.eyebrow || 'COMUNA CORCOVA, JUDEȚUL MEHEDINȚI'}
            </div>
            <h1>
              {hero.title}<br/>{hero.subtitle} <em>{hero.accent}</em>
            </h1>
            <p>{hero.description}</p>
            <div className="hero-actions mt-8">
              {hero.primary && (
                <a className="button primary rounded-lg px-6 shadow-md shadow-blue-900/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" href={safeHref(hero.primary.href)}>
                  {hero.primary.label} <ArrowRight size={18}/>
                </a>
              )}
              {hero.secondary && (
                <a className="text-link rounded-lg px-2 py-2 transition-colors hover:bg-white/80" href={safeHref(hero.secondary.href)}>
                  {hero.secondary.label} <ArrowUpRight size={17}/>
                </a>
              )}
            </div>
          </div>
          <div className="hero-art">
            {illustration || <HeroShowcase />}
          </div>
        </div>
      </section>

      {quick_links.length > 0 && (
        <section className="container quick-access relative z-10 -mt-6 rounded-2xl border-slate-200 bg-white shadow-xl shadow-slate-900/5" aria-label="Acces rapid">
          {quick_links.map((item, index) => {
            const Icon = icons[item.icon] || FileText;
            return (
              <a href={safeHref(item.href)} className="shortcut group rounded-xl border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:bg-slate-50 hover:shadow-lg" key={index}>
                <span className="shortcut-icon transition-colors duration-200 group-hover:bg-sky-100 group-hover:text-sky-800"><Icon size={24}/></span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </span>
                <ArrowUpRight size={18} className="shortcut-arrow"/>
              </a>
            );
          })}
        </section>
      )}

      {/* Domenii principale, inițiative strategice și conducerea comunei */}
      <CommunityPillars />

      <section className="container news-layout items-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{news.eyebrow || 'LA ZI CU PRIMĂRIA'}</span>
              <h2>{news.title || 'Anunțuri și documente oficiale'}</h2>
            </div>
            <a className="text-link rounded-lg px-3 py-2 text-sky-800 transition-colors hover:bg-sky-50" href={safeHref(news.href || '/anunturi')}>
              Vezi toate <ArrowRight size={17}/>
            </a>
          </div>

          <div className="news-list">
            {latest.loading && <p role="status">Se încarcă documentele…</p>}
            {latest.error && <p role="alert">{latest.error}</p>}
            {latest.data?.results?.map(doc => (
              <a className="news-row rounded-lg px-3 transition-colors hover:bg-slate-50" key={doc.id} href={doc.download_url} target="_blank" rel="noopener noreferrer">
                <span className="news-date">
                  <strong>
                    {doc.year ? doc.year : 'DOC'}
                  </strong>
                  <small>ACT</small>
                </span>
                <span className="news-content">
                  <span className="tag">DOCUMENT PUBLIC</span>
                  <h3>{doc.title}</h3>
                  <span className="document-caption">
                    Consultă documentul <span>{doc.original_filename?.split('.').pop()?.toUpperCase()}</span>
                  </span>
                </span>
                <ArrowUpRight size={21}/>
              </a>
            ))}
          </div>
        </div>

        <aside className="citizen-panel rounded-2xl border-slate-200 bg-gradient-to-b from-sky-50 to-white shadow-sm lg:sticky lg:top-6">
          <span className="panel-icon"><Landmark size={28}/></span>
          <span className="eyebrow">{panel.eyebrow || 'ADMINISTRAȚIE DESCHISĂ'}</span>
          <h2>{panel.title || 'Primăria în slujba comunității.'}</h2>
          <p>{panel.description || 'Acces simplu și transparent la deciziile autorităților locale.'}</p>
          {panel.links?.map((link, index) => (
            <a key={index} href={safeHref(link.href)}>
              {link.label} <ArrowRight size={17}/>
            </a>
          ))}
          <div className="citizen-contact-box" aria-label="Date de contact primărie">
            <a className="citizen-contact-entry" href={`mailto:${email}`} aria-label={`Email: ${email}`}>
              <Mail size={17}/>
              <span>{email}</span>
            </a>
            <a className="citizen-contact-entry" href={`tel:${phoneClean}`} aria-label={`Telefon: ${phone}`}>
              <Phone size={17}/>
              <span>{phone}</span>
            </a>
          </div>
          <span className="panel-bottom">{panel.caption || 'TRANSPARENȚĂ. DIALOG. IMPLICARE.'}</span>
        </aside>
      </section>

      <section className="community-strip bg-gradient-to-r from-slate-50 via-emerald-50/60 to-slate-50">
        <div className="container community-inner">
          <span className="community-icon"><Sprout size={37}/></span>
          <div>
            <span className="eyebrow">{community.eyebrow || 'RĂDĂCINI ISTORICE. ZONĂ VITICOLĂ PRIVILEGIATĂ.'}</span>
            <h2>{community.title || 'Descoperiți Comuna Corcova'}</h2>
            <p>{community.description}</p>
          </div>
          {community.link && (
            <a className="button outline rounded-lg bg-white px-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" href={safeHref(community.link.href)}>
              {community.link.label} <ArrowUpRight size={18}/>
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
