# AI Session CR (Compte Rendu) Flow

This document describes how to test the AI-generated session report flow: record (web or mobile) → upload → backend STT + LLM → draft CR created/updated → display and open CR in the app.

## Workflow (in-app recording with persistent indicator)

- The tutor opens a session that is **En cours** (in progress) and taps **Démarrer l'enregistrement** on the session detail screen.
- Recording starts and continues **even when the tutor navigates to other screens** (e.g. another tab or the dashboard). The app uses a global recording state so the `Audio.Recording` instance is not lost on screen change.
- A **persistent banner** appears at the top of the app (on every tab) while recording is active: "Enregistrement en cours" with a red indicator and a button **Arrêter et générer le CR**. The tutor can keep using the app and always see that recording is on.
- The tutor can **stop and generate the CR** either from that banner (from any screen) or by returning to the session detail and tapping **Arrêter l'enregistrement**.
- After stopping, the banner shows "Génération du CR en cours…" while the file is uploaded and the backend runs STT + LLM. On success, the session is invalidated so the session detail and list show the new report; the session detail shows "CR brouillon prêt" with a link to the report.
- **Optional – background recording**: Audio mode is set with `staysActiveInBackground: true` so that switching in-app screens does not stop recording. If you want recording to continue when the app is sent to the background (e.g. tutor switches to another app briefly), enable the **Audio** background mode for iOS in `app.json` (see below). Without it, recording may stop when the app is backgrounded.

## Environment

### Backend (`ednov-backend`)

- **`GROQ_API_KEY`** (required for AI): Set in `.env`. Used for:
  - Groq Whisper (STT, French)
  - Groq LLM (draft CR + pedagogical resources + session chat assistant)
- Without it, AI endpoints return 503 with message "AI generation is not configured (GROQ_API_KEY)".
- For the **session chat assistant** and AI CR to work, the backend must be the process listening on the host/port in `EXPO_PUBLIC_API_URL`. Use a separate terminal: from `ednov-backend` run `npm run dev` (default port 3000). Check `GET /api/v1/sessions/ai/health` (no auth) to confirm the backend is the one responding.

### Mobile (`ednov-mobile-v2`)

- **`EXPO_PUBLIC_API_URL`**: Set in `.env` or app config to your backend base URL (e.g. `http://localhost:3000/api/v1` for dev). Used by `env.apiUrl`; the AI recording section is only shown when `env.apiUrl` is set and the session is in progress.

## Manual test steps

1. **Backend**: Ensure backend is running with `GROQ_API_KEY` set. Run migrations and seed data so you have at least one session in status `in_progress`.
2. **App**: Set `EXPO_PUBLIC_API_URL` and run the app (browser, device, or simulator).
3. **Log in** as a user who can access the session (e.g. tutor or admin).
4. **Sessions list**: Open the session that is "En cours" (in progress).
5. **Session detail**: You should see the block "Démarrer l'enregistrement" (microphone button). Tap **Démarrer l'enregistrement**.
6. **Record**: Speak briefly in French (or leave short silence). You can **navigate to another tab or screen**; a banner at the top will show "Enregistrement en cours" and **Arrêter et générer le CR**. Tap that button (or return to the session detail and tap **Arrêter l'enregistrement**).
7. **Wait**: The banner or session detail shows "Génération du CR en cours…" while the backend runs Whisper and the LLM.
8. **Success**: You should see "CR brouillon prêt" with a button **Voir / modifier le CR brouillon** and optionally "Ressources suggérées". Tapping the button opens the CR detail screen (`/(tabs)/comptes-rendus/:reportId`).
9. **Session refetch**: After success, the session query is invalidated; if the session now has a report, the "Voir le CR" button also appears for future visits.

## How to confirm

- **Backend**: Check logs for no 400/502/503 on `POST /sessions/:id/ai/generate-from-recording`. Response body should contain `reportId`, `transcript`, `generatedComment`, `generatedResources`.
- **Mobile**: No error message in the red block; "CR brouillon prêt" and the link to the CR are visible; opening the CR shows the draft comment and status.
- **API**: Session `GET /sessions/:id` after generation should include `reportId` so "Voir le CR" is available.

## Troubleshooting

- **404 on session AI (chat or generate-from-recording)**: The request must hit the Nest backend. Ensure (1) the Nest app is running on the same host/port as in `EXPO_PUBLIC_API_URL` (e.g. `http://localhost:3000/api/v1` → backend on port 3000); (2) no other server (e.g. Expo dev server) is bound to that port; (3) restart the backend after pulling changes. **Verify the backend is responding**: open `GET http://localhost:3000/api/v1/sessions/ai/health` in a browser (no auth). If you see `{"ok":true,"routes":[...]}`, the backend is on that port. The chat endpoint is `POST /api/v1/ai/session-chat` with body `{ "sessionId": "<uuid>", "messages": [{ "role": "user", "content": "test" }] }`.
- **400 "No audio file provided"**: Ensure the mobile app is sending the file with field name `audio` and that the request does not force `Content-Type: multipart/form-data` without a boundary (the app omits Content-Type for FormData so the runtime adds the boundary).
- **503 "AI generation is not configured"**: Set `GROQ_API_KEY` in the backend `.env`.
- **503 "Speech-to-text failed" / "CR generation failed"**: Check Groq API key and quota; inspect backend logs for the underlying error.
- **Recording section not visible**: Session must be in progress (`in_progress`) and `EXPO_PUBLIC_API_URL` must be set.

## Optional: iOS background recording

To allow recording to continue when the app is in the background (e.g. user switches to another app), add the **Audio** background mode in `app.json` under `expo.ios.infoPlist.UIBackgroundModes`:

```json
"ios": {
  "supportsTablet": true,
  "infoPlist": {
    "UIBackgroundModes": ["audio"]
  }
}
```

Without this, recording continues when navigating between screens inside the app but may stop when the app is backgrounded.
