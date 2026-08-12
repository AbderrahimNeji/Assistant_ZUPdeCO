import * as React from 'react';
import { ShieldX } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="unauth-root">
      {/* Floating orbs */}
      <div className="unauth-orb unauth-orb-1" />
      <div className="unauth-orb unauth-orb-2" />
      <div className="unauth-orb unauth-orb-3" />

      {/* Floating rings */}
      <div className="unauth-ring unauth-ring-1" />
      <div className="unauth-ring unauth-ring-2" />
      <div className="unauth-ring unauth-ring-3" />

      {/* Floating particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`unauth-particle unauth-particle-${i + 1}`} />
      ))}

      {/* Card */}
      <div className="unauth-card">
        {/* Glow halo behind icon */}
        <div className="unauth-icon-halo" />

        {/* Animated icon */}
        <div className="unauth-icon-wrap">
          <div className="unauth-icon-ring" />
          <div className="unauth-icon-box">
            <ShieldX className="unauth-icon" strokeWidth={1.4} />
          </div>
        </div>

        {/* 403 */}
        <div className="unauth-code">403</div>

        {/* Animated scan line */}
        <div className="unauth-scan" />

        {/* Title */}
        <h1 className="unauth-title">Accès refusé</h1>

        {/* Description */}
        <p className="unauth-desc">
          Vous ne disposez pas des permissions nécessaires pour accéder à cette page.
          <br />
          Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>

        {/* Bottom tag */}
        <div className="unauth-tag">
          <span className="unauth-tag-dot" />
          Erreur&nbsp;403&nbsp;—&nbsp;Forbidden
        </div>
      </div>
    </div>
  );
};
