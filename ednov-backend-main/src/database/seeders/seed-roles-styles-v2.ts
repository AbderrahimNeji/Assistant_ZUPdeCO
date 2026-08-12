import { DataSource } from 'typeorm';

/**
 * Met à jour les icônes et couleurs des rôles système avec les tokens du branding.
 *
 * Format couleur : 'color-{X}-nuance-{Y}' → résolu côté frontend en var(--color-{X}-nuance-{Y}).
 * Ce format est identique à celui utilisé par le ColorPicker et le système CSS de branding.
 *
 * Icônes : noms exacts des composants lucide-react (PascalCase).
 *
 * Rôles admin (groupe hiérarchique) :
 *   admin       → ShieldUser  / color-2-nuance-1   (super admin, identitaire violet)
 *   coordinator → Users       / color-1-nuance-1   (coordinateur, couleur principale)
 *   manager     → UserStar    / color-3-nuance-1   (manager, couleur tertiaire)
 *
 * Autres types d'utilisateurs :
 *   tutor       → GraduationCap / color-1-nuance-2   (tuteur, dérivé couleur principale)
 *   volunteer   → HandHeart     / color-3-nuance-2   (bénévole, dérivé tertiaire)
 *   student     → BookOpen      / color-2-nuance-3   (élève, dérivé secondaire)
 *   PROFESSOR   → BookUser      / color-1-nuance-3   (professeur, dérivé couleur principale)
 */
export async function seedRolesStylesV2(ds: DataSource): Promise<void> {
  console.log('🎨 [v2] Mise à jour icônes et couleurs des rôles avec le branding...');

  const roleStyles: Record<string, { icon: string; color: string }> = {
    // ── Groupe admin ──────────────────────────────────────────────────────────
    admin: { icon: 'ShieldUser', color: 'color-2-nuance-1' },
    coordinator: { icon: 'Users', color: 'color-1-nuance-1' },
    manager: { icon: 'UserStar', color: 'color-3-nuance-1' },
    // ── Autres rôles système ──────────────────────────────────────────────────
    tutor: { icon: 'GraduationCap', color: 'color-1-nuance-2' },
    volunteer: { icon: 'HandHeart', color: 'color-3-nuance-2' },
    student: { icon: 'BookOpen', color: 'color-2-nuance-3' },
    PROFESSOR: { icon: 'BookUser', color: 'color-1-nuance-3' },
  };

  let totalUpdated = 0;

  for (const [code, style] of Object.entries(roleStyles)) {
    const result = await ds.query(
      `UPDATE roles
       SET icon       = $1::varchar,
           color      = $2::varchar,
           updated_at = now()
       WHERE code = $3::varchar
         AND deleted_at IS NULL
       RETURNING id, label`,
      [style.icon, style.color, code],
    );

    if (result.length > 0) {
      totalUpdated += result.length;
      const names = result.map((r: { label: string }) => r.label).join(', ');
      console.log(
        `   ✓ [${code}] "${names}" → icon: ${style.icon} / color: ${style.color}`,
      );
    } else {
      console.log(`   ⚠  Aucun rôle trouvé avec le code '${code}'`);
    }
  }

  console.log(`\n✅ [v2] Styles mis à jour : ${totalUpdated} rôle(s)`);
}
