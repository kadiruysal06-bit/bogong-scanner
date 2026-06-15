// Vercel API endpoint — /api/seri?sym=AAPL
// Stooq'tan seri çeker, CORS header ekler

export default async function handler(req, res) {
  const { sym } = req.query;
  if (!sym) return res.status(400).json({error: 'sym gerekli'});
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const stooqSym = sym.toLowerCase() + '.us';
  const url = `https://stooq.com/q/d/l/?s=${stooqSym}&i=d`;
  
  try {
    const r = await fetch(url, {
      headers: {'User-Agent': 'Mozilla/5.0'},
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return res.status(502).json({error: 'stooq hata', status: r.status});
    
    const csv = await r.text();
    const lines = csv.trim().split('\n');
    if (lines.length < 22) return res.status(404).json({error: 'veri yok'});
    
    const mapped = [];
    for (let li = lines.length - 1; li >= 1; li--) {
      const cols = lines[li].split(',');
      if (cols.length < 5) continue;
      const close = parseFloat(cols[4]);
      if (isNaN(close) || close <= 0) continue;
      mapped.push({close, datetime: cols[0]});
      if (mapped.length >= 60) break;
    }
    
    if (mapped.length < 20) return res.status(404).json({error: 'yetersiz veri'});
    
    // 1 saat cache
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({sym, data: mapped});
    
  } catch(e) {
    return res.status(500).json({error: e.message});
  }
}
