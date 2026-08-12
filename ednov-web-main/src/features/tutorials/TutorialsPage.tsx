import * as React from 'react';
import { GraduationCap, UserPlus, HelpCircle, Phone, Clock } from 'lucide-react';

export const TutorialsPage: React.FC = () => {
  return (
    <div className="management-page">
      {/* Header */}
      <div className="management-page-header">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center border-2"
            style={{
              background: 'color-mix(in srgb, var(--color-2-nuance-1) 10%, transparent)',
              borderColor: 'var(--color-2-nuance-1)',
            }}
          >
            <HelpCircle className="w-6 h-6" style={{ color: 'var(--color-2-nuance-1)' }} />
          </div>
          <div>
            <h1 className="management-page-title">Tutoriels et aide</h1>
            <p className="management-page-subtitle">
              Guides vidéo et ressources pour vous accompagner dans l'utilisation de la plateforme
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="management-page-content">
        <div className="space-y-6">
          {/* Tutoriel 1: Création d'un tuteur */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
                }}
              >
                <UserPlus className="h-5 w-5" style={{ color: 'var(--color-2-nuance-1)' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Comment créer un tuteur</h3>
                <p className="text-sm text-muted-foreground">
                  Créez un profil tuteur en quelques étapes simples.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <video controls preload="metadata" className="h-full w-full object-cover">
                  <source
                    src="https://storage.googleapis.com/zupdeco-development.appspot.com/Tutorials/Tutoriel%20cr%C3%A9ation%20tuteurs.mp4"
                    type="video/mp4"
                  />
                  Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
              </div>
              <div className="text-right">
                <a
                  href="https://storage.googleapis.com/zupdeco-development.appspot.com/Tutorials/Tutoriel%20cr%C3%A9ation%20tuteurs.mp4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--color-2-nuance-1)' }}
                >
                  Ouvrir en plein écran
                </a>
              </div>
            </div>
          </div>

          {/* Tutoriel 2: Création d'un élève */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-1-nuance-1) 15%, transparent)',
                }}
              >
                <GraduationCap className="h-5 w-5" style={{ color: 'var(--color-1-nuance-1)' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Comment créer un élève</h3>
                <p className="text-sm text-muted-foreground">
                  Ajoutez un nouvel élève à la plateforme facilement.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <video controls preload="metadata" className="h-full w-full object-cover">
                  <source
                    src="https://storage.googleapis.com/zupdeco-development.appspot.com/Tutorials/Tutoriel%20cr%C3%A9ation%20%C3%A9l%C3%A8ves.mp4"
                    type="video/mp4"
                  />
                  Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
              </div>
              <div className="text-right">
                <a
                  href="https://storage.googleapis.com/zupdeco-development.appspot.com/Tutorials/Tutoriel%20cr%C3%A9ation%20%C3%A9l%C3%A8ves.mp4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--color-1-nuance-1)' }}
                >
                  Ouvrir en plein écran
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Section contact */}
        <div
          className="rounded-lg border p-6 mt-8"
          style={{
            borderColor: 'var(--color-1-nuance-1)',
            backgroundColor: 'color-mix(in srgb, var(--color-1-nuance-1) 8%, transparent)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-1-nuance-2)' }}>
            Besoin d'aide supplémentaire ?
          </h3>
          <p className="text-sm text-foreground mb-5">
            Si vous rencontrez des difficultés ou avez des questions, contactez notre équipe
            support.
          </p>

          <div className="space-y-3">
            {/* Numéro de téléphone */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-1-nuance-1) 20%, transparent)',
                }}
              >
                <Phone className="h-5 w-5" style={{ color: 'var(--color-1-nuance-2)' }} />
              </div>
              <div>
                <a
                  href="tel:+33183901879"
                  className="text-lg font-bold hover:underline"
                  style={{ color: 'var(--color-1-nuance-2)' }}
                >
                  01 83 90 18 79
                </a>
              </div>
            </div>

            {/* Horaires */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-1-nuance-1) 20%, transparent)',
                }}
              >
                <Clock className="h-5 w-5" style={{ color: 'var(--color-1-nuance-2)' }} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Du lundi au vendredi</p>
                <p className="text-xs text-muted-foreground">9h30 - 20h</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
