import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import './menu.css';

/** Reusable navigation. items: [{label, href? , children?: [{label, href}]}]. */
export default function Menu({ items = [], activeHref = '#/' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const root = useRef(null);
  const toggle = useRef(null);
  const id = useId();
  useEffect(() => {
    const outside = (event) => { if (!root.current?.contains(event.target)) setExpanded(null); };
    const navigate = () => { setExpanded(null); setMobileOpen(false); };
    const media = window.matchMedia('(max-width: 1023px)');
    document.addEventListener('pointerdown', outside);
    window.addEventListener('hashchange', navigate);
    media.addEventListener('change', navigate);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('hashchange', navigate); media.removeEventListener('change', navigate); };
  }, []);
  function escape(event) {
    if (event.key !== 'Escape') return;
    if (expanded !== null) { root.current.querySelector(`[data-trigger="${expanded}"]`)?.focus(); setExpanded(null); }
    else { setMobileOpen(false); toggle.current?.focus(); }
  }
  return <nav className="site-menu" aria-label="Navigare principală" ref={root} onKeyDown={escape}>
    <button className="mobile-menu-toggle" ref={toggle} aria-expanded={mobileOpen} aria-controls={`${id}-items`} onClick={() => { setMobileOpen(!mobileOpen); setExpanded(null); }}>
      {mobileOpen ? <X aria-hidden="true"/> : <MenuIcon aria-hidden="true"/>}<span>MENU</span>
    </button>
    <ul className={`menu-items ${mobileOpen ? 'is-open' : ''}`} id={`${id}-items`}>
      {items.map((item, index) => <li className={`menu-item ${expanded === index ? 'expanded' : ''} ${index === 8 ? 'second-row' : ''}`} key={item.label}
        onMouseEnter={() => { if (window.matchMedia('(hover: hover) and (min-width: 1024px)').matches) setExpanded(index); }}
        onMouseLeave={() => { if (window.matchMedia('(hover: hover) and (min-width: 1024px)').matches) setExpanded(null); }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(current => current === index ? null : current); }}>
        {item.children ? <>
          <button className="menu-link" data-trigger={index} aria-expanded={expanded === index} aria-controls={`${id}-${index}`} onClick={() => setExpanded(expanded === index ? null : index)}>
            <span>{item.label}</span><span className="menu-chevron"><ChevronDown aria-hidden="true"/></span>
          </button>
          <ul className="submenu" id={`${id}-${index}`} hidden={expanded !== index}>
            {item.children.map(child => <SubmenuItem key={child.id || child.href || child.label} item={child} activeHref={activeHref} close={() => { setMobileOpen(false); setExpanded(null); }}/>) }
          </ul>
        </> : <a className="menu-link" href={item.href} aria-current={activeHref === item.href ? 'page' : undefined} onClick={() => { setMobileOpen(false); setExpanded(null); }}>{item.label}</a>}
      </li>)}
    </ul>
  </nav>;
}

function SubmenuItem({ item, activeHref, close }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <li>{item.children?.length ? <><button className="submenu-branch" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{item.label}<ChevronDown size={16}/></button><ul className="submenu-nested" id={id} hidden={!open}>{item.children.map(child => <SubmenuItem key={child.id || child.label} item={child} activeHref={activeHref} close={close}/>)}</ul></> : <a href={item.href || '#/'} aria-current={activeHref === item.href ? 'page' : undefined} onClick={close}>{item.label}</a>}</li>;
}
