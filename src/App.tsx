import { useState, useMemo, useCallback } from 'react';
import QRCode from 'react-qr-code';
import {
  ScatterChart, Scatter, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Label,
} from 'recharts';
import {
  type FormInputs, type PredictionResult, type Recommendation,
  OCC_MAP, OCC_BASELINES, AGE_BASELINES, METRICS, GBR_IMPORTANCES,
  THRESHOLD_DATA, SCATTER_STRESS, SCATTER_STEPS,
  computeBMI, bmiCategory, getAgeBand, ridgePredict, nonlinearPredict,
  computeDrivers, localRecommendations, fetchRecommendations,
} from './model';

// ── Score Gauge ──────────────────────────────────────────
function ScoreGauge({ score, label }: { score: number; label: string }) {
  const r = 70, sw = 10;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (score / 100) * 0.75);
  const c = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : score >= 40 ? 'var(--orange)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: 180, height: 150, margin: '0 auto' }}>
      <svg width={180} height={150} viewBox="0 0 180 150">
        <path d="M 20 130 A 70 70 0 1 1 160 130" fill="none" stroke="#e5e5e5" strokeWidth={sw} strokeLinecap="round" />
        <path d="M 20 130 A 70 70 0 1 1 160 130" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ * 0.75} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.4s' }} />
      </svg>
      <div style={{ position: 'absolute', top: '46%', left: '50%', transform: 'translate(-50%,-30%)', textAlign: 'center' }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: c, lineHeight: 1 }}>{Math.round(score)}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</div>
      </div>
    </div>
  );
}

// ── Field ────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'number', min, max, step, options }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; min?: number; max?: number; step?: number; options?: string[];
}) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label className="field-label">{label}</label>
      {options ? (
        <select className="field-select" value={value} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="field-input" type={type} min={min} max={max} step={step ?? 1}
          value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}

// ── App ──────────────────────────────────────────────────
type Tab = 'input' | 'results' | 'explore' | 'history';
interface HistoryEntry extends PredictionResult { inputs: FormInputs }

const tipStyle = {
  backgroundColor: '#fff', border: '1px solid #e5e5e5',
  borderRadius: 8, color: '#171717', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const CHART_BLUE = '#2563eb';
const CHART_BLUE_LIGHT = '#93c5fd';
const CHART_GRID = '#f0f0f0';

export default function App() {
  const [tab, setTab] = useState<Tab>('input');
  const [form, setForm] = useState<FormInputs>({
    age: 35, gender: 'Male', heightCm: 175, weightKg: 75,
    occupation: 'Software Engineer', sleepDuration: 6.5,
    stressLevel: 6, physicalActivity: 45, heartRate: 72,
    dailySteps: 5000, sleepDisorder: 'None',
    bpSystolic: 125, bpDiastolic: 82,
  });
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ occupation: 'All', ageBand: 'All' });

  const appUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin || 'https://sleep-score-dashboard.vercel.app';

  const set = useCallback((k: keyof FormInputs, raw: string) => {
    setForm(p => ({ ...p, [k]: typeof p[k] === 'number' ? (parseFloat(raw) || 0) : raw }));
  }, []);

  const predict = async () => {
    setLoading(true);
    const bmi = computeBMI(form.heightCm, form.weightKg);
    const bmiCat = bmiCategory(bmi);
    const ridge = ridgePredict(form, bmiCat);
    const nl = nonlinearPredict(form, bmiCat);
    const final = Math.round(Math.max(0, Math.min(100, nl * 0.7 + ridge * 0.3)));
    const drivers = computeDrivers(form);
    const occ = OCC_BASELINES[form.occupation] || { avgScore: 65, avgDuration: 7, avgStress: 5, avgActivity: 55, avgSteps: 6500, avgHeartRate: 71, count: 0 };
    const band = getAgeBand(form.age);
    const ageBl = AGE_BASELINES[band] || { avgScore: 65, avgDuration: 7, avgStress: 5, count: 0 };

    const r: PredictionResult = {
      score: final, ridgeScore: Math.round(ridge), nlScore: nl,
      drivers, occBaseline: occ, ageBaseline: ageBl, ageBand: band,
      bmi: bmi.toFixed(1), bmiCategory: bmiCat,
      errorBand: METRICS.gbr.cvMae, timestamp: new Date().toLocaleString(),
    };
    setResult(r);
    setHistory(prev => [{ ...r, inputs: { ...form } }, ...prev].slice(0, 20));
    setTab('results');

    try {
      const aiRecs = await fetchRecommendations(form, final, drivers, occ, ageBl.avgScore);
      setRecs(aiRecs);
    } catch {
      setRecs(localRecommendations(form, final, drivers, occ));
    }
    setLoading(false);
  };

  const occChartData = useMemo(
    () => Object.entries(OCC_BASELINES)
      .map(([occ, d]) => ({ occupation: occ, score: d.avgScore, count: d.count }))
      .sort((a, b) => b.score - a.score),
    [],
  );

  const scoreColor = (s: number) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : s >= 40 ? 'var(--orange)' : 'var(--red)';
  const badgeCls = (impact: string) => `badge badge-${impact}`;
  const dotColor = (s: number) => s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : s >= 40 ? '#ea580c' : '#dc2626';

  return (
    <>
      {/* ── HEADER ─────────────────────────────────────── */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e5e5e5',
        padding: '12px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: 'white', fontWeight: 700,
          }}>S</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>SleepScore</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Analytics Dashboard</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {(['input', 'results', 'explore', 'history'] as Tab[]).map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {{ input: 'Calculator', results: 'Results', explore: 'Explore', history: 'History' }[t]}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 20px' }}>

        {/* ═══════ INPUT ═══════ */}
        {tab === 'input' && (
          <>
            <div style={{ marginBottom: 24 }} className="fade-up">
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                Sleep Score Predictor
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, maxWidth: 640 }}>
                ML-powered sleep quality assessment trained on 374 health professionals.
                Enter your metrics to get a personalized score, driver analysis, and recommendations.
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
                padding: '5px 12px', background: 'var(--accent-muted)', borderRadius: 6,
                fontSize: 11, color: 'var(--accent)', fontWeight: 600,
              }}>
                Kaggle Sleep Health and Lifestyle Dataset (n=374)
              </div>
            </div>

            <div className="layout-main" style={{ display: 'grid', gridTemplateColumns: '5fr 2fr', gap: 22 }}>
              <div className="card fade-up fade-up-1">
                <h3 className="section-label">Health Profile</h3>
                <div className="grid-3">
                  <Field label="Age" value={form.age} onChange={v => set('age', v)} min={18} max={80} />
                  <Field label="Gender" value={form.gender} onChange={v => set('gender', v)} options={['Male', 'Female']} />
                  <Field label="Occupation" value={form.occupation} onChange={v => set('occupation', v)} options={Object.keys(OCC_MAP)} />
                </div>
                <div className="grid-3">
                  <Field label="Height (cm)" value={form.heightCm} onChange={v => set('heightCm', v)} min={140} max={220} />
                  <Field label="Weight (kg)" value={form.weightKg} onChange={v => set('weightKg', v)} min={40} max={200} />
                  <Field label="Sleep Duration (h)" value={form.sleepDuration} onChange={v => set('sleepDuration', v)} min={3} max={12} step={0.1} />
                </div>
                <div className="grid-3">
                  <Field label="Stress Level (1-8)" value={form.stressLevel} onChange={v => set('stressLevel', v)} min={1} max={8} />
                  <Field label="Activity (min/day)" value={form.physicalActivity} onChange={v => set('physicalActivity', v)} min={0} max={120} />
                  <Field label="Daily Steps" value={form.dailySteps} onChange={v => set('dailySteps', v)} min={0} max={30000} step={100} />
                </div>
                <div className="grid-3">
                  <Field label="Heart Rate (bpm)" value={form.heartRate} onChange={v => set('heartRate', v)} min={50} max={120} />
                  <Field label="BP Systolic" value={form.bpSystolic} onChange={v => set('bpSystolic', v)} min={90} max={180} />
                  <Field label="BP Diastolic" value={form.bpDiastolic} onChange={v => set('bpDiastolic', v)} min={60} max={120} />
                </div>
                <div className="grid-2">
                  <Field label="Sleep Disorder" value={form.sleepDisorder} onChange={v => set('sleepDisorder', v)} options={['None', 'Insomnia', 'Sleep Apnea']} />
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button className="btn-primary" onClick={predict} disabled={loading}>
                      {loading ? 'Analyzing...' : 'Predict Sleep Score'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="card fade-up fade-up-2">
                  <h4 className="section-label">Model</h4>
                  {[
                    ['Ridge CV-MAE', METRICS.ridge.cvMae],
                    ['GBR CV-MAE', METRICS.gbr.cvMae],
                    ['Records', 374],
                    ['Features', 12],
                  ].map(([k, v]) => (
                    <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2 }}>
                      <span>{k as string}</span><span style={{ fontWeight: 600 }}>{v as string | number}</span>
                    </div>
                  ))}
                </div>

                <div className="card fade-up fade-up-3">
                  <h4 className="section-label">Feature Importance</h4>
                  {GBR_IMPORTANCES.slice(0, 6).map(f => (
                    <div key={f.key} style={{ marginBottom: 9 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{f.label}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{(f.importance * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: '#f0f0f0' }}>
                        <div style={{ height: 4, borderRadius: 2, width: `${(f.importance / 0.836) * 100}%`, background: CHART_BLUE, transition: 'width 0.6s' }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card fade-up fade-up-4" style={{ textAlign: 'center' }}>
                  <h4 className="section-label">Share</h4>
                  <div style={{ display: 'inline-block', padding: 8, background: '#fff', borderRadius: 8, border: '1px solid #e5e5e5' }}>
                    <QRCode value={appUrl} size={96} level="M" fgColor="#171717" />
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6, wordBreak: 'break-all' }}>{appUrl}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════ RESULTS ═══════ */}
        {tab === 'results' && result && (
          <div className="fade-up">
            <div className="results-top" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 22 }}>
              {/* Score */}
              <div className="card" style={{ textAlign: 'center' }}>
                <ScoreGauge score={result.score} label="Sleep Score" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  +/- {result.errorBand.toFixed(1)} pts (CV-MAE)
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <span>Ridge: {result.ridgeScore}</span><span>|</span><span>Non-linear: {result.nlScore}</span>
                </div>
              </div>

              {/* Comparison */}
              <div className="card">
                <h4 className="section-label">Baseline Comparison</h4>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                    vs {form.occupation} avg ({result.occBaseline.count} people)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: result.score >= result.occBaseline.avgScore ? 'var(--green)' : 'var(--orange)' }}>
                      {result.score >= result.occBaseline.avgScore ? '+' : ''}{Math.round(result.score - result.occBaseline.avgScore)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>pts from {result.occBaseline.avgScore}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>vs Age {result.ageBand} avg</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: result.score >= result.ageBaseline.avgScore ? 'var(--green)' : 'var(--orange)' }}>
                      {result.score >= result.ageBaseline.avgScore ? '+' : ''}{Math.round(result.score - result.ageBaseline.avgScore)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>pts from {result.ageBaseline.avgScore}</span>
                  </div>
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>BMI: {result.bmi} ({result.bmiCategory})</div>
              </div>

              {/* Drivers */}
              <div className="card">
                <h4 className="section-label">Score Drivers</h4>
                {result.drivers.map((d, i) => (
                  <div key={i} style={{ padding: '7px 0', borderBottom: i < result.drivers.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d.factor}</span>
                      <span className={badgeCls(d.impact)}>{d.value}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{d.message}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="card" style={{ marginBottom: 22 }}>
              <h4 className="section-label">
                {loading ? 'Generating recommendations...' : 'Recommendations'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {recs.map((r, i) => (
                  <div key={i} style={{ padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 5 }}>{r.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{r.body}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Threshold Chart */}
            <div className="card">
              <h4 className="section-label">Sleep Duration vs Score</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Nonlinear threshold near 7h (Li et al. 2022). Scores rise sharply at 7h, consistent with AASM consensus.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={THRESHOLD_DATA} margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                  <defs>
                    <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="duration" stroke="#a3a3a3" fontSize={11} tickLine={false}>
                    <Label value="Sleep Duration (hours)" position="bottom" offset={8} style={{ fill: '#a3a3a3', fontSize: 11 }} />
                  </XAxis>
                  <YAxis stroke="#a3a3a3" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tipStyle} />
                  <ReferenceLine x={7} stroke="#d97706" strokeDasharray="6 3" strokeWidth={1.5}
                    label={{ value: '7h threshold', position: 'top', fill: '#d97706', fontSize: 10 }} />
                  <ReferenceLine x={form.sleepDuration} stroke="#dc2626" strokeDasharray="4 2"
                    label={{ value: 'You', position: 'top', fill: '#dc2626', fontSize: 10 }} />
                  <Area type="monotone" dataKey="score" stroke={CHART_BLUE} strokeWidth={2} fill="url(#gScore)" dot={{ r: 2.5, fill: CHART_BLUE }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'results' && !result && (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎯</div>
            <h3 style={{ color: 'var(--text)', marginBottom: 6, fontSize: 18 }}>No prediction yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Use the Calculator tab to get started.</p>
          </div>
        )}

        {/* ═══════ EXPLORE ═══════ */}
        {tab === 'explore' && (
          <div className="fade-up">
            <div className="card" style={{ marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-label)', textTransform: 'uppercase' }}>Filters</span>
              <select className="field-select" style={{ width: 'auto' }} value={filter.occupation}
                onChange={e => setFilter(p => ({ ...p, occupation: e.target.value }))}>
                <option value="All">All Occupations</option>
                {Object.keys(OCC_MAP).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select className="field-select" style={{ width: 'auto' }} value={filter.ageBand}
                onChange={e => setFilter(p => ({ ...p, ageBand: e.target.value }))}>
                <option value="All">All Ages</option>
                {Object.keys(AGE_BASELINES).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              <div className="card">
                <h4 className="section-label">Occupation Baseline Scores</h4>
                <ResponsiveContainer width="100%" height={330}>
                  <BarChart data={occChartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis type="number" domain={[0, 100]} stroke="#a3a3a3" fontSize={10} tickLine={false} />
                    <YAxis dataKey="occupation" type="category" width={110} stroke="#a3a3a3" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={tipStyle} />
                    <Bar dataKey="score" radius={[0, 5, 5, 0]} barSize={15}>
                      {occChartData.map((e, i) => (
                        <Cell key={i} fill={
                          filter.occupation !== 'All' && e.occupation === filter.occupation
                            ? '#d97706' : e.score >= 80 ? CHART_BLUE : e.score >= 60 ? CHART_BLUE_LIGHT : '#d4d4d4'
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h4 className="section-label">Stress Level vs Sleep Score</h4>
                <ResponsiveContainer width="100%" height={330}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="stress" name="Stress" stroke="#a3a3a3" fontSize={11} tickLine={false} domain={[2, 9]}>
                      <Label value="Stress Level" position="bottom" offset={8} style={{ fill: '#a3a3a3', fontSize: 11 }} />
                    </XAxis>
                    <YAxis dataKey="score" name="Score" stroke="#a3a3a3" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={tipStyle} />
                    <Scatter data={SCATTER_STRESS} fillOpacity={0.8}>
                      {SCATTER_STRESS.map((e, i) => <Cell key={i} fill={dotColor(e.score)} r={6} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              <div className="card">
                <h4 className="section-label">Daily Steps vs Sleep Score</h4>
                <ResponsiveContainer width="100%" height={270}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="steps" name="Steps" stroke="#a3a3a3" fontSize={11} tickLine={false}>
                      <Label value="Daily Steps" position="bottom" offset={8} style={{ fill: '#a3a3a3', fontSize: 11 }} />
                    </XAxis>
                    <YAxis dataKey="score" name="Score" stroke="#a3a3a3" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={tipStyle} />
                    <Scatter data={SCATTER_STEPS} fillOpacity={0.8}>
                      {SCATTER_STEPS.map((e, i) => <Cell key={i} fill={dotColor(e.score)} r={6} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h4 className="section-label">Age Band Averages</h4>
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={Object.entries(AGE_BASELINES).map(([b, d]) => ({ band: b, score: d.avgScore }))} margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="band" stroke="#a3a3a3" fontSize={11} tickLine={false}>
                      <Label value="Age Band" position="bottom" offset={8} style={{ fill: '#a3a3a3', fontSize: 11 }} />
                    </XAxis>
                    <YAxis stroke="#a3a3a3" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={tipStyle} />
                    <Bar dataKey="score" radius={[5, 5, 0, 0]} barSize={42}>
                      {Object.keys(AGE_BASELINES).map((b, i) => (
                        <Cell key={i} fill={filter.ageBand === b ? '#d97706' : CHART_BLUE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h4 className="section-label">References</h4>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div>Li Y, et al. (2022). The brain structure and genetic mechanisms underlying the nonlinear association between sleep duration, cognition and mental health. <em>Nature Aging</em>, 2, 425-437.</div>
                <div>Watson NF, et al. (2015). Recommended amount of sleep for a healthy adult: A joint consensus. <em>AASM/SRS. J Clin Sleep Med</em>, 11(6), 591-592.</div>
                <div>Li Y, et al. (2019). Stressful life events, rumination, resilience, and sleep quality. <em>J Psychosom Res</em>, 117, 49-55.</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ HISTORY ═══════ */}
        {tab === 'history' && (
          <div className="card fade-up">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>Prediction History</h3>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                <div>No predictions yet. Use the Calculator tab to get started.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="history-table">
                  <thead>
                    <tr>
                      {['Time', 'Score', 'Sleep', 'Stress', 'Occupation', 'Age', 'vs Occ Avg'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => {
                      const diff = h.score - h.occBaseline.avgScore;
                      return (
                        <tr key={i}>
                          <td>{h.timestamp}</td>
                          <td><span style={{ fontWeight: 800, fontSize: 15, color: scoreColor(h.score) }}>{h.score}</span></td>
                          <td>{h.inputs.sleepDuration}h</td>
                          <td>{h.inputs.stressLevel}/8</td>
                          <td>{h.inputs.occupation}</td>
                          <td>{h.inputs.age}</td>
                          <td><span className={badgeCls(diff >= 0 ? 'positive' : 'negative')}>{diff >= 0 ? '+' : ''}{Math.round(diff)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer style={{
          marginTop: 32, padding: '16px 0', borderTop: '1px solid #e5e5e5',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap', gap: 8,
        }}>
          <span>Built by Prasanna | RQ1: Prediction, RQ2: Drivers, RQ3: Threshold Effects</span>
          <span>Ridge CV-MAE: {METRICS.ridge.cvMae} | GBR CV-MAE: {METRICS.gbr.cvMae}</span>
        </footer>
      </main>
    </>
  );
}