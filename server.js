import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";

// Node 18+ has global fetch built-in
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.ROBLOX_API_KEY;
const UNIVERSE_ID = process.env.UNIVERSE_ID;
const PLACE_ID = process.env.PLACE_ID || UNIVERSE_ID;
const CACHE_TTL = Number(process.env.CACHE_TTL || 15);

if (!API_KEY || !UNIVERSE_ID) {
  console.error("Missing environment variables!");
  process.exit(1);
}

app.use(cors());
app.use(rateLimit({ windowMs: 30000, max: 30 }));

let cached = null;
let lastFetch = 0;

app.get("/servers", async (req, res) => {
  try {
    if (cached && Date.now() - lastFetch < CACHE_TTL * 1000)
      return res.json({ ok: true, source: "cache", data: cached });

    const url = `https://apis.roblox.com/universes/v1/${UNIVERSE_ID}/places/${PLACE_ID}/instances`;
    const resp = await fetch(url, { headers: { "x-api-key": API_KEY } });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(502).json({ ok: false, error: "OpenCloud error", details: txt });
    }

    const json = await resp.json();
    const list = (json.data || []).map((s, i) => ({
      index: i + 1,
      jobId: s.id,
      playing: s.playing ?? 0,
      maxPlayers: s.maxPlayers ?? 0,
      ping: s.ping ?? null,
      fps: s.fps ?? null
    }));

    cached = { list };
    lastFetch = Date.now();
    res.json({ ok: true, source: "opencloud", data: cached });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server proxy running on port ${PORT}`));
