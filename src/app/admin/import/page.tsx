'use client';

import { useMemo, useState } from 'react';
import Papa, { ParseError, ParseResult } from 'papaparse';
import { uploadTest, savePercentileMap } from '@/lib/firebaseData';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Question, TestInfo } from '@/types';

type CsvRow = {
  questionNumber: string;
  subject: string;
  chapter: string;
  topic: string;
  type: string; // 'MCQ' | 'Integer'
  correctAnswer: string;
  difficulty: string; // 'Easy' | 'Medium' | 'Hard'
  idealTime: string; // seconds
  'marks.correct': string;
  'marks.incorrect': string;
  imageFilename: string;
  solutionFilename: string;
};

type ParsedItem = {
  questionNumber: number;
  subject: 'Mathematics' | 'Physics' | 'Chemistry';
  chapter: string;
  topic: string;
  type: 'MCQ' | 'Integer';
  correctAnswer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  idealTime: number;
  marks: { correct: number; incorrect: number };
  imageFilename: string;
  solutionFilename: string;
};

type Subject = 'Mathematics' | 'Physics' | 'Chemistry';
function normalizeSubject(s: string): Subject | null {
  const v = (s || '').trim().toLowerCase();
  if (!v) return null;
  // Common variants
  if (v === 'maths' || v.startsWith('math')) return 'Mathematics';
  if (v.startsWith('phy')) return 'Physics';
  if (v.startsWith('chem')) return 'Chemistry';
  // Exact matches
  if (v === 'mathematics') return 'Mathematics';
  if (v === 'physics') return 'Physics';
  if (v === 'chemistry') return 'Chemistry';
  return null;
}

function toSlug(input: string) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function parseCsv(text: string): { parsedItems: ParsedItem[]; parseErrors: string[] } {
  const results: ParseResult<CsvRow> = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const parseErrors: string[] = [];
  const parsedItems: ParsedItem[] = [];

  if (results.errors?.length) {
    results.errors.forEach((e: ParseError) => parseErrors.push(`Row ${e.row}: ${e.message}`));
  }

  (results.data || []).forEach((row: CsvRow, i: number) => {
    try {
      const subjectRaw = (row.subject || '').trim();
      const subjectNorm = normalizeSubject(subjectRaw);
      const type = (row.type || '').trim();
      const difficulty = (row.difficulty || '').trim();

      const mc = row['marks.correct'];
      const mi = row['marks.incorrect'];
      const ic = row.idealTime;

      const correct = mc === '' || mc == null ? 4 : Number(mc);
      const incorrect = mi === '' || mi == null ? -1 : Number(mi);
      const idealTime = ic === '' || ic == null ? 120 : Number(ic);

      if (!subjectNorm) {
        parseErrors.push(`Row ${i + 2}: Invalid subject "${row.subject}"`);
        return;
      }

      const parsed: ParsedItem = {
        questionNumber: Number(row.questionNumber),
        subject: subjectNorm,
        chapter: (row.chapter || '').trim(),
        topic: (row.topic || '').trim(),
        type: type === 'Integer' ? 'Integer' : 'MCQ',
        correctAnswer: (row.correctAnswer || '').trim(),
        difficulty: (difficulty === 'Easy' || difficulty === 'Hard') ? (difficulty as any) : 'Medium',
        idealTime,
        marks: { correct, incorrect },
        imageFilename: (row.imageFilename || '').trim(),
        solutionFilename: (row.solutionFilename || '').trim(),
      };

      if (!parsed.questionNumber || !parsed.imageFilename) {
        parseErrors.push(`Row ${i + 2}: Missing questionNumber or imageFilename`);
      } else {
        parsedItems.push(parsed);
      }
    } catch (e: any) {
      parseErrors.push(`Row ${i + 2}: ${e?.message || 'Parse error'}`);
    }
  });

  return { parsedItems, parseErrors };
}

function parseJson(text: string): { parsedItems: ParsedItem[]; parseErrors: string[] } {
  const parseErrors: string[] = [];
  try {
    const data: any = JSON.parse(text);
    if (!Array.isArray(data)) return { parsedItems: [], parseErrors: ['JSON must be an array'] };

    const parsedItems: ParsedItem[] = [];
    data.forEach((row: any, i: number) => {
      try {
        const subjectRaw = (row.subject || '').trim();
        const subjectNorm = normalizeSubject(subjectRaw);
        const type = (row.type || '').trim();
        const difficulty = (row.difficulty || '').trim();

        const mc = row?.marks?.correct;
        const mi = row?.marks?.incorrect;
        const ic = row?.idealTime;

        const correct = mc === '' || mc == null ? 4 : Number(mc);
        const incorrect = mi === '' || mi == null ? -1 : Number(mi);
        const idealTime = ic === '' || ic == null ? 120 : Number(ic);

        if (!subjectNorm) {
          parseErrors.push(`Item ${i}: Invalid subject "${row.subject}"`);
          return;
        }

        const parsed: ParsedItem = {
          questionNumber: Number(row.questionNumber),
          subject: subjectNorm,
          chapter: (row.chapter || '').trim(),
          topic: (row.topic || '').trim(),
          type: type === 'Integer' ? 'Integer' : 'MCQ',
          correctAnswer: (row.correctAnswer || '').trim(),
          difficulty: (difficulty === 'Easy' || difficulty === 'Hard') ? (difficulty as any) : 'Medium',
          idealTime,
          marks: { correct, incorrect },
          imageFilename: (row.imageFilename || '').trim(),
          solutionFilename: (row.solutionFilename || '').trim(),
        };

        if (!parsed.questionNumber || !parsed.imageFilename) {
          parseErrors.push(`Item ${i}: Missing questionNumber or imageFilename`);
        } else {
          parsedItems.push(parsed);
        }
      } catch (e: any) {
        parseErrors.push(`Item ${i}: ${e?.message || 'Parse error'}`);
      }
    });
    return { parsedItems, parseErrors };
  } catch (e: any) {
    return { parsedItems: [], parseErrors: [e?.message || 'Invalid JSON'] };
  }
}

function parsePercentileCsv(text: string, maxMarks: number): { pMap: number[] | null; pErrors: string[] } {
  const pErrors: string[] = [];
  if (!text || !text.trim()) return { pMap: null, pErrors };

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const entries: Array<{ m: number; p: number }> = [];

  lines.forEach((line, idx) => {
    // Allow CSV with headers or plain "marks,percentile"
    if (idx === 0 && /[a-zA-Z]/.test(line)) {
      // header row - skip
      return;
    }
    const parts = line.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) {
      pErrors.push(`Line ${idx + 1}: Expected "marks, percentile"`);
      return;
    }
    const m = Number(parts[0]);
    const p = Number(parts[1]);
    if (!Number.isFinite(m) || !Number.isFinite(p)) {
      pErrors.push(`Line ${idx + 1}: Non-numeric values "${parts[0]}", "${parts[1]}"`);
      return;
    }
    const mm = Math.max(0, Math.min(maxMarks, Math.round(m)));
    const pp = Math.max(0, Math.min(100, p));
    entries.push({ m: mm, p: pp });
  });

  if (entries.length === 0) {
    pErrors.push('No valid percentile rows found.');
    return { pMap: null, pErrors };
  }

  // Use last occurrence for duplicate marks
  const byMark = new Map<number, number>();
  for (const { m, p } of entries) byMark.set(m, p);

  const known = Array.from(byMark.entries()).sort((a, b) => a[0] - b[0]);
  const arr: number[] = new Array(maxMarks + 1);
  for (const [m, p] of known) arr[m] = p;

  // Interpolate gaps linearly between known anchors
  const indices = known.map(k => k[0]);
  if (indices.length > 0) {
    const first = indices[0];
    for (let i = 0; i < first; i++) arr[i] = arr[first];

    for (let i = 0; i < indices.length - 1; i++) {
      const a = indices[i];
      const b = indices[i + 1];
      const pa = arr[a];
      const pb = arr[b];
      const span = b - a;
      for (let x = a + 1; x < b; x++) {
        const t = (x - a) / span;
        arr[x] = pa + (pb - pa) * t;
      }
    }

    const last = indices[indices.length - 1];
    for (let i = last + 1; i <= maxMarks; i++) arr[i] = arr[last];
  } else {
    // Should not happen, but fallback to zeros
    for (let i = 0; i <= maxMarks; i++) arr[i] = 0;
  }

  // Enforce non-decreasing and clamp/round to 2 decimals
  for (let i = 0; i <= maxMarks; i++) {
    if (i > 0) arr[i] = Math.max(arr[i], arr[i - 1]);
    arr[i] = Math.max(0, Math.min(100, Math.round(arr[i] * 100) / 100));
  }

  return { pMap: arr, pErrors };
}

type UploadAsset = { secure_url: string; public_id: string };

async function uploadToCloudinary(file: File, folder: string, publicId?: string, userEmail?: string): Promise<UploadAsset> {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  if (publicId) form.append('public_id', publicId);

  // Add admin authentication headers
  const headers: HeadersInit = {};
  if (userEmail) {
    headers['x-admin-email'] = userEmail;
    headers['x-admin-token'] = 'admin-access'; // Simple token for now
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form,
    headers
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Upload failed');
  }
  return data.asset as UploadAsset;
}

export default function AdminImportPage() {
  // Admin authentication check
  const { isAdmin, user, loading } = useAdminAuth();

  // Step control
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Test meta
  const [name, setName] = useState('Sample JEE Test');
  const [testType, setTestType] = useState<TestInfo['testType']>('Full Test');
  const [type, setType] = useState<TestInfo['type']>('JEE');
  const [duration, setDuration] = useState(180);
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 16)); // datetime-local
  const [subjects, setSubjects] = useState<Subject[]>(['Mathematics', 'Physics', 'Chemistry']);
  const [maxMarks, setMaxMarks] = useState(300);
  const [description, setDescription] = useState('A full mock test');
  const [status, setStatus] = useState<TestInfo['status']>('Upcoming');

  // Data input
  const [mode, setMode] = useState<'CSV' | 'JSON'>('CSV');
  const [rawData, setRawData] = useState('');

  // Files
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [solutionFiles, setSolutionFiles] = useState<File[]>([]);

  // Optional percentile CSV (marks,percentile)
  const [percentileCsv, setPercentileCsv] = useState<string>('');
  const { pMap, pErrors } = useMemo(() => parsePercentileCsv(percentileCsv, maxMarks), [percentileCsv, maxMarks]);

  const handlePercentileCsvFile = async (file: File) => {
    try {
      const text = await file.text();
      setPercentileCsv(text);
    } catch (e) {
      console.error('Failed to read percentile CSV file:', e);
    }
  };

  // Parsed
  const { parsedItems, parseErrors } = useMemo(() => {
    if (!rawData.trim()) return { parsedItems: [] as ParsedItem[], parseErrors: [] as string[] };
    return mode === 'CSV' ? parseCsv(rawData) : parseJson(rawData);
  }, [rawData, mode]);

  const questionMap = useMemo(() => {
    const m = new Map<string, File>();
    for (const f of questionFiles) m.set(f.name, f);
    return m;
  }, [questionFiles]);

  const solutionMap = useMemo(() => {
    const m = new Map<string, File>();
    for (const f of solutionFiles) m.set(f.name, f);
    return m;
  }, [solutionFiles]);

  const testSlug = useMemo(() => toSlug(name), [name]);

  // Progress
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [resultTestId, setResultTestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleSubject(s: Subject) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleImport() {
    try {
      setIsImporting(true);
      setProgress(0);
      setLog([]);
      setError(null);
      setResultTestId(null);

      if (parsedItems.length === 0) throw new Error('No parsed data to import');
      if (subjects.length === 0) throw new Error('Select at least one subject');

      // Upload images and build questions
      const questions: Question[] = [];
      const total = parsedItems.length * 2; // question + solution image
      let done = 0;

      for (const item of parsedItems) {
        if (!subjects.includes(item.subject)) {
          // Skip items not in selected subjects
          continue;
        }

        const qFolder = `gearx/questions/${testSlug}/${item.subject}`;
        const sFolder = `gearx/solutions/${testSlug}/${item.subject}`;

        const qFile = questionMap.get(item.imageFilename);
        if (!qFile) throw new Error(`Missing question image file: ${item.imageFilename}`);

        const sFile = item.solutionFilename ? solutionMap.get(item.solutionFilename) : undefined;
        // Allow missing solution file; will fallback to question image if absent

        const qPublic = `${item.questionNumber}`;
        const sPublic = `${item.questionNumber}-solution`;

        setLog(prev => [...prev, `Uploading Q${item.questionNumber} images...`]);

        const qAsset = await uploadToCloudinary(qFile, qFolder, qPublic, user?.email || undefined);
        done += 1;
        setProgress(Math.round((done / total) * 100));

        let sUrl = qAsset.secure_url;
        if (sFile) {
          const sAsset = await uploadToCloudinary(sFile, sFolder, sPublic, user?.email || undefined);
          sUrl = sAsset.secure_url;
          done += 1;
          setProgress(Math.round((done / total) * 100));
        } else {
          // If no solution file, count progress unit anyway to keep bar moving
          done += 1;
          setProgress(Math.round((done / total) * 100));
        }

        const q: Question = {
          id: '',
          subject: item.subject,
          chapter: item.chapter,
          topic: item.topic,
          type: item.type,
          questionNumber: item.questionNumber,
          imagePath: qAsset.secure_url, // store Cloudinary URL
          solutionPath: sUrl,
          correctAnswer: item.correctAnswer,
          marks: { correct: item.marks.correct, incorrect: item.marks.incorrect },
          difficulty: item.difficulty,
          idealTime: item.idealTime,
          ...(item.type === 'MCQ' ? { options: ['A', 'B', 'C', 'D'] } : {}),
        };

        questions.push(q);
      }

      // Build testInfo
      const testInfo: TestInfo = {
        id: '',
        name,
        testType,
        scheduledDate: new Date(scheduledDate || new Date().toISOString()),
        duration,
        totalQuestions: questions.length,
        subjects,
        maxMarks,
        status,
        attempts: 0,
        type,
        description,
        createdAt: new Date(),
      };

      setLog(prev => [...prev, 'Writing test and questions to Firestore...']);
      const testId = await uploadTest(testInfo, questions);
      setResultTestId(testId);

      // Optionally save percentile map if provided
      try {
        if (pMap && pMap.length > 0) {
          setLog(prev => [...prev, 'Saving percentile map...']);
          await savePercentileMap(testId, pMap, maxMarks);
          setLog(prev => [...prev, 'Saved percentile map.'] );
        } else {
          setLog(prev => [...prev, 'No percentile map provided; skipping.'] );
        }
      } catch (pmErr: any) {
        setLog(prev => [...prev, `Warning: Failed to save percentile map: ${pmErr?.message || pmErr}`]);
      }

      setLog(prev => [...prev, `Import complete. Test ID: ${testId}`]);
      setStep(5);
    } catch (e: any) {
      setError(e?.message || 'Import failed');
      setLog(prev => [...prev, `Error: ${e?.message || 'Import failed'}`]);
    } finally {
      setIsImporting(false);
      setProgress(100);
    }
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        color: '#666'
      }}>
        Checking admin access...
      </div>
    );
  }

  // This component will only render if user is admin (useAdminAuth handles redirects)
  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: 8 }}>
        <div style={{ fontSize: 14, color: '#0369a1' }}>
          👤 Signed in as admin: <strong>{user?.email}</strong>
        </div>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Admin: Bulk Import Test (Signed Cloudinary)</h1>

      <ol style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <li
            key={n}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: step === n ? '#2563eb' : '#e5e7eb',
              color: step === n ? 'white' : '#111827',
            }}
          >
            Step {n}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Step 1: Test Meta</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
            </label>
            <label>
              Test Type
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as TestInfo['testType'])}
                style={{ width: '100%' }}
              >
                <option value="Full Test">Full Test</option>
                <option value="Part Test">Part Test</option>
              </select>
            </label>
            <label>
              Category
              <select value={type} onChange={(e) => setType(e.target.value as TestInfo['type'])} style={{ width: '100%' }}>
                <option value="JEE">JEE</option>
                <option value="UGEE">UGEE</option>
              </select>
            </label>
            <label>
              Duration (minutes)
              <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label>
              Scheduled Date/Time
              <input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} style={{ width: '100%' }} />
            </label>
            <label>
              Max Marks
              <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label style={{ gridColumn: '1 / span 2' }}>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ width: '100%' }} />
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>Subjects</div>
            {(['Mathematics', 'Physics', 'Chemistry'] as Subject[]).map((s) => (
              <label key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 12 }}>
                <input type="checkbox" checked={subjects.includes(s)} onChange={() => toggleSubject(s)} />
                {s}
              </label>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as TestInfo['status'])} style={{ marginLeft: 8 }}>
                <option value="Upcoming">Upcoming</option>
                <option value="Live">Live</option>
                <option value="Completed">Completed</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => setStep(2)} style={{ padding: '8px 14px', background: '#2563eb', color: 'white', borderRadius: 6 }}>
              Next
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Step 2: Data (CSV or JSON)</h2>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <button
              onClick={() => setMode('CSV')}
              style={{ padding: '6px 10px', borderRadius: 6, background: mode === 'CSV' ? '#2563eb' : '#e5e7eb', color: mode === 'CSV' ? 'white' : '#111827' }}
            >
              CSV
            </button>
            <button
              onClick={() => setMode('JSON')}
              style={{ padding: '6px 10px', borderRadius: 6, background: mode === 'JSON' ? '#2563eb' : '#e5e7eb', color: mode === 'JSON' ? 'white' : '#111827' }}
            >
              JSON
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
            CSV header required: questionNumber,subject,chapter,topic,type,correctAnswer,difficulty,idealTime,marks.correct,marks.incorrect,imageFilename,solutionFilename
          </div>

          <textarea
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            rows={12}
            style={{ width: '100%', fontFamily: 'monospace' }}
            placeholder={mode === 'CSV' ? 'Paste CSV here' : 'Paste JSON array here'}
          />

          {parseErrors.length > 0 && (
            <div style={{ marginTop: 8, color: '#b91c1c' }}>
              {parseErrors.map((err: string, idx: number) => (
                <div key={idx}>{err}</div>
              ))}
            </div>
          )}

          {parsedItems.length > 0 && <div style={{ marginTop: 8, color: '#065f46' }}>Parsed {parsedItems.length} items.</div>}

          {/* Optional Percentile CSV */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Optional: Percentile CSV</div>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>
              Provide per-mark percentile for this test. Two columns: marks,percentile. Values will be clamped to [0,100] and interpolated for missing marks.
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePercentileCsvFile(f);
                }}
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                {pMap ? `Parsed percentile map for 0..${maxMarks} marks.` : 'No percentile CSV provided.'}
              </span>
            </div>
            <textarea
              value={percentileCsv}
              onChange={(e) => setPercentileCsv(e.target.value)}
              rows={6}
              style={{ width: '100%', fontFamily: 'monospace' }}
              placeholder={`marks,percentile\n0,1.0\n1,1.2\n2,1.6\n...\n${maxMarks},99.9`}
            />
            {pErrors && pErrors.length > 0 && (
              <div style={{ marginTop: 8, color: '#b91c1c' }}>
                {pErrors.map((err, i) => (<div key={i}>{err}</div>))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button onClick={() => setStep(1)} style={{ padding: '8px 14px', borderRadius: 6 }}>
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!parsedItems.length}
              style={{ padding: '8px 14px', background: parsedItems.length ? '#2563eb' : '#9ca3af', color: 'white', borderRadius: 6 }}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Step 3: Select Images</h2>
          <p style={{ color: '#374151' }}>Select all question images and solution images. Filenames must match imageFilename and solutionFilename columns.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Question Images</div>
              <input type="file" multiple accept="image/*" onChange={(e) => setQuestionFiles(Array.from(e.target.files || []))} />
              <div style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>{questionFiles.length} files selected</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Solution Images (optional)</div>
              <input type="file" multiple accept="image/*" onChange={(e) => setSolutionFiles(Array.from(e.target.files || []))} />
              <div style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>{solutionFiles.length} files selected</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button onClick={() => setStep(2)} style={{ padding: '8px 14px', borderRadius: 6 }}>
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!parsedItems.length || !questionFiles.length}
              style={{ padding: '8px 14px', background: parsedItems.length && questionFiles.length ? '#2563eb' : '#9ca3af', color: 'white', borderRadius: 6 }}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Step 4: Preview Mapping</h2>
          <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>First 10 rows preview</div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, maxHeight: 300, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>#</th>
                  <th style={{ textAlign: 'left' }}>Subject</th>
                  <th style={{ textAlign: 'left' }}>Image File</th>
                  <th style={{ textAlign: 'left' }}>Found</th>
                  <th style={{ textAlign: 'left' }}>Solution File</th>
                  <th style={{ textAlign: 'left' }}>Found</th>
                </tr>
              </thead>
              <tbody>
                {parsedItems.slice(0, 10).map((r: ParsedItem, idx: number) => {
                  const qFound = questionMap.has(r.imageFilename);
                  const sFound = r.solutionFilename ? solutionMap.has(r.solutionFilename) : true;
                  return (
                    <tr key={idx}>
                      <td>{r.questionNumber}</td>
                      <td>{r.subject}</td>
                      <td>{r.imageFilename}</td>
                      <td style={{ color: qFound ? '#065f46' : '#b91c1c' }}>{qFound ? 'Yes' : 'No'}</td>
                      <td>{r.solutionFilename || '—'}</td>
                      <td style={{ color: sFound ? '#065f46' : '#b91c1c' }}>{sFound ? 'Yes' : 'No'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button onClick={() => setStep(3)} style={{ padding: '8px 14px', borderRadius: 6 }}>
              Back
            </button>
            <button onClick={handleImport} disabled={isImporting} style={{ padding: '8px 14px', background: '#16a34a', color: 'white', borderRadius: 6 }}>
              {isImporting ? 'Importing...' : 'Start Import'}
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div>Progress: {progress}%</div>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#16a34a', borderRadius: 4 }} />
            </div>
          </div>

          {error && <div style={{ marginTop: 8, color: '#b91c1c' }}>{error}</div>}
          {log.length > 0 && (
            <div
              style={{
                marginTop: 8,
                maxHeight: 160,
                overflow: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 8,
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              {log.map((l: string, i: number) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 5 && (
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Step 5: Done</h2>
          {resultTestId ? <div style={{ color: '#065f46' }}>Import completed. Test ID: {resultTestId}</div> : <div>No result available.</div>}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => {
                setStep(1);
                setRawData('');
                setQuestionFiles([]);
                setSolutionFiles([]);
                setResultTestId(null);
                setProgress(0);
                setLog([]);
              }}
              style={{ padding: '8px 14px', borderRadius: 6 }}
            >
              New Import
            </button>
          </div>
        </section>
      )}
    </div>
  );
}