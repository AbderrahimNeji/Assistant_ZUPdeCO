import { Audio } from 'expo-av';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { generateCrFromRecording, type GenerateCrFromRecordingResponse } from '@/services/aiSession';

export interface SessionRecordingState {
  recordingSessionId: string | null;
  isRecording: boolean;
  isUploading: boolean;
  /** Timestamp (Date.now()) when recording started; null otherwise. Used for timer and red/green state. */
  recordingStartedAt: number | null;
  aiError: string | null;
  aiResult: GenerateCrFromRecordingResponse | null;
  /** Session id the last aiResult belongs to (so session detail can show result for the right session). */
  aiResultSessionId: string | null;
  /**
   * True ONLY when the current aiResult / aiError / isUploading state comes from an active
   * recording that was just validated — never from loadSavedResult (DB reads).
   * The AiProcessingModal gates its visibility on this flag so it never pops up when the
   * user simply navigates to a screen that loads an existing report.
   */
  hasFreshAnalysis: boolean;
}

export interface LoadSavedResultPayload {
  reportId: string;
  generatedScript?: string | null;
  generatedComment?: string | null;
  generatedResources?: Array<{ title: string; problem: string; solution: string }>;
}

export interface SessionRecordingContextValue extends SessionRecordingState {
  startRecording: (sessionId: string) => Promise<void>;
  stopRecordingAndGenerate: () => Promise<void>;
  /** Stops recording without uploading. */
  cancelRecording: () => Promise<void>;
  clearError: () => void;
  clearResult: () => void;
  /**
   * Hides the AiProcessingModal without wiping aiResult, so the ai-processing screen
   * can still read the result after the user taps "Voir les résultats".
   */
  dismissResult: () => void;
  /** Load saved AI result from a report so results/script/resource-detail screens can display it. */
  loadSavedResult: (sessionId: string, payload: LoadSavedResultPayload) => void;
}

const SessionRecordingContext = createContext<SessionRecordingContextValue | null>(null);

export function SessionRecordingProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const recordingRef = useRef<Audio.Recording | null>(null);

  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<GenerateCrFromRecordingResponse | null>(null);
  const [aiResultSessionId, setAiResultSessionId] = useState<string | null>(null);
  // Gating flag — only true when an actual recording was just processed.
  const [hasFreshAnalysis, setHasFreshAnalysis] = useState(false);

  const startRecording = useCallback(async (sessionId: string) => {
    setAiError(null);
    setAiResult(null);
    setAiResultSessionId(null);
    setHasFreshAnalysis(false);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setAiError('Permission micro refusée.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecordingSessionId(sessionId);
      setRecordingStartedAt(Date.now());
      setIsRecording(true);
    } catch (e) {
      setAiError((e as Error).message || "Impossible de démarrer l'enregistrement.");
    }
  }, []);

  const MIN_RECORDING_DURATION_MS = 30000;

  const stopRecordingAndGenerate = useCallback(async () => {
    const recording = recordingRef.current;
    const sessionId = recordingSessionId;
    if (!recording || !sessionId) return;
    recordingRef.current = null;
    setIsRecording(false);
    try {
      const status = await recording.getStatusAsync();
      if (status.isRecording && status.durationMillis != null && status.durationMillis < MIN_RECORDING_DURATION_MS) {
        setAiError('Enregistrement annulé : moins de 30 secondes. Enregistrez au moins 30 secondes pour générer un CR.');
        setAiResultSessionId(sessionId);
        setHasFreshAnalysis(true);
        setRecordingSessionId(null);
        setRecordingStartedAt(null);
        await recording.stopAndUnloadAsync();
        return;
      }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) {
        setAiError("Fichier d'enregistrement introuvable.");
        setHasFreshAnalysis(true);
        setRecordingSessionId(null);
        setRecordingStartedAt(null);
        return;
      }
      setRecordingStartedAt(null);
      // Mark fresh BEFORE the async upload so the loading state shows immediately.
      setHasFreshAnalysis(true);
      setIsUploading(true);
      setAiError(null);
      const result = await generateCrFromRecording(sessionId, uri);
      setAiResult(result);
      setAiResultSessionId(sessionId);
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (e) {
      const err = e as { message?: string; status?: number };
      const backendMessage = err?.message?.trim();
      const status = err?.status;
      let msg = backendMessage;
      if (!msg) {
        if (status === 401) msg = 'Non autorisé. Connectez-vous à nouveau.';
        else if (status === 403) msg = 'Accès refusé pour cette séance.';
        else if (status != null && status >= 502) msg = 'Service IA indisponible. Réessayez plus tard.';
        else msg = (e as Error).message ?? "Erreur lors de la génération du CR.";
      }
      setAiError(msg);
    } finally {
      setIsUploading(false);
      setRecordingSessionId(null);
      setRecordingStartedAt(null);
    }
  }, [recordingSessionId, queryClient]);

  const MIN_RECORDING_DURATION_MS_CANCEL = 30000;

  const cancelRecording = useCallback(async () => {
    const recording = recordingRef.current;
    const sessionId = recordingSessionId;
    if (!recording || !sessionId) return;
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingSessionId(null);
    setRecordingStartedAt(null);
    try {
      const status = await recording.getStatusAsync();
      if (status.isRecording && status.durationMillis != null && status.durationMillis < MIN_RECORDING_DURATION_MS_CANCEL) {
        setAiError('Enregistrement annulé : moins de 30 secondes. Enregistrez au moins 30 secondes pour générer un CR.');
        setAiResultSessionId(sessionId);
        setHasFreshAnalysis(true);
      }
      await recording.stopAndUnloadAsync();
    } catch {
      // ignore
    }
  }, [recordingSessionId]);

  const clearError = useCallback(() => {
    setAiError(null);
    setHasFreshAnalysis(false);
  }, []);

  const clearResult = useCallback(() => {
    setAiResult(null);
    setAiResultSessionId(null);
    setHasFreshAnalysis(false);
  }, []);

  /**
   * Hides the notification modal without wiping aiResult.
   * The ai-processing screen can still read the result after navigation.
   */
  const dismissResult = useCallback(() => {
    setHasFreshAnalysis(false);
  }, []);

  const loadSavedResult = useCallback((sessionId: string, payload: LoadSavedResultPayload) => {
    // Explicitly keep hasFreshAnalysis untouched (false) — loading from DB must never
    // trigger the AiProcessingModal.
    setAiResult({
      reportId: payload.reportId,
      transcript: '',
      generatedScript: payload.generatedScript ?? undefined,
      generatedComment: payload.generatedComment ?? '',
      generatedResources: payload.generatedResources ?? [],
    });
    setAiResultSessionId(sessionId);
  }, []);

  const value = useMemo<SessionRecordingContextValue>(
    () => ({
      recordingSessionId,
      isRecording,
      isUploading,
      recordingStartedAt,
      aiError,
      aiResult,
      aiResultSessionId,
      hasFreshAnalysis,
      startRecording,
      stopRecordingAndGenerate,
      cancelRecording,
      clearError,
      clearResult,
      dismissResult,
      loadSavedResult,
    }),
    [
      recordingSessionId,
      isRecording,
      isUploading,
      recordingStartedAt,
      aiError,
      aiResult,
      aiResultSessionId,
      hasFreshAnalysis,
      startRecording,
      stopRecordingAndGenerate,
      cancelRecording,
      clearError,
      clearResult,
      dismissResult,
      loadSavedResult,
    ]
  );

  return (
    <SessionRecordingContext.Provider value={value}>
      {children}
    </SessionRecordingContext.Provider>
  );
}

export function useSessionRecording(): SessionRecordingContextValue {
  const ctx = useContext(SessionRecordingContext);
  if (!ctx) throw new Error('useSessionRecording must be used within SessionRecordingProvider');
  return ctx;
}
