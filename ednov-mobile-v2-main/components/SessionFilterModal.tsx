import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from 'react-native-paper';

import { isAndroid, isWeb } from '@/constants/Platform';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { triggerMedium } from '@/utils/haptics';
import type { SessionFilter, SessionStatus } from '@/types/session';
import type { SessionCrStatusFilter } from '@/store/sessionFilterStore';

const PERIOD_OPTIONS: { value: SessionFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'upcoming', label: 'Prochaines' },
  { value: 'past', label: 'Passées' },
];

const STATUS_OPTIONS: { value: SessionStatus | ''; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'planned', label: 'Planifiée' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'closed', label: 'Clôturée' },
  { value: 'cancelled', label: 'Annulée' },
];

const CR_OPTIONS: { value: SessionCrStatusFilter; label: string }[] = [
  { value: '', label: 'Tous les CR' },
  { value: 'pending', label: 'À saisir' },
  { value: 'submitted', label: 'Saisi' },
  { value: 'validated', label: 'Validé' },
];

export interface SessionFilterModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onApply: (filters: {
    status: SessionStatus | null;
    datePeriod: SessionFilter;
    crStatus: SessionCrStatusFilter;
  }) => void;
  readonly currentFilters: {
    status: SessionStatus | null;
    datePeriod: SessionFilter;
    crStatus: SessionCrStatusFilter;
  };
}

export function SessionFilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
}: Readonly<SessionFilterModalProps>) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [tempStatus, setTempStatus] = useState<SessionStatus | ''>(currentFilters.status ?? '');
  const [tempPeriod, setTempPeriod] = useState<SessionFilter>(currentFilters.datePeriod);
  const [tempCr, setTempCr] = useState<SessionCrStatusFilter>(currentFilters.crStatus);

  useEffect(() => {
    if (visible) {
      setTempStatus(currentFilters.status ?? '');
      setTempPeriod(currentFilters.datePeriod);
      setTempCr(currentFilters.crStatus);
    }
  }, [visible, currentFilters.status, currentFilters.datePeriod, currentFilters.crStatus]);

  useEffect(() => {
    if (!visible || !isAndroid) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible || !isWeb) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        e.preventDefault();
      }
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  const handleApply = () => {
    triggerMedium();
    onApply({
      status: tempStatus || null,
      datePeriod: tempPeriod,
      crStatus: tempCr,
    });
    onClose();
  };

  const handleReset = () => {
    setTempStatus('');
    setTempPeriod('all');
    setTempCr('');
  };

  const chipStyle = (selected: boolean) => ({
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: selected ? colors.tint : colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: selected ? colors.tint : colors.border,
  });
  const selectedTextColor = isDark ? colors.text : colors.background;
  const chipTextStyle = (selected: boolean) => ({
    fontSize: 13,
    fontWeight: '600' as const,
    color: selected ? selectedTextColor : colors.textSecondary,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Filtrer les séances</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Statut de la séance</Text>
              <View style={styles.chipRow}>
                {STATUS_OPTIONS.map((opt) => {
                  const selected = tempStatus === opt.value;
                  return (
                    <Pressable
                      key={opt.value || 'all'}
                      style={[chipStyle(selected), styles.chip]}
                      onPress={() => setTempStatus(opt.value)}
                    >
                      <Text style={chipTextStyle(selected)}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Période</Text>
              <View style={styles.chipRow}>
                {PERIOD_OPTIONS.map((opt) => {
                  const selected = tempPeriod === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[chipStyle(selected), styles.chip]}
                      onPress={() => setTempPeriod(opt.value)}
                    >
                      <Text style={chipTextStyle(selected)}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Statut du compte-rendu</Text>
              <View style={styles.chipRow}>
                {CR_OPTIONS.map((opt) => {
                  const selected = tempCr === opt.value;
                  return (
                    <Pressable
                      key={opt.value || 'all'}
                      style={[chipStyle(selected), styles.chip]}
                      onPress={() => setTempCr(opt.value)}
                    >
                      <Text style={chipTextStyle(selected)}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.actions}>
              <Button mode="outlined" onPress={handleReset} style={styles.button} textColor={colors.text}>
                Réinitialiser
              </Button>
              <Button mode="contained" onPress={handleApply} style={styles.button} buttonColor={colors.tint} textColor={isDark ? colors.text : colors.background}>
                Appliquer
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: { maxHeight: '100%' },
  scrollContent: { padding: 20, paddingBottom: 32 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { flex: 1 },
});
