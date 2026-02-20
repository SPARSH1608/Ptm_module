import React from 'react';
import { FileText, Eye, Clock } from 'lucide-react';

const StudentFormsView: React.FC = () => {
    // Dummy form submissions
    const forms = [
        { id: 1, student: 'Alice Johnson', formName: 'Pre-PTM Questionnaire', submittedAt: 'Mar 1, 2026 • 10:00 AM', status: 'Reviewed' },
        { id: 2, student: 'Bob Smith', formName: 'Pre-PTM Questionnaire', submittedAt: 'Feb 28, 2026 • 2:30 PM', status: 'Pending' },
        { id: 3, student: 'Charlie Brown', formName: 'Feedback Form', submittedAt: 'Feb 27, 2026 • 9:15 AM', status: 'Pending' },
        { id: 4, student: 'Diana Prince', formName: 'Pre-PTM Questionnaire', submittedAt: 'Feb 26, 2026 • 4:45 PM', status: 'Reviewed' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Student Forms</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Form Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Submission Date</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {forms.map((form) => (
                            <tr key={form.id} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center text-xs font-bold">
                                            {form.student.charAt(0)}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">{form.student}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded inline-block w-max border border-gray-100">
                                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                                        {form.formName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-gray-300" />
                                        {form.submittedAt}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${form.status === 'Reviewed'
                                        ? 'bg-success-50 text-success-700 border-success-100'
                                        : 'bg-warning-50 text-warning-700 border-warning-100'
                                        }`}>
                                        {form.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button className="text-gray-400 hover:text-primary-600 transition-colors p-1 hover:bg-primary-50 rounded-lg">
                                        <Eye className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentFormsView;
