import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isAndroid } from '@/constants/Platform';
import { SCREEN_HEADER_CONTENT_OFFSET } from '@/components/ScreenHeader';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useDynamicColors } from '@/providers/BrandingProvider';
import { env } from '@/config/env';
import {
  getSessionChatHistory,
  sendSessionChatMessage,
  type SessionChatMessage,
} from '@/services/aiSession';
import { useSessionDetail } from '@/hooks/useSessionDetail';
import { useSessionParticipants } from '@/hooks/useSessionParticipants';
import { borderRadius, getCardShadowPlatform, spacing } from '@/constants/DesignTokens';
import type { SessionFormat } from '@/types/session';

// ─── Layout constants ─────────────────────────────────────────────────────────

const INPUT_BAR_HEIGHT = 56;
const SEND_BTN_SIZE = 44;
const BUBBLE_MAX_WIDTH = '82%';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getFormatLabel(
  format: SessionFormat | null | undefined,
  joinLink?: string | null
): string {
  if (format === 'visio') return 'Visio';
  if (format === 'presentiel') return 'Présentiel';
  if (format === 'hybrid') return 'Hybride';
  return joinLink?.trim() ? 'Visio' : 'Présentiel';
}

function buildSessionContext(
  date: string | undefined,
  establishment: string | null | undefined,
  format: SessionFormat | null | undefined,
  joinLink: string | null | undefined,
  room: string | null | undefined,
  students: Array<{ firstName?: string | null; lastName?: string | null }>
): string {
  const parts: string[] = ['[Contexte de la séance]'];
  if (date) parts.push(`Date : ${formatShortDate(date)}`);
  if (establishment) parts.push(`Établissement : ${establishment}`);
  if (room) parts.push(`Salle : ${room}`);
  parts.push(`Format : ${getFormatLabel(format, joinLink)}`);
  if (students.length > 0) {
    const names = students
      .map((s) => [s.firstName, s.lastName].filter(Boolean).join(' '))
      .filter(Boolean);
    if (names.length > 0) parts.push(`Élève(s) : ${names.join(', ')}`);
  }
  return parts.join('\n');
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  description: string;
}[] = [
  { icon: 'pencil-outline', label: 'Exercices adaptés', description: 'Propose des exercices selon le niveau' },
  { icon: 'text-box-check-outline', label: 'Points clés', description: 'Résume les éléments essentiels' },
  { icon: 'refresh', label: 'Points à revoir', description: 'Identifie les lacunes détectées' },
  { icon: 'lightbulb-outline', label: 'Conseils péda.', description: 'Stratégies pour progresser' },
];

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots({ color }: Readonly<{ color: string }>) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 200);
    const a3 = anim(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotStyle = (val: Animated.Value) => ({
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: color, marginHorizontal: 2,
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
  });

  return (
    <View style={styles.typingDotsRow}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}

// ─── Header back button ───────────────────────────────────────────────────────

function BackButton({
  onPress,
  textColor,
}: Readonly<{ onPress: () => void; textColor: string }>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginRight: 12, padding: 10, margin: -10,
        opacity: pressed ? 0.7 : 1,
        minWidth: 44, minHeight: 44,
        justifyContent: 'center', alignItems: 'center',
      })}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel="Retour"
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name="arrow-left" size={24} color={textColor} />
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SessionChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  let id = '';
  if (typeof params.id === 'string') id = params.id;
  else if (Array.isArray(params.id)) id = params.id[0];

  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = useDynamicColors();
  const successColor = (colors as { success?: string }).success ?? '#22c55e';

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const contextSentRef = useRef(false);

  const [messages, setMessages] = useState<SessionChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // ── Session data ──
  const { data: session } = useSessionDetail(id);
  const { data: participants = [] } = useSessionParticipants(id);
  const students = participants.filter((p) => p.role === 'student');

  const sessionContext = useMemo(
    () =>
      session
        ? buildSessionContext(
            session.date,
            session.establishment,
            session.format,
            session.joinLink,
            session.room,
            students
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.id, students.length]
  );

  // ── Load history ──
  useEffect(() => {
    if (!id || !env.apiUrl?.trim()) {
      setLoadingHistory(false);
      return;
    }
    let cancelled = false;
    getSessionChatHistory(id)
      .then((history) => {
        if (!cancelled) {
          setMessages(Array.isArray(history) ? history : []);
          setLoadingHistory(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  // ── Android back ──
  useEffect(() => {
    if (!isAndroid) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // ── Keyboard height ──
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // ── Header ──
  const goBack = useCallback(() => router.back(), [router]);
  const renderHeaderLeft = useCallback(
    () => <BackButton onPress={goBack} textColor={colors.text} />,
    [goBack, colors.text]
  );
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Assistant IA', headerLeft: renderHeaderLeft });
  }, [navigation, renderHeaderLeft]);

  // ── Send ──
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !id || loading) return;

    setInput('');
    setError(null);
    setShowSuggestions(false);

    // Prepend invisible session context on the first message
    let outgoing: SessionChatMessage[] = [...messages];
    if (sessionContext && !contextSentRef.current && outgoing.length === 0) {
      outgoing = [
        { role: 'user', content: sessionContext },
        {
          role: 'assistant',
          content:
            'Contexte de la séance pris en compte. Comment puis-je vous aider ?',
        },
      ];
      contextSentRef.current = true;
    }
    outgoing = [...outgoing, { role: 'user', content: text }];
    setMessages(outgoing);
    setLoading(true);

    try {
      const { content } = await sendSessionChatMessage(id, outgoing);
      setMessages((prev) => [...prev, { role: 'assistant', content: content || '' }]);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Erreur lors de l'envoi";
      const msg =
        typeof raw === 'string' &&
        (raw.includes('not found') || raw.includes('introuvable'))
          ? "Cette séance n'existe pas ou n'est pas accessible côté serveur."
          : raw;
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [id, input, messages, loading, sessionContext]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSuggestedPress = useCallback((label: string) => {
    setInput(label);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  // Filter out the invisible session context exchange
  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (m) =>
          !(m.role === 'user' && m.content.startsWith('[Contexte de la séance]')) &&
          !(
            m.role === 'assistant' &&
            m.content ===
              'Contexte de la séance pris en compte. Comment puis-je vous aider ?'
          )
      ),
    [messages]
  );

  const safeBottom = Math.max(insets.bottom, spacing.sm);
  const bottomOffset = keyboardHeight > 0 ? keyboardHeight : safeBottom;
  const dangerColor = (colors as { danger?: string }).danger ?? colors.tint;

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + SCREEN_HEADER_CONTENT_OFFSET,
          backgroundColor: colors.pageBackground,
          paddingBottom: bottomOffset,
        },
      ]}
    >
      <View style={styles.inner}>

        {/* ── Session context strip ── */}
        {!!session && (
          <View
            style={[
              styles.sessionStrip,
              { backgroundColor: colors.tint + '12', borderBottomColor: colors.tint + '30' },
            ]}
          >
            <MaterialCommunityIcons
              name={session.format === 'visio' ? 'video-outline' : 'map-marker-outline'}
              size={13}
              color={colors.tint}
            />
            <Text style={[styles.sessionStripLabel, { color: colors.tint }]} numberOfLines={1}>
              {[getFormatLabel(session.format, session.joinLink), session.establishment]
                .filter(Boolean)
                .join('  ·  ')}
            </Text>
            {!!session.date && (
              <Text
                style={[styles.sessionStripDate, { color: colors.tint }]}
                numberOfLines={1}
              >
                {formatShortDate(session.date)}
              </Text>
            )}
          </View>
        )}

        {/* ── Messages scroll ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
          ]}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Loading history */}
          {loadingHistory && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Chargement de l&apos;historique…
              </Text>
            </View>
          )}

          {/* Empty / welcome state */}
          {!loadingHistory && visibleMessages.length === 0 && !loading && (
            <View style={styles.emptyWrap}>
              {/* Welcome card */}
              <View
                style={[
                  styles.welcomeCard,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    borderLeftColor: colors.tint,
                    ...getCardShadowPlatform(isDark),
                  },
                ]}
              >
                <View style={styles.welcomeHeader}>
                  <View style={[styles.welcomeAvatar, { backgroundColor: colors.tint + '22' }]}>
                    <MaterialCommunityIcons name="robot-outline" size={26} color={colors.tint} />
                  </View>
                  <View style={styles.welcomeTitleWrap}>
                    <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                      Assistant IA
                    </Text>
                    <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
                      {session
                        ? 'Contexte de votre séance chargé'
                        : 'Prêt à vous aider'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.onlineBadge,
                      { backgroundColor: successColor + '22' },
                    ]}
                  >
                    <Text style={[styles.onlineText, { color: successColor }]}>En ligne</Text>
                  </View>
                </View>

                {/* Session context chips */}
                {!!session && (
                  <View style={styles.sessionChips}>
                    {!!session.establishment && (
                      <View
                        style={[
                          styles.sessionChip,
                          { backgroundColor: colors.tint + '12', borderColor: colors.tint + '30' },
                        ]}
                      >
                        <MaterialCommunityIcons name="school-outline" size={12} color={colors.tint} />
                        <Text
                          style={[styles.sessionChipText, { color: colors.tint }]}
                          numberOfLines={1}
                        >
                          {session.establishment}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.sessionChip,
                        { backgroundColor: colors.tint + '12', borderColor: colors.tint + '30' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={session.format === 'visio' ? 'video-outline' : 'map-marker-outline'}
                        size={12}
                        color={colors.tint}
                      />
                      <Text style={[styles.sessionChipText, { color: colors.tint }]}>
                        {getFormatLabel(session.format, session.joinLink)}
                      </Text>
                    </View>
                    {students.length > 0 && (
                      <View
                        style={[
                          styles.sessionChip,
                          {
                            backgroundColor: successColor + '12',
                            borderColor: successColor + '30',
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="account-school-outline"
                          size={12}
                          color={successColor}
                        />
                        <Text
                          style={[styles.sessionChipText, { color: successColor }]}
                          numberOfLines={1}
                        >
                          {students.length === 1
                            ? [students[0].firstName, students[0].lastName]
                                .filter(Boolean)
                                .join(' ') || 'Élève'
                            : `${students.length} élèves`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
                  Posez une question, demandez des exercices ou des conseils pédagogiques.
                </Text>
              </View>

              {/* Suggestions */}
              <Text style={[styles.suggestionsLabel, { color: colors.textSecondary }]}>
                Suggestions
              </Text>
              <View style={styles.suggestionsGrid}>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <Pressable
                    key={prompt.label}
                    onPress={() => handleSuggestedPress(prompt.label)}
                    style={[
                      styles.suggestionCard,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                        ...getCardShadowPlatform(isDark),
                      },
                    ]}
                    android_ripple={{ color: colors.tint + '22' }}
                    accessibilityLabel={`Suggestion : ${prompt.label}`}
                    accessibilityRole="button"
                  >
                    <View style={[styles.suggestionIconWrap, { backgroundColor: colors.tint + '18' }]}>
                      <MaterialCommunityIcons name={prompt.icon} size={20} color={colors.tint} />
                    </View>
                    <Text style={[styles.suggestionCardTitle, { color: colors.text }]} numberOfLines={1}>
                      {prompt.label}
                    </Text>
                    <Text style={[styles.suggestionCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {prompt.description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Messages */}
            {visibleMessages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const userTextColor = isDark ? colors.text : colors.background;
              const bubbleTextColor = isUser ? userTextColor : colors.text;
              return (
            <View
              key={`msg-${index}-${msg.role}`}
              style={[
                styles.bubbleRow,
                isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant,
              ]}
            >
              {!isUser && (
                <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
                  <MaterialCommunityIcons name="robot-outline" size={18} color={colors.tint} />
                </View>
              )}
              <View
                style={[
                  styles.bubbleWrap,
                  isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? {
                          backgroundColor: colors.tint,
                          borderColor: colors.tint,
                          borderTopLeftRadius: borderRadius.lg,
                          borderTopRightRadius: 4,
                        }
                      : {
                          backgroundColor: colors.backgroundSecondary,
                          borderColor: colors.border,
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: borderRadius.lg,
                          ...getCardShadowPlatform(isDark),
                        },
                  ]}
                >
                  <Text
                    style={[styles.bubbleText, { color: bubbleTextColor }]}
                    selectable
                  >
                    {msg.content}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.bubbleRole,
                    { color: colors.textSecondary, textAlign: isUser ? 'right' : 'left' },
                  ]}
                >
                  {isUser ? 'Vous' : 'Assistant IA'}
                </Text>
              </View>
            </View>
              );
            })}

          {/* Typing indicator */}
          {loading && (
            <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
              <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
                <MaterialCommunityIcons name="robot-outline" size={18} color={colors.tint} />
              </View>
              <View
                style={[
                  styles.bubble,
                  styles.typingBubble,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TypingDots color={colors.tint} />
              </View>
            </View>
          )}

          {/* Error banner */}
          {error != null && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: dangerColor + '18',
                  borderColor: dangerColor + '40',
                },
              ]}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={20}
                color={dangerColor}
                style={styles.errorIcon}
              />
              <Text style={[styles.errorText, { color: dangerColor }]} numberOfLines={3}>
                {error}
              </Text>
              <Pressable
                onPress={() => setError(null)}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                accessibilityLabel="Fermer"
                accessibilityRole="button"
              >
                <Text style={[styles.errorDismiss, { color: colors.tint }]}>Fermer</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* ── Compact suggestions strip (shown when messages exist and toggled on) ── */}
        {visibleMessages.length > 0 && showSuggestions && (
          <View style={[styles.suggestionsStrip, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsStripContent}
              keyboardShouldPersistTaps="handled"
            >
              {SUGGESTED_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt.label}
                  onPress={() => handleSuggestedPress(prompt.label)}
                  style={[styles.stripChip, { backgroundColor: colors.tint + '12', borderColor: colors.tint + '40' }]}
                  android_ripple={{ color: colors.tint + '30' }}
                  accessibilityLabel={`Suggestion : ${prompt.label}`}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name={prompt.icon} size={14} color={colors.tint} />
                  <Text style={[styles.stripChipText, { color: colors.tint }]} numberOfLines={1}>
                    {prompt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Input bar ── */}
        <View
          style={[
            styles.inputBarOuter,
            { borderTopColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <View
            style={[
              styles.inputBarInner,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: input.length > 0 ? colors.tint + '60' : colors.border,
              },
            ]}
          >
            {/* Lightbulb toggle — only shown when messages exist */}
            {visibleMessages.length > 0 && (
              <Pressable
                onPress={() => setShowSuggestions((v) => !v)}
                style={[
                  styles.suggestionToggleBtn,
                  { backgroundColor: showSuggestions ? colors.tint + '20' : 'transparent' },
                ]}
                accessibilityLabel="Suggestions"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="lightbulb-outline"
                  size={20}
                  color={showSuggestions ? colors.tint : colors.textSecondary}
                />
              </Pressable>
            )}
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Écrivez un message…"
              placeholderTextColor={colors.textSecondary}
              multiline
              scrollEnabled
              maxLength={4000}
              style={[styles.inputField, { color: colors.text }]}
              editable={!loading}
              returnKeyType="default"
            />
            {/* Send button — static style so backgroundColor always paints on Android */}
            <Pressable
              onPress={send}
              style={[styles.sendBtn, { backgroundColor: colors.tint }]}
              android_ripple={{ color: 'rgba(255,255,255,0.35)', borderless: false, radius: SEND_BTN_SIZE / 2 }}
              accessibilityLabel="Envoyer"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size={18} color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { flex: 1 },

  // Session strip
  sessionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  sessionStripLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  sessionStripDate: { fontSize: 11, opacity: 0.8 },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Loading
  loadingWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: 15 },

  // Welcome
  emptyWrap: { paddingBottom: spacing.xl },
  welcomeCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  welcomeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  welcomeTitleWrap: { flex: 1, minWidth: 0 },
  welcomeTitle: { fontSize: 16, fontWeight: '700' },
  welcomeSubtitle: { fontSize: 12, marginTop: 2 },
  onlineBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  onlineText: { fontSize: 11, fontWeight: '700' },

  // Session chips inside welcome card
  sessionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  sessionChipText: { fontSize: 11, fontWeight: '600' },

  welcomeBody: { fontSize: 14, lineHeight: 21 },

  // Suggestions
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionCard: {
    flexBasis: '47%',
    flexGrow: 1,
    flexShrink: 0,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  suggestionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  suggestionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionCardDesc: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Bubbles
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  bubbleRowAssistant: {},
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginBottom: 4,
  },
  bubbleWrap: { maxWidth: BUBBLE_MAX_WIDTH },
  bubbleWrapUser: { alignItems: 'flex-end' },
  bubbleWrapAssistant: { alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  typingBubble: { paddingVertical: spacing.sm + 6 },
  typingDotsRow: { flexDirection: 'row', alignItems: 'center', height: 18 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleRole: {
    fontSize: 10, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4,
  },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1,
    marginTop: spacing.sm,
  },
  errorIcon: { flexShrink: 0, marginTop: 2 },
  errorText: { flex: 1, fontSize: 14, lineHeight: 20 },
  errorDismiss: { fontSize: 13, fontWeight: '600', marginTop: spacing.xs },

  // Compact suggestions strip (above input when messages exist)
  suggestionsStrip: {
    borderTopWidth: 1,
    paddingVertical: spacing.xs,
  },
  suggestionsStripContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  stripChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Lightbulb toggle inside input bar
  suggestionToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    flexShrink: 0,
  },

  // Input bar — exact original structure that works
  inputBarOuter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    minHeight: INPUT_BAR_HEIGHT,
  },
  inputBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: spacing.md,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 44,
  },
  inputField: {
    flex: 1,
    minHeight: 32,
    maxHeight: 100,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingRight: spacing.sm,
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: 'transparent',
  },
  sendBtn: {
    width: SEND_BTN_SIZE,
    height: SEND_BTN_SIZE,
    borderRadius: SEND_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
