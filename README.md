# FX22 INTELLIGENCE TERMINAL v4.0
### README — START HERE

---

## QUICK START (2 steps)

**Step 1:** Install Node.js (if not installed)
→ Download from: https://nodejs.org (choose LTS)

**Step 2:** Open terminal/cmd in this folder, then run:

```
npm install
npm start
```

**Step 3:** Open browser → http://localhost:3000

That's it. Live news starts immediately. No API keys needed for news — it pulls from Reuters, CNBC, BBC, etc.

---

## WHAT IS LIVE (NO KEY NEEDED)

✅ **Live News** — Real RSS from:
- Reuters Business & World
- CNBC Finance
- BBC Business & World
- ForexLive
- DailyFX
- MarketWatch

Updates every 30 seconds automatically.

✅ **Live Geopolitical Monitor** — Real RSS from:
- Reuters World News
- BBC World
- Deutsche Welle World

Auto-classifies risk level (CRITICAL/HIGH/MEDIUM).

✅ **Economic Calendar** — ForexFactory RSS
Shows today's events with prev/forecast/actual.
Falls back to hand-crafted realistic calendar.

✅ **Prices** — 100ms simulation (realistic microstructure)
18 pairs: Majors, Minors, Commodities, Crypto

✅ **Live Stream** — Bloomberg, CNBC, Al Jazeera, Sky News, Fox Business embedded YouTube live streams.
Persists when switching sources. Mute/unmute/stop.

✅ **Resizable Panels** — Drag column/row edges to resize.
All panels stay in sync with neighbors.

✅ **Premium Modals** — Every click opens a full-page popup:
News, Geo events, Calendar events, Pairs, AI insights, Settings — all with detailed analysis and data.

---

## OPTIONAL API KEYS (for even more live data)

**ANTHROPIC** (AI Analyst — live multi-perspective analysis):
- Free key at: https://console.anthropic.com
- Enter directly in the terminal: Settings ⚙ → API Key
- Or set env: `ANTHROPIC_KEY=sk-ant-... npm start`

Once set, the AI panel will:
- Analyze all live news from 5 perspectives
- Generate 4 actionable trading insights
- Update every 5 minutes automatically
- Click any insight for full drill-down breakdown

**FINNHUB** (Real-time forex prices via WebSocket):
- Free key at: https://finnhub.io
- Set env: `FINNHUB_KEY=your_key npm start`
- Provides tick-by-tick live prices for all 18 pairs

**Running with all keys (Windows):**
```
set ANTHROPIC_KEY=sk-ant-api03-...
set FINNHUB_KEY=d1abc123xyz
npm start
```

**Running with all keys (Mac/Linux):**
```
ANTHROPIC_KEY=sk-ant-... FINNHUB_KEY=d1abc... npm start
```

---

## FEATURES

### 📰 LIVE NEWS FEED
- Real RSS from 7 sources, refreshes every 30s
- Impact classification: BREAKING / HIGH / MEDIUM / LOW
- Currency pair detection and filtering
- Click any news item → premium full-page modal with complete analysis, FX impact, trading implications

### 🌍 GEOPOLITICAL RISK MONITOR
- Live RSS from Reuters World, BBC, DW
- Auto-classified CRITICAL/HIGH/MEDIUM
- Click any item → risk assessment, FX impact, history

### 📅 ECONOMIC CALENDAR
- ForexFactory RSS (real upcoming events)
- Previous, Forecast, Actual, Surprise %
- Click any event → how to trade it, risk management

### 💱 PAIRS MONITOR
- 18 pairs: Majors, Minors, Commodities, Crypto
- 100ms price updates with flash animations
- Click any pair → live sparkline chart, technicals, support/resistance, RSI, MACD, related news

### 🧠 AI ANALYST (requires Anthropic key)
- Multi-perspective synthesis: Central Bank, Geo, Technical, Sentiment, Macro Economics
- 4 actionable insights, updates every 5 minutes
- Click any insight → full drill-down with weighted perspective analysis and AI reasoning

### 📺 LIVE STREAM
- Bloomberg TV, CNBC, Al Jazeera, Sky News, Fox Biz
- Stream persists when switching sources
- Mute/unmute and stop controls

### ↔️ RESIZABLE LAYOUT
- Drag column left/right edges to resize columns
- Drag panel top/bottom edges to resize panel heights
- All panels stay proportional to neighbors

### 🎨 5 THEMES
- Dark Pro (default), Light Pro, Matrix, Amber, Stealth

### 🔔 SMART ALERTS
- Create custom price/condition alerts
- Toggle active/inactive, remove alerts
- Alert manager with full CRUD

##SCREENSHOTS : 
<img width="1440" height="900" alt="Screenshot 2026-07-28 at 4 10 39 PM" src="https://github.com/user-attachments/assets/02616b34-acbb-4e17-9ff0-ab47a76ba99c" />

<img width="1440" height="900" alt="Screenshot 2026-07-28 at 4 10 57 PM" src="https://github.com/user-attachments/assets/7476f33d-a91c-4db6-8978-e3d4739c4379" />

---

## FILES

```
fx22/
├── server.js        ← Node.js backend + WebSocket + RSS
├── package.json     ← Dependencies
├── README.md        ← This file
└── public/
    └── index.html   ← Full frontend terminal
```

---

## TROUBLESHOOTING

**Q: News panel shows "Loading..."**
A: Make sure the server is running (`npm start`). Check terminal for RSS fetch errors.

**Q: AI panel shows "No API key"**
A: Go to Settings ⚙ in the terminal and enter your Anthropic API key. Get one free at console.anthropic.com

**Q: Prices are simulated not live**
A: Set `FINNHUB_KEY` env var (free at finnhub.io). Without it, simulation runs at 100ms which looks live.

**Q: Calendar not showing today's events**
A: ForexFactory RSS sometimes has delays. The terminal falls back to a realistic hand-crafted calendar.

**Q: Port 3000 already in use**
A: Run: `PORT=3001 npm start` then open localhost:3001

---

FX22 Intelligence Terminal v4.0 © 2026


###CAUTION : This is not the final product ; Few minor edits are required for full functionality and API and ANTHROPIC keys are required for every service to work and for the AI ANALYST to work properly .
