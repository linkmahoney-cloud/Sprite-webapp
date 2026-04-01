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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDateLabel(dateStr, range) {
  const d = new Date(dateStr + 'T12:00:00')
  if (parseInt(range) <= 14) {
    return `${DAY_NAMES[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`
  }
  if (parseInt(range) <= 90) {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = new Date(label + 'T12:00:00')
  const dayName = DAY_NAMES[d.getDay()]
  const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="history-tooltip">
      <div className="tooltip-date">{dayName}, {dateLabel}</div>
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

export default function SpriteHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30')
  const [selectedCats, setSelectedCats] = useState(SPRITE_CATEGORIES.map(c => c.key))
  const [viewMode, setViewMode] = useState('combined') // combined | individual

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    try {
      const res = await fetch(`/api/sprite/history?days=${range}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
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

  // Compute weekly averages for the "by day of week" analysis
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

  // Overall averages per category
  const overallAvgs = SPRITE_CATEGORIES.map(cat => {
    if (history.length === 0) return { ...cat, avg: 0 }
    const avg = Math.round(history.reduce((s, h) => s + (h[cat.key] || 0), 0) / history.length)
    return { ...cat, avg }
  })

  // Format x-axis data
  const chartData = history.map(h => ({
    ...h,
    label: formatDateLabel(h.date, range),
  }))

  // Determine tick interval based on range
  const tickInterval = parseInt(range) <= 14 ? 0 : parseInt(range) <= 30 ? 2 : parseInt(range) <= 90 ? 6 : 14

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

      {/* Category toggles */}
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
        <button
          className={`range-btn ${viewMode === 'combined' ? 'active' : ''}`}
          onClick={() => setViewMode('combined')}
        >
          Combined
        </button>
        <button
          className={`range-btn ${viewMode === 'individual' ? 'active' : ''}`}
          onClick={() => setViewMode('individual')}
        >
          Individual
        </button>
      </div>

      {/* Overall averages */}
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
        /* Combined chart — all selected categories on one graph */
        <div className="chart-section">
          <h3>All Categories</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => formatDateLabel(v, range)}
                  interval={tickInterval}
                />
                <YAxis
                  domain={[0, 200]}
                  ticks={[0, 25, 50, 75, 100, 125, 150, 175, 200]}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <ReferenceLine y={100} stroke="var(--accent-gold)" strokeDasharray="5 5" strokeOpacity={0.5} label={{ value: '100%', fill: 'var(--accent-gold)', fontSize: 11, position: 'right' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => SPRITE_CATEGORIES.find(c => c.key === value)?.label || value}
                  wrapperStyle={{ fontSize: 12 }}
                />
                {SPRITE_CATEGORIES.filter(c => selectedCats.includes(c.key)).map(cat => (
                  <Line
                    key={cat.key}
                    type="monotone"
                    dataKey={cat.key}
                    stroke={cat.color}
                    strokeWidth={2}
                    dot={parseInt(range) <= 14}
                    activeDot={{ r: 5, fill: cat.color }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Individual charts — one per category */
        <div className="individual-charts">
          {SPRITE_CATEGORIES.filter(c => selectedCats.includes(c.key)).map(cat => (
            <div key={cat.key} className="chart-section individual">
              <h3 style={{ color: cat.color }}>{cat.label}</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => formatDateLabel(v, range)}
                      interval={tickInterval}
                    />
                    <YAxis
                      domain={[0, 200]}
                      ticks={[0, 50, 100, 150, 200]}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <ReferenceLine y={100} stroke={cat.color} strokeDasharray="5 5" strokeOpacity={0.3} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey={cat.key}
                      stroke={cat.color}
                      strokeWidth={2.5}
                      dot={parseInt(range) <= 14}
                      activeDot={{ r: 5, fill: cat.color }}
                      fill={`${cat.color}20`}
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
        <h3>Average by Day of Week</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
          See which days you tend to lack in each category.
        </p>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dowChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <YAxis
                domain={[0, 'auto']}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={100} stroke="var(--accent-gold)" strokeDasharray="5 5" strokeOpacity={0.3} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => SPRITE_CATEGORIES.find(c => c.key === value)?.label || value}
                wrapperStyle={{ fontSize: 12 }}
              />
              {SPRITE_CATEGORIES.filter(c => selectedCats.includes(c.key)).map(cat => (
                <Line
                  key={cat.key}
                  type="monotone"
                  dataKey={cat.key}
                  stroke={cat.color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: cat.color }}
                  activeDot={{ r: 6 }}
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
        .chart-section {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 12px; padding: 20px; margin-bottom: 16px;
        }
        .chart-section h3 { margin: 0 0 12px; font-size: 15px; }
        .chart-wrapper { margin: 0 -10px; }
        .individual-charts {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 16px; margin-bottom: 16px;
        }
        .chart-section.individual { margin-bottom: 0; }

        /* Tooltip */
        .history-tooltip {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 8px; padding: 10px 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .tooltip-date {
          font-size: 12px; font-weight: 600; color: var(--text-primary);
          margin-bottom: 6px; border-bottom: 1px solid var(--border);
          padding-bottom: 4px;
        }
        .tooltip-row {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; padding: 2px 0;
        }
        .tooltip-dot { width: 8px; height: 8px; border-radius: 50%; }
        .tooltip-cat { color: var(--text-muted); flex: 1; }
        .tooltip-val { font-weight: 600; color: var(--text-primary); }

        @media (max-width: 900px) {
          .avg-cards { grid-template-columns: repeat(3, 1fr); }
          .individual-charts { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
