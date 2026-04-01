import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { SPRITE_CATEGORIES } from '../../utils/spriteCalc'

const RANGES = [
  { key: '7', label: '7 Days' },
  { key: '14', label: '14 Days' },
  { key: '30', label: '30 Days' },
  { key: '90', label: '90 Days' },
  { key: '180', label: '6 Months' },
  { key: '365', label: '1 Year' },
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Format like "Apr 1, 2026" for the X-axis
function formatXAxisDate(dateStr, range) {
  const d = new Date(dateStr + 'T12:00:00')
  const month = MONTH_NAMES[d.getMonth()]
  const day = d.getDate()
  const year = d.getFullYear()
  if (parseInt(range) <= 30) {
    return `${month} ${day}`
  }
  return `${month} ${day}, ${year}`
}

// Full format for tooltip header
function formatFullDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dayName = DAY_NAMES[d.getDay()]
  const month = MONTH_NAMES[d.getMonth()]
  return `${dayName}, ${month} ${d.getDate()}, ${d.getFullYear()}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="history-tooltip">
      <div className="tooltip-date">{formatFullDate(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="tooltip-row">
          <span className="tooltip-dot" style={{ background: p.color }} />
          <span className="tooltip-cat">{SPRITE_CATEGORIES.find(c => c.key === p.dataKey)?.label}</span>
          <span className="tooltip-val">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

// Custom legend matching the screenshot style — colored circles with labels
function ChartLegend({ categories }) {
  return (
    <div className="chart-legend">
      <span className="chart-legend-title">Legend</span>
      {categories.map(cat => (
        <div key={cat.key} className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: cat.color }} />
          <span>{cat.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function SpriteHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30')
  const [selectedCats, setSelectedCats] = useState(SPRITE_CATEGORIES.map(c => c.key))
  const [viewMode, setViewMode] = useState('combined')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    try {
      const res = await fetch(`/api/sprite/history?days=${range}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) setHistory(await res.json())
    } catch (e) {
      console.error('History fetch error:', e)
    }
    setLoading(false)
  }, [range])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const toggleCategory = (key) => {
    setSelectedCats(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const activeCats = SPRITE_CATEGORIES.filter(c => selectedCats.includes(c.key))

  // Day-of-week averages
  const dayOfWeekAvgs = {}
  for (const cat of SPRITE_CATEGORIES) {
    dayOfWeekAvgs[cat.key] = Array(7).fill(null).map((_, dow) => {
      const dayEntries = history.filter(h => h.dayOfWeek === dow)
      if (dayEntries.length === 0) return 0
      return Math.round(dayEntries.reduce((s, h) => s + (h[cat.key] || 0), 0) / dayEntries.length)
    })
  }

  const dowChartData = DAY_NAMES.map((name, i) => {
    const row = { day: name }
    for (const cat of SPRITE_CATEGORIES) {
      row[cat.key] = dayOfWeekAvgs[cat.key][i]
    }
    return row
  })

  // Overall averages
  const overallAvgs = SPRITE_CATEGORIES.map(cat => {
    if (history.length === 0) return { ...cat, avg: 0 }
    const avg = Math.round(history.reduce((s, h) => s + (h[cat.key] || 0), 0) / history.length)
    return { ...cat, avg }
  })

  // Tick interval so labels don't overlap
  const numDays = parseInt(range)
  const tickInterval = numDays <= 7 ? 0 : numDays <= 14 ? 1 : numDays <= 30 ? 3 : numDays <= 90 ? 9 : numDays <= 180 ? 14 : 30

  return (
    <div className="sprite-history-page">
      <div className="history-header">
        <h2>SPRITE History</h2>
        <div className="history-controls">
          {RANGES.map(r => (
            <button
              key={r.key}
              className={`range-btn ${range === r.key ? 'active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category toggles + view mode */}
      <div className="cat-toggles">
        {SPRITE_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`cat-toggle ${selectedCats.includes(cat.key) ? 'active' : ''}`}
            style={{
              borderColor: selectedCats.includes(cat.key) ? cat.color : 'var(--border)',
              color: selectedCats.includes(cat.key) ? cat.color : 'var(--text-muted)',
              background: selectedCats.includes(cat.key) ? `${cat.color}15` : 'var(--bg-card)',
            }}
            onClick={() => toggleCategory(cat.key)}
          >
            <span className="cat-dot" style={{ background: cat.color }} />
            {cat.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className={`range-btn ${viewMode === 'combined' ? 'active' : ''}`} onClick={() => setViewMode('combined')}>Combined</button>
        <button className={`range-btn ${viewMode === 'individual' ? 'active' : ''}`} onClick={() => setViewMode('individual')}>Individual</button>
      </div>

      {/* Average cards */}
      <div className="avg-cards">
        {overallAvgs.map(cat => (
          <div key={cat.key} className="avg-card" style={{ borderColor: `${cat.color}44` }}>
            <span className="avg-num" style={{ color: cat.color }}>{cat.avg}%</span>
            <span className="avg-label">{cat.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: 20 }}>Loading history...</p>
      ) : viewMode === 'combined' ? (
        <div className="chart-section">
          <div className="chart-title-row">
            <h3>SPRITE Scores Over Time</h3>
            <ChartLegend categories={activeCats} />
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={480}>
              <LineChart data={history} margin={{ top: 10, right: 20, bottom: 60, left: 10 }}>
                <CartesianGrid
                  strokeDasharray="none"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8a8a9a', fontSize: 11 }}
                  tickFormatter={(v) => formatXAxisDate(v, range)}
                  interval={tickInterval}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                <YAxis
                  domain={[0, 200]}
                  ticks={[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200]}
                  tick={{ fill: '#8a8a9a', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                  tickLine={false}
                  width={50}
                />
                <ReferenceLine
                  y={100}
                  stroke="var(--accent-gold)"
                  strokeDasharray="6 4"
                  strokeOpacity={0.4}
                />
                <Tooltip content={<CustomTooltip />} />
                {activeCats.map(cat => (
                  <Line
                    key={cat.key}
                    type="monotone"
                    dataKey={cat.key}
                    stroke={cat.color}
                    strokeWidth={2.5}
                    dot={numDays <= 14 ? { r: 3, fill: cat.color, strokeWidth: 0 } : false}
                    activeDot={{ r: 6, fill: cat.color, stroke: '#0d0a14', strokeWidth: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="individual-charts">
          {activeCats.map(cat => (
            <div key={cat.key} className="chart-section individual">
              <h3 style={{ color: cat.color }}>{cat.label}</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={history} margin={{ top: 10, right: 15, bottom: 50, left: 5 }}>
                    <CartesianGrid strokeDasharray="none" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#8a8a9a', fontSize: 10 }}
                      tickFormatter={(v) => formatXAxisDate(v, range)}
                      interval={tickInterval}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                      axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 200]}
                      ticks={[0, 50, 100, 150, 200]}
                      tick={{ fill: '#8a8a9a', fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <ReferenceLine y={100} stroke={cat.color} strokeDasharray="6 4" strokeOpacity={0.25} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey={cat.key}
                      stroke={cat.color}
                      strokeWidth={2.5}
                      dot={numDays <= 14 ? { r: 3, fill: cat.color, strokeWidth: 0 } : false}
                      activeDot={{ r: 6, fill: cat.color, stroke: '#0d0a14', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Day-of-week patterns */}
      <div className="chart-section">
        <div className="chart-title-row">
          <div>
            <h3>Average by Day of Week</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              Spot which days you tend to fall behind in each category.
            </p>
          </div>
          <ChartLegend categories={activeCats} />
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={dowChartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="none" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#8a8a9a', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 'auto']}
                tick={{ fill: '#8a8a9a', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <ReferenceLine y={100} stroke="var(--accent-gold)" strokeDasharray="6 4" strokeOpacity={0.3} />
              <Tooltip content={<CustomTooltip />} />
              {activeCats.map(cat => (
                <Line
                  key={cat.key}
                  type="monotone"
                  dataKey={cat.key}
                  stroke={cat.color}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: cat.color, stroke: '#0d0a14', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: cat.color, stroke: '#0d0a14', strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        .sprite-history-page {
          overflow-y: auto; height: calc(100vh - var(--header-height) - 56px);
          padding-bottom: 40px;
        }
        .history-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
        }
        .history-header h2 { margin: 0; font-size: 20px; }
        .history-controls { display: flex; gap: 4px; }
        .range-btn {
          background: var(--bg-card); border: 1px solid var(--border);
          color: var(--text-muted); padding: 5px 12px; border-radius: 6px;
          font-size: 12px; cursor: pointer; transition: all 0.15s;
        }
        .range-btn.active {
          background: var(--accent-gold); color: #0d0a14;
          border-color: var(--accent-gold); font-weight: 600;
        }
        .cat-toggles {
          display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap;
          align-items: center;
        }
        .cat-toggle {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 8px; border: 1px solid;
          font-size: 12px; cursor: pointer; transition: all 0.15s;
          font-weight: 500;
        }
        .cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        /* Average cards */
        .avg-cards {
          display: grid; grid-template-columns: repeat(6, 1fr);
          gap: 10px; margin-bottom: 20px;
        }
        .avg-card {
          background: var(--bg-card); border: 1px solid;
          border-radius: 10px; padding: 14px 12px;
          display: flex; flex-direction: column; align-items: center;
        }
        .avg-num { font-size: 22px; font-weight: 700; }
        .avg-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

        /* Chart sections */
        .chart-section {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 12px; padding: 24px; margin-bottom: 16px;
        }
        .chart-section h3 { margin: 0; font-size: 15px; }
        .chart-title-row {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 16px;
        }
        .chart-wrapper { }
        .individual-charts {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 16px; margin-bottom: 16px;
        }
        .chart-section.individual { margin-bottom: 0; padding: 18px; }

        /* Legend — styled like the screenshot */
        .chart-legend {
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          border-radius: 8px; padding: 10px 14px;
          display: flex; flex-direction: column; gap: 5px;
          min-width: 130px;
        }
        .chart-legend-title {
          font-size: 12px; font-weight: 600; color: var(--text-primary);
          margin-bottom: 2px;
        }
        .chart-legend-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--text-secondary);
        }
        .chart-legend-dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
        }

        /* Tooltip */
        .history-tooltip {
          background: #1a1625; border: 1px solid var(--border);
          border-radius: 8px; padding: 12px 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6);
          min-width: 180px;
        }
        .tooltip-date {
          font-size: 13px; font-weight: 600; color: var(--text-primary);
          margin-bottom: 8px; border-bottom: 1px solid var(--border);
          padding-bottom: 6px;
        }
        .tooltip-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; padding: 3px 0;
        }
        .tooltip-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .tooltip-cat { color: var(--text-muted); flex: 1; }
        .tooltip-val { font-weight: 700; color: var(--text-primary); font-size: 13px; }

        /* Recharts overrides for dark theme */
        .recharts-cartesian-grid-horizontal line { stroke: rgba(255,255,255,0.06); }
        .recharts-text { fill: #8a8a9a; }

        @media (max-width: 900px) {
          .avg-cards { grid-template-columns: repeat(3, 1fr); }
          .individual-charts { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
