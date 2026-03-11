import React, { useState } from 'react';
import { Clock, Video, FileText, MoreHorizontal, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import api from '../services/api';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 10;

interface Meeting {
    id: number;
    studentName: string;
    rollNumber: string;
    batch: string;
    course: string;
    dateTime: string;
    type: 'upcoming' | 'past' | 'cancelled';
    avatar: string;
    joinUrl?: string;
    notes?: string;
}

interface Option { id: number; name: string; }

const MeetsView: React.FC = () => {
    const { user } = useAuth();
    const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);
    const [tempNotes, setTempNotes] = useState('');
    const [courses, setCourses] = useState<Option[]>([]);
    const [batches, setBatches] = useState<Option[]>([]);
    const [teachers, setTeachers] = useState<Option[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
    const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const resetPage = () => setCurrentPage(1);

    const fetchMeetings = React.useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCourse) params.append('courseId', selectedCourse.toString());
            if (selectedBatch) params.append('batchId', selectedBatch.toString());
            if (selectedTeacher) params.append('teacherId', selectedTeacher.toString());

            const response = await api.get(`/meetings?${params.toString()}`);
            const fetchedMeetings: any[] = response.data;

            const mappedMeetings: Meeting[] = fetchedMeetings.map((m: any) => {
                const date = new Date(m.slot.startAt);
                const isPast = date < new Date();
                const isCancelled = m.status === 'CANCELLED';
                return {
                    id: m.id,
                    studentName: m.student.name,
                    rollNumber: m.student.rollNumber,
                    batch: m.student.batch.name,
                    course: m.student.batch.course.name,
                    dateTime: format(date, 'dd MMM yyyy, hh:mm a'),
                    type: isCancelled ? 'cancelled' : isPast ? 'past' : 'upcoming',
                    avatar: m.student.name.charAt(0).toUpperCase(),
                    joinUrl: m.joinUrl,
                    notes: m.notes,
                };
            });

            setMeetings(mappedMeetings);
            resetPage();
        } catch (error) {
            console.error('Failed to fetch meetings:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedCourse, selectedBatch, selectedTeacher]);

    React.useEffect(() => {
        const fetchInitialMetadata = async () => {
            try {
                if (user?.role === 'ADMIN') {
                    const couRes = await api.get('/master/courses');
                    setCourses(couRes.data);
                } else {
                    const [couRes, bRes] = await Promise.all([
                        api.get('/teacher/courses'),
                        api.get('/teacher/batches'),
                    ]);
                    setCourses(couRes.data);
                    setBatches(bRes.data);
                }
            } catch (error) {
                console.error('Failed to fetch initial filters:', error);
            }
        };
        fetchInitialMetadata();
    }, [user?.role]);

    React.useEffect(() => {
        const fetchBatches = async () => {
            if (user?.role === 'ADMIN') {
                if (selectedCourse) {
                    const bRes = await api.get(`/master/batches?courseId=${selectedCourse}`);
                    setBatches(bRes.data);
                } else {
                    setBatches([]);
                }
            }
        };
        fetchBatches();
    }, [selectedCourse, user?.role]);

    React.useEffect(() => {
        const fetchTeachers = async () => {
            if (user?.role === 'ADMIN') {
                if (selectedBatch) {
                    const teaRes = await api.get(`/master/teachers?batchId=${selectedBatch}`);
                    setTeachers(teaRes.data);
                } else {
                    setTeachers([]);
                }
            }
        };
        fetchTeachers();
    }, [selectedBatch, user?.role]);

    React.useEffect(() => {
        fetchMeetings();
    }, [fetchMeetings]);

    const handleSaveNotes = async (meetingId: number) => {
        try {
            await api.patch(`/meetings/${meetingId}/notes`, { notes: tempNotes });
            setMeetings(meetings.map(m => m.id === meetingId ? { ...m, notes: tempNotes } : m));
            setEditingMeetingId(null);
        } catch (error) {
            console.error('Failed to save notes:', error);
        }
    };

    const filteredMeetings = meetings.filter(m => {
        const matchesType = filterType === 'all' || m.type === filterType;
        const matchesSearch =
            m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / PAGE_SIZE));
    const pagedMeetings = filteredMeetings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const typeBadge = {
        upcoming: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        past: 'bg-gray-100 text-gray-500 border-gray-200',
        cancelled: 'bg-red-50 text-red-600 border-red-100',
    };

    const TABS: { key: 'all' | 'upcoming' | 'past'; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'past', label: 'Past' },
    ];

    return (
        <div className="px-8 py-6 space-y-6 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 -mx-8 px-8 bg-gray-50/95 backdrop-blur-md pt-1 pb-5 border-b border-gray-200">
                {/* Title + tabs row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Meetings</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Manage and review your scheduled sessions</p>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl self-start sm:self-auto">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setFilterType(tab.key); resetPage(); }}
                                className={clsx(
                                    'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
                                    filterType === tab.key
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by name or roll number…"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); resetPage(); }}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                        />
                    </div>

                    <select
                        value={selectedCourse || ''}
                        onChange={e => {
                            setSelectedCourse(Number(e.target.value) || null);
                            setSelectedBatch(null);
                            setSelectedTeacher(null);
                        }}
                        className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                    >
                        <option value="">All Courses</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                        value={selectedBatch || ''}
                        onChange={e => {
                            setSelectedBatch(Number(e.target.value) || null);
                            setSelectedTeacher(null);
                        }}
                        className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                    >
                        <option value="">All Batches</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    {user?.role === 'ADMIN' && (
                        <select
                            value={selectedTeacher || ''}
                            onChange={e => setSelectedTeacher(Number(e.target.value) || null)}
                            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                        >
                            <option value="">All Teachers</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    )}

                    {(selectedCourse || selectedBatch || selectedTeacher || searchQuery) && (
                        <button
                            onClick={() => {
                                setSelectedCourse(null);
                                setSelectedBatch(null);
                                setSelectedTeacher(null);
                                setSearchQuery('');
                                setFilterType('all');
                                resetPage();
                            }}
                            className="px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Results count */}
            {!loading && meetings.length > 0 && (
                <p className="text-xs text-gray-400 font-medium">
                    {filteredMeetings.length} {filteredMeetings.length === 1 ? 'meeting' : 'meetings'}
                    {filterType !== 'all' && ` · ${filterType}`}
                </p>
            )}

            {/* Meeting list */}
            <div className="space-y-3">
                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3.5 bg-gray-100 rounded w-1/4" />
                                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                                    </div>
                                    <div className="h-8 bg-gray-100 rounded-lg w-32" />
                                </div>
                                <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                                    <div className="h-3 bg-gray-100 rounded w-16" />
                                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <AnimatePresence>
                    {!loading && pagedMeetings.map(meet => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            key={meet.id}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Top section */}
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-5">
                                {/* Avatar + info */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-base">
                                        {meet.avatar}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-semibold text-gray-900 truncate">{meet.studentName}</h3>
                                            <span className={clsx(
                                                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                                                typeBadge[meet.type]
                                            )}>
                                                {meet.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                            <span>#{meet.rollNumber}</span>
                                            <span>·</span>
                                            <span className="truncate">{meet.course}</span>
                                            <span>·</span>
                                            <span className="truncate">{meet.batch}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 shrink-0">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    {meet.dateTime}
                                </div>

                                {/* Action */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {meet.type === 'upcoming' && meet.joinUrl && (
                                        <a
                                            href={meet.joinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                                        >
                                            <Video className="w-3.5 h-3.5" />
                                            Join
                                        </a>
                                    )}
                                    <button className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Notes section */}
                            <div className="px-5 pb-5 pt-0">
                                <div className="border-t border-gray-100 pt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                            <FileText className="w-3 h-3" />
                                            Notes
                                        </div>
                                        {editingMeetingId !== meet.id && user?.role !== 'ADMIN' && (
                                            <button
                                                onClick={() => {
                                                    setEditingMeetingId(meet.id);
                                                    setTempNotes(meet.notes || '');
                                                }}
                                                className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                                            >
                                                {meet.notes ? 'Edit' : '+ Add'}
                                            </button>
                                        )}
                                    </div>

                                    {editingMeetingId === meet.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={tempNotes}
                                                onChange={e => setTempNotes(e.target.value)}
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all resize-none min-h-[80px]"
                                                placeholder="Add meeting notes…"
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingMeetingId(null)}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleSaveNotes(meet.id)}
                                                    className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className={clsx(
                                            'text-sm leading-relaxed',
                                            meet.notes ? 'text-gray-600' : 'text-gray-300 italic'
                                        )}>
                                            {meet.notes || 'No notes yet.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty state */}
                {!loading && filteredMeetings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                            <Clock className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900">No meetings found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-gray-400">
                            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredMeetings.length)} of {filteredMeetings.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, idx) =>
                                    p === '…'
                                        ? <span key={`e-${idx}`} className="w-8 text-center text-gray-300 text-sm">…</span>
                                        : <button
                                            key={p}
                                            onClick={() => setCurrentPage(p as number)}
                                            className={clsx(
                                                'w-8 h-8 rounded-lg text-sm font-semibold transition-all',
                                                currentPage === p
                                                    ? 'bg-gray-900 text-white'
                                                    : 'text-gray-500 hover:bg-gray-100'
                                            )}
                                        >
                                            {p}
                                        </button>
                                )}

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetsView;
