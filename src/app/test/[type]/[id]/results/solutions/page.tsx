'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Filter, Bookmark as BookmarkIcon, NotebookPen } from 'lucide-react';

import FastImage from '@/components/FastImage';
import BookmarkButton from '@/components/BookmarkButton';
import MistakeModal from '@/components/MistakeModal';

import {
  getTestSession,
  getQuestionsByTestId,
  getBookmarkedQuestionIdSet,
  toggleBookmark,
  getMistakeNotesForAttempt,
  upsertMistakeNote,
  deleteMistakeNote
} from '@/lib/firebaseData';

import { Question, SolutionItem, TestSession } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

type StatusFilter = 'All' | 'Correct' | 'Incorrect' | 'Skipped' | 'Review';
type SubjectFilter = 'All' | 'Physics' | 'Chemistry' | 'Mathematics';
type LevelFilter = 'All' | 'Easy' | 'Medium' | 'Hard';
type TimeEffFilter = 'All' | 'Perfect' | 'Overtime' | 'Waste' | 'OvertimeMiss';

function computeSolutionItem(q: Question, session: TestSession | null): SolutionItem {
  const ans = session?.answers?.find((a) => a.questionId === q.id);

  const isAnswered = !!ans?.isAnswered;
  const isMarkedForReview = !!ans?.isMarkedForReview;

  let isCorrect = false;
  if (q.type === 'MCQ') {
    isCorrect = isAnswered && ans?.selectedOption === q.correctAnswer;
  } else {
    const expected = Number(q.correctAnswer);
    isCorrect = isAnswered && Number(ans?.integerAnswer) === expected;
  }

  let status: SolutionItem['status'] = 'Skipped';
  if (isMarkedForReview && isAnswered) status = 'Review';
  else if (isAnswered && isCorrect) status = 'Correct';
  else if (isAnswered && !isCorrect) status = 'Incorrect';
  else status = 'Skipped';

  return {
    question: q,
    userAnswer: q.type === 'MCQ' ? ans?.selectedOption : ans?.integerAnswer,
    isAnswered,
    isMarkedForReview,
    isCorrect,
    timeSpent: ans?.timeSpent || 0,
    status,
    isBookmarked: false
  };
}

export default function SolutionsPage() {
  const router = useRouter();
  const params = useParams();
  const { type, id } = params as { type: string; id: string };
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<TestSession | null>(null);
  const [items, setItems] = useState<SolutionItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  // Map of questionId -> saved mistake note content
  const [notesByQ, setNotesByQ] = useState<Record<string, { note: string; tags: string[]; id?: string }>>({});

  // Filters and navigation
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [chapterFilter, setChapterFilter] = useState<string>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All');
  const [timeFilter, setTimeFilter] = useState<TimeEffFilter>('All');

  const [activeIndex, setActiveIndex] = useState(0);

  // Reliable query param reading that updates on in-app navigation
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get('sessionId') || '';

  // Optional deep-link target question id from outside pages (e.g., Mistake Notebook)
  const qid = searchParams?.get('qid') || '';

  useEffect(() => {
    const run = async () => {
      try {
        if (!sessionId) {
          setError('Session ID missing');
          setLoading(false);
          return;
        }
        
        if (!user) {
          console.log('⚠️ Solutions: No authenticated user');
          setError('Please sign in to view solutions');
          setLoading(false);
          return;
        }

        const [sess, qs, bset, notes] = await Promise.all([
          getTestSession(sessionId),
          getQuestionsByTestId(id),
          getBookmarkedQuestionIdSet(user.uid, id),
          getMistakeNotesForAttempt(user.uid, sessionId)
        ]);
 
        setSession(sess);
        // Build base items
        const base = qs
          .sort((a, b) => a.questionNumber - b.questionNumber)
          .map((q) => {
            const it = computeSolutionItem(q, sess);
            it.isBookmarked = bset.has(q.id);
            return it;
          });
        setItems(base);
        setBookmarks(bset);
        // Build notes map for quick prefill and badge
        const byQ: Record<string, { note: string; tags: string[]; id?: string }> = {};
        (notes || []).forEach((n: any) => {
          byQ[n.questionId] = { note: n.note || '', tags: n.tags || [], id: n.id };
        });
        setNotesByQ(byQ);
        setLoading(false);
      } catch (e) {
        console.error('Failed to load solutions data:', e);
        setError('Failed to load solutions. Please try again.');
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sessionId, user]);

  // Safety net: if something goes wrong and loading never flips, fail fast with a visible message
  useEffect(() => {
    if (!loading) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled && loading) {
        setLoading(false);
        setError((prev) => prev || 'Timed out while loading solutions. Please retry.');
      }
    }, 10000); // 10s fallback
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [loading]);

  const chapters = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.question.chapter));
    return ['All', ...Array.from(set)];
  }, [items]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (subjectFilter !== 'All' && i.question.subject !== subjectFilter) return;
      if (chapterFilter === 'All' || i.question.chapter === chapterFilter) {
        set.add(i.question.topic);
      }
    });
    return ['All', ...Array.from(set)];
  }, [items, subjectFilter, chapterFilter]);

  // Compute time-efficiency category for an item
  const getTimeCategory = (it: SolutionItem): 'Perfect' | 'Overtime' | 'Waste' | 'OvertimeMiss' | null => {
    const ideal = typeof it.question.idealTime === 'number' ? it.question.idealTime : undefined;
    const spent = it.timeSpent ?? 0;
    if (it.isCorrect) {
      if (ideal === undefined) return null;
      return spent <= ideal ? 'Perfect' : 'Overtime';
    } else {
      if (spent < 30) return 'Waste';
      if (ideal !== undefined && spent > ideal) return 'OvertimeMiss';
      return null;
    }
  };

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return false;
      if (statusFilter !== 'All' && it.status !== statusFilter) return false;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return false;
      if (topicFilter !== 'All' && it.question.topic !== topicFilter) return false;
      if (levelFilter !== 'All' && it.question.difficulty !== levelFilter) return false;
      if (timeFilter !== 'All') {
        const cat = getTimeCategory(it);
        if (cat !== timeFilter) return false;
      }
      return true;
    });
  }, [items, subjectFilter, statusFilter, chapterFilter, topicFilter, levelFilter, timeFilter]);

  // Counts for filter badges (do not show next to "All" options)
  // Base set for status counts ignores current status filter but respects others
  const baseForStatus = useMemo(() => {
    return items.filter((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return false;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return false;
      if (topicFilter !== 'All' && it.question.topic !== topicFilter) return false;
      if (levelFilter !== 'All' && it.question.difficulty !== levelFilter) return false;
      return true;
    });
  }, [items, subjectFilter, chapterFilter, topicFilter, levelFilter]);

  const statusCounts = useMemo(() => {
    let Correct = 0, Incorrect = 0, Skipped = 0, Review = 0;
    baseForStatus.forEach((it) => {
      if (it.status === 'Correct') Correct++;
      else if (it.status === 'Incorrect') Incorrect++;
      else if (it.status === 'Review') Review++;
      else Skipped++;
    });
    return { Correct, Incorrect, Skipped, Review };
  }, [baseForStatus]);

  // Level counts: respect subject/chapter/topic, ignore current level selection
  const levelCounts = useMemo(() => {
    let Easy = 0, Medium = 0, Hard = 0;
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return;
      if (topicFilter !== 'All' && it.question.topic !== topicFilter) return;
      const d = it.question.difficulty;
      if (d === 'Easy') Easy++;
      else if (d === 'Medium') Medium++;
      else if (d === 'Hard') Hard++;
    });
    return { Easy, Medium, Hard };
  }, [items, subjectFilter, chapterFilter, topicFilter]);

  // Chapter counts: respect subject/level/topic, ignore current chapter selection
  const chapterCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      if (levelFilter !== 'All' && it.question.difficulty !== levelFilter) return;
      if (topicFilter !== 'All' && it.question.topic !== topicFilter) return;
      const key = it.question.chapter;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [items, subjectFilter, levelFilter, topicFilter]);

  // Topic counts: respect subject/level/chapter, ignore current topic selection
  const topicCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      if (levelFilter !== 'All' && it.question.difficulty !== levelFilter) return;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return;
      const key = it.question.topic;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [items, subjectFilter, levelFilter, chapterFilter]);

  // Subject-aware UI lists that hide zero-count options
  const chaptersUI = useMemo(() => {
    // Build ordered unique list restricted to current subject
    const order: string[] = [];
    const seen = new Set<string>();
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      const ch = it.question.chapter;
      if (!seen.has(ch)) { seen.add(ch); order.push(ch); }
    });
    // Only include chapters with non-zero count under current filters
    const available = order.filter((ch) => (chapterCounts.get(ch) || 0) > 0);
    return ['All', ...available];
  }, [items, subjectFilter, chapterCounts]);

  const topicsUI = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return;
      const tp = it.question.topic;
      if (!seen.has(tp)) { seen.add(tp); order.push(tp); }
    });
    const available = order.filter((tp) => (topicCounts.get(tp) || 0) > 0);
    return ['All', ...available];
  }, [items, subjectFilter, chapterFilter, topicCounts]);

  // Ensure selected chapter/topic remain valid when subject or lists change
  useEffect(() => {
    if (chapterFilter !== 'All' && !chaptersUI.includes(chapterFilter)) {
      setChapterFilter('All');
    }
  }, [subjectFilter, chaptersUI]);

  useEffect(() => {
    if (topicFilter !== 'All' && !topicsUI.includes(topicFilter)) {
      setTopicFilter('All');
    }
  }, [subjectFilter, chapterFilter, topicsUI]);

  // Base for time-efficiency counts (respect current Subject/Chapter/Topic/Level and Status)
  const baseForTime = useMemo(() => {
    return items.filter((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return false;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return false;
      if (topicFilter !== 'All' && it.question.topic !== topicFilter) return false;
      if (levelFilter !== 'All' && it.question.difficulty !== levelFilter) return false;
      if (statusFilter !== 'All' && it.status !== statusFilter) return false;
      return true;
    });
  }, [items, subjectFilter, chapterFilter, topicFilter, levelFilter, statusFilter]);

  const timeCounts = useMemo(() => {
    let Perfect = 0, Overtime = 0, Waste = 0, OvertimeMiss = 0;
    baseForTime.forEach((it) => {
      const cat = getTimeCategory(it);
      if (cat === 'Perfect') Perfect++;
      else if (cat === 'Overtime') Overtime++;
      else if (cat === 'Waste') Waste++;
      else if (cat === 'OvertimeMiss') OvertimeMiss++;
    });
    return { Perfect, Overtime, Waste, OvertimeMiss };
  }, [baseForTime]);

  // Clamp active index if filters change
  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIndex]);

  const isEmpty = filtered.length === 0;
  const activeItem = !isEmpty ? filtered[activeIndex] : undefined;

  // When landing with a qid param, jump to that question within current filtered set once
  const seededFromQ = useRef(false);
  useEffect(() => {
    if (!seededFromQ.current && qid && filtered.length > 0) {
      const idx = filtered.findIndex((f) => f.question.id === qid);
      if (idx >= 0) {
        setActiveIndex(idx);
        seededFromQ.current = true;
      }
    }
  }, [filtered, qid]);

  const handleToggleBookmark = async (questionId: string, subject: Question['subject']) => {
    try {
      if (!user) {
        alert('Please sign in to manage bookmarks');
        return;
      }
      const after = await toggleBookmark(user.uid, { testId: id, questionId, subject });
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (after) next.add(questionId);
        else next.delete(questionId);
        return next;
      });
      setItems((prev) =>
        prev.map((it) => (it.question.id === questionId ? { ...it, isBookmarked: after } : it))
      );
    } catch (e) {
      console.error('Toggle bookmark failed', e);
      alert('Failed to update bookmark. Try again.');
    }
  };

  const [mistakeOpen, setMistakeOpen] = useState(false);

  const submitMistake = async (payload: { text: string; tags: string[] }) => {
    if (!activeItem || !user) return;
    try {
      const res = await upsertMistakeNote({
        userId: user.uid,
        attemptId: sessionId,
        testId: id,
        questionId: activeItem.question.id,
        note: payload.text,
        tags: payload.tags
      });
      // Optimistically update local cache so modal opens prefilled next time
      setNotesByQ(prev => ({
        ...prev,
        [activeItem.question.id]: { note: payload.text, tags: payload.tags, id: res.id }
      }));
    } catch (e) {
      console.error('Failed to save mistake note', e);
      alert('Failed to save note.');
    }
  };

  const jumpToQuestionId = (qid: string) => {
    const idx = filtered.findIndex((f) => f.question.id === qid);
    if (idx >= 0) setActiveIndex(idx);
  };

  const next = () => {
    setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
  };
  const prev = () => {
    setActiveIndex((i) => Math.max(0, i - 1));
  };

  // Styling helpers
  const statusColor = (status: SolutionItem['status']) => {
    switch (status) {
      case 'Correct':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Incorrect':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Review':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Skipped':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const indexButtonClass = (item: SolutionItem, isActive: boolean) => {
    const base =
      'w-10 h-10 rounded-md border text-sm font-semibold flex items-center justify-center relative';
    const map: Record<SolutionItem['status'], string> = {
      Correct: 'border-green-500 text-green-700 bg-green-50',
      Incorrect: 'border-red-500 text-red-700 bg-red-50',
      Skipped: 'border-gray-300 text-gray-600 bg-white',
      Review: 'border-purple-500 text-purple-700 bg-purple-50'
    };
    const active = isActive ? 'ring-2 ring-blue-500' : '';
    return `${base} ${map[item.status]} ${active}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-700">Loading solutions…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="text-red-600 font-medium mb-4">{error}</div>
        <button
          className="px-4 py-2 rounded-md bg-blue-600 text-white"
          onClick={() => router.push(`/test/${type}/${id}/results?sessionId=${sessionId}`)}
        >
          Back to Results
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-gray-50 lg:overflow-hidden flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 shadow-sm"
              onClick={() => router.push(`/test/${type}/${id}/results?sessionId=${sessionId}`)}
            >
              <ChevronLeft size={16} />
              Back to Results
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Subject chips */}
            {(['All', 'Mathematics', 'Physics', 'Chemistry'] as SubjectFilter[]).map((s) => {
              const active = subjectFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setSubjectFilter(s)}
                  className={`rounded-full px-2.5 py-1 text-xs sm:text-sm border ${
                    active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters row */}
        <div className="mx-auto max-w-7xl px-4 pb-3 flex flex-wrap items-center gap-2">
          {/* Status pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Correct', 'Incorrect', 'Skipped', 'Review'] as StatusFilter[]).map((s) => {
              const active = statusFilter === s;
              const base = 'rounded-full px-2.5 py-1 text-xs sm:text-sm flex items-center gap-1.5 transition-colors';
              const style = active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200';
              const count =
                s === 'All'
                  ? undefined
                  : (s === 'Correct'
                      ? statusCounts.Correct
                      : s === 'Incorrect'
                      ? statusCounts.Incorrect
                      : s === 'Review'
                      ? statusCounts.Review
                      : statusCounts.Skipped);
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`${base} ${style}`}
                >
                  <span>{s}</span>
                  {typeof count === 'number' && (
                    <span
                      className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-5 rounded-full text-[11px] px-1.5 font-semibold ${
                        active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Note: Level/Chapter/Topic controls are moved above the right "Questions" index to save space */}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-full">
          {/* Left: Question and solution */}
          <div className="space-y-4 lg:h-full lg:overflow-y-auto lg:pr-2 pb-6">
          {isEmpty ? (
            <div className="rounded-lg border bg-white p-8 text-center text-gray-600">
              No questions match the applied filters. Adjust filters to see questions.
            </div>
          ) : (
            <>
              {/* Question head */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">
                    Question <span className="font-semibold text-gray-900">{activeItem!.question.questionNumber}</span>
                  </div>
                  <div className="rounded-full border px-3 py-1 text-xs text-gray-700 bg-gray-50">
                    Marks:{' '}
                    <span className="text-green-700 font-semibold">+{activeItem!.question.marks.correct}</span>,{' '}
                    <span className="text-red-700 font-semibold">{activeItem!.question.marks.incorrect}</span>
                  </div>
                  <div className="rounded-full border px-3 py-1 text-xs text-gray-700 bg-gray-50">
                    Type: {activeItem!.question.type}
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs ${statusColor(activeItem!.status)}`}>
                    {activeItem!.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 relative"
                    onClick={() => setMistakeOpen(true)}
                    title="Add to Mistake Notebook"
                  >
                    <NotebookPen size={16} />
                    {notesByQ[activeItem!.question.id]?.note ? 'Edit Note' : 'Mistake Note'}
                    {notesByQ[activeItem!.question.id]?.note && (
                      <span className="absolute -top-1 -right-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                  <BookmarkButton
                    isBookmarked={bookmarks.has(activeItem!.question.id)}
                    onToggle={() => handleToggleBookmark(activeItem!.question.id, activeItem!.question.subject)}
                  />
                </div>
              </div>
              {/* Question image */}
              <div className="rounded-lg border bg-white p-3">
                <div className="flex justify-center">
                  <FastImage
                    id={`q-${activeItem!.question.id}`}
                    src={activeItem!.question.imagePath}
                    alt={`Question ${activeItem!.question.questionNumber}`}
                    className="question-image"
                    onError={() => {
                      console.error('Failed to load question image:', activeItem!.question.imagePath);
                    }}
                  />
                </div>
                {/* Options for MCQ */}
                {activeItem!.question.type === 'MCQ' && (
                  <div className="mt-4 grid gap-2">
                    {(activeItem!.question.options || []).map((opt, i) => {
                      const isSelected = activeItem!.userAnswer === opt;
                      const isCorrect = activeItem!.question.correctAnswer === opt;
                      const styles = isCorrect
                        ? 'border-green-500 bg-green-50'
                        : isSelected
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300 bg-white';
                      return (
                        <div
                          key={i}
                          className={`rounded-md border px-3 py-2 text-sm text-gray-900 flex items-center justify-between ${styles}`}
                        >
                          <span>{opt}</span>
                          {isCorrect && <span className="text-green-700 text-xs font-semibold">Correct</span>}
                          {!isCorrect && isSelected && (
                            <span className="text-red-700 text-xs font-semibold">Your choice</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Integer answer */}
                {activeItem!.question.type === 'Integer' && (
                  <div className="mt-4">
                    <div className="rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-900 inline-flex items-center gap-2">
                      <span className="text-gray-600">Your Answer:</span>
                      <span className="font-semibold">{String(activeItem!.userAnswer ?? '—')}</span>
                    </div>
                  </div>
                )}
              </div>
              {/* Result card */}
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
                  <div className="p-4">
                    <div className="text-xs font-medium text-gray-600">Status</div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor(activeItem!.status)}`}>
                        {activeItem!.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-medium text-gray-600">Time Taken</div>
                    <div className="mt-1 text-gray-900 font-semibold">
                      {Math.floor(activeItem!.timeSpent / 60)}m {activeItem!.timeSpent % 60}s
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-medium text-gray-600">Correct Answer</div>
                    <div className="mt-1 text-gray-900 font-semibold">{activeItem!.question.correctAnswer}</div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-medium text-gray-600">Subject</div>
                    <div className="mt-1 text-gray-900 font-semibold">{activeItem!.question.subject}</div>
                  </div>
                </div>
              </div>
              {/* Solution image */}
              <div className="rounded-lg border bg-white p-3">
                <div className="mb-2 text-sm font-semibold text-gray-800">Solution</div>
                <div className="flex justify-center">
                  <FastImage
                    id={`s-${activeItem!.question.id}`}
                    src={activeItem!.question.solutionPath}
                    alt={`Solution for Q${activeItem!.question.questionNumber}`}
                    className="question-image"
                    onError={() => {
                      console.error('Failed to load solution image:', activeItem!.question.solutionPath);
                    }}
                  />
                </div>
              </div>
              {/* Prev/Next */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prev}
                  disabled={activeIndex === 0}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <div className="text-sm text-gray-600">
                  {filtered.length > 0 ? activeIndex + 1 : 0} / {filtered.length}
                </div>
                <button
                  onClick={next}
                  disabled={activeIndex >= filtered.length - 1}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Number index */}
        <div className="rounded-lg border bg-white p-3 lg:sticky lg:top-[64px] max-h-[calc(100vh-80px)] overflow-y-auto">
          {/* Compact filters above index */}
          <div className="mb-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Level with counts */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-gray-800"
            >
              <option value="All">Level: All</option>
              <option value="Easy">Easy • {levelCounts.Easy}</option>
              <option value="Medium">Medium • {levelCounts.Medium}</option>
              <option value="Hard">Hard • {levelCounts.Hard}</option>
            </select>
            {/* Chapter with counts (subject-aware, hide zero count) */}
            <select
              value={chapterFilter}
              onChange={(e) => {
                setChapterFilter(e.target.value);
                setTopicFilter('All');
              }}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-gray-800"
            >
              {chaptersUI.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'Chapter: All' : `${c} • ${chapterCounts.get(c) || 0}`}
                </option>
              ))}
            </select>
            {/* Topic with counts (subject/chapter-aware, hide zero count) */}
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-gray-800"
            >
              {topicsUI.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'Topic: All' : `${t} • ${topicCounts.get(t) || 0}`}
                </option>
              ))}
            </select>
          </div>

          {/* Time efficiency pills */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(['All', 'Perfect', 'Overtime', 'Waste', 'OvertimeMiss'] as TimeEffFilter[]).map((t) => {
              const active = timeFilter === t;
              // Friendly label for OvertimeMiss
              const label = t === 'OvertimeMiss' ? 'Late & Wrong' : t;
              const base = 'rounded-full px-2.5 py-1 text-xs sm:text-sm flex items-center gap-1.5 transition-colors';
              const style = active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200';
              const count =
                t === 'All'
                  ? filtered.length // show current shown when All selected
                  : (t === 'Perfect'
                      ? timeCounts.Perfect
                      : t === 'Overtime'
                      ? timeCounts.Overtime
                      : t === 'Waste'
                      ? timeCounts.Waste
                      : timeCounts.OvertimeMiss);
              return (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`${base} ${style}`}
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
                  <span>{label}</span>
                  {typeof count === 'number' && (
                    <span
                      className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-5 rounded-full text-[11px] px-1.5 font-semibold ${
                        active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">Questions</div>
            <div className="text-xs text-gray-500">
              {filtered.length} shown
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No questions match the applied filters.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-2">
                {filtered.map((it, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={it.question.id}
                      className={indexButtonClass(it, isActive)}
                      title={`Q${it.question.questionNumber}`}
                      onClick={() => setActiveIndex(idx)}
                    >
                      {it.question.questionNumber}
                      {bookmarks.has(it.question.id) && (
                        <span className="absolute -top-0.5 -right-0.5 inline-block h-2 w-2 rounded-full bg-yellow-500"></span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Tiny legend */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-green-500 bg-green-50 inline-block" />
                  Correct
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-red-500 bg-red-50 inline-block" />
                  Incorrect
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-gray-300 bg-white inline-block" />
                  Skipped
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-purple-500 bg-purple-50 inline-block" />
                  Review
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" />
                  Bookmarked
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

      <MistakeModal
        open={mistakeOpen}
        onClose={() => setMistakeOpen(false)}
        onSave={submitMistake}
        onDelete={async () => {
          try {
            if (!activeItem) return;
            const qid = activeItem.question.id;
            const existing = notesByQ[qid];
            if (!existing?.id) {
              alert('No saved note found for this question.');
              return;
            }
            await deleteMistakeNote(existing.id);
            // Optimistically remove from local cache so button/badge reflect deletion
            setNotesByQ((prev) => {
              const next = { ...prev };
              delete next[qid];
              return next;
            });
            setMistakeOpen(false);
          } catch (e) {
            console.error('Failed to delete mistake note', e);
            alert('Failed to delete note. Please try again.');
          }
        }}
        defaultText={activeItem ? (notesByQ[activeItem.question.id]?.note || '') : ''}
        defaultTags={activeItem ? (notesByQ[activeItem.question.id]?.tags || []) : []}
        submitLabel={activeItem && notesByQ[activeItem.question.id]?.note ? 'Update Note' : 'Save Note'}
        title="Add to Mistake Notebook"
      />
    </div>
  );
}