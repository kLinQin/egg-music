import { useEffect, useRef, useState } from 'react';
import { TIPS_SECTIONS } from '../lib/tipsContent';

export function TipsView() {
   const [activeId, setActiveId] = useState<string>(TIPS_SECTIONS[0].id);
   const contentRef = useRef<HTMLDivElement>(null);

   const scrollToSection = (id: string) => {
      const el = document.getElementById(`tips-section-${id}`);
      if (el) {
         el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setActiveId(id);
   };

   // Update active section on scroll
   useEffect(() => {
      const container = contentRef.current;
      if (!container) return;

      const handleScroll = () => {
         const scrollTop = container.scrollTop;
         const offset = 80;

         let current = TIPS_SECTIONS[0].id;
         for (const s of TIPS_SECTIONS) {
            const el = document.getElementById(`tips-section-${s.id}`);
            if (!el) continue;
            if (el.offsetTop - offset <= scrollTop) {
               current = s.id;
            } else {
               break;
            }
         }
         setActiveId(current);
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
   }, []);

   return (
      <div className="tips-view">
         <aside className="tips-sidebar">
            <div className="tips-sidebar-header">Daftar Isi</div>
            <ul className="tips-sidebar-list">
               {TIPS_SECTIONS.map((s) => (
                  <li key={s.id}>
                     <button
                        className={`tips-sidebar-item ${activeId === s.id ? 'active' : ''}`}
                        onClick={() => scrollToSection(s.id)}
                     >
                        {s.title}
                     </button>
                  </li>
               ))}
            </ul>
         </aside>

         <div className="tips-content" ref={contentRef}>
            <div className="tips-content-inner">
               {TIPS_SECTIONS.map((s) => (
                  <section
                     key={s.id}
                     id={`tips-section-${s.id}`}
                     className="tips-section"
                  >
                     <h1 className="tips-section-title">{s.title}</h1>
                     <div className="tips-section-body">{s.content}</div>
                  </section>
               ))}
            </div>
         </div>
      </div>
   );
}