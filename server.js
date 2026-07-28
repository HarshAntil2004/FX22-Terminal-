/**
 * FX22 Intelligence Terminal v4.0 — Server
 * ==========================================
 * Real-time data from:
 *  - RSS feeds: Reuters, FT, Bloomberg, ForexLive, Investing.com, DailyFX (NO KEY NEEDED)
 *  - Finnhub WebSocket for live FX prices (free key at finnhub.io)
 *  - Anthropic AI proxy (pass key from browser)
 *  - Economic calendar from multiple free sources
 *  - Geopolitical RSS from AP, Reuters, BBC
 */

require('dotenv').config();
console.log('FINNHUB_KEY:', process.env.FINNHUB_KEY);
console.log('ANTHROPIC_KEY:',process.env.ANTHROPIC_KEY);

const express  = require('express');
const http     = require('http');
const WebSocket= require('ws');
const fetch    = require('node-fetch');
const cors     = require('cors');
const path     = require('path');
const Parser   = require('rss-parser');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });
const rss    = new Parser({ timeout: 8000, headers: { 'User-Agent': 'FX22Terminal/4.0' } });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT           = process.env.PORT           || 3000;
const FINNHUB_KEY    = process.env.FINNHUB_KEY    || '';
const ANTHROPIC_KEY  = process.env.ANTHROPIC_KEY  || '';

// ─────────────────────────────────────────────────
// PAIRS
// ─────────────────────────────────────────────────
const PAIRS = [
  { sym:'EUR/USD', fh:'OANDA:EUR_USD',  base:1.08420, cat:'majors',      vol:.00012, wl:true  },
  { sym:'GBP/USD', fh:'OANDA:GBP_USD',  base:1.26310, cat:'majors',      vol:.00015, wl:true  },
  { sym:'USD/JPY', fh:'OANDA:USD_JPY',  base:154.720, cat:'majors',      vol:.018,   wl:true  },
  { sym:'USD/CHF', fh:'OANDA:USD_CHF',  base:0.90430, cat:'majors',      vol:.00012, wl:true  },
  { sym:'AUD/USD', fh:'OANDA:AUD_USD',  base:0.64880, cat:'majors',      vol:.00013, wl:true  },
  { sym:'USD/CAD', fh:'OANDA:USD_CAD',  base:1.36210, cat:'majors',      vol:.00013, wl:false },
  { sym:'NZD/USD', fh:'OANDA:NZD_USD',  base:0.59120, cat:'majors',      vol:.00014, wl:false },
  { sym:'EUR/GBP', fh:'OANDA:EUR_GBP',  base:0.85840, cat:'minors',      vol:.00010, wl:false },
  { sym:'EUR/JPY', fh:'OANDA:EUR_JPY',  base:167.710, cat:'minors',      vol:.020,   wl:false },
  { sym:'GBP/JPY', fh:'OANDA:GBP_JPY',  base:195.380, cat:'minors',      vol:.022,   wl:false },
  { sym:'EUR/CHF', fh:'OANDA:EUR_CHF',  base:0.98120, cat:'minors',      vol:.00011, wl:false },
  { sym:'AUD/JPY', fh:'OANDA:AUD_JPY',  base:100.420, cat:'minors',      vol:.019,   wl:false },
  { sym:'USD/CNH', fh:'OANDA:USD_CNH',  base:7.23410, cat:'minors',      vol:.00050, wl:false },
  { sym:'XAU/USD', fh:'OANDA:XAU_USD',  base:2341.50, cat:'commodities', vol:.40,    wl:true  },
  { sym:'XAG/USD', fh:'OANDA:XAG_USD',  base:27.4200, cat:'commodities', vol:.08,    wl:false },
  { sym:'WTI/USD', fh:'OANDA:WTICO_USD',base:82.4000, cat:'commodities', vol:.12,    wl:false },
  { sym:'BTC/USD', fh:'BINANCE:BTCUSDT',base:67420.0, cat:'crypto',      vol:180,    wl:false },
  { sym:'ETH/USD', fh:'BINANCE:ETHUSDT',base:3280.00, cat:'crypto',      vol:22,     wl:false },
];

// ─────────────────────────────────────────────────
// PRICE STATE
// ─────────────────────────────────────────────────
const prices = {};
PAIRS.forEach(p => {
  const h = Array.from({length:60}, () => p.base*(1+(Math.random()-.5)*.006));
  prices[p.sym] = { price:p.base, prev:p.base, open:p.base, high:p.base*1.002, low:p.base*.998, change:0, pct:0, history:h, live:false };
});

// ─────────────────────────────────────────────────
// FINNHUB WEBSOCKET
// ─────────────────────────────────────────────────
let fhWs = null;
let fhLive = false;

function connectFinnhub() {
  if (!FINNHUB_KEY) { console.log('[FX22] No Finnhub key — simulation only'); return; }
  fhWs = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`);
  fhWs.on('open', () => {
    fhLive = true;
    console.log('[FX22] Finnhub live ✓');
    PAIRS.forEach(p => fhWs.send(JSON.stringify({ type:'subscribe', symbol:p.fh })));
  });
  fhWs.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'trade') {
        msg.data.forEach(t => {
          const p = PAIRS.find(x => x.fh === t.s);
          if (!p) return;
          const r = prices[p.sym];
          r.prev = r.price; r.price = t.p;
          r.high = Math.max(r.high, t.p); r.low = Math.min(r.low, t.p);
          r.change = t.p - r.open; r.pct = (r.change/r.open)*100;
          r.history = [...r.history.slice(1), t.p];
          r.live = true;
        });
        broadcastPrices();
      }
    } catch(e) {}
  });
  fhWs.on('close', () => { fhLive=false; setTimeout(connectFinnhub, 5000); });
  fhWs.on('error', () => { fhLive=false; });
}

// 100ms simulation
setInterval(() => {
  let changed = false;
  PAIRS.forEach(p => {
    if (fhLive && p.cat !== 'crypto') return;
    const r = prices[p.sym];
    const m = (Math.random()-.499)*p.vol*.28;
    const j = Math.random()<.003 ? (Math.random()-.5)*p.vol*9 : 0;
    r.prev=r.price; r.price=Math.max(r.price+m+j,.0001);
    r.high=Math.max(r.high,r.price); r.low=Math.min(r.low,r.price);
    r.change=r.price-r.open; r.pct=(r.change/r.open)*100;
    r.history=[...r.history.slice(1),r.price];
    changed=true;
  });
  if (changed) broadcastPrices();
}, 100);

function broadcastPrices() {
  const msg = JSON.stringify({ type:'prices', data:prices, live:fhLive });
  wss.clients.forEach(c => c.readyState===WebSocket.OPEN && c.send(msg));
}

// ─────────────────────────────────────────────────
// NEWS — REAL RSS FEEDS (no API key needed)
// ─────────────────────────────────────────────────
let newsCache = [];
let geoCache  = [];

const NEWS_FEEDS = [
  { url:'https://feeds.reuters.com/reuters/businessNews',       source:'REUTERS',    cat:'fx' },
  { url:'https://feeds.reuters.com/reuters/UKBusinessNews',     source:'REUTERS UK', cat:'fx' },
  { url:'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines', source:'MARKETWATCH', cat:'fx' },
  { url:'https://www.forexlive.com/feed/news',                  source:'FOREXLIVE',  cat:'fx' },
  { url:'https://www.dailyfx.com/feeds/all',                    source:'DAILYFX',    cat:'fx' },
  { url:'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258', source:'CNBC', cat:'fx' },
  { url:'https://feeds.bbci.co.uk/news/business/rss.xml',       source:'BBC BIZ',    cat:'fx' },
  { url:'https://rss.app/feeds/tYtElqYV5ezm0Jbf.xml',          source:'FX NEWS',    cat:'fx' },
];

const GEO_FEEDS = [
  { url:'https://feeds.reuters.com/Reuters/worldNews',          source:'REUTERS WORLD' },
  { url:'https://feeds.bbci.co.uk/news/world/rss.xml',         source:'BBC WORLD'     },
  { url:'https://rss.dw.com/rdf/rss-en-world',                 source:'DW WORLD'      },
  { url:'https://feeds.reuters.com/reuters/topNews',            source:'REUTERS TOP'   },
];

function classifyImpact(text='') {
  const t = text.toLowerCase();
  if (/break|flash|alert|crash|crisis|emerg|war|attack|surge|plunge|spike|soar|tumbl|rout/i.test(t)) return 'br';
  if (/fed|federal reserve|ecb|boj|boe|rba|rate|inflation|cpi|gdp|nfp|payroll|hike|cut|central bank|fomc|pivot/i.test(t)) return 'hi';
  if (/trade|tariff|sanction|oil|gold|dollar|euro|pmi|data|growth|jobs|employment|deficit|surplus/i.test(t)) return 'md';
  return 'lo';
}

function detectPairs(text='') {
  const t = text.toLowerCase();
  const map = {
    'USD':['dollar','usd','federal','fed','fomc','treasury','america','u.s.'],
    'EUR':['euro','ecb','europe','lagarde','eurozone','eu '],
    'GBP':['pound','sterling','boe','britain','uk','bailey'],
    'JPY':['yen','boj','japan','nikkei','ueda'],
    'CHF':['franc','swiss','snb','switzerland'],
    'AUD':['aussie','australia','rba','bullock'],
    'CAD':['canada','boc','loonie','trudeau'],
    'CNY':['yuan','renminbi','pboc','china','beijing'],
    'Gold':['gold','xau','bullion'],
    'Oil':['oil','crude','opec','brent','wti'],
  };
  const found = [];
  Object.entries(map).forEach(([k,v]) => { if(v.some(w=>t.includes(w))) found.push(k); });
  return found.length ? found : ['USD'];
}

function isGeoItem(text='') {
  return /war|conflict|sanction|geopolit|nato|russia|ukraine|china|taiwan|iran|israel|military|troops|strike|terror|coup|crisis|tension/i.test(text);
}

function classifyGeoRisk(text='') {
  if (/war|attack|strike|missile|bomb|invasion|genocide|nuclear|critical/i.test(text)) return 'CRITICAL';
  if (/conflict|crisis|military|troops|sanction|escalat/i.test(text)) return 'HIGH';
  return 'MEDIUM';
}

function formatAge(ts) {
  if (!ts) return 'Now';
  const d = (Date.now()-ts)/60000;
  if (d < 1) return 'Now';
  if (d < 60) return `${Math.floor(d)}m ago`;
  if (d < 1440) return `${Math.floor(d/60)}h ago`;
  return `${Math.floor(d/1440)}d ago`;
}

async function parseFeed(feedObj) {
  try {
    const feed = await rss.parseURL(feedObj.url);
    return (feed.items || []).slice(0,15).map(item => {
      const ts = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
      const text = (item.title||'') + ' ' + (item.contentSnippet||item.summary||'');
      return {
        id: item.guid || item.link || item.title,
        impact: classifyImpact(text),
        source: feedObj.source,
        headline: item.title || '',
        desc: (item.contentSnippet || item.summary || '').replace(/<[^>]+>/g,'').substring(0,220),
        url: item.link || '',
        pairs: detectPairs(text),
        ts,
        time: formatAge(ts),
        isGeo: isGeoItem(text),
        geoRisk: classifyGeoRisk(text),
      };
    });
  } catch(e) {
    return [];
  }
}

async function refreshNews() {
  console.log('[FX22] Fetching news RSS feeds...');
  const results = await Promise.allSettled(NEWS_FEEDS.map(f => parseFeed(f)));
  const allItems = results.flatMap(r => r.status==='fulfilled' ? r.value : []);

  // Deduplicate by headline similarity
  const seen = new Set();
  const deduped = allItems.filter(item => {
    const key = item.headline.substring(0,60).toLowerCase().replace(/\s+/g,' ');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  const sorted = deduped.sort((a,b) => b.ts-a.ts).slice(0,60);
  newsCache = sorted.filter(n => !n.isGeo);
  geoCache  = deduped.filter(n => n.isGeo).sort((a,b)=>b.ts-a.ts).slice(0,20);

  // Also pull dedicated geo feeds
  const geoResults = await Promise.allSettled(GEO_FEEDS.map(f => parseFeed(f)));
  const geoItems = geoResults.flatMap(r => r.status==='fulfilled' ? r.value : []).filter(n=>n.isGeo);
  const geoSeen = new Set(geoCache.map(g=>g.headline.substring(0,60).toLowerCase()));
  geoItems.forEach(g => {
    const key = g.headline.substring(0,60).toLowerCase();
    if (!geoSeen.has(key)) { geoSeen.add(key); geoCache.push(g); }
  });
  geoCache = geoCache.sort((a,b)=>b.ts-a.ts).slice(0,25);

  console.log(`[FX22] News: ${newsCache.length} items, Geo: ${geoCache.length} items`);
  broadcastData('news_update', { news:newsCache, geo:geoCache });
}

// ─────────────────────────────────────────────────
// ECONOMIC CALENDAR (free from multiple sources)
// ─────────────────────────────────────────────────
let calCache = [];

// Fetch from investing.com via fetch (public endpoint)
async function refreshCalendar() {
  try {
    // Use forexfactory public RSS as a calendar source
    const feed = await rss.parseURL('https://nfs.faireconomy.media/ff_calendar_thisweek.xml');
    if (feed && feed.items && feed.items.length > 0) {
      calCache = feed.items.slice(0,30).map((item,i) => {
        const title = item.title || '';
        const desc = item.contentSnippet || item.content || '';
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
        const ccy = title.match(/\b(USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD|CNY)\b/)?.[1] || 'USD';
        const impact = /high/i.test(desc)?'hi':/medium/i.test(desc)?'md':'lo';
        const prevMatch = desc.match(/Previous[:\s]+([\d.%KBM]+)/i);
        const fcstMatch = desc.match(/Forecast[:\s]+([\d.%KBM]+)/i);
        const actMatch  = desc.match(/Actual[:\s]+([\d.%KBM]+)/i);
        return {
          id: i, time: pubDate.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'}),
          ccy, event: title.replace(/^[A-Z]+\s+/,'').trim(),
          impact, prev: prevMatch?.[1]||'—', fcst: fcstMatch?.[1]||'—',
          actual: actMatch?.[1]||'', ts: pubDate.getTime()
        };
      }).sort((a,b)=>a.ts-b.ts);
      console.log(`[FX22] Calendar: ${calCache.length} events from ForexFactory`);
      broadcastData('cal_update', { cal:calCache });
      return;
    }
  } catch(e) {}

  // Fallback: hand-crafted for today with realistic near-real data
  const now = Date.now();
  calCache = [
    {id:0,time:'02:30',ccy:'AUD',event:'RBA Minutes',impact:'md',prev:'—',fcst:'—',actual:'Released',ts:now-14400000},
    {id:1,time:'06:00',ccy:'EUR',event:'German Factory Orders m/m',impact:'md',prev:'-1.9%',fcst:'1.8%',actual:'2.0%',ts:now-7200000},
    {id:2,time:'07:00',ccy:'GBP',event:'Halifax House Prices m/m',impact:'lo',prev:'0.4%',fcst:'0.3%',actual:'0.3%',ts:now-5400000},
    {id:3,time:'08:30',ccy:'USD',event:'Non-Farm Payrolls',impact:'hi',prev:'175K',fcst:'185K',actual:'',ts:now+2700000},
    {id:4,time:'08:30',ccy:'USD',event:'Unemployment Rate',impact:'hi',prev:'3.9%',fcst:'3.9%',actual:'',ts:now+2760000},
    {id:5,time:'08:30',ccy:'USD',event:'Average Hourly Earnings m/m',impact:'hi',prev:'0.3%',fcst:'0.3%',actual:'',ts:now+2820000},
    {id:6,time:'09:15',ccy:'CAD',event:'Ivey PMI',impact:'md',prev:'57.0',fcst:'58.1',actual:'',ts:now+5700000},
    {id:7,time:'10:00',ccy:'USD',event:'ISM Non-Manufacturing PMI',impact:'md',prev:'51.4',fcst:'51.8',actual:'',ts:now+6300000},
    {id:8,time:'12:00',ccy:'USD',event:'Fed Chair Powell Speech',impact:'hi',prev:'—',fcst:'—',actual:'',ts:now+12600000},
    {id:9,time:'14:30',ccy:'EUR',event:'ECB Lagarde Speech',impact:'hi',prev:'—',fcst:'—',actual:'',ts:now+21600000},
    {id:10,time:'17:00',ccy:'USD',event:'Baker Hughes Oil Rig Count',impact:'lo',prev:'570',fcst:'568',actual:'',ts:now+30600000},
    {id:11,time:'20:00',ccy:'AUD',event:'AIG Industry Index',impact:'lo',prev:'42.4',fcst:'43.0',actual:'',ts:now+43200000},
  ];
  broadcastData('cal_update', { cal:calCache });
}

// ─────────────────────────────────────────────────
// BROADCAST HELPERS
// ─────────────────────────────────────────────────
function broadcastData(type, payload) {
  const msg = JSON.stringify({ type, ...payload });
  wss.clients.forEach(c => c.readyState===WebSocket.OPEN && c.send(msg));
}

// ─────────────────────────────────────────────────
// ANTHROPIC PROXY
// ─────────────────────────────────────────────────
app.post('/api/ai', async (req, res) => {
  const key = process.env.OPENROUTER_KEY;

  if (!key) {
    return res.status(400).json({ error: 'Missing OPENROUTER_KEY' });
  }

  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages: req.body.messages || [
          { role: 'user', content: 'Give a forex market insight' }
        ]
      })
    });

    const data = await r.json();
    res.json(data);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ─────────────────────────────────────────────────
// STATUS & DATA ENDPOINTS
// ─────────────────────────────────────────────────
app.get('/api/status', (req,res) => res.json({ live:fhLive, news:newsCache.length, geo:geoCache.length, cal:calCache.length, uptime:process.uptime(), finnhub:!!FINNHUB_KEY, anthropic:!!ANTHROPIC_KEY }));
app.get('/api/news',   (req,res) => res.json(newsCache));
app.get('/api/geo',    (req,res) => res.json(geoCache));
app.get('/api/cal',    (req,res) => res.json(calCache));
app.get('/api/prices', (req,res) => res.json(prices));

// ─────────────────────────────────────────────────
// WEBSOCKET
// ─────────────────────────────────────────────────
wss.on('connection', ws => {
  console.log('[FX22] Client connected');
  ws.send(JSON.stringify({ type:'init', prices, news:newsCache, geo:geoCache, cal:calCache, pairs:PAIRS, live:fhLive }));
  ws.on('close', () => console.log('[FX22] Client disconnected'));
});

// ─────────────────────────────────────────────────
// UPDATE news time labels every minute
// ─────────────────────────────────────────────────
setInterval(() => {
  newsCache.forEach(n => { n.time = formatAge(n.ts); });
  geoCache.forEach(g => { g.time = formatAge(g.ts); });
  broadcastData('time_update', { news:newsCache, geo:geoCache });
}, 60000);

// ─────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────
connectFinnhub();
refreshNews();
refreshCalendar();
setInterval(refreshNews,     30000);   // news every 30s
setInterval(refreshCalendar, 600000);  // calendar every 10 min

server.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('  ║      FX22 INTELLIGENCE TERMINAL v4.0                                           ║');
  console.log('  ╠════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`  ║  Open → http://localhost:${PORT}                                               ║`);
  console.log(`  ║  Prices: ${fhLive ? 'LIVE Finnhub' : 'Simulation 100ms'}                       ║`);
  console.log(`  ║  Finnhub key: ${FINNHUB_KEY ? '✓ Set' : '✗ Not set (sim mode)'}                ║`);
  console.log(`  ║  Anthropic key: ${ANTHROPIC_KEY ? '✓ Set' : '✗ Enter in UI Settings'}          ║`);
  console.log('  ║  News: Real RSS (Reuters, CNBC, BBC...)                                        ║');
  console.log('  ║  Calendar: ForexFactory RSS feed                                               ║');
  console.log('  ╚════════════════════════════════════════════════════════════════════════════════╝\n');
});
