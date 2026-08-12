import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Pressable,
  ScrollView,
  Text as NativeText,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorMessage } from '@/components/ErrorMessage';
import { InfoRow } from '@/components/InfoRow';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SectionTitle } from '@/components/SectionTitle';
import { Text } from '@/components/Themed';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AppButton } from '@/components/AppButton';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';
import { AppLogo } from '@/components/AppLogo';
import { LevelBadgeImage } from '@/components/LevelBadgeImage';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import { MIN_TOUCH_TARGET_HEIGHT } from '@/constants/Layout';
import { env } from '@/config/env';
import { useProfile } from '@/hooks/useProfile';
import { useScrollContentBottomPadding } from '@/hooks/useScrollContentBottomPadding';
import { useIsWebDesktop } from '@/hooks/useWebDesktop';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/providers/AuthProvider';
import { getMyCriminalRecordDownloadUrl, uploadCriminalRecordPdf } from '@/services/criminalRecord';
import { displayLabelForNumero, isRemoteIconUrl, tierFromNumero } from '@/utils/levelBadge';

/** Profil → bibliothèque ressources pédagogiques (désactivé). */
const SHOW_PROFILE_PEDAGOGICAL_RESOURCES = false;

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const isDark = colorScheme === 'dark';
  const queryClient = useQueryClient();
  const { data: profile, isLoading, error, refetch } = useProfile();
  const { data: gamification } = useGamification();
  const { signOut } = useAuth();
  const router = useRouter();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const scrollBottom = useScrollContentBottomPadding();
  const isWebDesktop = useIsWebDesktop();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [casierMessage, setCasierMessage] = useState<string | null>(null);
  const [casierError, setCasierError] = useState<string | null>(null);
  const [openingPdf, setOpeningPdf] = useState(false);

  const canUploadCriminalRecord = Boolean(env.apiUrl?.trim()) && !env.useStaticData;

  const uploadCriminalRecordMutation = useMutation({
    mutationFn: ({ uri, name }: { uri: string; name: string }) => uploadCriminalRecordPdf(uri, name),
    onSuccess: () => {
      setCasierError(null);
      setCasierMessage('Document ajouté avec succès.');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e: Error) => {
      setCasierMessage(null);
      setCasierError(e.message || 'Échec du téléversement');
    },
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const handlePickCriminalRecord = async () => {
    if (!canUploadCriminalRecord) return;
    setCasierError(null);
    setCasierMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) {
        setCasierError('Impossible de lire le fichier.');
        return;
      }
      const name = asset.name ?? 'document.pdf';
      const mime = (asset.mimeType ?? '').toLowerCase();
      if (!mime.includes('pdf') && !name.toLowerCase().endsWith('.pdf')) {
        setCasierError('Format invalide. Veuillez importer un fichier PDF.');
        return;
      }
      await uploadCriminalRecordMutation.mutateAsync({ uri: asset.uri, name });
    } catch (e) {
      setCasierMessage(null);
      setCasierError(e instanceof Error ? e.message : 'Échec du téléversement');
    }
  };

  const handleOpenCriminalRecordPdf = async () => {
    if (!canUploadCriminalRecord || !profile?.criminalRecord) return;
    setCasierError(null);
    setOpeningPdf(true);
    try {
      const url = await getMyCriminalRecordDownloadUrl();
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setCasierError(e instanceof Error ? e.message : 'Impossible d’ouvrir le document');
    } finally {
      setOpeningPdf(false);
    }
  };

  const closeLogoutModal = () => {
    setLogoutModalVisible(false);
    setLogoutError(null);
  };

  const screenWrapStyle = {
    flex: 1,
    backgroundColor: colors.pageBackground,
  };
  const headerOffsetStyle = {
    flex: 1,
    paddingTop: SCREEN_HEADER_CONTENT_OFFSET,
  };

  const contentSheetStyle = {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden' as const,
    ...getCardShadowPlatform(isDark),
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={screenWrapStyle}>
        <View style={headerOffsetStyle}>
          <LoadingScreen message="Chargement du profil…" backgroundColor={colors.pageBackground} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView edges={['top']} style={screenWrapStyle}>
        <View style={headerOffsetStyle}>
          <ErrorMessage
            title="Profil indisponible"
            message="Impossible de charger le profil. Veuillez réessayer."
            onRetry={() => { void refetch(); }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleLogout = () => {
    setLogoutError(null);
    setLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    setLogoutError(null);
    setLogoutLoading(true);
    try {
      await signOut();
      setLogoutModalVisible(false);
      router.replace('/(auth)/login' as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'La déconnexion a échoué.';
      setLogoutError(message);
    } finally {
      setLogoutLoading(false);
    }
  };

  const first = profile.firstName?.trim().charAt(0) ?? '';
  const last = profile.lastName?.trim().charAt(0) ?? '';
  const initial = (first || last) ? (first + last).toUpperCase() : '?';

  return (
    <SafeAreaView edges={['top']} style={screenWrapStyle}>
      <View style={headerOffsetStyle}>
        <View style={contentSheetStyle}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: scrollBottom,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <AppLogo size="small" />
            </View>
          {/* Carte utilisateur (style TutorProfile v1) */}
          <View
            style={{
              borderRadius: 20,
              backgroundColor: colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.xl,
              alignItems: 'center',
              marginBottom: spacing.lg,
              ...getCardShadowPlatform(isDark),
            }}
          >
            {profile.avatarUrl ? (
              <View
                style={{
                  borderRadius: 52,
                  borderWidth: 3,
                  borderColor: colors.tint,
                  padding: 2,
                }}
              >
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                  accessibilityLabel="Photo de profil"
                />
              </View>
            ) : (
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: colors.tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: colors.tint + '40',
                  shadowColor: colors.tint,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Text style={{ fontSize: 32, fontWeight: '700', color: isDark ? colors.text : colors.background }}>{initial}</Text>
              </View>
            )}
            <Text
              style={{
                marginTop: 14,
                fontSize: 20,
                fontWeight: '700',
                color: colors.text,
                letterSpacing: -0.3,
              }}
            >
              {profile.firstName} {profile.lastName}
            </Text>
            <View
              style={{
                marginTop: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.tint + '14',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <MaterialCommunityIcons name="school" size={13} color={colors.tint} />
              <Text style={{ fontSize: 12, color: colors.tint, fontWeight: '600' }}>Tuteur</Text>
            </View>
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
              Inscription le {formatDate(profile.createdAt)}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/profile/edit' as never)}
              style={({ pressed }) => ({
                marginTop: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: borderRadius.md,
                backgroundColor: colors.tint + '18',
                opacity: pressed ? 0.8 : 1,
                minHeight: MIN_TOUCH_TARGET_HEIGHT,
              })}
              accessibilityLabel="Modifier le profil"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="pencil" size={18} color={colors.tint} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.tint }}>Modifier</Text>
            </Pressable>
          </View>

          {/* Progression / Gamification (G1–G4) */}
          {gamification ? (
            <View
              style={{
                borderRadius: borderRadius.lg,
                backgroundColor: colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.lg,
                marginBottom: spacing.lg,
                ...getCardShadowPlatform(isDark),
              }}
            >
              <SectionTitle style={{ marginBottom: spacing.sm }}>Progression</SectionTitle>
              {gamification.currentNiveau &&
              (gamification.levelBadge ||
                tierFromNumero(gamification.currentNiveau.numero) ||
                isRemoteIconUrl(gamification.currentNiveau.icone)) ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    marginBottom: spacing.md,
                    padding: spacing.md,
                    borderRadius: borderRadius.lg,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <LevelBadgeImage
                    size={88}
                    levelBadge={gamification.levelBadge}
                    niveauNumero={gamification.currentNiveau.numero}
                    niveauIcone={gamification.currentNiveau.icone}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>
                      Badge de niveau
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 2 }}>
                      {gamification.levelBadge?.displayLabel ??
                        displayLabelForNumero(gamification.currentNiveau.numero) ??
                        gamification.currentNiveau.nom}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }} numberOfLines={2}>
                      Niveau : {gamification.currentNiveau.nom}
                    </Text>
                  </View>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
                <MaterialCommunityIcons name="star" size={20} color={colors.tint} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                  {gamification.totalXp} XP
                </Text>
              </View>
              {gamification.currentNiveau &&
              !(gamification.levelBadge ||
                tierFromNumero(gamification.currentNiveau.numero) ||
                isRemoteIconUrl(gamification.currentNiveau.icone)) ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: spacing.md,
                    backgroundColor: (gamification.currentNiveau.couleur ?? colors.tint) + '18',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: borderRadius.md,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    {gamification.currentNiveau.nom}
                  </Text>
                </View>
              ) : null}
              {gamification.nextNiveau != null && gamification.xpRangeToNext != null && gamification.xpRangeToNext > 0 ? (
                <View style={{ marginBottom: spacing.md }}>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.border,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (gamification.xpInCurrentLevel / gamification.xpRangeToNext) * 100)}%`,
                        backgroundColor: colors.tint,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                    {gamification.totalXp} / {gamification.nextNiveau.xpRequis} XP vers {gamification.nextNiveau.nom}
                  </Text>
                </View>
              ) : null}
              {gamification.badges.length > 0 ? (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
                    Badges
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {gamification.badges.map((a) => (
                      <View
                        key={a.badge.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: (a.badge.couleur ?? colors.tint) + '18',
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: borderRadius.md,
                        }}
                      >
                        <MaterialCommunityIcons
                          name={(a.badge.icone ?? 'medal') as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                          size={16}
                          color={a.badge.couleur ?? colors.tint}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>
                          {a.badge.nom}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              <Pressable
                onPress={() => router.push('/(tabs)/profile/classement' as never)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: spacing.md,
                  paddingTop: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                  minHeight: MIN_TOUCH_TARGET_HEIGHT,
                })}
                accessibilityLabel="Voir le classement"
                accessibilityRole="button"
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <MaterialCommunityIcons name="podium" size={20} color={colors.tint} />
                  <Text style={{ fontSize: 15, fontWeight: '500', color: colors.tint }} numberOfLines={1}>Voir le classement</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/profile/historique' as never)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: spacing.sm,
                  paddingTop: spacing.sm,
                  opacity: pressed ? 0.8 : 1,
                  minHeight: MIN_TOUCH_TARGET_HEIGHT,
                })}
                accessibilityLabel="Historique d'activité"
                accessibilityRole="button"
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <MaterialCommunityIcons name="history" size={20} color={colors.tint} />
                  <Text style={{ fontSize: 15, fontWeight: '500', color: colors.tint }} numberOfLines={1}>Historique d'activité</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} style={{ marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} />
              </Pressable>
            </View>
          ) : null}

          {/* Casier judiciaire */}
          <SectionTitle style={{ marginBottom: spacing.sm }}>Casier judiciaire</SectionTitle>
          <View
            style={{
              borderRadius: borderRadius.lg,
              backgroundColor: colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              marginBottom: spacing.lg,
              ...getCardShadowPlatform(isDark),
            }}
          >
            {casierMessage ? (
              <Text style={{ fontSize: 13, color: colors.success, marginBottom: spacing.sm }}>{casierMessage}</Text>
            ) : null}
            {casierError ? (
              <Text style={{ fontSize: 13, color: colors.danger, marginBottom: spacing.sm }}>{casierError}</Text>
            ) : null}
            {!canUploadCriminalRecord ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm }}>
                Mode démonstration ou API non configurée : le téléversement réel est désactivé.
              </Text>
            ) : null}
            {profile.criminalRecord ? (
              <>
                <View style={{ marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Fichier</Text>
                  <Text
                    style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {profile.criminalRecord.fileName}
                  </Text>
                </View>
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Date de dépôt</Text>
                  <Text style={{ fontSize: 15, color: colors.text, marginTop: 2 }}>
                    {formatDate(profile.criminalRecord.depositedAt)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md }}>
                Aucun document déposé. Ajoutez votre casier judiciaire au format PDF.
              </Text>
            )}
            {canUploadCriminalRecord && profile.criminalRecord?.status !== 'validated' ? (
              <Pressable
                onPress={() => void handlePickCriminalRecord()}
                disabled={uploadCriminalRecordMutation.isPending}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.tint + '18',
                  opacity: pressed || uploadCriminalRecordMutation.isPending ? 0.75 : 1,
                  marginBottom: spacing.sm,
                  minHeight: MIN_TOUCH_TARGET_HEIGHT,
                })}
                accessibilityLabel={profile.criminalRecord ? 'Remplacer le document PDF' : 'Ajouter un document PDF'}
                accessibilityRole="button"
              >
                {uploadCriminalRecordMutation.isPending ? (
                  <ActivityIndicator color={colors.tint} />
                ) : (
                  <MaterialCommunityIcons name="file-upload-outline" size={22} color={colors.tint} />
                )}
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.tint }}>
                  {profile.criminalRecord ? 'Remplacer le document' : 'Ajouter un document'}
                </Text>
              </Pressable>
            ) : null}
            {profile.criminalRecord && canUploadCriminalRecord ? (
              <Pressable
                onPress={() => void handleOpenCriminalRecordPdf()}
                disabled={openingPdf}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: borderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed || openingPdf ? 0.75 : 1,
                  minHeight: MIN_TOUCH_TARGET_HEIGHT,
                })}
                accessibilityLabel="Voir le PDF du casier judiciaire"
                accessibilityRole="button"
              >
                {openingPdf ? (
                  <ActivityIndicator color={colors.tint} />
                ) : (
                  <MaterialCommunityIcons name="file-eye-outline" size={22} color={colors.text} />
                )}
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Voir le PDF</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Coordonnées */}
          <SectionTitle style={{ marginBottom: spacing.sm }}>Coordonnées</SectionTitle>
          <View
            style={{
              borderRadius: borderRadius.lg,
              backgroundColor: colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              marginBottom: spacing.lg,
              ...getCardShadowPlatform(isDark),
            }}
          >
            <InfoRow
              icon="phone-outline"
              iconColor={colors.info}
              label="Téléphone"
              value={profile.phone ?? '—'}
              colors={colors}
            />
            <InfoRow
              icon="domain"
              iconColor={colors.success}
              label="Établissement"
              value={profile.establishment ?? '—'}
              colors={colors}
              last
            />
          </View>

          {/* Créneaux d'engagement */}
          <SectionTitle style={{ marginBottom: spacing.sm }}>Créneaux d'engagement</SectionTitle>
          <View
            style={{
              borderRadius: borderRadius.lg,
              backgroundColor: colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              marginBottom: spacing.xl,
              ...getCardShadowPlatform(isDark),
            }}
          >
            {(() => {
              const slots = profile.engagement ?? [];
              return slots.length > 0 ? (
                slots.map((slot, i) => (
                  <View
                    key={`${slot.day}-${slot.start}-${slot.end}-${i}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderBottomWidth: i < slots.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.tint + '18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="clock-outline" size={18} color={colors.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7, color: colors.textSecondary, marginBottom: 2 }}>
                      {slot.day}
                    </Text>
                    <Text style={{ fontSize: 15, color: colors.text, fontWeight: '500' }}>
                      {slot.start} – {slot.end}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.textSecondary + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="clock-remove-outline" size={18} color={colors.textSecondary} />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Aucun créneau déclaré</Text>
              </View>
            );
            })()}
          </View>

          {/* Apparence / Mode sombre */}
          <SectionTitle style={{ marginBottom: spacing.sm }}>Apparence</SectionTitle>
          <View
            style={{
              borderRadius: borderRadius.lg,
              backgroundColor: colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              marginBottom: spacing.lg,
              ...getCardShadowPlatform(isDark),
            }}
          >
            <ThemeToggle />
          </View>

          {SHOW_PROFILE_PEDAGOGICAL_RESOURCES ? (
            <>
              <SectionTitle style={{ marginBottom: spacing.sm }}>Ressources</SectionTitle>
              <View
                style={{
                  borderRadius: borderRadius.lg,
                  backgroundColor: colors.backgroundSecondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                  marginBottom: spacing.lg,
                  ...getCardShadowPlatform(isDark),
                }}
              >
                <Pressable
                  onPress={() => router.push('/(tabs)/profile/ressources' as never)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  accessibilityLabel="Ressources pédagogiques"
                  accessibilityRole="button"
                >
                  <View
                    style={{
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.tint + '18',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 1,
                      }}
                    >
                      <MaterialCommunityIcons name="book-open-variant" size={18} color={colors.tint} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <NativeText
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: 0.8,
                          color: colors.textSecondary,
                          marginBottom: 4,
                        }}
                        numberOfLines={1}
                      >
                        Ressources
                      </NativeText>
                      <NativeText
                        style={{ fontSize: 15, color: colors.text, fontWeight: '500' }}
                        numberOfLines={2}
                      >
                        Exercices, fiches et supports utiles
                      </NativeText>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.textSecondary}
                      style={{ flexShrink: 0, marginTop: 6 }}
                    />
                  </View>
                </Pressable>
              </View>
            </>
          ) : null}

          {/* Paramètres notifications — masqué temporairement (à réactiver plus tard) */}
          {false && (
            <>
              <SectionTitle style={{ marginBottom: spacing.sm }}>Notifications</SectionTitle>
              <View
                style={{
                  borderRadius: borderRadius.lg,
                  backgroundColor: colors.backgroundSecondary,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                  marginBottom: spacing.lg,
                  ...getCardShadowPlatform(isDark),
                }}
              >
                <Pressable
                  onPress={() => router.push('/(tabs)/profile/notifications' as never)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  accessibilityLabel="Paramètres des notifications"
                  accessibilityRole="button"
                >
                  <View
                    style={{
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.tint + '18',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 1,
                      }}
                    >
                      <MaterialCommunityIcons name="bell-cog-outline" size={18} color={colors.tint} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <NativeText
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: 0.8,
                          color: colors.textSecondary,
                          marginBottom: 4,
                        }}
                        numberOfLines={1}
                      >
                        Notifications
                      </NativeText>
                      <NativeText
                        style={{ fontSize: 15, color: colors.text, fontWeight: '500' }}
                        numberOfLines={2}
                      >
                        Rappels de séance et alertes CR
                      </NativeText>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.textSecondary}
                      style={{ flexShrink: 0, marginTop: 6 }}
                    />
                  </View>
                </Pressable>
              </View>
            </>
          )}

          {/* Déconnexion — masqué sur web desktop (déjà présent dans la side nav). */}
          {!isWebDesktop && (
            <AppButton
              title="Déconnexion"
              onPress={handleLogout}
              variant="danger"
              icon="logout"
              accessibilityLabel="Déconnexion"
              style={{
                marginTop: spacing.xl,
                marginBottom: spacing.lg,
              }}
            />
          )}
        </ScrollView>
        </View>
      </View>
      <LogoutConfirmModal
        visible={logoutModalVisible}
        onClose={closeLogoutModal}
        onConfirm={handleConfirmLogout}
        loading={logoutLoading}
        error={logoutError}
      />
    </SafeAreaView>
  );
}
