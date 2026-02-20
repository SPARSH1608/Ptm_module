import React, { useState } from 'react';
import { X, Clock, Users, Check, Search, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { format } from 'date-fns';

interface AvailabilityCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    onSave: (data: any) => void;
}

import api from '../services/api';

interface Batch {
    id: number;
    name: string;
    course: {
        id: number;
        name: string;
    };
}

interface CourseGroup {
    id: number;
    name: string;
    batches: Batch[];
}

const DURATIONS = [15, 30, 45, 60];

const AvailabilityCreationModal: React.FC<AvailabilityCreationModalProps> = ({ isOpen, onClose, selectedDate, onSave }) => {
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [duration, setDuration] = useState(30);

    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [selectedBatches, setSelectedBatches] = useState<{ [courseId: string]: string[] }>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCourses, setExpandedCourses] = useState<string[]>([]);

    const [courses, setCourses] = useState<CourseGroup[]>([]);

    React.useEffect(() => {
        const fetchBatches = async () => {
            try {
                const response = await api.get('/teacher/batches');
                const batches: Batch[] = response.data; 

                const grouped: { [key: number]: CourseGroup } = {};
                batches.forEach(b => {
                    if (!grouped[b.course.id]) {
                        grouped[b.course.id] = {
                            id: b.course.id,
                            name: b.course.name,
                            batches: []
                        };
                    }
                    grouped[b.course.id].batches.push(b);
                });

                setCourses(Object.values(grouped));
            } catch (error) {
                console.error('Failed to fetch batches:', error);
            }
        };

        if (isOpen) {
            fetchBatches();
        }
    }, [isOpen]);

    const filteredCourses = courses.filter(course => {
        const query = searchQuery.toLowerCase();
        return course.name.toLowerCase().includes(query) ||
            course.batches.some(b => b.name.toLowerCase().includes(query));
    });

    const toggleCourseExpansion = (courseId: string) => {
        setExpandedCourses(prev =>
            prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
        );
    };

    const toggleCourse = (courseId: string) => {
        if (selectedCourses.includes(courseId)) {
            setSelectedCourses(prev => prev.filter(id => id !== courseId));
            const newBatches = { ...selectedBatches };
            delete newBatches[courseId];
            setSelectedBatches(newBatches);
        } else {
            setSelectedCourses(prev => [...prev, courseId]);
            const course = courses.find(c => c.id.toString() === courseId);
            if (course) {
                setSelectedBatches(prev => ({ ...prev, [courseId]: course.batches.map(b => b.id.toString()) }));
            }
        }
    };

    const toggleBatch = (courseId: string, batchId: string) => {
        const currentBatches = selectedBatches[courseId] || [];
        if (currentBatches.includes(batchId)) {
            setSelectedBatches(prev => ({
                ...prev,
                [courseId]: currentBatches.filter(b => b !== batchId)
            }));
        } else {
            setSelectedBatches(prev => ({
                ...prev,
                [courseId]: [...currentBatches, batchId]
            }));
        }
    };

    const handleSave = () => {
        const allBatchIds: number[] = [];
        Object.values(selectedBatches).forEach(ids => {
            ids.forEach(id => allBatchIds.push(parseInt(id)));
        });

        onSave({
            startTime,
            endTime,
            duration,
            batchIds: allBatchIds 
        });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-white/50 backdrop-blur-xl z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 font-display tracking-tight">Add Availability</h2>
                                <p className="text-sm text-gray-500 mt-1">{format(selectedDate, 'EEEE, MMMM do, yyyy')}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">

                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-gray-100 rounded-lg">
                                        <Clock className="w-4 h-4 text-gray-900" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Time Range</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide group-focus-within:text-gray-900 transition-colors">Start Time</label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full p-4 bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-200 rounded-xl text-base font-semibold focus:outline-none focus:bg-white focus:border-gray-900 transition-all cursor-pointer text-gray-900 shadow-sm"
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide group-focus-within:text-gray-900 transition-colors">End Time</label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full p-4 bg-gray-50 hover:bg-white border-2 border-transparent hover:border-gray-200 rounded-xl text-base font-semibold focus:outline-none focus:bg-white focus:border-gray-900 transition-all cursor-pointer text-gray-900 shadow-sm"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-gray-100 rounded-lg">
                                        <Clock className="w-4 h-4 text-gray-900" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Duration</h3>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {DURATIONS.map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setDuration(d)}
                                            className={clsx(
                                                "py-3 px-2 rounded-xl text-sm font-semibold transition-all border-2",
                                                duration === d
                                                    ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200 scale-105"
                                                    : "bg-white text-gray-600 border-transparent bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-sm"
                                            )}
                                        >
                                            {d}m
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="flex flex-col h-[400px]"> 
                                <div className="flex items-center gap-2 mb-4 shrink-0">
                                    <div className="p-1.5 bg-gray-100 rounded-lg">
                                        <Users className="w-4 h-4 text-gray-900" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Audience</h3>
                                </div>

                                <div className="relative mb-4 shrink-0">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search courses or batches..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-gray-900 rounded-xl text-sm font-medium transition-all outline-none"
                                    />
                                </div>

                                <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                    {filteredCourses.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 text-sm">
                                            No courses found matching "{searchQuery}"
                                        </div>
                                    ) : (
                                        filteredCourses.map(course => {
                                            const courseIdStr = course.id.toString();
                                            const isCourseSelected = selectedCourses.includes(courseIdStr);
                                            const isExpanded = expandedCourses.includes(courseIdStr) || searchQuery.length > 0;
                                            const selectedBatchCount = selectedBatches[courseIdStr]?.length || 0;
                                            const totalBatches = course.batches.length;
                                            const isIndeterminate = selectedBatchCount > 0 && selectedBatchCount < totalBatches;

                                            return (
                                                <div key={course.id} className={clsx(
                                                    "group rounded-xl transition-all duration-200 overflow-hidden border",
                                                    isCourseSelected && !isIndeterminate
                                                        ? "bg-white border-gray-900 shadow-sm"
                                                        : "bg-white border-gray-200 hover:border-gray-300"
                                                )}>
                                                    <div className="p-3 flex items-center gap-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleCourseExpansion(courseIdStr);
                                                            }}
                                                            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                                        >
                                                            <ChevronRight className={clsx(
                                                                "w-4 h-4 text-gray-400 transition-transform duration-200",
                                                                isExpanded && "rotate-90"
                                                            )} />
                                                        </button>

                                                        <div
                                                            onClick={() => toggleCourse(courseIdStr)}
                                                            className="flex-1 flex items-center justify-between cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={clsx(
                                                                    "w-5 h-5 rounded flex items-center justify-center transition-all duration-200 border",
                                                                    isCourseSelected
                                                                        ? "bg-gray-900 border-gray-900 text-white"
                                                                        : isIndeterminate
                                                                            ? "bg-gray-900 border-gray-900 text-white"
                                                                            : "bg-white border-gray-300 group-hover:border-gray-400"
                                                                )}>
                                                                    {isCourseSelected && !isIndeterminate && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                                    {isIndeterminate && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
                                                                </div>
                                                                <div>
                                                                    <span className={clsx(
                                                                        "font-semibold text-sm block",
                                                                        isCourseSelected || isIndeterminate ? "text-gray-900" : "text-gray-700"
                                                                    )}>{course.name}</span>
                                                                    <span className="text-xs text-gray-500 font-medium">
                                                                        {selectedBatchCount}/{totalBatches} batches selected
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden bg-gray-50/50 border-t border-gray-100"
                                                            >
                                                                <div className="p-3 pl-12 grid grid-cols-2 gap-2">
                                                                    {course.batches.map(batch => {
                                                                        const batchIdStr = batch.id.toString();
                                                                        const isBatchSelected = selectedBatches[courseIdStr]?.includes(batchIdStr);
                                                                        const isMatch = searchQuery && batch.name.toLowerCase().includes(searchQuery.toLowerCase());

                                                                        return (
                                                                            <button
                                                                                key={batch.id}
                                                                                onClick={() => toggleBatch(courseIdStr, batchIdStr)}
                                                                                className={clsx(
                                                                                    "px-3 py-2 rounded-lg text-xs font-medium border text-left flex items-center gap-2 transition-all",
                                                                                    isBatchSelected
                                                                                        ? "bg-white border-gray-900 text-gray-900 shadow-sm"
                                                                                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700",
                                                                                    isMatch && !isBatchSelected && "ring-2 ring-gray-900/10 border-gray-400"
                                                                                )}
                                                                            >
                                                                                <div className={clsx(
                                                                                    "w-3 h-3 rounded-sm border flex items-center justify-center transition-colors",
                                                                                    isBatchSelected ? "bg-gray-900 border-gray-900" : "border-gray-300"
                                                                                )}>
                                                                                    {isBatchSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                                                                                </div>
                                                                                <span className="truncate">{batch.name}</span>
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </section>

                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white z-20">
                            <button
                                onClick={handleSave}
                                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl font-bold text-sm tracking-wide shadow-xl shadow-gray-200 transition-all hover:-translate-y-0.5"
                            >
                                Create Availability
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AvailabilityCreationModal;
