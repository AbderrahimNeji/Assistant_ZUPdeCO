import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { SectionTitle } from '@/components/SectionTitle';
import { Text } from '@/components/Themed';
import type { ColorPalette } from '@/providers/BrandingProvider';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import type { CompteRenduAuthorFeedback, CompteRenduFeeling } from '@/types/compteRendu';
import type { TutorFeedbackFormValue } from '@/utils/report-author-feedback';

const FEELING_OPTIONS: { value: CompteRenduFeeling; label: string }[] = [
  { value: 'very_at_ease', label: "Très à l'aise" },
  { value: 'rather_at_ease', label: "Plutôt à l'aise" },
  { value: 'neutral', label: 'Neutre' },
  { value: 'somewhat_difficult', label: 'Un peu en difficulté' },
  { value: 'difficult', label: 'En difficulté' },
];

const FEELING_LABELS: Record<CompteRenduFeeling, string> = {
  very_at_ease: "Très à l'aise",
  rather_at_ease: "Plutôt à l'aise",
  neutral: 'Neutre',
  somewhat_difficult: 'Un peu en difficulté',
  difficult: 'En difficulté',
};

function cardShell(colors: ColorPalette, isDark: boolean) {
  return {
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    ...getCardShadowPlatform(isDark),
  };
}

function renderStars(rating: number, colors: ColorPalette) {
  return Array.from({ length: 5 }, (_, i) => (
    <MaterialCommunityIcons
      key={i}
      name={i < rating ? 'star' : 'star-outline'}
      size={18}
      color={i < rating ? colors.warning : colors.border}
    />
  ));
}

export function TutorFeedbackReadOnlyBlock({
  feedback,
  title,
  colors,
  isDark,
}: {
  feedback: CompteRenduAuthorFeedback;
  title: string;
  colors: ColorPalette;
  isDark: boolean;
}) {
  return (
    <View style={cardShell(colors, isDark)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.tint + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="account-school-outline" size={16} color={colors.tint} />
        </View>
        <SectionTitle>{title}</SectionTitle>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
        Note de la séance
      </Text>
      {feedback.rating != null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          {renderStars(feedback.rating, colors)}
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{feedback.rating}/5</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
          Aucune note attribuée
        </Text>
      )}
      {feedback.feeling != null && (
        <>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>
            Ressenti
          </Text>
          <Text style={{ fontSize: 14, color: colors.text, marginBottom: 12 }}>
            {FEELING_LABELS[feedback.feeling]}
          </Text>
        </>
      )}
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>
        Commentaire
      </Text>
      {feedback.comment?.trim() ? (
        <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{feedback.comment}</Text>
      ) : (
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Aucun commentaire rédigé</Text>
      )}
    </View>
  );
}

export function TutorFeedbackEditableBlock({
  title,
  value,
  onChange,
  readOnly,
  colors,
  isDark,
  disabled,
}: {
  title: string;
  value: TutorFeedbackFormValue;
  onChange: (next: TutorFeedbackFormValue) => void;
  readOnly?: boolean;
  colors: ColorPalette;
  isDark: boolean;
  disabled?: boolean;
}) {
  if (readOnly) {
    return (
      <TutorFeedbackReadOnlyBlock
        feedback={{
          idAuteur: '',
          rating: value.note.trim() ? Number.parseInt(value.note, 10) : null,
          comment: value.commentaire || null,
          feeling: value.feeling,
        }}
        title={title}
        colors={colors}
        isDark={isDark}
      />
    );
  }

  const inputStyle = {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  };

  return (
    <View style={cardShell(colors, isDark)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.tint + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="account-school-outline" size={16} color={colors.tint} />
        </View>
        <SectionTitle>{title}</SectionTitle>
      </View>

      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
        Note de la séance (0 à 5)
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const isSelected =
            value.note.trim() === String(n) ||
            (value.note.trim() !== '' && Number.parseFloat(value.note) === n);
          return (
            <Pressable
              key={n}
              onPress={() => onChange({ ...value, note: String(n) })}
              disabled={disabled}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: isSelected ? colors.tint : colors.border,
                backgroundColor: isSelected ? colors.tint + '18' : colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.5 : 1,
              }}
              accessibilityLabel={`Note ${n}`}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: isSelected ? colors.tint : colors.text }}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
        Comment vous êtes-vous senti ?
      </Text>
      <View style={{ gap: 8, marginBottom: 14 }}>
        {FEELING_OPTIONS.map(({ value: optValue, label }) => {
          const isSelected = value.feeling === optValue;
          return (
            <Pressable
              key={optValue}
              onPress={() =>
                onChange({ ...value, feeling: isSelected ? null : optValue })
              }
              disabled={disabled}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderColor: isSelected ? colors.tint : colors.border,
                backgroundColor: isSelected ? colors.tint + '18' : colors.background,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? '700' : '500',
                  color: colors.text,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
        Résumé de la séance
      </Text>
      <TextInput
        value={value.commentaire}
        onChangeText={(commentaire) => onChange({ ...value, commentaire })}
        placeholder="Observations sur la séance"
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        editable={!disabled}
        style={{
          ...inputStyle,
          minHeight: 96,
          textAlignVertical: 'top',
        }}
      />
    </View>
  );
}
