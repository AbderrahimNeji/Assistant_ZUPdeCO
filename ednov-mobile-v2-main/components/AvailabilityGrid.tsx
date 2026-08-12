import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';

import { borderRadius, spacing } from '@/constants/DesignTokens';
import { useDynamicColors } from '@/providers/BrandingProvider';

export type AvailabilitySlot = {
  day: number;
  start: string;
  end: string;
};

export type AvailabilityValue = { weekly: AvailabilitySlot[] };

type AvailabilityGridProps = {
  value?: AvailabilityValue;
  onChange?: (value: AvailabilityValue) => void;
  disabled?: boolean;
  maxVisibleRows?: number;
};

const DAYS = [
  { value: 1, short: 'Lun', label: 'Lundi' },
  { value: 2, short: 'Mar', label: 'Mardi' },
  { value: 3, short: 'Mer', label: 'Mercredi' },
  { value: 4, short: 'Jeu', label: 'Jeudi' },
  { value: 5, short: 'Ven', label: 'Vendredi' },
] as const;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function generateTimeSlots(): { label: string; start: string; end: string }[] {
  const slots: { label: string; start: string; end: string }[] = [];
  for (let startMinutes = 7 * 60; startMinutes <= 19 * 60 + 30; startMinutes += 30) {
    const endMinutes = startMinutes + 60;
    const start = `${pad(Math.floor(startMinutes / 60))}:${pad(startMinutes % 60)}`;
    const end = `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}`;
    slots.push({ label: `${start}-${end}`, start, end });
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

type DayAvailability = Record<string, boolean>;
type GridData = Record<number, DayAvailability>;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function slotsToGrid(slots: AvailabilitySlot[]): GridData {
  const grid: GridData = {};
  for (const slot of slots) {
    if (!grid[slot.day]) grid[slot.day] = {};
    for (const timeSlot of TIME_SLOTS) {
      if (slot.start <= timeSlot.start && slot.end >= timeSlot.end) {
        grid[slot.day][timeSlot.label] = true;
      }
    }
  }
  return grid;
}

function gridToSlots(grid: GridData): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  for (const dayStr of Object.keys(grid)) {
    const day = Number(dayStr);
    const dayData = grid[day];
    const checked = TIME_SLOTS.filter((t) => dayData[t.label]);
    if (checked.length === 0) continue;

    let group = [checked[0]];
    for (let i = 1; i < checked.length; i++) {
      const prev = checked[i - 1];
      const cur = checked[i];
      if (timeToMinutes(cur.start) < timeToMinutes(prev.end)) {
        group.push(cur);
      } else {
        slots.push({ day, start: group[0].start, end: group[group.length - 1].end });
        group = [cur];
      }
    }
    slots.push({ day, start: group[0].start, end: group[group.length - 1].end });
  }
  return slots;
}

/**
 * Grille de disponibilités hebdomadaires (alignée web AvailabilityGrid).
 * Lun–Ven, créneaux 1h / 30 min — largeur = 100 % du conteneur (Ven toujours visible).
 */
export function AvailabilityGrid({
  value = { weekly: [] },
  onChange,
  disabled = false,
  maxVisibleRows = 10,
}: AvailabilityGridProps) {
  const colors = useDynamicColors();
  const [gridData, setGridData] = useState<GridData>(() => slotsToGrid(value.weekly ?? []));
  const [containerWidth, setContainerWidth] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (!isInternalUpdate.current) {
      setGridData(slotsToGrid(value.weekly ?? []));
    }
    isInternalUpdate.current = false;
  }, [value]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 1) {
      setContainerWidth(w);
    }
  };

  const timeColW = containerWidth > 0 && containerWidth < 340 ? 58 : 70;
  const dayColW =
    containerWidth > 0 ? Math.max((containerWidth - timeColW) / DAYS.length, 36) : 44;
  const cellH = 36;
  const cellGap = 2;
  const hasCollapsibleRows = TIME_SLOTS.length > maxVisibleRows;
  const visibleSlots = showAll ? TIME_SLOTS : TIME_SLOTS.slice(0, maxVisibleRows);

  const toggle = (day: number, timeSlot: (typeof TIME_SLOTS)[0]) => {
    if (disabled) return;
    const next: GridData = { ...gridData, [day]: { ...(gridData[day] ?? {}) } };
    next[day][timeSlot.label] = !next[day][timeSlot.label];
    setGridData(next);
    isInternalUpdate.current = true;
    onChange?.({ weekly: gridToSlots(next) });
  };

  return (
    <View style={{ width: '100%', alignSelf: 'stretch' }} onLayout={onLayout}>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              backgroundColor: colors.info + '33',
              borderWidth: 1,
              borderColor: colors.info,
            }}
          />
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Disponible</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              backgroundColor: colors.tint + '22',
              borderWidth: 1,
              borderColor: colors.tint + '66',
            }}
          />
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Indisponible</Text>
        </View>
      </View>

      {containerWidth > 0 ? (
        <View style={{ width: containerWidth }}>
          <View style={{ flexDirection: 'row', marginBottom: 4, width: containerWidth }}>
            <View style={{ width: timeColW, justifyContent: 'center' }}>
              <Text
                style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}
                numberOfLines={1}
              >
                Horaires
              </Text>
            </View>
            {DAYS.map((d) => (
              <View key={d.value} style={{ width: dayColW, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{d.short}</Text>
              </View>
            ))}
          </View>

          {visibleSlots.map((slot) => (
            <View
              key={slot.label}
              style={{
                flexDirection: 'row',
                marginBottom: 4,
                alignItems: 'center',
                width: containerWidth,
              }}
            >
              <View style={{ width: timeColW }}>
                <Text
                  style={{ fontSize: 9, color: colors.tint, fontWeight: '600' }}
                  numberOfLines={1}
                >
                  {slot.label}
                </Text>
              </View>
              {DAYS.map((day) => {
                const checked = !!gridData[day.value]?.[slot.label];
                return (
                  <Pressable
                    key={`${day.value}-${slot.label}`}
                    onPress={() => toggle(day.value, slot)}
                    disabled={disabled}
                    style={{
                      width: dayColW - cellGap * 2,
                      marginHorizontal: cellGap,
                      height: cellH,
                      borderRadius: borderRadius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: checked ? colors.info + '28' : colors.tint + '18',
                      borderWidth: 1,
                      borderColor: checked ? colors.info : colors.tint + '40',
                      opacity: disabled ? 0.5 : 1,
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked, disabled }}
                    accessibilityLabel={`${day.label} ${slot.label}`}
                  >
                    <MaterialCommunityIcons
                      name={checked ? 'check-circle' : 'clock-outline'}
                      size={15}
                      color={checked ? colors.info : colors.textSecondary}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
          {hasCollapsibleRows ? (
            <Pressable
              onPress={() => setShowAll((current) => !current)}
              disabled={disabled}
              style={{
                minHeight: 42,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 2,
                opacity: disabled ? 0.5 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel={
                showAll
                  ? 'Réduire les créneaux'
                  : `Afficher la suite, ${TIME_SLOTS.length - maxVisibleRows} créneaux masqués`
              }
            >
              <MaterialCommunityIcons
                name={showAll ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.tint}
              />
              <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>
                {showAll
                  ? 'Réduire'
                  : `Afficher la suite (${TIME_SLOTS.length - maxVisibleRows} créneaux masqués)`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
