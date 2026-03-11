import React, { useState, useEffect } from 'react';
import { FileText, Eye, Clock, X } from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';

interface FormAnswer {
    id: number;
    answerText: string | null;
    formQuestion: {
        id: number;
        question: { title: string; type: string };
    };
}

interface FormSubmission {
    id: number;
    submittedAt: string;
    form: { name: string };
    answers: FormAnswer[];
}

interface MeetingRow {
    id: number;
    studentName: string;
    rollNumber: string;
    batch: string;
    course: string;
    dateTime: string;
    status: string;
}

const STATUS_STYLES: Record<string, string> = {
    SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-100',
    COMPLETED: 'bg-green-50 text-green-700 border-green-100',
    CANCELLED: 'bg-gray-50 text-gray-500 border-gray-100',
};

const StudentFormsView: React.FC = () => {
    const [meetings, setMeetings] = useState<MeetingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeeting, setSelectedMeeting] = useState<MeetingRow | null>(null);
    const [submission, setSubmission] = useState<FormSubmission | null>(null);
    const [submissionLoading, setSubmissionLoading] = useState(false);

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const res = await api.get('/meetings/');
                const rows: MeetingRow[] = (res.data as any[]).map(m => ({
                    id: m.id,
                    studentName: m.student?.name || '—',
                    rollNumber: m.student?.rollNumber || '—',
                    batch: m.student?.batch?.name || '—',
                    course: m.student?.batch?.course?.name || '—',
                    dateTime: format(new Date(m.slot.startAt), 'MMM d, yyyy • h:mm a'),
                    status: m.status,
                }));
                setMeetings(rows);
            } catch (err) {
                console.error('Failed to fetch meetings:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMeetings();
    }, []);

    const handleView = async (meeting: MeetingRow) => {
        setSelectedMeeting(meeting);
        setSubmission(null);
        setSubmissionLoading(true);
        try {
            const res = await api.get(`/meetings/${meeting.id}/responses`);
            setSubmission(res.data);
        } catch (err) {
            console.error('Failed to fetch form responses:', err);
        } finally {
            setSubmissionLoading(false);
        }
    };

    return (
        <div className="px-8 py-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Student Forms</h1>

            {loading ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                {['Student', 'Batch / Course', 'Meeting Time', 'Status', ''].map(h => (
                                    <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {[1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100" />
                                            <div className="space-y-1.5">
                                                <div className="h-3 bg-gray-100 rounded w-28" />
                                                <div className="h-2.5 bg-gray-100 rounded w-16" />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="h-3 bg-gray-100 rounded w-32" /></td>
                                    <td className="px-6 py-4"><div className="h-3 bg-gray-100 rounded w-36" /></td>
                                    <td className="px-6 py-4"><div className="h-5 bg-gray-100 rounded-full w-20" /></td>
                                    <td className="px-6 py-4 text-right"><div className="h-5 w-5 bg-gray-100 rounded ml-auto" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Batch / Course</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Meeting Time</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Form</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {meetings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400 italic">
                                        No meetings found.
                                    </td>
                                </tr>
                            ) : meetings.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center text-xs font-bold">
                                                {row.studentName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{row.studentName}</div>
                                                <div className="text-xs text-gray-400">ID: {row.rollNumber}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {row.batch}
                                        <span className="mx-1.5 text-gray-300">·</span>
                                        <span className="text-gray-400">{row.course}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-gray-300" />
                                            {row.dateTime}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[row.status] ?? STATUS_STYLES.CANCELLED}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleView(row)}
                                            className="text-gray-400 hover:text-primary-600 transition-colors p-1 hover:bg-primary-50 rounded-lg"
                                            title="View form responses"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Side panel — form responses */}
            {selectedMeeting && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setSelectedMeeting(null)}
                    />
                    <div className="relative w-full max-w-4xl bg-white shadow-2xl flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">{selectedMeeting.studentName}</h2>
                                <p className="text-xs text-gray-500 mt-0.5">{selectedMeeting.dateTime}</p>
                            </div>
                            <button
                                onClick={() => setSelectedMeeting(null)}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6 flex-1 overflow-y-auto">
                            {submissionLoading ? (
                                <div className="space-y-4 animate-pulse">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                                            <div className="h-2.5 bg-gray-200 rounded w-1/3" />
                                            <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                                        </div>
                                    ))}
                                </div>
                            ) : !submission || !submission.answers?.length ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <FileText className="w-10 h-10 text-gray-200 mb-3" />
                                    <p className="text-sm font-medium text-gray-500">No form responses</p>
                                    <p className="text-xs text-gray-400 mt-1">Student hasn't submitted a form for this meeting.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                                        <FileText className="w-3.5 h-3.5" />
                                        {submission.form?.name || 'Form Responses'}
                                    </div>
                                    {submission.answers.map((ans, i) => (
                                        <div key={ans.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                Q{i + 1}. {ans.formQuestion.question.title}
                                            </p>
                                            <p className="text-sm text-gray-800 font-medium">
                                                {ans.answerText ?? <span className="italic text-gray-400">No answer</span>}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentFormsView;
