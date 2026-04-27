const LIVEAVATAR_API = "https://api.liveavatar.com";

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { LIVEAVATAR_API_KEY, AVATAR_ID, ELEVENLABS_AGENT_ID, ELEVENLABS_SECRET_ID } = process.env;

  if (!LIVEAVATAR_API_KEY || !AVATAR_ID || !ELEVENLABS_AGENT_ID || !ELEVENLABS_SECRET_ID) {
    return res.status(500).json({ error: "Missing required environment variables" });
  }

  // Step 1: Create session token
  let tokenRes;
  try {
    tokenRes = await fetch(`${LIVEAVATAR_API}/v1/sessions/token`, {
      method: "POST",
      headers: {
        "x-api-key": LIVEAVATAR_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "LITE",
        avatar_id: AVATAR_ID,
        elevenlabs_agent_config: {
          secret_id: ELEVENLABS_SECRET_ID,
          agent_id: ELEVENLABS_AGENT_ID,
        },
      }),
    });
  } catch (err) {
    console.error("Network error calling /v1/sessions/token:", err);
    return res.status(502).json({ error: "Failed to reach LiveAvatar API" });
  }

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error(`/v1/sessions/token returned ${tokenRes.status}:`, body);
    return res.status(502).json({ error: "LiveAvatar token request failed", detail: body });
  }

  const { session_token } = await tokenRes.json();

  // Step 2: Start session
  let startRes;
  try {
    startRes = await fetch(`${LIVEAVATAR_API}/v1/sessions/start`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session_token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Network error calling /v1/sessions/start:", err);
    return res.status(502).json({ error: "Failed to reach LiveAvatar API" });
  }

  if (!startRes.ok) {
    const body = await startRes.text();
    console.error(`/v1/sessions/start returned ${startRes.status}:`, body);
    return res.status(502).json({ error: "LiveAvatar session start failed", detail: body });
  }

  const { session_id, livekit_url, livekit_client_token, max_session_duration } = await startRes.json();

  // Return only what the browser needs. Never expose the API key or session_token.
  return res.status(200).json({ session_id, livekit_url, livekit_client_token, max_session_duration });
}
