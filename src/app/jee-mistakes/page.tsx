'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, NotebookPen, Filter, ExternalLink, Tag, Clock, Trash2, Eye, X } from 'lucide-react';

import JEESidebar from '@/components/JEESidebar';
import FastImage from '@/components/FastImage';
import {
  getMistakeNotesForUser,
  getQuestionsByTestId,
  deleteMistakeNote,
  getTestNameById,
  getTestSession
} from '@/lib/firebaseData';
import { MistakeNoteDoc, Question, TestSession } from '@/types';

const USER_ID = 'guest';

type MistakeWithQuestion = MistakeNoteDoc & { question?: Question };

type StatusFilter = 'All' | 'Correct' | 'Incorrect' | 'Skipped' | 'Review';
type LevelFilter = 'All' | 'Easy' | 'Medium' | 'Hard';
type TimeEffFilter = 'All' | 'Perfect' | 'Overtime' | 'Waste' | 'OvertimeMiss';

export default function JEEMistakesPage() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<MistakeWithQuestion[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testNames, setTestNames] = useState<Record<string, string>>({});
  const [sessionsByAttempt, setSessionsByAttempt] = useState<Record<string, TestSession | null>>({});

  // Image preview modal state (shows question/solution in optimized/test sizing)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [previewAlt, setPreviewAlt] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'question' | 'solution'>('question');
  // Preview context for toggling Question/Solution
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Simple filters (kept where they are)
  const [subject, setSubject] = useState<'All' | 'Physics' | 'Chemistry' | 'Mathematics'>('All');
  const [tag, setTag] = useState<string>('All');

  // Advanced filters (popup)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All');
  const [chapterFilter, setChapterFilter] = useState<string>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<TimeEffFilter>('All');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const raw = await getMistakeNotesForUser(USER_ID);
        if (raw.length === 0) {
          setNotes([]);
          setSessionsByAttempt({});
          setLoading(false);
          return;
        }

        // Fetch questions grouped by test
        const byTest = new Map<string, MistakeNoteDoc[]>();
        raw.forEach((n) => {
          const arr = byTest.get(n.testId) || [];
          arr.push(n);
          byTest.set(n.testId, arr);
        });

        const results: MistakeWithQuestion[] = [];
        await Promise.all(
          Array.from(byTest.entries()).map(async ([testId, arr]) => {
            const qs = await getQuestionsByTestId(testId);
            const qMap = new Map(qs.map((q) => [q.id, q]));
            arr.forEach((n) => {
              results.push({ ...n, question: qMap.get(n.questionId) });
            });
          })
        );

        // Fetch test names for all unique testIds (robust helper with fallbacks)
        try {
          const namePairs = await Promise.all(
            Array.from(byTest.keys()).map(async (tid) => {
              try {
                const name = await getTestNameById(tid);
                return [tid, name || tid] as [string, string];
              } catch {
                return [tid, tid] as [string, string];
              }
            })
          );
          setTestNames(Object.fromEntries(namePairs));
        } catch (e) {
          console.warn('Could not fetch some test names:', e);
        }

        // Sort notes by creation time: newest first
        results.sort((a, b) => {
          const aT =
            (a as any).createdAt?.toDate?.() instanceof Date
              ? (a as any).createdAt.toDate().getTime()
              : (a as any).createdAt instanceof Date
              ? (a as any).createdAt.getTime()
              : 0;
          const bT =
            (b as any).createdAt?.toDate?.() instanceof Date
              ? (b as any).createdAt.toDate().getTime()
              : (b as any).createdAt instanceof Date
              ? (b as any).createdAt.getTime()
              : 0;
          return bT - aT;
        });

        setNotes(results);

        // Fetch all unique attempts' sessions so we can compute status/time filters
        try {
          const attemptIds = Array.from(new Set(raw.map((n) => n.attemptId).filter(Boolean)));
          const pairs = await Promise.all(
            attemptIds.map(async (aid) => {
              const sess = await getTestSession(aid);
              return [aid, sess] as [string, TestSession | null];
            })
          );
          setSessionsByAttempt(Object.fromEntries(pairs));
        } catch (err) {
          console.warn('Failed to fetch some sessions for Mistake Notebook filters:', err);
        }

        setLoading(false);
      } catch (e) {
        console.error('Failed to load mistake notes:', e);
        setError('Failed to load Mistake Notebook');
        setLoading(false);
      }
    };

    run();
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    notes.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
    return ['All', ...Array.from(s)];
  }, [notes]);

  // Compute category like on Solutions page
  function getTimeCategory(data: {
    isCorrect: boolean;
    timeSpent: number;
    idealTime?: number;
  }): 'Perfect' | 'Overtime' | 'Waste' | 'OvertimeMiss' | null {
    const ideal = typeof data.idealTime === 'number' ? data.idealTime : undefined;
    const spent = data.timeSpent ?? 0;
    if (data.isCorrect) {
      if (ideal === undefined) return null;
      return spent <= ideal ? 'Perfect' : 'Overtime';
    } else {
      if (spent < 30) return 'Waste';
      if (ideal !== undefined && spent > ideal) return 'OvertimeMiss';
      return null;
    }
  }

  // Derive status/time info for a mistake note using its attempt session
  function deriveStatusAndTime(n: MistakeWithQuestion): {
    status: 'Correct' | 'Incorrect' | 'Skipped' | 'Review';
    isAnswered: boolean;
    isCorrect: boolean;
    isMarkedForReview: boolean;
    timeSpent: number;
    timeCategory: ReturnType<typeof getTimeCategory>;
  } {
    const q = n.question;
    const sess = sessionsByAttempt[n.attemptId];
    const ans = q ? sess?.answers?.find((a) => a.questionId === q.id) : undefined;

    const isAnswered = !!ans?.isAnswered;
    const isMarkedForReview = !!ans?.isMarkedForReview;

    let isCorrect = false;
    if (q?.type === 'MCQ') {
      isCorrect = isAnswered && ans?.selectedOption === q.correctAnswer;
    } else if (q) {
      const expected = Number(q.correctAnswer);
      isCorrect = isAnswered && Number(ans?.integerAnswer) === expected;
    }

    let status: 'Correct' | 'Incorrect' | 'Skipped' | 'Review' = 'Skipped';
    if (isMarkedForReview && isAnswered) status = 'Review';
    else if (isAnswered && isCorrect) status = 'Correct';
    else if (isAnswered && !isCorrect) status = 'Incorrect';
    else status = 'Skipped';

    const timeSpent = ans?.timeSpent || 0;
    const timeCategory = q ? getTimeCategory({ isCorrect, timeSpent, idealTime: q.idealTime }) : null;

    return { status, isAnswered, isCorrect, isMarkedForReview, timeSpent, timeCategory };
  }

  // Lists for chapter/topic filters derived from available notes
  const chaptersUI = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      const q = n.question;
      if (!q) return;
      if (subject !== 'All' && q.subject !== subject) return;
      if (levelFilter !== 'All' && q.difficulty !== levelFilter) return;
      set.add(q.chapter);
    });
    return ['All', ...Array.from(set)];
  }, [notes, subject, levelFilter]);

  const topicsUI = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      const q = n.question;
      if (!q) return;
      if (subject !== 'All' && q.subject !== subject) return;
      if (levelFilter !== 'All' && q.difficulty !== levelFilter) return;
      if (chapterFilter !== 'All' && q.chapter !== chapterFilter) return;
      set.add(q.topic);
    });
    return ['All', ...Array.from(set)];
  }, [notes, subject, levelFilter, chapterFilter]);

  // Combined filtering: subject, tag, plus advanced filters
  const filtered = useMemo(() => {
    return notes.filter((n) => {
      const q = n.question;
      const subjOk = subject === 'All' || q?.subject === subject;
      const tagOk = tag === 'All' || (n.tags || []).includes(tag);
      if (!subjOk || !tagOk) return false;

      // If no question, we cannot evaluate advanced filters
      if (!q) return false;

      // Level filter
      if (levelFilter !== 'All' && q.difficulty !== levelFilter) return false;
      // Chapter filter
      if (chapterFilter !== 'All' && q.chapter !== chapterFilter) return false;
      // Topic filter
      if (topicFilter !== 'All' && q.topic !== topicFilter) return false;

      // Status/time filters based on attempt session
      const derived = deriveStatusAndTime(n);
      if (statusFilter !== 'All' && derived.status !== statusFilter) return false;

      if (timeFilter !== 'All') {
        if (derived.timeCategory !== timeFilter) return false;
      }

      return true;
    });
  }, [notes, subject, tag, levelFilter, chapterFilter, topicFilter, statusFilter, timeFilter, sessionsByAttempt]);

  const grouped = useMemo(() => {
    const m = new Map<string, MistakeWithQuestion[]>();
    filtered.forEach((n) => {
      const arr = m.get(n.testId) || [];
      arr.push(n);
      m.set(n.testId, arr);
    });
    return Array.from(m.entries());
  }, [filtered]);

  const activeAdvancedFilters =
    (statusFilter !== 'All' ? 1 : 0) +
    (levelFilter !== 'All' ? 1 : 0) +
    (chapterFilter !== 'All' ? 1 : 0) +
    (topicFilter !== 'All' ? 1 : 0) +
    (timeFilter !== 'All' ? 1 : 0);

  const resetAdvanced = () => {
    setStatusFilter('All');
    setLevelFilter('All');
    setChapterFilter('All');
    setTopicFilter('All');
    setTimeFilter('All');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      <div className="relative z-10 flex">
        <JEESidebar />

        <main className="flex-1">
          <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-3 rounded-xl shadow-lg">
                    <NotebookPen className="h-8 w-8" />
                  </div>
                  Mistake Notebook
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Your saved learning notes from test reviews
                </p>
              </div>

              {/* Filters bar (basic filters remain here) */}
              <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className={`inline-flex items-center justify-center rounded-lg p-1.5 transition-colors ${
                    activeAdvancedFilters > 0
                      ? 'text-indigo-600 bg-indigo-50 border border-indigo-200'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/40'
                  }`}
                  title="Open advanced filters"
                  aria-label="Open advanced filters"
                >
                  <Filter className="h-4 w-4" />
                  {activeAdvancedFilters > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] px-1.5 h-4 min-w-[16px]">
                      {activeAdvancedFilters}
                    </span>
                  )}
                </button>

                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as any)}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-800 dark:text-gray-200"
                >
                  {['All', 'Physics', 'Chemistry', 'Mathematics'].map((s) => (
                    <option key={s} value={s}>
                      Subject: {s}
                    </option>
                  ))}
                </select>

                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-800 dark:text-gray-200"
                >
                  {allTags.map((t) => (
                    <option key={t} value={t}>
                      Tag: {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Filters Popup */}
            {filtersOpen && (
              <div className="fixed inset-0 z-[2000] flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setFiltersOpen(false)}
                />
                <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700">
                  <div className="border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Filter Mistakes
                    </h3>
                    <button
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Close
                    </button>
                  </div>

                  <div className="px-5 py-4 space-y-5">
                    {/* Status */}
                    <div>
                      <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(['All', 'Correct', 'Incorrect', 'Skipped', 'Review'] as StatusFilter[]).map((s) => {
                          const active = statusFilter === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setStatusFilter(s)}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                                active
                                  ? 'bg-gray-900 text-white border-gray-900'
                                  : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Efficiency */}
                    <div>
                      <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Time Efficiency
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(['All', 'Perfect', 'Overtime', 'Waste', 'OvertimeMiss'] as TimeEffFilter[]).map((t) => {
                          const active = timeFilter === t;
                          const label = t === 'OvertimeMiss' ? 'Late & Wrong' : t;
                          return (
                            <button
                              key={t}
                              onClick={() => setTimeFilter(t)}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                                active
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                              }`}
                              title={
                                t === 'Perfect'
                                  ? 'Correct within ideal time'
                                  : t === 'Overtime'
                                  ? 'Correct but over ideal time'
                                  : t === 'Waste'
                                  ? 'Incorrect in under 30s'
                                  : t === 'OvertimeMiss'
                                  ? 'Incorrect and over ideal time'
                                  : 'No time filter'
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Level / Chapter / Topic */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Level
                        </label>
                        <select
                          value={levelFilter}
                          onChange={(e) => {
                            setLevelFilter(e.target.value as LevelFilter);
                            // keep chapter/topic in sync with available lists
                            setChapterFilter('All');
                            setTopicFilter('All');
                          }}
                          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-gray-800 dark:text-gray-200"
                        >
                          <option value="All">All</option>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Chapter
                        </label>
                        <select
                          value={chapterFilter}
                          onChange={(e) => {
                            setChapterFilter(e.target.value);
                            setTopicFilter('All');
                          }}
                          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-gray-800 dark:text-gray-200"
                        >
                          {chaptersUI.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Topic
                        </label>
                        <select
                          value={topicFilter}
                          onChange={(e) => setTopicFilter(e.target.value)}
                          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-gray-800 dark:text-gray-200"
                        >
                          {topicsUI.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-5 py-4">
                    <button
                      type="button"
                      onClick={resetAdvanced}
                      className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Reset
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFiltersOpen(false)}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-gray-700 dark:text-gray-200">Loading notebook…</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : notes.length === 0 ? (
              <div className="text-center py-16 relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl">
                <div className="bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/30 p-8 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <NotebookPen className="h-16 w-16 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                  No notes in your Mistake Notebook yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                  After reviewing solutions, save notes on mistakes to revisit them here.
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {grouped.map(([testId, items]) => (
                  <section key={testId} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-1 rounded-full bg-purple-500/80" />
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Test: {testNames[testId] || testId}
                      </h2>
                      <span className="text-sm text-gray-600 dark:text-gray-400">({items.length})</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {items.map((n) => {
                        const q = n.question;
                        // Deep-link to Solutions with both sessionId and qid (question id)
                        const reviewHref = q
                          ? `/test/jee/${n.testId}/results/solutions?sessionId=${n.attemptId}&qid=${q.id}`
                          : undefined;

                        // Format created time if available
                        let created = '';
                        const c: any = (n as any).createdAt;
                        if (c?.toDate) {
                          created = c.toDate().toLocaleString();
                        } else if (c instanceof Date) {
                          created = c.toLocaleString();
                        }

                        // Derived status/time badges (optional small hint)
                        const derived = q ? deriveStatusAndTime(n) : null;

                        return (
                          <div
                            key={n.id}
                            className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow hover:shadow-md transition-shadow"
                          >
                            <div className="relative bg-gray-50 dark:bg-gray-900/40 p-3 flex items-center justify-center">
                              {q ? (
                                <>
                                  <FastImage
                                    id={`mist-${q.id}`}
                                    src={q.imagePath}
                                    alt={`Q${q.questionNumber}`}
                                    className="max-h-48 object-contain"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewSrc(q.imagePath);
                                      setPreviewAlt(`Question ${q.questionNumber}`);
                                      setPreviewQuestion(q);
                                      setPreviewTab('question');
                                      setPreviewOpen(true);
                                    }}
                                    className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-white/90 backdrop-blur p-2 shadow border border-gray-200 hover:bg-white"
                                    title="View larger"
                                    aria-label="View larger"
                                  >
                                    <Eye className="h-4 w-4 text-gray-700" />
                                  </button>
                                </>
                              ) : (
                                <div className="h-48 flex items-center justify-center text-gray-400 text-sm w-full">
                                  Question not found
                                </div>
                              )}
                            </div>

                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                  {q ? (
                                    <>
                                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        Q{q.questionNumber}
                                      </span>{' '}
                                      • {q.subject}
                                    </>
                                  ) : (
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">Q —</span>
                                  )}
                                </div>
                                {created && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{created}</span>
                                  </div>
                                )}
                              </div>

                              {q && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span>{q.chapter}</span>
                                  <span>•</span>
                                  <span>{q.topic}</span>
                                  <span>•</span>
                                  <span>{q.difficulty}</span>
                                  {derived?.status && (
                                    <>
                                      <span>•</span>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full border ${
                                          derived.status === 'Correct'
                                            ? 'border-green-500 text-green-700 bg-green-50'
                                            : derived.status === 'Incorrect'
                                            ? 'border-red-500 text-red-700 bg-red-50'
                                            : derived.status === 'Review'
                                            ? 'border-purple-500 text-purple-700 bg-purple-50'
                                            : 'border-gray-300 text-gray-700 bg-gray-50'
                                        }`}
                                      >
                                        {derived.status}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}

                              <div className="rounded-md border border-purple-200/60 dark:border-purple-800/50 bg-purple-50/60 dark:bg-purple-900/20 p-3 text-sm text-gray-800 dark:text-gray-100">
                                {n.note || '—'}
                              </div>

                              {n.tags && n.tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                  {n.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex items-center gap-1 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-0.5 text-[11px] text-gray-700 dark:text-gray-300"
                                    >
                                      <Tag className="h-3 w-3" />
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="pt-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {reviewHref ? (
                                      <Link
                                        href={reviewHref}
                                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                                        title="Open this question in Solutions"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        Review in Solutions
                                      </Link>
                                    ) : (
                                      <span className="text-xs text-gray-500">Cannot open solutions for this item</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!confirm('Delete this note from Mistake Notebook?')) return;
                                      if (!n.id) {
                                        alert('Cannot delete: missing note id.');
                                        return;
                                      }
                                      try {
                                        setDeletingId(n.id || null);
                                        await deleteMistakeNote(n.id as string);
                                        setNotes((prev) => prev.filter((x) => x.id !== n.id));
                                      } catch (e) {
                                        console.error('Delete note failed', e);
                                        alert('Failed to delete. Please try again.');
                                      } finally {
                                        setDeletingId(null);
                                      }
                                    }}
                                    disabled={deletingId === n.id}
                                    className="inline-flex items-center justify-center rounded-full p-2 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-60"
                                    title="Delete this note"
                                    aria-label="Delete this note"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* Image Preview Modal */}
            {previewOpen && (
              <div className="fixed inset-0 z-[3000] flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/60"
                  onClick={() => setPreviewOpen(false)}
                />

                <div className="relative max-w-[95vw] max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 pt-10">
                  {/* Top-left toggle between Question / Solution */}
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-white/90 dark:bg-gray-800/80 backdrop-blur rounded-md border border-gray-200 dark:border-gray-700 p-1">
                    <button
                      onClick={() => setPreviewTab('question')}
                      className={`px-2 py-0.5 text-xs rounded ${previewTab === 'question' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/40'}`}
                    >
                      Question
                    </button>
                    <button
                      onClick={() => setPreviewTab('solution')}
                      disabled={!previewQuestion?.solutionPath}
                      className={`px-2 py-0.5 text-xs rounded ${previewTab === 'solution' ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/40'} ${!previewQuestion?.solutionPath ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={previewQuestion?.solutionPath ? 'Show solution image' : 'No solution image available'}
                    >
                      Solution
                    </button>
                  </div>

                  {/* Close button above image */}
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    className="absolute top-2 right-2 z-20 inline-flex items-center justify-center rounded-full p-2 bg-white/95 border border-gray-200 shadow-md ring-1 ring-black/5 hover:bg-white"
                    aria-label="Close preview"
                    title="Close"
                  >
                    <X className="h-4 w-4 text-gray-700" />
                  </button>

                  <div className="overflow-auto max-h-[calc(90vh-64px)] overscroll-contain">
                    <FastImage
                      src={
                        previewTab === 'solution'
                          ? (previewQuestion?.solutionPath || previewQuestion?.imagePath || previewSrc)
                          : (previewQuestion?.imagePath || previewSrc)
                      }
                      alt={
                        previewTab === 'solution'
                          ? (previewAlt ? previewAlt.replace('Question', 'Solution') : 'Solution image')
                          : (previewAlt || 'Question image')
                      }
                      className="question-image"
                      onError={() => {
                        const src =
                          previewTab === 'solution'
                            ? (previewQuestion?.solutionPath || previewQuestion?.imagePath || previewSrc)
                            : (previewQuestion?.imagePath || previewSrc);
                        console.error('Failed to load preview image:', src);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}