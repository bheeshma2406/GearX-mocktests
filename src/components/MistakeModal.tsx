'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (note: { text: string; tags: string[] }) => Promise<void> | void;
  defaultText?: string;
  defaultTags?: string[];
  title?: string;
  submitLabel?: string;
  onDelete?: () => Promise<void> | void; // optional delete handler
  showDelete?: boolean; // reserved flag if we want to force-show/hide later
};

const COMMON_TAGS = ['Conceptual', 'Calculation', 'Careless', 'Time Management', 'Not Attempted'];

export default function MistakeModal({
  open,
  onClose,
  onSave,
  defaultText = '',
  defaultTags = [],
  title = 'Add to Mistake Notebook',
  submitLabel = 'Save Note',
  onDelete,
  showDelete
}: Props) {
  const [text, setText] = useState(defaultText);
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Only reset fields when modal open state changes to avoid infinite re-renders
  useEffect(() => {
    if (open) {
      setText(defaultText ?? '');
      setTags(defaultTags ?? []);
    }
  }, [open]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({ text, tags });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setDeleting(true);
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block text-sm font-medium text-gray-700">What went wrong?</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a short note to your future self. Example: Misapplied kinematics equation; forgot that acceleration is variable."
            className="h-28 w-full resize-none rounded-md border border-gray-300 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">Tags</div>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-5 py-4">
          {onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          ) : (
            <span />
          )}

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Saving...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}