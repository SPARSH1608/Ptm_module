import React, { useState } from 'react';
import { Clock, Video, FileText, Filter, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import api from '../services/api';
import { format } from 'date-fns';

const MeetsView: React.FC = () => {
    const [filterType, setFilterType] = useState<'upcoming' | 'past'>('upcoming');

    interface Meeting {
        id: number;
        studentName: string;
        rollNumber: string;
        batch: string;
        course: string;
        dateTime: string;
        type: 'upcoming' | 'past';
        avatar: string;
        joinUrl?: string;
        notes?: string;
    }

    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);
    const [tempNotes, setTempNotes] = useState('');

    interface Option { id: number; name: string; }
    const [courses, setCourses] = useState<Option[]>([]);
    const [batches, setBatches] = useState<Option[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
    const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMeetings = React.useCallback(async () => {
        try {
            let url = '/meetings?';
            if (selectedCourse) url += `courseId=${selectedCourse}&`;
            if (selectedBatch) url += `batchId=${selectedBatch}&`;

            const response = await api.get(url);
            const fetchedMeetings: any[] = response.data;

            const mappedMeetings: Meeting[] = fetchedMeetings.map((m: any) => {
                const date = new Date(m.slot.startAt);
                const isPast = date < new Date();
                return {
                    id: m.id,
                    studentName: m.student.name,
                    rollNumber: m.student.rollNumber,
                    batch: m.student.batch.name,
                    course: m.student.batch.course.name,
                    dateTime: format(date, 'yyyy-MM-dd hh:mm a'),
                    type: isPast ? 'past' : 'upcoming',
                    avatar: m.student.name.charAt(0),
                    joinUrl: m.joinUrl,
                    notes: m.notes
                };
            });

            setMeetings(mappedMeetings);
        } catch (error) {
            console.error("Failed to fetch meetings:", error);
        }
    }, [selectedCourse, selectedBatch]);

    React.useEffect(() => {
        const fetchFilters = async () => {
            try {
                // Assuming these endpoints exist or we'll add them
                const [cRes, bRes] = await Promise.all([
                    api.get('/teacher/courses'),
                    api.get('/teacher/batches')
                ]);
                setCourses(cRes.data);
                setBatches(bRes.data);
            } catch (error) {
                console.error("Failed to fetch filters:", error);
            }
        };
        fetchFilters();
    }, []);

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
        const matchesType = m.type === filterType;
        const matchesSearch = m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="space-y-8 pb-20">
            <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-md pb-6 pt-1 border-b border-gray-200/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 font-display tracking-tight">Meetings</h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">Manage and review your scheduled sessions</p>
                    </div>

                    <div className="flex items-center p-1.5 bg-gray-200/50 rounded-xl">
                        <button
                            onClick={() => setFilterType('upcoming')}
                            className={clsx(
                                "px-6 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-widest",
                                filterType === 'upcoming'
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setFilterType('past')}
                            className={clsx(
                                "px-6 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-widest",
                                filterType === 'past'
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Past
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[300px]">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <Clock className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by student name or roll number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-300 shadow-sm transition-all"
                        />
                    </div>

                    <select
                        value={selectedCourse || ''}
                        onChange={(e) => setSelectedCourse(Number(e.target.value) || null)}
                        className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
                    >
                        <option value="">All Courses</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                        value={selectedBatch || ''}
                        onChange={(e) => setSelectedBatch(Number(e.target.value) || null)}
                        className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
                    >
                        <option value="">All Batches</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <button
                        onClick={() => {
                            setSelectedCourse(null);
                            setSelectedBatch(null);
                            setSearchQuery('');
                        }}
                        className="px-4 py-3 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>



            <div className="space-y-4">
                <AnimatePresence>
                    {filteredMeetings.map((meet) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            key={meet.id}
                            className="group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-6 relative"
                        >
                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                {/* Student Info */}
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-lg border border-gray-100">
                                        {meet.avatar}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 leading-tight font-display">{meet.studentName}</h3>
                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 font-medium">
                                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase tracking-tighter">
                                                ID: {meet.rollNumber}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span>{meet.course}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <span>{meet.batch}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div className="flex items-center gap-3 text-gray-600 bg-gray-50/50 px-4 py-2 rounded-xl text-sm font-medium border border-gray-100">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    {meet.dateTime}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    {meet.type === 'upcoming' && meet.joinUrl && (
                                        <a
                                            href={meet.joinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-gray-200 transition-all active:scale-[0.98]"
                                        >
                                            <Video className="w-4 h-4" />
                                            Join Meeting
                                        </a>
                                    )}

                                    <button className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div className="pt-6 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                                        <FileText className="w-3.5 h-3.5" />
                                        Meeting Notes
                                    </div>
                                    {editingMeetingId !== meet.id && (
                                        <button
                                            onClick={() => {
                                                setEditingMeetingId(meet.id);
                                                setTempNotes(meet.notes || '');
                                            }}
                                            className="text-[10px] font-bold text-gray-900 hover:underline uppercase tracking-widest"
                                        >
                                            {meet.notes ? 'Edit Notes' : 'Add Notes'}
                                        </button>
                                    )}
                                </div>

                                {editingMeetingId === meet.id ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={tempNotes}
                                            onChange={(e) => setTempNotes(e.target.value)}
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-medium min-h-[100px]"
                                            placeholder="Type meeting summary or private notes here..."
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingMeetingId(null)}
                                                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleSaveNotes(meet.id)}
                                                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold shadow-md hover:bg-black transition-all active:scale-95 uppercase tracking-widest"
                                            >
                                                Save Notes
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={clsx(
                                        "text-sm leading-relaxed rounded-xl transition-colors",
                                        meet.notes ? "text-gray-600" : "text-gray-400 italic font-normal"
                                    )}>
                                        {meet.notes || 'No notes added for this meeting yet.'}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>


                {filteredMeetings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <Filter className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-medium">No {filterType} meetings found</p>
                        <p className="text-sm text-gray-500 mt-1">Adjust your filters or check back later</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetsView;
