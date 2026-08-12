import * as React from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Users,
  Minus,
  DoorOpen,
  UserCog,
  Shield,
  Clock,
  Handshake,
} from 'lucide-react';

function computePartnershipSeniority(startDate: Date | string | null | undefined): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (totalMonths < 0) return null;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} mois`;
  if (months === 0) return `${years} an${years > 1 ? 's' : ''}`;
  return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
}
import { useQuery } from '@tanstack/react-query';
import { DetailBadge } from '../DetailBadge';
import { EmptyPlaceholder } from '../EmptyPlaceholder';
import { DetailField } from '../DetailField';
import { DetailChipList } from '../DetailChipList';
import { SectionCard } from '@/components/common/cards/SectionCard';
import {
  ESTABLISHMENT_PRIORITY_NETWORK_CONFIG,
  ESTABLISHMENT_STATUS_CONFIG,
  ESTABLISHMENT_TYPE_CONFIG,
  PARTNER_RELATIONSHIP_QUALITY_CONFIG,
} from '@/components/establishments/establishment-configs';
import { getRooms } from '@/services/rooms.service';
import type { Establishment } from '@/types/establishment.types';

const EstablishmentDetails = ({ establishment }: { establishment: Establishment }) => {
  const statusConfig =
    ESTABLISHMENT_STATUS_CONFIG[establishment.status] || ESTABLISHMENT_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const typeConfig = establishment.type ? ESTABLISHMENT_TYPE_CONFIG[establishment.type] : null;
  const TypeIcon = typeConfig?.icon;

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', establishment.id],
    queryFn: () => getRooms(establishment.id),
  });

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'active' ? 'success' : 'error';
  };

  const typeColorName = typeConfig?.colorName ?? 'color-2';

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <Building2 className="w-6 h-6 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">{establishment.name}</h3>
              {typeConfig && TypeIcon && (
                <DetailBadge
                  label={typeConfig.label}
                  icon={TypeIcon}
                  colorName={typeColorName}
                  variant="filled"
                />
              )}
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(establishment.status)}
                variant="outlined"
              />
            </div>
            {establishment.officialName && (
              <p className="details-view-header-subtitle">{establishment.officialName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard
          icon={Building2}
          title="Informations générales"
          colorName="color-2"
          colSpan={1}
        >
          <div className="space-y-3">
            <DetailField label="Code UAI" value={establishment.uaiCode} />
            <DetailField label="Nom" value={establishment.name} />
            {establishment.officialName && (
              <DetailField label="Nom officiel" value={establishment.officialName} />
            )}
            {establishment.ipsValue != null && (
              <DetailField
                label="IPS"
                value={`${establishment.ipsValue}${establishment.ipsYear ? ` (${establishment.ipsYear})` : ''}`}
              />
            )}
            {establishment.priorityNetwork && (
              <DetailField
                label="Réseau prioritaire"
                value={
                  ESTABLISHMENT_PRIORITY_NETWORK_CONFIG[establishment.priorityNetwork]?.label ??
                  establishment.priorityNetwork
                }
              />
            )}
            {establishment.isQpv != null && (
              <DetailField label="QPV" value={establishment.isQpv ? 'Oui' : 'Non'} />
            )}
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title="Adresse" colorName="color-1" colSpan={1}>
          {establishment.addressLine1 || establishment.postalCode || establishment.city ? (
            <div className="space-y-3">
              {establishment.addressLine1 && (
                <DetailField label="Adresse" value={establishment.addressLine1} />
              )}
              {establishment.department && (
                <DetailField label="Département" value={establishment.department} />
              )}
              {establishment.postalCode && establishment.city && (
                <DetailField
                  label="Ville"
                  value={`${establishment.postalCode} ${establishment.city}`}
                />
              )}
            </div>
          ) : (
            <EmptyPlaceholder message="Aucune adresse renseignée" />
          )}
        </SectionCard>

        <SectionCard icon={Users} title="Engagement & Contrat" colorName="color-2" colSpan={1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {establishment.studentQuota !== null && establishment.studentQuota !== undefined && (
              <DetailField label="Quota élèves" value={establishment.studentQuota.toString()} />
            )}
            {establishment.volunteerQuota !== null &&
              establishment.volunteerQuota !== undefined && (
                <DetailField label="Quota VSC" value={establishment.volunteerQuota.toString()} />
              )}
            {establishment.engagementStartDate && (
              <DetailField
                label="Date de début partenariat"
                value={new Date(establishment.engagementStartDate).toLocaleDateString('fr-FR')}
              />
            )}
            {establishment.engagementEndDate && (
              <DetailField
                label="Date fin partenariat"
                value={new Date(establishment.engagementEndDate).toLocaleDateString('fr-FR')}
              />
            )}
            {(() => {
              const seniority = computePartnershipSeniority(establishment.engagementStartDate);
              return seniority ? (
                <DetailField icon={Clock} label="Ancienneté partenariat" value={seniority} />
              ) : null;
            })()}
            {establishment.renewalNextYear != null && (
              <DetailField
                label="Reconduction prévue N+1"
                value={establishment.renewalNextYear ? 'Oui' : 'Non'}
              />
            )}
          </div>
        </SectionCard>

        {(establishment.conventionSigned != null ||
          establishment.hasDevoirsFaits != null ||
          establishment.hasInternat != null ||
          establishment.involvementLevel != null ||
          establishment.partnerRelationshipQuality != null) && (
          <SectionCard
            icon={Handshake}
            title="Dispositifs & Partenariat"
            colorName="color-3"
            colSpan={1}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {establishment.conventionSigned != null && (
                <DetailField
                  label="Convention signée"
                  value={establishment.conventionSigned ? 'Oui' : 'Non'}
                />
              )}
              {establishment.hasDevoirsFaits != null && (
                <DetailField
                  label="Présence dispositif Devoirs Faits"
                  value={establishment.hasDevoirsFaits ? 'Oui' : 'Non'}
                />
              )}
              {establishment.hasInternat != null && (
                <DetailField
                  label="Présence internat"
                  value={establishment.hasInternat ? 'Oui' : 'Non'}
                />
              )}
              {establishment.involvementLevel != null && (
                <DetailField
                  label="Niveau d'implication"
                  value={`${establishment.involvementLevel} / 5`}
                />
              )}
              {establishment.partnerRelationshipQuality != null && (
                <DetailField
                  label="Qualité relation partenaire"
                  value={
                    PARTNER_RELATIONSHIP_QUALITY_CONFIG[establishment.partnerRelationshipQuality]
                      ?.label ?? establishment.partnerRelationshipQuality
                  }
                />
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard icon={User} title="CPE" colorName="color-3" colSpan="full">
          {(() => {
            const hasContacts = establishment.contacts && establishment.contacts.length > 0;
            const hasLegacyContact =
              establishment.contactName || establishment.contactEmail || establishment.contactPhone;

            if (hasContacts) {
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {establishment.contacts.map((contact, index) => (
                    <div
                      key={contact.contactEmail || contact.contactName || `contact-${index}`}
                      className="p-3 rounded-lg border border-[color-mix(in_srgb,var(--color-3-nuance-1)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-3-nuance-1)_5%,transparent)]"
                    >
                      <div className="space-y-2">
                        {contact.contactName && (
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-[var(--color-3-nuance-1)] shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">
                              {contact.contactName}
                            </span>
                          </div>
                        )}
                        {contact.contactEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-[var(--color-3-nuance-1)] shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {contact.contactEmail}
                            </span>
                          </div>
                        )}
                        {contact.contactPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-[var(--color-3-nuance-1)] shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              {contact.contactPhone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            if (hasLegacyContact) {
              return (
                <div className="grid grid-cols-3 gap-4">
                  {establishment.contactName && (
                    <DetailField icon={User} label="Nom" value={establishment.contactName} />
                  )}
                  {establishment.contactEmail && (
                    <DetailField icon={Mail} label="Email" value={establishment.contactEmail} />
                  )}
                  {establishment.contactPhone && (
                    <DetailField
                      icon={Phone}
                      label="Téléphone"
                      value={establishment.contactPhone}
                    />
                  )}
                </div>
              );
            }

            return <EmptyPlaceholder message="Aucun CPE renseigné" />;
          })()}
        </SectionCard>

        <SectionCard icon={DoorOpen} title="Salles" colorName="color-1" colSpan={1}>
          <DetailField label="Nombre de salles" value={rooms.length.toString()} />
        </SectionCard>

        <SectionCard
          icon={UserCog}
          title="Gestion de l'établissement"
          colorName="color-2"
          colSpan={2}
        >
          <div className="space-y-6">
            {establishment.managedBy && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
                  <h5 className="text-sm font-medium text-foreground">Manager</h5>
                </div>
                <div className="p-3 rounded-lg border border-[color-mix(in_srgb,var(--color-2-nuance-1)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_5%,transparent)]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--color-2-nuance-1)] shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {`${establishment.managedBy.firstName || ''} ${establishment.managedBy.lastName || ''}`.trim() ||
                        establishment.managedBy.email ||
                        establishment.managedBy.id}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {establishment.coordinators && establishment.coordinators.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
                  <h5 className="text-sm font-medium text-foreground">Coordinateurs</h5>
                </div>
                <DetailChipList
                  items={establishment.coordinators.map((c) => ({
                    id: c.id,
                    label: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || c.id,
                    icon: User,
                  }))}
                  colorScheme="color-2"
                  variant="filled"
                />
              </div>
            )}
            {!establishment.managedBy &&
              (!establishment.coordinators || establishment.coordinators.length === 0) && (
                <EmptyPlaceholder message="Aucun gestionnaire assigné" />
              )}
          </div>
        </SectionCard>
      </div>

      {establishment.createdAt && (
        <div className="mt-8 pt-4 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Créé le {new Date(establishment.createdAt).toLocaleDateString('fr-FR')}</span>
            {establishment.updatedAt && (
              <>
                <Minus className="w-3 h-3" />
                <span>
                  Modifié le {new Date(establishment.updatedAt).toLocaleDateString('fr-FR')}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export const renderEstablishmentContent = (establishment: Establishment): React.ReactNode => {
  return <EstablishmentDetails establishment={establishment} />;
};
