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
import type { CrDatePeriod, CrReportStatusFilter } from '@/store/crFilterStore';

const PERIOD_OPTIONS: { value: CrDatePeriod; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
];

const STATUS_OPTIONS: { value: CrReportStatusFilter; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'a-saisir', label: 'CR à saisir' },
  { value: 'saisi', label: 'Saisi' },
  { value: 'valide', label: 'Validé' },
];

export interface CrFilterModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onApply: (filters: { datePeriod: CrDatePeriod; reportStatus: CrReportStatusFilter }) => void;
  readonly currentFilters: { datePeriod: CrDatePeriod; reportStatus: CrReportStatusFilter };
}

export function CrFilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
}: Readonly<CrFilterModalProps>) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = useDynamicColors();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [tempPeriod, setTempPeriod] = useState<CrDatePeriod>(currentFilters.datePeriod);
  const [tempStatus, setTempStatus] = useState<CrReportStatusFilter>(currentFilters.reportStatus);

  useEffect(() => {
    if (visible) {
      setTempPeriod(currentFilters.datePeriod);
      setTempStatus(currentFilters.reportStatus);
    }
  }, [visible, currentFilters.datePeriod, currentFilters.reportStatus]);

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
    onApply({ datePeriod: tempPeriod, reportStatus: tempStatus });
    onClose();
  };

  const handleReset = () => {
    setTempPeriod('all');
    setTempStatus('tous');
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Filtrer les comptes rendus</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]} showsVerticalScrollIndicator={false}>
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
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Statut du compte rendu</Text>
              <View style={styles.chipRow}>
                {STATUS_OPTIONS.map((opt) => {
                  const selected = tempStatus === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[chipStyle(selected), styles.chip]}
                      onPress={() => setTempStatus(opt.value)}
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
