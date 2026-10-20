import React, { useState, useMemo } from 'react';
import {
  StickyNote,
  FileText,
  Search,
  Plus,
  BookOpen,
  Pin,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  FolderOpen,
  Layers,
  ArrowRight,
  Filter,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { NoteItem, NoteFolder, StudyFile, StickyNoteItem } from '../types';

export interface FileStickyNoteEntry {
  fileId: string;
  fileName: string;
  file: StudyFile;
  note: StickyNoteItem;
}

interface NotesOverviewProps {
  notes: NoteItem[];
  folders: NoteFolder[];
  studyFiles?: StudyFile[];
  onSelectNoteToEdit: (noteId: string) => void;
  onStartNewNote: () => void;
  onTogglePinNote: (noteId: string, currentPin?: boolean) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenFileAtPage?: (file: StudyFile, pageNumber: number) => void;
  onUpdateStickyNote?: (fileId: string, updatedNote: StickyNoteItem) => void;
  onDeleteStickyNote?: (fileId: string, stickyNoteId: string) => void;
  onSwitchToEditor: () => void;
}

const PRESET_COLORS = [
  { bg: '#fef08a', text: '#713f12', name: 'زرد کلاسیک' },
  { bg: '#bbf7d0', text: '#14532d', name: 'سبز نعنایی' },
  { bg: '#fed7aa', text: '#7c2d12', name: 'هلویی' },
  { bg: '#bae6fd', text: '#0c4a6e', name: 'آبی آسمانی' },
  { bg: '#e9d5ff', text: '#581c87', name: 'بنفش اسطوخودوس' },
  { bg: '#fecdd3', text: '#881337', name: 'صورتی ملایم' },
  { bg: '#f3f4f6', text: '#1f2937', name: 'خاکستری مینیمال' },
];

/**
 * Extracts plain text from HTML content for clean previews
 */
function stripHtml(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

export const NotesOverview: React.FC<NotesOverviewProps> = ({
  notes,
  folders,
  studyFiles = [],
  onSelectNoteToEdit,
  onStartNewNote,
  onTogglePinNote,
  onDeleteNote,
  onOpenFileAtPage,
  onUpdateStickyNote,
  onDeleteStickyNote,
  onSwitchToEditor,
}) => {
  // Global search input
  const [searchQuery, setSearchQuery] = useState('');

  // Column 1 Filters (Sticky Notes)
  const [selectedFileId, setSelectedFileId] = useState<string>('all');

  // Column 2 Filters (Standalone Notes)
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');

  // Sticky Note Quick Edit Modal
  const [editingStickyNote, setEditingStickyNote] = useState<FileStickyNoteEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('#fef08a');
  const [editTextColor, setEditTextColor] = useState('#713f12');

  // Sticky Note Delete Confirmation
  const [deletingStickyNote, setDeletingStickyNote] = useState<FileStickyNoteEntry | null>(null);

  // Standalone Note Delete Confirmation
  const [deletingNote, setDeletingNote] = useState<NoteItem | null>(null);

  // Copy toast notification
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const showCopyToast = (msg: string) => {
    setCopiedToast(msg);
    setTimeout(() => {
      setCopiedToast(null);
    }, 2200);
  };

  // 1. Flatten all sticky notes from all files
  const allStickyNotes: FileStickyNoteEntry[] = useMemo(() => {
    const list: FileStickyNoteEntry[] = [];
    (studyFiles || []).forEach((file) => {
      (file.stickyNotes || []).forEach((note) => {
        list.push({
          fileId: file.id,
          fileName: file.name,
          file,
          note,
        });
      });
    });
    // Sort by file name and page number
    return list.sort((a, b) => {
      if (a.fileName !== b.fileName) {
        return a.fileName.localeCompare(b.fileName, 'fa');
      }
      return (a.note.pageNumber || 1) - (b.note.pageNumber || 1);
    });
  }, [studyFiles]);

  // Unique files that contain at least one sticky note
  const filesWithStickyNotes = useMemo(() => {
    const fileMap = new Map<string, { id: string; name: string; count: number }>();
    allStickyNotes.forEach((entry) => {
      const existing = fileMap.get(entry.fileId);
      if (existing) {
        existing.count += 1;
      } else {
        fileMap.set(entry.fileId, { id: entry.fileId, name: entry.fileName, count: 1 });
      }
    });
    return Array.from(fileMap.values());
  }, [allStickyNotes]);

  // Filtered Sticky Notes (by file & search query)
  const filteredStickyNotes = useMemo(() => {
    return allStickyNotes.filter((entry) => {
      if (selectedFileId !== 'all' && entry.fileId !== selectedFileId) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const titleMatch = (entry.note.title || '').toLowerCase().includes(query);
        const contentMatch = (entry.note.content || '').toLowerCase().includes(query);
        const fileMatch = entry.fileName.toLowerCase().includes(query);
        const pageMatch = String(entry.note.pageNumber || '').includes(query);
        if (!titleMatch && !contentMatch && !fileMatch && !pageMatch) {
          return false;
        }
      }
      return true;
    });
  }, [allStickyNotes, selectedFileId, searchQuery]);

  // Filtered Standalone Notes (by folder & search query)
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (selectedFolderId !== 'all') {
        if (selectedFolderId === 'uncategorized') {
          if (note.folderId) return false;
        } else if (note.folderId !== selectedFolderId) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const titleMatch = (note.title || '').toLowerCase().includes(query);
        const contentMatch = stripHtml(note.content || '').toLowerCase().includes(query);
        if (!titleMatch && !contentMatch) {
          return false;
        }
      }
      return true;
    });
  }, [notes, selectedFolderId, searchQuery]);

  // Open Sticky Note Edit Modal
  const handleOpenEditStickyNote = (entry: FileStickyNoteEntry) => {
    setEditingStickyNote(entry);
    setEditTitle(entry.note.title || '');
    setEditContent(entry.note.content || '');
    setEditColor(entry.note.color || '#fef08a');
    setEditTextColor(entry.note.textColor || '#713f12');
  };

  // Save Sticky Note Edit
  const handleSaveStickyNoteEdit = () => {
    if (!editingStickyNote || !onUpdateStickyNote) return;
    const updated: StickyNoteItem = {
      ...editingStickyNote.note,
      title: editTitle.trim() || `یادداشت صفحه ${editingStickyNote.note.pageNumber}`,
      content: editContent.trim(),
      color: editColor,
      textColor: editTextColor,
    };
    onUpdateStickyNote(editingStickyNote.fileId, updated);
    setEditingStickyNote(null);
    showCopyToast('تغییرات استیکی‌نوت با موفقیت ذخیره شد');
  };

  // Confirm delete sticky note
  const handleConfirmDeleteStickyNote = () => {
    if (!deletingStickyNote || !onDeleteStickyNote) return;
    onDeleteStickyNote(deletingStickyNote.fileId, deletingStickyNote.note.id);
    setDeletingStickyNote(null);
    showCopyToast('استیکی‌نوت از فایل حذف شد');
  };

  // Confirm delete standalone note
  const handleConfirmDeleteNote = () => {
    if (!deletingNote) return;
    onDeleteNote(deletingNote.id);
    setDeletingNote(null);
    showCopyToast('یادداشت حذف شد');
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showCopyToast(`${label} کپی شد`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-100/50 overflow-hidden relative select-auto font-sans">
      {/* 1. Top Header Banner with Unified Controls */}
      <header className="px-6 py-4 bg-white shadow-md z-10 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-xs shrink-0">
              <StickyNote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-neutral-900 tracking-tight">
                  میز بررسی و مرور یادداشت‌ها
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-neutral-100 text-neutral-700 rounded-full">
                  صفحه پیش‌فرض
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                مرور همزمان استیکی‌نوت‌های درون فایل‌ها و یادداشت‌های مستقل مطالعه
              </p>
            </div>
          </div>

          {/* Search Bar & Switch to Editor Button */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Real-time search */}
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجو در تمام یادداشت‌ها و استیکی‌نوت‌ها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-xs bg-neutral-100/80 hover:bg-neutral-100 focus:bg-white rounded-xl focus:outline-hidden shadow-xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Switch to Full Editor */}
            <button
              onClick={onSwitchToEditor}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
              title="ورود به محیط ویرایشگر کامل"
            >
              <FileText className="w-4 h-4 text-neutral-600" />
              <span className="hidden sm:inline">محیط ویرایشگر</span>
            </button>

            {/* Quick Add Note Button */}
            <button
              onClick={onStartNewNote}
              className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0"
              title="ایجاد یادداشت جدید"
            >
              <Plus className="w-4 h-4" />
              <span>یادداشت جدید</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Two-Column Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-full items-start">
          {/* =========================================================================
              COLUMN 1: یادداشت‌های داخل فایل‌ها (استیکی‌نوت‌ها)
              ========================================================================= */}
          <section className="flex flex-col bg-white rounded-3xl shadow-lg overflow-hidden min-h-[580px]">
            {/* Column 1 Header */}
            <div className="p-4 sm:p-5 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-neutral-900">
                      استیکی‌نوت‌های داخل فایل‌ها
                    </h2>
                    <span className="px-2 py-0.5 text-[11px] font-black bg-amber-500/15 text-amber-800 rounded-full font-mono tabular-nums">
                      {filteredStickyNotes.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    یادداشت‌های چسبان ثبت شده روی صفحات کتاب‌ها و جزوه‌ها
                  </p>
                </div>
              </div>

              {/* Filter by file dropdown */}
              {filesWithStickyNotes.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedFileId}
                    onChange={(e) => setSelectedFileId(e.target.value)}
                    className="text-xs bg-white text-neutral-700 py-1.5 px-3 rounded-xl shadow-xs focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">همه فایل‌ها ({allStickyNotes.length})</option>
                    {filesWithStickyNotes.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Column 1 Notes List */}
            <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-230px)]">
              {filteredStickyNotes.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center space-y-3 h-80">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-xs">
                    <StickyNote className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-800">
                    {searchQuery || selectedFileId !== 'all'
                      ? 'هیچ استیکی‌نوتی با این فیلتر یافت نشد'
                      : 'هنوز هیچ استیکی‌نوتی روی فایل‌ها ثبت نشده'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                    هنگام مطالعه کتاب‌ها و جزوه‌ها با ابزار استیکی‌نوت در هر صفحه نکته بگذارید. تمام آن یادداشت‌ها در این ستون برای مرور سریع قرار می‌گیرند.
                  </p>
                </div>
              ) : (
                filteredStickyNotes.map((entry) => {
                  const { file, note } = entry;
                  const noteBg = note.color || '#fef08a';
                  const noteTextColor = note.textColor || '#713f12';

                  return (
                    <article
                      key={`${entry.fileId}_${note.id}`}
                      className="rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-xl transition-all duration-200 relative group flex flex-col justify-between"
                      style={{
                        backgroundColor: `${noteBg}20`,
                      }}
                    >
                      {/* Top Info Bar: File name + Page pill */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: noteBg }}
                            />
                            <span
                              className="text-xs font-bold text-neutral-800 truncate max-w-[200px]"
                              title={file.name}
                            >
                              {file.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 text-[11px] font-bold bg-white text-neutral-700 rounded-lg shadow-2xs flex items-center gap-1 font-mono tabular-nums">
                              <BookOpen className="w-3 h-3 text-neutral-500" />
                              <span>صفحه {note.pageNumber}</span>
                            </span>

                            {note.createdAt && (
                              <span className="text-[10px] text-neutral-400 font-mono tabular-nums hidden sm:inline">
                                {note.createdAt}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h4
                          className="text-sm font-black mb-1.5 leading-snug"
                          style={{ color: noteTextColor }}
                        >
                          {note.title || `یادداشت صفحه ${note.pageNumber}`}
                        </h4>

                        {/* Content text */}
                        <p
                          className="text-xs leading-relaxed whitespace-pre-wrap select-text font-normal"
                          style={{ color: noteTextColor }}
                        >
                          {note.content || 'بدون متن'}
                        </p>
                      </div>

                      {/* Bottom Action Strip */}
                      <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between gap-2">
                        {/* Jump to File & Page Button */}
                        <button
                          onClick={() => onOpenFileAtPage && onOpenFileAtPage(file, note.pageNumber)}
                          className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-neutral-900 text-neutral-800 hover:text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer group-hover:shadow-md"
                          title="باز کردن مستقیم این صفحه در کتاب‌خوان"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>مطالعه در فایل</span>
                        </button>

                        {/* Auxiliary Actions */}
                        <div className="flex items-center gap-1">
                          {/* Copy */}
                          <button
                            onClick={() =>
                              handleCopyText(
                                `${note.title || ''}\n${note.content || ''}`.trim(),
                                'متن استیکی‌نوت'
                              )
                            }
                            className="p-1.5 bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 rounded-lg shadow-2xs cursor-pointer transition-colors"
                            title="کپی متن"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Edit */}
                          {onUpdateStickyNote && (
                            <button
                              onClick={() => handleOpenEditStickyNote(entry)}
                              className="p-1.5 bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 rounded-lg shadow-2xs cursor-pointer transition-colors"
                              title="ویرایش سریع استیکی‌نوت"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {onDeleteStickyNote && (
                            <button
                              onClick={() => setDeletingStickyNote(entry)}
                              className="p-1.5 bg-white/80 hover:bg-white text-neutral-400 hover:text-rose-600 rounded-lg shadow-2xs cursor-pointer transition-colors"
                              title="حذف استیکی‌نوت"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* =========================================================================
              COLUMN 2: یادداشت‌های اختصاصی و دفاتر مطالعه (یادداشت‌های بخش یادداشت)
              ========================================================================= */}
          <section className="flex flex-col bg-white rounded-3xl shadow-lg overflow-hidden min-h-[580px]">
            {/* Column 2 Header */}
            <div className="p-4 sm:p-5 bg-sky-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-neutral-900">
                      یادداشت‌های اختصاصی برنامه
                    </h2>
                    <span className="px-2 py-0.5 text-[11px] font-black bg-sky-500/15 text-sky-800 rounded-full font-mono tabular-nums">
                      {filteredNotes.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    خلاصه‌نویسی‌ها، نکات آزمون و یادداشت‌های پوشه‌بندی شده
                  </p>
                </div>
              </div>

              {/* Filter by folder & Add Note */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="text-xs bg-white text-neutral-700 py-1.5 px-3 rounded-xl shadow-xs focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">همه پوشه‌ها ({notes.length})</option>
                    <option value="uncategorized">بدون پوشه (عمومی)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={onStartNewNote}
                  className="px-2.5 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs transition-colors shrink-0"
                  title="ایجاد یادداشت جدید"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن</span>
                </button>
              </div>
            </div>

            {/* Column 2 Notes List */}
            <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-230px)]">
              {filteredNotes.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center space-y-3 h-80">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center shadow-xs">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-800">
                    {searchQuery || selectedFolderId !== 'all'
                      ? 'هیچ یادداشتی با این فیلتر یافت نشد'
                      : 'هنوز یادداشتی ایجاد نشده است'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                    می‌توانید برای دسته‌بندی نکات و خلاصه‌نویسی‌های درسی، اولین یادداشت خود را ایجاد کنید.
                  </p>
                  <button
                    onClick={onStartNewNote}
                    className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-md cursor-pointer transition-all mt-2"
                  >
                    + ایجاد یادداشت جدید
                  </button>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const noteFolder = folders.find((f) => f.id === note.folderId);
                  const preview = stripHtml(note.content || '');

                  return (
                    <article
                      key={note.id}
                      onClick={() => onSelectNoteToEdit(note.id)}
                      className="bg-neutral-50/70 hover:bg-white rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-xl transition-all duration-200 relative group cursor-pointer flex flex-col justify-between"
                    >
                      {/* Top Bar: Pin + Title + Folder Tag */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {note.isPinned && (
                              <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            <h4 className="text-sm font-bold text-neutral-900 truncate">
                              {note.title || 'بدون عنوان'}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {noteFolder ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-2xs"
                                style={{
                                  backgroundColor: `${noteFolder.color}15`,
                                  color: noteFolder.color,
                                }}
                              >
                                <span>{noteFolder.name}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-400 font-medium">عمومی</span>
                            )}
                            <span className="text-[10px] text-neutral-400 font-mono tabular-nums">
                              {note.createdAt}
                            </span>
                          </div>
                        </div>

                        {/* Plain preview text */}
                        <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                          {preview || 'بدون متن'}
                        </p>
                      </div>

                      {/* Bottom Action Strip */}
                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                        {/* Open in Editor button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectNoteToEdit(note.id);
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-white text-neutral-800 hover:bg-neutral-900 hover:text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer group-hover:shadow-md"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>باز کردن و ویرایش</span>
                        </button>

                        {/* Auxiliary actions */}
                        <div className="flex items-center gap-1">
                          {/* Toggle Pin */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePinNote(note.id, note.isPinned);
                            }}
                            className={`p-1.5 rounded-lg shadow-2xs cursor-pointer transition-colors ${
                              note.isPinned
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-white text-neutral-400 hover:text-neutral-700'
                            }`}
                            title={note.isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-500' : ''}`} />
                          </button>

                          {/* Copy */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyText(`${note.title}\n\n${preview}`, 'متن یادداشت');
                            }}
                            className="p-1.5 bg-white text-neutral-500 hover:text-neutral-900 rounded-lg shadow-2xs cursor-pointer transition-colors"
                            title="کپی متن"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingNote(note);
                            }}
                            className="p-1.5 bg-white text-neutral-400 hover:text-rose-600 rounded-lg shadow-2xs cursor-pointer transition-colors"
                            title="حذف یادداشت"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>

      {/* =========================================================================
          MODALS & TOASTS
          ========================================================================= */}

      {/* 1. Quick Edit Sticky Note Modal */}
      {editingStickyNote && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEditingStickyNote(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 select-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full shadow-2xs"
                  style={{ backgroundColor: editColor }}
                />
                <h3 className="text-sm font-bold text-neutral-900">
                  ویرایش استیکی‌نوت
                </h3>
              </div>
              <button
                onClick={() => setEditingStickyNote(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* File info badge */}
            <div className="p-2.5 bg-neutral-50 rounded-xl flex items-center justify-between text-xs text-neutral-600">
              <span className="font-semibold truncate max-w-[200px]">
                فایل: {editingStickyNote.fileName}
              </span>
              <span className="font-bold text-neutral-900 font-mono tabular-nums">
                صفحه {editingStickyNote.note.pageNumber}
              </span>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                عنوان نوت
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="عنوان استیکی‌نوت..."
                className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl focus:bg-white focus:outline-hidden shadow-2xs"
              />
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                متن یادداشت
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
                placeholder="متن نکته..."
                className="w-full px-3 py-2 text-xs bg-neutral-50 rounded-xl focus:bg-white focus:outline-hidden shadow-2xs leading-relaxed resize-none"
              />
            </div>

            {/* Color Palette */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                رنگ پس‌زمینه نوت
              </label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.bg}
                    type="button"
                    onClick={() => {
                      setEditColor(c.bg);
                      setEditTextColor(c.text);
                    }}
                    className={`w-7 h-7 rounded-full cursor-pointer shadow-2xs flex items-center justify-center transition-transform ${
                      editColor === c.bg ? 'scale-110 ring-2 ring-neutral-900 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: c.bg }}
                    title={c.name}
                  >
                    {editColor === c.bg && <Check className="w-3.5 h-3.5" style={{ color: c.text }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStickyNote(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveStickyNoteEdit}
                className="px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-md cursor-pointer transition-all"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Delete Sticky Note Confirm Modal */}
      {deletingStickyNote && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeletingStickyNote(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                حذف استیکی‌نوت از فایل
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                آیا از حذف این استیکی‌نوت از فایل «{deletingStickyNote.fileName}» (صفحه {deletingStickyNote.note.pageNumber}) مطمئن هستید؟
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingStickyNote(null)}
                className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmDeleteStickyNote}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Standalone Note Confirm Modal */}
      {deletingNote && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeletingNote(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                حذف یادداشت
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                آیا از حذف یادداشت «{deletingNote.title || 'بدون عنوان'}» اطمینان دارید؟ این عملیات قابل بازگشت نیست.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingNote(null)}
                className="flex-1 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmDeleteNote}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Copied Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedToast}</span>
        </div>
      )}
    </div>
  );
};
