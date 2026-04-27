# AI_Mike

## What this is

A real-time, two-way AI avatar of Mike Hyzy, deployed at talk.mikehyzy.com.
Visitors click a button, talk to a video version of Mike, and get answers
about AI strategy, executive transformation, and strategic foresight.

Repo: github.com/mikehyzy/AIMike
Local folder: AI_Mike

Primary audience: executive recruiters (Korn Ferry, BlueSteps, and
similar) and hiring boards evaluating Mike for CAIO, CDO, and SVP
Innovation roles. The piece exists to make a 3-minute interaction do
what a 30-page deck cannot.

## Architecture

Three services stitched together:

1. LiveAvatar (HeyGen) renders the avatar video in real time. Uses LITE
   mode, which means LiveAvatar handles only video rendering and
   delegates all audio plus LLM work to ElevenLabs.
2. ElevenLabs Agent handles speech-to-text, LLM reasoning, and
   text-to-speech. Mike's cloned voice is attached. System prompt
   defines voice, register, and content guardrails.
3. Vercel hosts a static landing page plus a serverless function that
   brokers session tokens. Custom domain talk.mikehyzy.com points here
   via CNAME.

Data flow per session:
- Visitor clicks button on talk.mikehyzy.com
- Browser hits /api/token (Vercel serverless)
- /api/token calls LiveAvatar /v1/sessions/token, then /v1/sessions/start
- /api/token returns LiveKit room URL and client token to browser
- Browser connects to LiveKit room using livekit-client SDK
- Avatar video streams in, mic audio streams out
- ElevenLabs Agent (driven by LiveAvatar's worker) processes audio,
  generates response, audio streams back through LiveKit, drives avatar
  lip sync

## Why LITE mode, not FULL

FULL mode uses HeyGen's bundled OpenAI 4o-mini and HeyGen voice options.
The project requires Mike's cloned ElevenLabs voice plus a custom system
prompt controlling register and content. LITE mode is the only path that
allows both. Cost is also lower: 1 credit per minute on LITE versus 2
credits per minute on FULL.

## Why Vercel, not GitHub Pages

The token endpoint must run server-side to keep the LiveAvatar API key
private. GitHub Pages serves static files only. Vercel free tier covers
this use case.

## Credentials

All secrets live in Vercel environment variables. Never commit values
to the repo. Reference them in code only by name.

| Env var name          | What it holds |
|-----------------------|---|
| LIVEAVATAR_API_KEY    | LiveAvatar API key from app.liveavatar.com/developers |
| AVATAR_ID             | UUID of Mike's trained avatar |
| ELEVENLABS_AGENT_ID   | ElevenLabs Agent ID, format agent_xxx |
| ELEVENLABS_SECRET_ID  | UUID returned by LiveAvatar /v1/secrets after registering the ElevenLabs key |
| ALLOWED_ORIGIN        | Set to https://talk.mikehyzy.com in production, * in dev |

The ElevenLabs API key is registered with LiveAvatar via /v1/secrets,
which encrypts it server-side and returns ELEVENLABS_SECRET_ID. The raw
ElevenLabs key is never referenced again after registration.

## Hard-won gotchas (do not relearn these)

- LiveAvatar API header name is x-api-key (lowercase, with dashes).
  Their published docs say x-api. The docs are wrong. Use x-api-key.
- ElevenLabs Agent must be configured with PCM 24000 Hz on BOTH sides:
  conversation_config.tts.agent_output_audio_format and the user input
  audio format. Default is pcm_16000, which fails with error 4000.
- Session creation is a two-step flow:
  1. POST /v1/sessions/token returns a session_token (JWT)
  2. POST /v1/sessions/start with Authorization: Bearer <session_token>
     returns the LiveKit url and tokens
- LiveAvatar API key and HeyGen API key are not the same key. They
  share a login but not credentials. Use the one from
  app.liveavatar.com/developers.
- LiveAvatar account requires an active paid plan (Starter $19 minimum)
  for API access. Free tier returns 4010 on every endpoint.

## Verified API contract (Apr 2026)

Register ElevenLabs key:
  POST https://api.liveavatar.com/v1/secrets
  Header: x-api-key
  Body: { secret_type, secret_value, secret_name }
  Returns: { id, secret_name }

Create session token (LITE mode):
  POST https://api.liveavatar.com/v1/sessions/token
  Header: x-api-key
  Body: {
    mode: "LITE",
    avatar_id,
    elevenlabs_agent_config: { secret_id, agent_id }
  }
  Returns: { session_id, session_token }

Start session:
  POST https://api.liveavatar.com/v1/sessions/start
  Header: Authorization: Bearer <session_token>
  Returns: { session_id, livekit_url, livekit_client_token,
    livekit_agent_token, max_session_duration, ws_url }

Stop session:
  POST https://api.liveavatar.com/v1/sessions/stop
  Header: Authorization: Bearer <session_token>

## Voice and tone rules for any UI copy or content

Mike's writing voice is sharp tech executive, futurist, dry, signal
first. No motivational language. No cheerleading. No graduation-speech
sentences. No self-heroic arcs. Active voice. Short sentences when
possible. Lead with the signal, then the evidence.

Hard rules (zero exceptions):
- Never use em dashes or en dashes anywhere. Use commas, periods,
  semicolons, colons, or parentheses instead. Scan output before
  shipping.
- For any bio copy or public-facing content: AI / agentic focus,
  Forbes Technology Council, Roosevelt University board, MBA from
  Gies. Do not include construction background, proprietary
  frameworks, Chicago Futures Salon, Parallax Futures, the
  gamification book, or Northwestern unless explicitly requested.

## Repo conventions

- Source layout: index.html at root, /api/token.js for Vercel serverless,
  /public for any static assets, package.json for dependencies.
- Use livekit-client from npm. Import via ES modules in index.html.
- Token endpoint should perform both /v1/sessions/token and
  /v1/sessions/start calls server-side, returning only the LiveKit
  credentials to the client. Never expose LiveAvatar API key or the
  LiveAvatar session_token to the browser.
- vercel.json sets functions runtime if needed; otherwise let Vercel
  auto-detect.
- Test locally with vercel dev before pushing.
