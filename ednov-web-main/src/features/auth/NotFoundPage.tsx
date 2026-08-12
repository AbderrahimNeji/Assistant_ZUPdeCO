import * as React from 'react';
import { SearchX } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="unauth-root">
      {/* Floating orbs */}
      <div className="unauth-orb notfound-orb-1" />
      <div className="unauth-orb notfound-orb-2" />
      <div className="unauth-orb unauth-orb-3" />

      {/* Floating rings */}
      <div className="unauth-ring notfound-ring-1" />
      <div className="unauth-ring notfound-ring-2" />
      <div className="unauth-ring unauth-ring-3" />

      {/* Floating particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`unauth-particle notfound-particle-${i + 1}`} />
      ))}

      {/* Card */}
      <div className="unauth-card notfound-card">
        {/* Glow halo behind icon */}
        <div className="unauth-icon-halo notfound-icon-halo" />

        {/* Animated icon */}
        <div className="unauth-icon-wrap">
          <div className="unauth-icon-ring notfound-icon-ring" />
          <div className="unauth-icon-box notfound-icon-box">
            <SearchX className="unauth-icon notfound-icon" strokeWidth={1.4} />
          </div>
        </div>

        {/* 404 */}
        <div className="unauth-code notfound-code">404</div>

        {/* Animated scan line */}
        <div className="unauth-scan notfound-scan" />

        {/* Title */}
        <h1 className="unauth-title">Page introuvable</h1>

        {/* Description */}
        <p className="unauth-desc">
          La page que vous recherchez n'existe pas ou a été déplacée.
          <br />
          Vérifiez l'URL ou revenez à la page précédente.
        </p>

        {/* Bottom tag */}
        <div className="unauth-tag notfound-tag">
          <span className="unauth-tag-dot notfound-tag-dot" />
          Erreur&nbsp;404&nbsp;—&nbsp;Not Found
        </div>
      </div>
    </div>
  );
};
