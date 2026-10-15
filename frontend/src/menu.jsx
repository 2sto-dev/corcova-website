import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import './navigation.css';

/** Reusable navigation. items: [{label, href? , children?: [{label, href}]}]. */
export default function Menu({ items = [], activeHref = '/' }) {
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
    window.addEventListener('popstate', navigate);
    media.addEventListener('change', navigate);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('popstate', navigate); media.removeEventListener('change', navigate); };
  }, []);
  function escape(event) {
    if (event.key !== 'Escape') return;
    if (expanded !== null) { root.current.querySelector(`[data-trigger="${expanded}"]`)?.focus(); setExpanded(null); }
    else { setMobileOpen(false); toggle.current?.focus(); }
  }
  return <nav className="civic-navigation relative" aria-label="Navigare principală" ref={root} onKeyDown={escape}>
    <button type="button" className="mx-auto flex w-full max-w-7xl items-center justify-end gap-2 px-5 py-3 text-[16px] font-bold uppercase tracking-[0.12em] lg:hidden" ref={toggle} aria-expanded={mobileOpen} aria-controls={`${id}-items`} onClick={() => { setMobileOpen(!mobileOpen); setExpanded(null); }}>
      {mobileOpen ? <X aria-hidden="true"/> : <MenuIcon aria-hidden="true"/>}<span>MENU</span>
    </button>
    <ul className={`${mobileOpen ? 'flex' : 'hidden'} mx-auto max-w-7xl flex-col overflow-visible px-5 py-2 lg:flex lg:max-w-none lg:flex-row lg:flex-nowrap lg:items-center lg:justify-center lg:gap-0 lg:px-2`} id={`${id}-items`}>
      {items.map((item, index) => <li className="relative" key={item.label}
        onMouseEnter={() => { if (window.matchMedia('(hover: hover) and (min-width: 1024px)').matches) setExpanded(index); }}
        onMouseLeave={() => { if (window.matchMedia('(hover: hover) and (min-width: 1024px)').matches) setExpanded(null); }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(current => current === index ? null : current); }}>
        {item.children ? <>
          <button type="button" className="flex w-full items-center justify-between gap-1 rounded-md px-4 py-3 text-left text-[16px] font-semibold transition lg:w-auto lg:px-1" data-trigger={index} aria-expanded={expanded === index} aria-controls={`${id}-${index}`} onClick={() => {
            const desktop = window.matchMedia('(hover: hover) and (min-width: 1024px)').matches;
            setExpanded(current => desktop ? index : (current === index ? null : index));
          }}>
            <span>{item.label}</span><ChevronDown className={`menu-chevron-main transition-transform ${expanded === index ? 'rotate-180' : ''}`} aria-hidden="true"/>
          </button>
          <ul className="absolute left-0 top-full z-30 min-w-64 rounded-lg border p-2 shadow-xl" id={`${id}-${index}`} hidden={expanded !== index}>
            {item.children.map(child => <SubmenuItem key={child.id || child.href || child.label} item={child} activeHref={activeHref} close={() => { setMobileOpen(false); setExpanded(null); }}/>) }
          </ul>
        </> : <a className="block rounded-md px-4 py-3 text-[16px] font-semibold transition lg:px-1" href={item.href} aria-current={activeHref === item.href ? 'page' : undefined} onClick={() => { setMobileOpen(false); setExpanded(null); }}>{item.label}</a>}
      </li>)}
    </ul>
  </nav>;
}

function SubmenuItem({ item, activeHref, close }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <li className="relative">{item.children?.length ? <><button type="button" className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-[16px] font-medium" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{item.label}<ChevronDown className="menu-chevron-sub" size={16}/></button><ul className="ml-3 border-l pl-2" id={id} hidden={!open}>{item.children.map(child => <SubmenuItem key={child.id || child.label} item={child} activeHref={activeHref} close={close}/>)}</ul></> : <a className="block rounded-md px-3 py-2 text-[16px]" href={item.href || '/'} aria-current={activeHref === item.href ? 'page' : undefined} onClick={close}>{item.label}</a>}</li>;
}
