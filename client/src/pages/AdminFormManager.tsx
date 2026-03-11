import React, { useState, useEffect } from 'react';
import {
    Plus,
    FileText,
    ToggleLeft,
    ToggleRight,
    ChevronRight,
    Search,
    Trash2,
    Library,
    Loader2,
    X
} from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { format } from 'date-fns';

interface Question {
    id: number;
    title: string;
    type: 'TEXT' | 'DROPDOWN';
    options: string[]; // Options should always be an array
}

interface FormQuestion {
    id: number;
    questionId: number;
    sortOrder: number;
    question: Question;
}

interface Form {
    id: number;
    name: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    _count: { questions: number };
}

const AdminFormManager: React.FC = () => {
    const [forms, setForms] = useState<Form[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
    const [selectedForm, setSelectedForm] = useState<(Form & { questions: FormQuestion[] }) | null>(null);
    const [isCreatingForm, setIsCreatingForm] = useState(false);
    const [newFormName, setNewFormName] = useState('');
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [questionForm, setQuestionForm] = useState<Partial<Question>>({
        title: '',
        type: 'TEXT',
        options: []
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [formSearchQuery, setFormSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Draggable states
    const [draggedQuestionId, setDraggedQuestionId] = useState<number | null>(null);
    const [isDraggingOverForm, setIsDraggingOverForm] = useState(false);
    const [isDraggingOverLibrary, setIsDraggingOverLibrary] = useState(false);

    useEffect(() => {
        fetchForms();
        fetchQuestions();
    }, []);

    useEffect(() => {
        if (selectedFormId) {
            fetchFormDetails(selectedFormId);
        }
    }, [selectedFormId]);

    const fetchForms = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/admin/forms');
            setForms(response.data);
        } catch (error) {
            console.error('Failed to fetch forms:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchQuestions = async () => {
        try {
            const response = await api.get('/admin/questions');
            setQuestions(response.data);
        } catch (error) {
            console.error('Failed to fetch questions library:', error);
        }
    };

    const fetchFormDetails = async (id: number) => {
        setIsLoadingDetails(true);
        try {
            const response = await api.get(`/admin/forms/${id}`);
            setSelectedForm(response.data);
        } catch (error) {
            console.error('Failed to fetch form details:', error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleCreateForm = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/admin/forms', { name: newFormName });
            setForms([response.data, ...forms]);
            setNewFormName('');
            setIsCreatingForm(false);
            setSelectedFormId(response.data.id);
        } catch (error) {
            console.error('Failed to create form:', error);
        }
    };

    const toggleStatus = async (form: Form) => {
        const nextStatus = form.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            await api.patch(`/admin/forms/status/${form.id}`, { status: nextStatus });
            fetchForms();
            if (selectedFormId === form.id) {
                fetchFormDetails(form.id);
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    const addFromLibrary = async (questionId: number) => {
        if (!selectedFormId) return;
        try {
            await api.post(`/admin/forms/${selectedFormId}/questions`, { questionId });
            fetchFormDetails(selectedFormId);
        } catch (error) {
            console.error('Failed to add question:', error);
        }
    };

    const handleQuestionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingQuestion) {
                await api.put(`/admin/questions/${editingQuestion.id}`, questionForm);
            } else {
                const response = await api.post('/admin/questions', questionForm);
                if (selectedFormId) {
                    await api.post(`/admin/forms/${selectedFormId}/questions`, { questionId: response.data.id });
                }
            }
            fetchQuestions();
            if (selectedFormId) fetchFormDetails(selectedFormId);
            setIsQuestionModalOpen(false);
            setEditingQuestion(null);
            setQuestionForm({ title: '', type: 'TEXT', options: [] });
        } catch (error) {
            console.error('Failed to save question:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const addOption = () => {
        setQuestionForm(prev => ({
            ...prev,
            options: [...(prev.options || []), '']
        }));
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...(questionForm.options || [])];
        newOptions[index] = value;
        setQuestionForm({ ...questionForm, options: newOptions });
    };

    const removeOption = (index: number) => {
        const newOptions = (questionForm.options || []).filter((_, i) => i !== index);
        setQuestionForm({ ...questionForm, options: newOptions });
    };

    const deleteLibraryQuestion = async (id: number) => {
        if (!confirm('Are you sure you want to move this question to trash?')) return;
        try {
            await api.delete(`/admin/questions/${id}`);
            fetchQuestions();
            if (selectedFormId) fetchFormDetails(selectedFormId);
        } catch (error) {
            console.error('Failed to delete question:', error);
        }
    };

    const removeQuestion = async (qId: number) => {
        if (!selectedFormId) return;
        try {
            await api.delete(`/admin/forms/${selectedFormId}/questions/${qId}`);
            fetchFormDetails(selectedFormId);
            fetchForms(); // Update question counts
        } catch (error) {
            console.error('Failed to remove question:', error);
        }
    };

    const handleReorder = async (newQuestions: FormQuestion[]) => {
        if (!selectedForm) return;

        // Update local state immediately for snappy feel
        setSelectedForm({ ...selectedForm, questions: newQuestions });

        try {
            const orders = newQuestions.map((fq, index) => ({
                questionId: fq.questionId,
                sortOrder: index
            }));
            await api.patch(`/admin/forms/${selectedFormId}/questions/order`, { orders });
        } catch (error) {
            console.error('Failed to update question order:', error);
            // Re-fetch to ensure sync if it failed
            if (selectedFormId) fetchFormDetails(selectedFormId);
        }
    };

    // DnD Handlers
    const onDragStart = (e: React.DragEvent, questionId: number) => {
        setDraggedQuestionId(questionId);
        e.dataTransfer.setData('questionId', questionId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent, type: 'FORM' | 'LIBRARY') => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (type === 'FORM') setIsDraggingOverForm(true);
        if (type === 'LIBRARY') setIsDraggingOverLibrary(true);
    };

    const onDragLeave = (type: 'FORM' | 'LIBRARY') => {
        if (type === 'FORM') setIsDraggingOverForm(false);
        if (type === 'LIBRARY') setIsDraggingOverLibrary(false);
    };

    const onDrop = async (e: React.DragEvent, target: 'FORM' | 'LIBRARY') => {
        e.preventDefault();
        setIsDraggingOverForm(false);
        setIsDraggingOverLibrary(false);

        const qId = parseInt(e.dataTransfer.getData('questionId') || draggedQuestionId?.toString() || '');
        if (!qId) return;

        if (target === 'FORM') {
            // Check if already in form
            if (selectedForm?.questions.some(fq => fq.questionId === qId)) return;
            await addFromLibrary(qId);
        } else if (target === 'LIBRARY') {
            // Check if in form to remove
            if (selectedForm?.questions.some(fq => fq.questionId === qId)) {
                await removeQuestion(qId);
            }
        }

        setDraggedQuestionId(null);
    };

    return (
        <div className="flex h-full bg-white overflow-hidden">
            {/* Left Sidebar: Form List */}
            <div className="w-80 border-r border-gray-100 flex flex-col bg-[#fafafa]">
                <div className="p-8 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-medium text-gray-900 font-display">Forms</h2>
                        <button
                            onClick={() => setIsCreatingForm(true)}
                            className="p-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search forms..."
                            value={formSearchQuery}
                            onChange={(e) => setFormSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar relative">
                    {isLoading ? (
                        <div className="space-y-2 p-1 animate-pulse">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="p-4 rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                                        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        forms
                            .filter(f => f.name.toLowerCase().includes(formSearchQuery.toLowerCase()))
                            .map(form => (
                                <button
                                    key={form.id}
                                    onClick={() => setSelectedFormId(form.id)}
                                    className={clsx(
                                        "w-full p-4 rounded-2xl flex items-center justify-between transition-all group",
                                        selectedFormId === form.id
                                            ? "bg-white shadow-xl shadow-gray-200/50 border border-gray-100 ring-1 ring-gray-900/5"
                                            : "hover:bg-gray-100/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "p-2.5 rounded-xl transition-colors",
                                            form.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                                        )}>
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[15px] font-medium text-gray-900 mb-0.5">{form.name}</div>
                                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                                {form._count?.questions || 0} questions
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className={clsx(
                                        "w-5 h-5 transition-all text-gray-300",
                                        selectedFormId === form.id ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                                    )} />
                                </button>
                            ))
                    )}
                </div>
            </div>

            {/* Main Content: Form Editor */}
            <div className="flex-1 flex flex-col bg-white border-r border-gray-100 overflow-hidden relative">
                {isLoadingDetails && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-20 p-8 space-y-4 animate-pulse">
                        <div className="h-4 bg-gray-100 rounded w-1/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="mt-6 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-14 bg-gray-100 rounded-xl w-full" />
                            ))}
                        </div>
                    </div>
                )}
                {selectedForm ? (
                    <>
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        selectedForm.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                                    )}>
                                        {selectedForm.status}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">•</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Created {format(new Date(selectedForm.createdAt), 'MMM dd, yyyy')}
                                    </span>
                                </div>
                                <h1 className="text-3xl font-medium text-gray-900 font-display tracking-tight">
                                    {selectedForm.name}
                                </h1>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => toggleStatus(selectedForm)}
                                    className={clsx(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95",
                                        selectedForm.status === 'ACTIVE'
                                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                            : "bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200"
                                    )}
                                >
                                    {selectedForm.status === 'ACTIVE' ? (
                                        <>
                                            <ToggleRight className="w-5 h-5" />
                                            Deactivate
                                        </>
                                    ) : (
                                        <>
                                            <ToggleLeft className="w-5 h-5" />
                                            Activate
                                        </>
                                    )}
                                </button>
                                <button className="p-2.5 hover:bg-gray-50 text-gray-400 rounded-xl transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div
                            className={clsx(
                                "flex-1 overflow-y-auto p-12 transition-all duration-300",
                                isDraggingOverForm ? "bg-gray-100/80 scale-[0.99] rounded-[40px] shadow-inner" : "bg-[#fafafa]"
                            )}
                            onDragOver={(e) => onDragOver(e, 'FORM')}
                            onDragLeave={() => onDragLeave('FORM')}
                            onDrop={(e) => onDrop(e, 'FORM')}
                        >
                            {isDraggingOverForm && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-x-12 top-12 bottom-12 border-4 border-dashed border-gray-300 rounded-[32px] flex items-center justify-center pointer-events-none z-10"
                                >
                                    <div className="text-center bg-white p-6 rounded-2xl shadow-xl">
                                        <Plus className="w-8 h-8 text-gray-900 mx-auto mb-2 animate-bounce" />
                                        <p className="font-bold text-gray-900">Drop to Add Question</p>
                                    </div>
                                </motion.div>
                            )}
                            <div className="max-w-2xl mx-auto relative z-0">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Questions</h3>
                                </div>

                                <div className="space-y-6">
                                    <Reorder.Group
                                        axis="y"
                                        values={selectedForm.questions}
                                        onReorder={handleReorder}
                                        className="space-y-6"
                                    >
                                        {selectedForm.questions.map((fq, index) => (
                                            <Reorder.Item
                                                key={fq.id}
                                                value={fq}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white p-8 rounded-[24px] border border-gray-100 shadow-sm group relative cursor-grab active:cursor-grabbing hover:border-gray-900/10 hover:shadow-lg transition-all"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <span className="text-[11px] font-bold text-gray-300 w-5">0{index + 1}</span>
                                                            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md text-[9px] font-bold uppercase tracking-widest border border-gray-100">
                                                                {fq.question.type}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-[17px] font-medium text-gray-900 mb-4">
                                                            {fq.question.title}
                                                        </h4>

                                                        {fq.question.type === 'DROPDOWN' && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {fq.question.options?.map((opt, i) => (
                                                                    <span key={i} className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium border border-gray-100">
                                                                        {opt}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingQuestion(fq.question);
                                                                setQuestionForm(fq.question);
                                                                setIsQuestionModalOpen(true);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeQuestion(fq.questionId);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>

                                    <button
                                        onClick={() => {
                                            setEditingQuestion(null);
                                            setQuestionForm({ title: '', type: 'TEXT', options: [] });
                                            setIsQuestionModalOpen(true);
                                        }}
                                        className="w-full py-12 border-2 border-dashed border-gray-200 rounded-[24px] flex flex-col items-center justify-center text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-all group active:scale-[0.99] bg-white/50"
                                    >
                                        <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 group-hover:bg-gray-900 group-hover:text-white transition-all">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold text-sm">Create new question</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#fafafa]">
                        <div className="h-20 w-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-8 text-gray-400">
                            <FileText className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-medium text-gray-900 font-display tracking-tight mb-2">
                            Select a form to manage
                        </h2>
                        <p className="text-gray-500 max-w-xs text-[15px]">
                            Choose a form from the sidebar to edit questions or change its active status.
                        </p>
                    </div>
                )}
            </div>

            {/* Right Panel: Question Library */}
            <div className="w-96 border-l border-gray-100 flex flex-col bg-[#fafafa] relative">
                <div className="p-8 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Library className="w-5 h-5 text-gray-400" />
                            <h2 className="text-xl font-medium text-gray-900 font-display">Library</h2>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-medium"
                        />
                    </div>
                </div>

                <div
                    className={clsx(
                        "flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar transition-all duration-300 relative",
                        isDraggingOverLibrary ? "bg-red-50/50" : "bg-[#fafafa]"
                    )}
                    onDragOver={(e) => onDragOver(e, 'LIBRARY')}
                    onDragLeave={() => onDragLeave('LIBRARY')}
                    onDrop={(e) => onDrop(e, 'LIBRARY')}
                >
                    {isDraggingOverLibrary && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-x-6 bottom-12 h-32 border-4 border-dashed border-red-200 rounded-[24px] flex flex-col items-center justify-center pointer-events-none z-10 bg-white/80 backdrop-blur-sm shadow-xl"
                        >
                            <Trash2 className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
                            <p className="text-sm font-bold text-red-600">Drop to Remove from Form</p>
                        </motion.div>
                    )}
                    {questions
                        .filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(q => (
                            <div
                                key={q.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, q.id)}
                                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing"
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1">
                                        <span className="px-2 py-0.5 bg-gray-50 text-[9px] font-extrabold uppercase tracking-widest text-gray-400 rounded-md border border-gray-100 mb-2 inline-block">
                                            {q.type}
                                        </span>
                                        <div className="font-medium text-gray-900 text-sm leading-relaxed">{q.title}</div>
                                    </div>
                                    <button
                                        onClick={() => addFromLibrary(q.id)}
                                        disabled={selectedForm?.questions.some(fq => fq.questionId === q.id)}
                                        className={clsx(
                                            "shrink-0 p-2 rounded-xl transition-all active:scale-95",
                                            selectedForm?.questions.some(fq => fq.questionId === q.id)
                                                ? "bg-emerald-50 text-emerald-600 opacity-50 cursor-not-allowed"
                                                : "bg-gray-50 text-gray-900 hover:bg-gray-900 hover:text-white"
                                        )}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setEditingQuestion(q);
                                            setQuestionForm(q);
                                            setIsQuestionModalOpen(true);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => deleteLibraryQuestion(q.id)}
                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    {questions.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <Search className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium text-gray-400">No questions found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Question Create/Edit Modal */}
            <AnimatePresence>
                {isQuestionModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsQuestionModalOpen(false)}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-xl bg-white rounded-[32px] overflow-hidden shadow-2xl"
                        >
                            <form onSubmit={handleQuestionSubmit} className="flex flex-col">
                                <div className="p-10 border-b border-gray-100">
                                    <h3 className="text-2xl font-medium text-gray-900 font-display tracking-tight mb-8">
                                        {editingQuestion ? 'Edit Question' : 'Create New Question'}
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-1">Title</label>
                                            <input
                                                type="text"
                                                value={questionForm.title}
                                                onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })}
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-medium"
                                                placeholder="Enter question title..."
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-1">Type</label>
                                            <div className="flex gap-2">
                                                {['TEXT', 'DROPDOWN'].map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setQuestionForm({ ...questionForm, type: t as any })}
                                                        className={clsx(
                                                            "flex-1 py-3 px-4 rounded-xl text-sm font-bold border transition-all",
                                                            questionForm.type === t
                                                                ? "bg-gray-900 text-white border-gray-900"
                                                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                                                        )}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {questionForm.type === 'DROPDOWN' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between ml-1">
                                                    <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Options</label>
                                                    <button
                                                        type="button"
                                                        onClick={addOption}
                                                        className="text-[11px] font-bold text-gray-900 hover:text-black uppercase tracking-widest flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Add Option
                                                    </button>
                                                </div>
                                                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {questionForm.options?.map((option, index) => (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="flex gap-2"
                                                        >
                                                            <input
                                                                type="text"
                                                                value={option}
                                                                onChange={(e) => updateOption(index, e.target.value)}
                                                                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-medium"
                                                                placeholder={`Option ${index + 1}`}
                                                                required
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeOption(index)}
                                                                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </motion.div>
                                                    ))}
                                                    {(!questionForm.options || questionForm.options.length === 0) && (
                                                        <div className="py-8 border-2 border-dashed border-gray-100 rounded-2xl text-center">
                                                            <p className="text-xs text-gray-400 font-medium">No options added yet</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-8 bg-gray-50 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsQuestionModalOpen(false)}
                                        className="flex-1 py-4 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black shadow-xl shadow-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {editingQuestion ? 'Save Changes' : 'Add to Library & Form'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Form Dialog */}
            <AnimatePresence>
                {isCreatingForm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreatingForm(false)}
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[32px] p-10 shadow-2xl"
                        >
                            <h3 className="text-2xl font-medium text-gray-900 font-display tracking-tight mb-8">Create New Form</h3>
                            <form onSubmit={handleCreateForm} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-1">Form Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Exit Feedback Form"
                                        value={newFormName}
                                        onChange={(e) => setNewFormName(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-medium"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingForm(false)}
                                        className="flex-1 py-4 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black shadow-xl shadow-gray-200 transition-all active:scale-95"
                                    >
                                        Create Form
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default AdminFormManager;
