// ════════════════════════════════════════════════════════════════
// MODEL COEFFICIENTS & DATA (trained from Kaggle Sleep Health Dataset)
// ════════════════════════════════════════════════════════════════

export const RIDGE = {
  coef: {
    sleepDuration: 2.818, stressLevel: -9.828, physicalActivity: 0.026,
    heartRate: 0.034, dailySteps: 0.001, age: 0.809,
    gender: -4.825, bmi: -7.151, disorder: -0.480,
    occupation: -1.283, bpSys: 0.183, bpDia: -0.177,
  },
  intercept: 54.089,
};

export const GBR_IMPORTANCES = [
  { key: 'sleepDuration', label: 'Sleep Duration', importance: 0.836 },
  { key: 'stressLevel',   label: 'Stress Level',   importance: 0.087 },
  { key: 'heartRate',     label: 'Heart Rate',      importance: 0.034 },
  { key: 'dailySteps',    label: 'Daily Steps',     importance: 0.018 },
  { key: 'age',           label: 'Age',             importance: 0.009 },
  { key: 'bpDia',         label: 'Blood Pressure',  importance: 0.007 },
  { key: 'occupation',    label: 'Occupation',       importance: 0.006 },
  { key: 'physicalActivity', label: 'Physical Activity', importance: 0.003 },
];

export const METRICS = {
  ridge: { mae: 3.82, rmse: 5.36, cvMae: 7.11 },
  gbr:   { mae: 0.02, rmse: 0.06, cvMae: 4.90 },
};

export const OCC_MAP: Record<string, number> = {
  Accountant: 0, Doctor: 1, Engineer: 2, Lawyer: 3, Manager: 4,
  Nurse: 5, 'Sales Representative': 6, Salesperson: 7, Scientist: 8,
  'Software Engineer': 9, Teacher: 10,
};

export const GENDER_MAP: Record<string, number> = { Male: 0, Female: 1 };
export const BMI_MAP: Record<string, number> = { Normal: 0, Overweight: 1, Obese: 2 };
export const DISORDER_MAP: Record<string, number> = { None: 0, Insomnia: 1, 'Sleep Apnea': 2 };

export interface OccBaseline {
  avgScore: number; avgDuration: number; avgStress: number;
  avgActivity: number; avgSteps: number; avgHeartRate: number; count: number;
}

export const OCC_BASELINES: Record<string, OccBaseline> = {
  'Software Engineer': { avgScore: 50.0, avgDuration: 6.75, avgStress: 6.0, avgActivity: 48.0, avgSteps: 5800, avgHeartRate: 75.5, count: 4 },
  Doctor:             { avgScore: 53.0, avgDuration: 6.97, avgStress: 6.73, avgActivity: 55.35, avgSteps: 6808, avgHeartRate: 71.52, count: 71 },
  'Sales Representative': { avgScore: 0.0, avgDuration: 5.9, avgStress: 8.0, avgActivity: 30.0, avgSteps: 3000, avgHeartRate: 85.0, count: 2 },
  Teacher:            { avgScore: 59.5, avgDuration: 6.69, avgStress: 4.53, avgActivity: 45.62, avgSteps: 5958, avgHeartRate: 67.22, count: 40 },
  Nurse:              { avgScore: 67.4, avgDuration: 7.06, avgStress: 5.55, avgActivity: 78.59, avgSteps: 8058, avgHeartRate: 72.0, count: 73 },
  Engineer:           { avgScore: 88.3, avgDuration: 7.99, avgStress: 3.89, avgActivity: 51.86, avgSteps: 5981, avgHeartRate: 67.19, count: 63 },
  Accountant:         { avgScore: 77.8, avgDuration: 7.11, avgStress: 4.59, avgActivity: 58.11, avgSteps: 6881, avgHeartRate: 68.86, count: 37 },
  Scientist:          { avgScore: 20.0, avgDuration: 6.0, avgStress: 7.0, avgActivity: 41.0, avgSteps: 5350, avgHeartRate: 78.5, count: 4 },
  Lawyer:             { avgScore: 77.9, avgDuration: 7.41, avgStress: 5.06, avgActivity: 70.43, avgSteps: 7662, avgHeartRate: 69.64, count: 47 },
  Salesperson:        { avgScore: 40.0, avgDuration: 6.4, avgStress: 7.0, avgActivity: 45.0, avgSteps: 6000, avgHeartRate: 72.0, count: 32 },
  Manager:            { avgScore: 60.0, avgDuration: 6.9, avgStress: 5.0, avgActivity: 55.0, avgSteps: 5500, avgHeartRate: 75.0, count: 1 },
};

export interface AgeBandBaseline { avgScore: number; avgDuration: number; avgStress: number; count: number }
export const AGE_BASELINES: Record<string, AgeBandBaseline> = {
  '27-35': { avgScore: 50.0, avgDuration: 6.85, avgStress: 6.57, count: 94 },
  '36-45': { avgScore: 66.8, avgDuration: 7.05, avgStress: 5.14, count: 170 },
  '46-55': { avgScore: 70.4, avgDuration: 7.24, avgStress: 5.51, count: 77 },
  '56-59': { avgScore: 100.0, avgDuration: 8.1, avgStress: 3.0, count: 33 },
};

// Chart datasets (aggregated from training data)
export const THRESHOLD_DATA = [
  { duration: 5.8, score: 0 }, { duration: 5.9, score: 5 }, { duration: 6.0, score: 35 },
  { duration: 6.1, score: 38 }, { duration: 6.2, score: 38 }, { duration: 6.3, score: 40 },
  { duration: 6.4, score: 40 }, { duration: 6.5, score: 45 }, { duration: 6.6, score: 55 },
  { duration: 6.7, score: 55 }, { duration: 6.8, score: 50 }, { duration: 6.9, score: 55 },
  { duration: 7.0, score: 75 }, { duration: 7.1, score: 75 }, { duration: 7.2, score: 78 },
  { duration: 7.3, score: 78 }, { duration: 7.4, score: 75 }, { duration: 7.5, score: 80 },
  { duration: 7.6, score: 80 }, { duration: 7.7, score: 78 }, { duration: 7.8, score: 82 },
  { duration: 7.9, score: 80 }, { duration: 8.0, score: 100 }, { duration: 8.1, score: 100 },
  { duration: 8.2, score: 100 }, { duration: 8.3, score: 100 }, { duration: 8.4, score: 100 },
  { duration: 8.5, score: 100 },
];

export const SCATTER_STRESS = [
  { stress: 3, score: 100 }, { stress: 3, score: 80 }, { stress: 4, score: 80 },
  { stress: 4, score: 60 }, { stress: 5, score: 80 }, { stress: 5, score: 60 },
  { stress: 6, score: 60 }, { stress: 6, score: 40 }, { stress: 7, score: 40 },
  { stress: 7, score: 20 }, { stress: 7, score: 60 }, { stress: 8, score: 40 },
  { stress: 8, score: 0 },
];

export const SCATTER_STEPS = [
  { steps: 3000, score: 0 }, { steps: 3500, score: 40 }, { steps: 4000, score: 20 },
  { steps: 4200, score: 40 }, { steps: 5000, score: 60 }, { steps: 5500, score: 40 },
  { steps: 5600, score: 60 }, { steps: 6000, score: 50 }, { steps: 6800, score: 70 },
  { steps: 7000, score: 80 }, { steps: 7500, score: 100 }, { steps: 8000, score: 75 },
  { steps: 10000, score: 60 },
];

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════
export interface FormInputs {
  age: number; gender: string; heightCm: number; weightKg: number;
  occupation: string; sleepDuration: number; stressLevel: number;
  physicalActivity: number; heartRate: number; dailySteps: number;
  sleepDisorder: string; bpSystolic: number; bpDiastolic: number;
}

export interface Driver {
  factor: string; value: string; impact: 'positive' | 'negative' | 'neutral';
  delta: number; weight: number; message: string;
}

export interface PredictionResult {
  score: number; ridgeScore: number; nlScore: number;
  drivers: Driver[]; occBaseline: OccBaseline; ageBaseline: AgeBandBaseline;
  ageBand: string; bmi: string; bmiCategory: string;
  errorBand: number; timestamp: string;
}

export interface Recommendation { title: string; body: string }

// ════════════════════════════════════════════════════════════════
// PREDICTION ENGINE
// ════════════════════════════════════════════════════════════════
function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

export function computeBMI(heightCm: number, weightKg: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function getAgeBand(age: number): string {
  if (age <= 35) return '27-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  return '56-59';
}

export function ridgePredict(f: FormInputs, bmiCat: string): number {
  const c = RIDGE.coef;
  let s = RIDGE.intercept;
  s += c.sleepDuration * f.sleepDuration;
  s += c.stressLevel * f.stressLevel;
  s += c.physicalActivity * f.physicalActivity;
  s += c.heartRate * f.heartRate;
  s += c.dailySteps * f.dailySteps;
  s += c.age * f.age;
  s += c.gender * (GENDER_MAP[f.gender] ?? 0);
  s += c.bmi * (BMI_MAP[bmiCat] ?? 0);
  s += c.disorder * (DISORDER_MAP[f.sleepDisorder] ?? 0);
  s += c.occupation * (OCC_MAP[f.occupation] ?? 0);
  s += c.bpSys * f.bpSystolic;
  s += c.bpDia * f.bpDiastolic;
  return clamp(s);
}

export function nonlinearPredict(f: FormInputs, bmiCat: string): number {
  let base = ridgePredict(f, bmiCat);
  // Threshold correction capturing GBR's step-function near 7h
  if (f.sleepDuration < 6.0) base = Math.min(base, 15);
  else if (f.sleepDuration < 6.5) base = Math.min(base, 45);
  else if (f.sleepDuration < 7.0) base *= 0.85;
  else if (f.sleepDuration >= 8.0) base = Math.max(base, 85);
  // Stress amplification
  if (f.stressLevel >= 7) base -= (f.stressLevel - 6) * 5;
  if (f.stressLevel <= 3) base += 8;
  return clamp(Math.round(base));
}

// ════════════════════════════════════════════════════════════════
// DRIVER ATTRIBUTION
// ════════════════════════════════════════════════════════════════
const POP = { duration: 7.13, stress: 5.39, activity: 59.17, hr: 70.17, steps: 6817 };

export function computeDrivers(f: FormInputs): Driver[] {
  const d: Driver[] = [];

  const durD = f.sleepDuration - POP.duration;
  d.push({
    factor: 'Sleep Duration', value: f.sleepDuration + 'h',
    impact: durD > 0 ? 'positive' : durD < -0.3 ? 'negative' : 'neutral',
    delta: durD, weight: 0.836,
    message: f.sleepDuration < 7
      ? 'Below the recommended 7h threshold (Watson et al. 2015 AASM consensus)'
      : f.sleepDuration <= 8
        ? 'Within optimal 7-8h range (Li et al. 2022, Nature Aging)'
        : 'Above 8h; adequate for most adults',
  });

  const strD = f.stressLevel - POP.stress;
  d.push({
    factor: 'Stress Level', value: f.stressLevel + '/8',
    impact: strD < 0 ? 'positive' : strD > 1 ? 'negative' : 'neutral',
    delta: -strD, weight: 0.087,
    message: f.stressLevel >= 7
      ? 'High stress disrupts sleep quality (Li et al. 2019, rumination and resilience)'
      : f.stressLevel <= 4 ? 'Low stress supports restorative sleep' : 'Moderate stress level',
  });

  const stpD = f.dailySteps - POP.steps;
  d.push({
    factor: 'Daily Steps', value: f.dailySteps.toLocaleString(),
    impact: stpD > 500 ? 'positive' : stpD < -1000 ? 'negative' : 'neutral',
    delta: stpD / 1000, weight: 0.018,
    message: f.dailySteps < 5000
      ? 'Consider increasing daily movement'
      : f.dailySteps >= 8000 ? 'Strong activity level' : 'Moderate activity',
  });

  const hrD = f.heartRate - POP.hr;
  d.push({
    factor: 'Heart Rate', value: f.heartRate + ' bpm',
    impact: hrD < -2 ? 'positive' : hrD > 5 ? 'negative' : 'neutral',
    delta: -hrD, weight: 0.034,
    message: f.heartRate > 78
      ? 'Elevated resting heart rate may indicate stress or low cardiovascular fitness'
      : 'Resting heart rate in a healthy range',
  });

  return d.sort((a, b) => b.weight - a.weight);
}

// ════════════════════════════════════════════════════════════════
// RECOMMENDATIONS (API + fallback)
// ════════════════════════════════════════════════════════════════
export function localRecommendations(f: FormInputs, score: number, drivers: Driver[], occ: OccBaseline): Recommendation[] {
  const recs: Recommendation[] = [];
  if (f.sleepDuration < 7) {
    recs.push({ title: 'Extend Sleep Duration', body: `You're sleeping ${f.sleepDuration}h, below the AASM-recommended 7h minimum. Even 20-30 extra minutes can meaningfully improve your score.` });
  }
  if (f.stressLevel >= 7) {
    recs.push({ title: 'Address High Stress', body: `Your stress level of ${f.stressLevel}/8 is elevated. Research links chronic stress to rumination and poor sleep quality (Li et al. 2019).` });
  }
  if (f.dailySteps < 5000) {
    recs.push({ title: 'Increase Daily Movement', body: `At ${f.dailySteps.toLocaleString()} steps, you're well below the dataset average of 6,817. Aiming for 7,000+ supports better sleep outcomes.` });
  }
  if (score < occ.avgScore) {
    recs.push({ title: 'Close the Gap', body: `Your score is ${Math.round(occ.avgScore - score)} points below the ${f.occupation} average of ${occ.avgScore}. Focus on the top driver to improve.` });
  }
  if (f.heartRate > 78) {
    recs.push({ title: 'Monitor Heart Rate', body: `Resting HR of ${f.heartRate} bpm is above average (70 bpm in the dataset). Regular cardio can help lower this over time.` });
  }
  if (recs.length < 2) {
    recs.push({ title: 'Maintain Your Routine', body: 'Your metrics are solid. Consistency in sleep and wake times is one of the strongest predictors of sustained sleep quality.' });
  }
  return recs.slice(0, 4);
}

export async function fetchRecommendations(
  f: FormInputs, score: number, drivers: Driver[], occ: OccBaseline, ageBandScore: number
): Promise<Recommendation[]> {
  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        age: f.age, occupation: f.occupation, sleepDuration: f.sleepDuration,
        stressLevel: f.stressLevel, physicalActivity: f.physicalActivity,
        dailySteps: f.dailySteps, heartRate: f.heartRate,
        bmiCategory: bmiCategory(computeBMI(f.heightCm, f.weightKg)),
        sleepDisorder: f.sleepDisorder, score: Math.round(score),
        occAvgScore: occ.avgScore, occCount: occ.count,
        ageAvgScore: ageBandScore,
        driversText: drivers.map(d => `${d.factor}: ${d.message}`).join('; '),
      }),
    });
    const data = await res.json();
    if (data.recommendations && Array.isArray(data.recommendations)) {
      return data.recommendations;
    }
    return localRecommendations(f, score, drivers, occ);
  } catch {
    return localRecommendations(f, score, drivers, occ);
  }
}
