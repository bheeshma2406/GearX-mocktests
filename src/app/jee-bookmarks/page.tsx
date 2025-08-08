'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  NotebookPen,
} from 'lucide-react';

import FastImage from '@/components/FastImage';
import BookmarkButton from '@/components/BookmarkButton';
import MistakeModal from '@/components/MistakeModal';
import {
  getBookmarksForUser,
  getQuestionsByTestId,
  getTestNameById,
  toggleBookmark,
  getMistakeNotesForUser,
  getTestSession,
  upsertMistakeNote,
  deleteMistakeNote,
  getUserResults,
} from '@/lib/firebaseData';
import { BookmarkDoc, Question, TestSession } from '@/types';

const USER_ID = 'guest';

type SubjectFilter = 'All' | 'Mathematics' | 'Physics' | 'Chemistry';
type LevelFilter = 'All' | 'Easy' | 'Medium' | 'Hard';
type StatusFilter = 'All' | 'Correct' | 'Incorrect' | 'Skipped' | 'Review';

type BookmarkWithQuestion = BookmarkDoc & {
  question?: Question;
  testName?: string;
};

type Item = {
  id: string; // unique for index list
  testId: string;
  testName: string;
  question: Question;
};

export default function JEEBookmarksPage() {
  // Data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkWithQuestion[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [testNames, setTestNames] = useState<Record<string, string>>({});

  // Filters (match Solutions layout/behavior)
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All'); // Correct/Incorrect/Skipped/Review
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All');
  const [chapterFilter, setChapterFilter] = useState<string>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');

  // Test Multi-select (top-right under subject chips)
  const [testsOpen, setTestsOpen] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const testsPopoverRef = useRef<HTMLDivElement | null>(null);

  // Navigation
  const [activeIndex, setActiveIndex] = useState(0);

  // Mistake notes state (edit existing only; no new DB collections)
  // Map: questionId -> { note, tags, attemptId, id? }
  const [notesByQ, setNotesByQ] = useState<Record<string, { note: string; tags: string[]; attemptId: string; id?: string }>>({});
  // attemptId -> session
  const [sessionsByAttempt, setSessionsByAttempt] = useState<Record<string, TestSession | null>>({});
  // Fallback when a question has no Mistake Note: use most recent session per test
  const [sessionsByTestId, setSessionsByTestId] = useState<Record<string, TestSession | null>>({});
  const [mistakeOpen, setMistakeOpen] = useState(false);

  // Fetch bookmarks and build items
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const raw = await getBookmarksForUser(USER_ID);
        if (raw.length === 0) {
          setBookmarks([]);
          setItems([]);
          setTestNames({});
          setLoading(false);
          return;
        }

        // Group by test
        const byTest = new Map<string, BookmarkDoc[]>();
        raw.forEach((b) => {
          const arr = byTest.get(b.testId) || [];
          arr.push(b);
          byTest.set(b.testId, arr);
        });

        // Friendly test names
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
        const nameMap = Object.fromEntries(namePairs);

        // Fetch questions and join
        const joined: BookmarkWithQuestion[] = [];
        await Promise.all(
          Array.from(byTest.entries()).map(async ([testId, arr]) => {
            const qs = await getQuestionsByTestId(testId);
            const qMap = new Map(qs.map((q) => [q.id, q]));
            arr.forEach((b) => {
              joined.push({ ...b, question: qMap.get(b.questionId), testName: nameMap[testId] });
            });
          })
        );

        // Sort newest created first (fallback secondary sort for stable order)
        joined.sort((a, b) => {
          const aTime =
            (a as any).createdAt?.toDate?.() instanceof Date
              ? (a as any).createdAt.toDate().getTime()
              : (a as any).createdAt instanceof Date
              ? (a as any).createdAt.getTime()
              : 0;
          const bTime =
            (b as any).createdAt?.toDate?.() instanceof Date
              ? (b as any).createdAt.toDate().getTime()
              : (b as any).createdAt instanceof Date
              ? (b as any).createdAt.getTime()
              : 0;
          if (bTime !== aTime) return bTime - aTime;

          const asub = a.question?.subject || '';
          const bsub = b.question?.subject || '';
          if (asub !== bsub) return asub.localeCompare(bsub);

          const aq = a.question?.questionNumber || 0;
          const bq = b.question?.questionNumber || 0;
          return aq - bq;
        });

        setBookmarks(joined);
        setTestNames(nameMap);

        // Build Items
        const flat: Item[] = joined
          .filter((j) => j.question)
          .map((j, idx) => ({
            id: j.id || `${j.userId}_${j.questionId}_${idx}`,
            testId: j.testId,
            testName: j.testName || j.testId,
            question: j.question as Question,
          }));

        setItems(flat);
      } catch (e) {
        console.error('Failed to load bookmarks:', e);
        setError('Failed to load bookmarks');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  // Load user's mistake notes (latest per question) + their sessions (for status derivation)
  useEffect(() => {
    const run = async () => {
      try {
        const notes = await getMistakeNotesForUser(USER_ID);
        // pick the latest note per questionId
        const byQ: Record<string, { note: string; tags: string[]; attemptId: string; id?: string; _created?: number }> = {};
        (notes as any[]).forEach((n) => {
          const created =
            n?.createdAt?.toDate?.() instanceof Date
              ? n.createdAt.toDate().getTime()
              : n?.createdAt instanceof Date
              ? n.createdAt.getTime()
              : 0;
          const qid = n.questionId;
          const prev = byQ[qid];
          if (!prev || created > (prev._created || 0)) {
            byQ[qid] = { note: n.note || '', tags: n.tags || [], attemptId: n.attemptId, id: n.id, _created: created };
          }
        });
        // strip helper prop
        const clean: Record<string, { note: string; tags: string[]; attemptId: string; id?: string }> = {};
        Object.entries(byQ).forEach(([k, v]) => {
          clean[k] = { note: v.note, tags: v.tags, attemptId: (v as any).attemptId, id: (v as any).id };
        });
        setNotesByQ(clean);

        // sessions for status
        const attemptIds = Array.from(new Set(Object.values(clean).map((v) => v.attemptId).filter(Boolean)));
        const pairs = await Promise.all(attemptIds.map(async (aid) => [aid, await getTestSession(aid)] as const));
        const map: Record<string, TestSession | null> = {};
        pairs.forEach(([aid, sess]) => (map[aid] = sess));
        setSessionsByAttempt(map);
      } catch (e) {
        console.warn('Failed to fetch mistake notes/sessions for bookmarks', e);
      }
    };
    run();
  }, []);

  // Build sessions by latest result per test (fallback when no Mistake Note exists)
  useEffect(() => {
    const run = async () => {
      try {
        if (items.length === 0) return;
        const results = await getUserResults();
        // Choose latest session per testId
        const latestSessionByTest: Record<string, string> = {};
        const dateVal = (d: any): number => {
          if (!d) return 0;
          if (d?.toDate) return d.toDate().getTime?.() || 0;
          if (d instanceof Date) return d.getTime();
          if (typeof d === 'string' || typeof d === 'number') return new Date(d as any).getTime();
          return 0;
        };
        // Only keep tests that appear in current items set
        const testSet = new Set(items.map(i => i.testId));
        results.forEach((r: any) => {
          if (!r?.testId || !r?.sessionId) return;
          if (!testSet.has(r.testId)) return;
          const ts = dateVal(r.submittedAt);
          const prevSid = latestSessionByTest[r.testId];
          if (!prevSid) {
            latestSessionByTest[r.testId] = r.sessionId;
            (latestSessionByTest as any)._t = (latestSessionByTest as any)._t || {};
            (latestSessionByTest as any)._t[r.testId] = ts;
          } else {
            const prevTs = (latestSessionByTest as any)._t?.[r.testId] || 0;
            if (ts > prevTs) {
              latestSessionByTest[r.testId] = r.sessionId;
              (latestSessionByTest as any)._t[r.testId] = ts;
            }
          }
        });
        const entries = Object.entries(latestSessionByTest).filter(([k]) => k !== '_t');
        if (entries.length === 0) return;
        const pairs = await Promise.all(entries.map(async ([testId, sid]) => [testId, await getTestSession(sid as string)] as const));
        const map: Record<string, TestSession | null> = {};
        pairs.forEach(([tid, sess]) => (map[tid] = sess));
        setSessionsByTestId(map);
      } catch (e) {
        console.warn('Bookmarks: failed to build sessionsByTestId fallback', e);
      }
    };
    run();
  }, [items]);

  // Close multiselect when clicking outside
  useEffect(() => {
    if (!testsOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!testsPopoverRef.current) return;
      if (!testsPopoverRef.current.contains(e.target as Node)) {
        setTestsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [testsOpen]);

  const allTestOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.testId));
    return Array.from(set).sort((a, b) => (testNames[a] || a).localeCompare(testNames[b] || b));
  }, [items, testNames]);

  // Derived lists and counts for Level/Chapter/Topic (like Solutions)
  const levelCounts = useMemo(() => {
    let Easy = 0,
      Medium = 0,
      Hard = 0;
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      if (selectedTestIds.size > 0 && !selectedTestIds.has(it.testId)) return;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return;
      if (topicFilter !== 'All' && it.question.topic !== topicFilter) return;
      if (it.question.difficulty === 'Easy') Easy++;
      else if (it.question.difficulty === 'Medium') Medium++;
      else if (it.question.difficulty === 'Hard') Hard++;
    });
    return { Easy, Medium, Hard };
  }, [items, subjectFilter, selectedTestIds, chapterFilter, topicFilter]);

  const chapterCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      if (selectedTestIds.size > 0 && !selectedTestIds.has(it.testId)) return;
      if (levelFilter !== 'All' && it.question.difficulty !== levelFilter) return;
      if (topicFilter !== 'All' && it.question.topic !== topicFilter) return;
      const key = it.question.chapter;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [items, subjectFilter, selectedTestIds, levelFilter, topicFilter]);

  const topicCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      if (selectedTestIds.size > 0 && !selectedTestIds.has(it.testId)) return;
      if (levelFilter !== 'All' && it.question.difficulty !== levelFilter) return;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return;
      const key = it.question.topic;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [items, subjectFilter, selectedTestIds, levelFilter, chapterFilter]);

  const chaptersUI = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      if (selectedTestIds.size > 0 && !selectedTestIds.has(it.testId)) return;
      const ch = it.question.chapter;
      if (!seen.has(ch)) {
        seen.add(ch);
        order.push(ch);
      }
    });
    const available = order.filter((ch) => (chapterCounts.get(ch) || 0) > 0);
    return ['All', ...available];
  }, [items, subjectFilter, selectedTestIds, chapterCounts]);

  const topicsUI = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    items.forEach((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return;
      if (selectedTestIds.size > 0 && !selectedTestIds.has(it.testId)) return;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return;
      const tp = it.question.topic;
      if (!seen.has(tp)) {
        seen.add(tp);
        order.push(tp);
      }
    });
    const available = order.filter((tp) => (topicCounts.get(tp) || 0) > 0);
    return ['All', ...available];
  }, [items, subjectFilter, selectedTestIds, chapterFilter, topicCounts]);

  // Status derivation (only for items that have a note/attempt)
  const statusByItemId = useMemo(() => {
    const map: Record<string, StatusFilter> = {};
    items.forEach((it) => {
      // Session resolution: prefer attempt from mistake note, else latest by test
      const note = notesByQ[it.question.id];
      let sess: TestSession | null | undefined = undefined;
      if (note?.attemptId) {
        sess = sessionsByAttempt[note.attemptId];
      }
      if (!sess) {
        sess = sessionsByTestId[it.testId];
      }
      const ans = sess?.answers?.find((a) => a.questionId === it.question.id);
      if (!ans) return; // leave undefined so counts ignore it
      const isAnswered = !!ans.isAnswered;
      const isMarkedForReview = !!ans.isMarkedForReview;
      let isCorrect = false;
      if (it.question.type === 'MCQ') {
        isCorrect = isAnswered && ans.selectedOption === it.question.correctAnswer;
      } else {
        isCorrect = isAnswered && Number(ans.integerAnswer) === Number(it.question.correctAnswer);
      }
      let status: StatusFilter = 'Skipped';
      if (isMarkedForReview && isAnswered) status = 'Review';
      else if (isAnswered && isCorrect) status = 'Correct';
      else if (isAnswered && !isCorrect) status = 'Incorrect';
      else status = 'Skipped';
      map[it.id] = status;
    });
    return map;
  }, [items, notesByQ, sessionsByAttempt, sessionsByTestId]);

  // Base for status counts: respect other filters except status itself, and only items with derived status
  const baseForStatus = useMemo(() => {
    return items.filter((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return false;
      if (selectedTestIds.size > 0 && !selectedTestIds.has(it.testId)) return false;
      if (levelFilter !== 'All' && it.question.difficulty !== levelFilter) return false;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return false;
      if (topicFilter !== 'All' && it.question.topic !== topicFilter) return false;
      return typeof statusByItemId[it.id] === 'string';
    });
  }, [items, subjectFilter, selectedTestIds, levelFilter, chapterFilter, topicFilter, statusByItemId]);

  const statusCounts = useMemo(() => {
    let Correct = 0,
      Incorrect = 0,
      Skipped = 0,
      Review = 0;
    baseForStatus.forEach((it) => {
      const st = statusByItemId[it.id];
      if (st === 'Correct') Correct++;
      else if (st === 'Incorrect') Incorrect++;
      else if (st === 'Review') Review++;
      else Skipped++;
    });
    return { Correct, Incorrect, Skipped, Review };
  }, [baseForStatus, statusByItemId]);

  // Filtered items (apply all filters including status)
  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (subjectFilter !== 'All' && it.question.subject !== subjectFilter) return false;
      if (selectedTestIds.size > 0 && !selectedTestIds.has(it.testId)) return false;
      if (levelFilter !== 'All' && it.question.difficulty !== levelFilter) return false;
      if (chapterFilter !== 'All' && it.question.chapter !== chapterFilter) return false;
      if (topicFilter !== 'All' && it.question.topic !== topicFilter) return false;
      if (statusFilter !== 'All') {
        const st = statusByItemId[it.id];
        if (st !== statusFilter) return false; // exclude when undefined or mismatch
      }
      return true;
    });
  }, [
    items,
    subjectFilter,
    selectedTestIds,
    levelFilter,
    chapterFilter,
    topicFilter,
    statusFilter,
    statusByItemId,
  ]);

  // Keep activeIndex in range
  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(filtered.length > 0 ? filtered.length - 1 : 0);
    }
  }, [filtered.length, activeIndex]);

  const activeItem = filtered.length > 0 ? filtered[activeIndex] : undefined;

  // Active user's answer derived from Mistake Note attempt; fallback to latest session-by-test
  const activeAnswer = useMemo(() => {
    if (!activeItem) return null;
    // 1) Prefer session from mistake note (exact attempt)
    const note = notesByQ[activeItem.question.id];
    let sess: TestSession | null | undefined = undefined;
    if (note?.attemptId) {
      sess = sessionsByAttempt[note.attemptId];
    }
    // 2) Fallback to latest session per test
    if (!sess) {
      sess = sessionsByTestId[activeItem.testId];
    }
    const ans = sess?.answers?.find((a: any) => a.questionId === activeItem.question.id) || null;
    return ans as any;
  }, [activeItem, notesByQ, sessionsByAttempt, sessionsByTestId]);

  const formatTime = (seconds?: number) => {
    const s = Number(seconds) || 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  // Derive active status directly from the resolved activeAnswer (mirrors Solutions)
  const activeStatus: StatusFilter | null = useMemo(() => {
    if (!activeItem) return null;
    const ans: any = activeAnswer;
    if (!ans) return null;
    const isAnswered = !!ans.isAnswered;
    const isMarkedForReview = !!ans.isMarkedForReview;
    let isCorrect = false;
    if (activeItem.question.type === 'MCQ') {
      isCorrect = isAnswered && ans.selectedOption === activeItem.question.correctAnswer;
    } else {
      isCorrect = isAnswered && Number(ans.integerAnswer) === Number(activeItem.question.correctAnswer);
    }
    if (isMarkedForReview && isAnswered) return 'Review';
    if (isAnswered && isCorrect) return 'Correct';
    if (isAnswered && !isCorrect) return 'Incorrect';
    return 'Skipped';
  }, [activeItem, activeAnswer]);


  const toggleTestSelection = (id: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearTests = () => setSelectedTestIds(new Set());
  const next = () => setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
  const prev = () => setActiveIndex((i) => Math.max(0, i - 1));

  const handleToggleBookmark = async (item: Item) => {
    try {
      const after = await toggleBookmark(USER_ID, {
        testId: item.testId,
        questionId: item.question.id,
        subject: item.question.subject,
      });
      // Remove locally if unbookmarked
      if (!after) {
        setItems((prev) => prev.filter((p) => !(p.question.id === item.question.id && p.testId === item.testId)));
      }
    } catch (e) {
      console.error('Toggle bookmark failed', e);
      alert('Failed to update bookmark. Try again.');
    }
  };

  const submitMistake = async (payload: { text: string; tags: string[] }) => {
    if (!activeItem) return;
    const existing = notesByQ[activeItem.question.id];
    if (!existing?.attemptId) {
      alert('Create this note from Solutions page first.');
      return;
    }
    const res = await upsertMistakeNote({
      userId: USER_ID,
      attemptId: existing.attemptId,
      testId: activeItem.testId,
      questionId: activeItem.question.id,
      note: payload.text,
      tags: payload.tags,
    });
    // update local cache
    setNotesByQ((prev) => ({
      ...prev,
      [activeItem.question.id]: { note: payload.text, tags: payload.tags, attemptId: existing.attemptId, id: res.id },
    }));
  };

  return (
    <div className="min-h-screen lg:h-screen bg-gray-50 lg:overflow-hidden flex flex-col">
      {/* Header (match Solutions) */}
      <div className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/jee-tests"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 shadow-sm"
            >
              <ArrowLeft size={16} />
              Back to JEE Tests
            </Link>
          </div>

          {/* Subject chips in header (like Solutions) */}
          <div className="flex items-center gap-2">
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

        {/* Filters row under subject chips: Status pills + Tests multi-select */}
        <div className="mx-auto max-w-7xl px-4 pb-3 flex flex-wrap items-center gap-2 justify-between">
          {/* Status pills with counts (only for items with a known status via Mistake note session) */}
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Correct', 'Incorrect', 'Skipped', 'Review'] as StatusFilter[]).map((s) => {
              const active = statusFilter === s;
              const count =
                s === 'All'
                  ? undefined
                  : s === 'Correct'
                  ? statusCounts.Correct
                  : s === 'Incorrect'
                  ? statusCounts.Incorrect
                  : s === 'Review'
                  ? statusCounts.Review
                  : statusCounts.Skipped;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-2.5 py-1 text-xs sm:text-sm flex items-center gap-1.5 transition-colors ${
                    active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
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

          {/* Tests multi-select */}
          <div className="relative" ref={testsPopoverRef}>
            <button
              onClick={() => setTestsOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm hover:bg-gray-50"
              title="Filter by tests"
            >
              <Filter className="w-4 h-4 text-gray-600" />
              <span>Tests</span>
              {selectedTestIds.size > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] px-1.5 h-4 min-w-[16px]">
                  {selectedTestIds.size}
                </span>
              )}
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>

            {testsOpen && (
              <div className="absolute right-0 mt-2 w-72 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl z-20">
                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">Select Tests</div>
                  {selectedTestIds.size > 0 && (
                    <button onClick={clearTests} className="text-xs text-indigo-600 hover:underline" title="Clear selected">
                      Clear
                    </button>
                  )}
                </div>
                <div className="p-2">
                  {allTestOptions.length === 0 ? (
                    <div className="text-xs text-gray-500 p-2">No tests found</div>
                  ) : (
                    allTestOptions.map((tid) => {
                      const name = testNames[tid] || tid;
                      const checked = selectedTestIds.has(tid);
                      return (
                        <label
                          key={tid}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTestSelection(tid)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-gray-800 line-clamp-1">{name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content (match Solutions layout and scrolling) */}
      <div className="flex-1 lg:overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-full">
          {/* Left: Question and solution */}
          <div className="space-y-4 lg:h-full lg:overflow-y-auto lg:pr-2 pb-6">
            {loading ? (
              <div className="text-gray-700">Loading bookmarks…</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-lg border bg-white p-8 text-center text-gray-600">
                No questions match the applied filters. Adjust filters to see questions.
                <div className="mt-4">
                  <Link
                    href="/jee-tests"
                    className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Browse Tests</span>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Question head (match Solutions' compact info) */}
                {activeItem && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-600">
                        Question{' '}
                        <span className="font-semibold text-gray-900">{activeItem.question.questionNumber}</span>
                      </div>
                      <div className="rounded-full border px-3 py-1 text-xs text-gray-700 bg-gray-50">
                        Marks:{' '}
                        <span className="text-green-700 font-semibold">+{activeItem.question.marks.correct}</span>,{' '}
                        <span className="text-red-700 font-semibold">{activeItem.question.marks.incorrect}</span>
                      </div>
                      <div className="rounded-full border px-3 py-1 text-xs text-gray-700 bg-gray-50">
                        Type: {activeItem.question.type}
                      </div>
                      {/* Status chip if available (from attempt or fallback) */}
                      {(statusByItemId[activeItem.id] || activeStatus) && (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${
                            (statusByItemId[activeItem.id] || activeStatus) === 'Correct'
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : (statusByItemId[activeItem.id] || activeStatus) === 'Incorrect'
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : (statusByItemId[activeItem.id] || activeStatus) === 'Review'
                              ? 'bg-purple-50 border-purple-300 text-purple-700'
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        >
                          {statusByItemId[activeItem.id] || activeStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMistakeOpen(true)}
                        title="Add/Edit Mistake Note"
                      >
                        <NotebookPen size={16} />
                        {notesByQ[activeItem.question.id]?.note ? 'Edit Note' : 'Mistake Note'}
                      </button>
                      <BookmarkButton
                        isBookmarked={true}
                        onToggle={() => handleToggleBookmark(activeItem)}
                        title="Remove bookmark"
                      />
                    </div>
                  </div>
                )}

                {/* Question image */}
                {activeItem && (
                  <div className="rounded-lg border bg-white p-3">
                    <div className="flex justify-center">
                      <FastImage
                        id={`q-${activeItem.question.id}`}
                        src={activeItem.question.imagePath}
                        alt={`Question ${activeItem.question.questionNumber}`}
                        className="question-image"
                        onError={() => {
                          console.error('Failed to load question image:', activeItem.question.imagePath);
                        }}
                      />
                    </div>

                    {/* Options with user's selection + correct marking (match Solutions) */}
                    {activeItem.question.type === 'MCQ' && (
                      <div className="mt-4 grid gap-2">
                        {(activeItem.question.options || []).map((opt, i) => {
                          const isSelected = (activeAnswer?.selectedOption || '') === opt;
                          const isCorrect = activeItem.question.correctAnswer === opt;
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

                    {/* Integer: show both user's answer and correct answer (match Solutions) */}
                    {activeItem.question.type === 'Integer' && (
                      <div className="mt-4 space-x-2">
                        <div className="inline-flex rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-900 items-center gap-2">
                          <span className="text-gray-600">Your Answer:</span>
                          <span className="font-semibold">
                            {activeAnswer?.integerAnswer !== undefined ? String(activeAnswer?.integerAnswer) : '—'}
                          </span>
                        </div>
                        <div className="inline-flex rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-900 items-center gap-2">
                          <span className="text-gray-600">Correct Answer:</span>
                          <span className="font-semibold">{String(activeItem.question.correctAnswer)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Result card (Status, Time, Correct Answer, Subject) */}
                {activeItem && (
                  <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x">
                      <div className="p-4">
                        <div className="text-xs font-medium text-gray-600">Status</div>
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              (statusByItemId[activeItem.id] || activeStatus) === 'Correct'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : (statusByItemId[activeItem.id] || activeStatus) === 'Incorrect'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : (statusByItemId[activeItem.id] || activeStatus) === 'Review'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-gray-100 text-gray-800 border border-gray-300'
                            }`}
                          >
                            {statusByItemId[activeItem.id] || activeStatus || '—'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="text-xs font-medium text-gray-600">Time Taken</div>
                        <div className="mt-1 text-gray-900 font-semibold">
                          {formatTime(activeAnswer?.timeSpent)}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="text-xs font-medium text-gray-600">Correct Answer</div>
                        <div className="mt-1 text-gray-900 font-semibold">
                          {String(activeItem.question.correctAnswer)}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="text-xs font-medium text-gray-600">Subject</div>
                        <div className="mt-1 text-gray-900 font-semibold">
                          {activeItem.question.subject}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Solution image */}
                {activeItem && (
                  <div className="rounded-lg border bg-white p-3">
                    <div className="mb-2 text-sm font-semibold text-gray-800">Solution</div>
                    <div className="flex justify-center">
                      <FastImage
                        id={`s-${activeItem.question.id}`}
                        src={activeItem.question.solutionPath}
                        alt={`Solution for Q${activeItem.question.questionNumber}`}
                        className="question-image"
                        onError={() => {
                          console.error('Failed to load solution image:', activeItem.question.solutionPath);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Prev/Next (like Solutions footer) */}
                {activeItem && (
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
                )}
              </>
            )}
          </div>

          {/* Right: Filters above index + index (match Solutions structure) */}
          <div className="rounded-lg border bg-white p-3 lg:sticky lg:top-[64px] max-h-[calc(100vh-80px)] overflow-y-auto">
            {/* Level / Chapter / Topic */}
            <div className="mb-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Level with counts */}
              <select
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value as LevelFilter);
                  setChapterFilter('All');
                  setTopicFilter('All');
                }}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-gray-800"
              >
                <option value="All">Level: All</option>
                <option value="Easy">Easy • {levelCounts.Easy}</option>
                <option value="Medium">Medium • {levelCounts.Medium}</option>
                <option value="Hard">Hard • {levelCounts.Hard}</option>
              </select>
              {/* Chapter with counts */}
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
              {/* Topic with counts */}
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

            {/* Index */}
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Questions</div>
              <div className="text-xs text-gray-500">{filtered.length} shown</div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No questions match the filters.</div>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-2">
                  {filtered.map((it, idx) => {
                    const isActive = idx === activeIndex;
                    const subjectRing =
                      it.question.subject === 'Mathematics'
                        ? 'ring-blue-500'
                        : it.question.subject === 'Physics'
                        ? 'ring-green-500'
                        : 'ring-red-500';
                    return (
                      <button
                        key={it.id}
                        className={`w-10 h-10 rounded-md border text-sm font-semibold flex items-center justify-center relative ${
                          isActive
                            ? `ring-2 ${subjectRing} border-gray-400 bg-white text-gray-900`
                            : 'border-gray-300 text-gray-700 bg-white'
                        }`}
                        title={`Q${it.question.questionNumber} • ${it.testName}`}
                        onClick={() => setActiveIndex(idx)}
                      >
                        {it.question.questionNumber}
                      </button>
                    );
                  })}
                </div>

                {/* Active test name and bookmark action */}
                {activeItem && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs text-gray-500 line-clamp-2">{activeItem.testName}</div>
                    <BookmarkButton
                      isBookmarked={true}
                      onToggle={() => handleToggleBookmark(activeItem)}
                      className="w-full justify-center"
                      title="Remove bookmark"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mistake Modal */}
      <MistakeModal
        open={mistakeOpen}
        onClose={() => setMistakeOpen(false)}
        onSave={submitMistake}
        onDelete={async () => {
          try {
            const qid = activeItem?.question.id;
            if (!qid) return;
            const existing = notesByQ[qid];
            if (!existing?.id) {
              alert('No saved note found for this question.');
              return;
            }
            await deleteMistakeNote(existing.id);
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
