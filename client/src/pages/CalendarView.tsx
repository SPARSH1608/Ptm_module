import React, { useState } from 'react';
import { Plus, Clock, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video } from 'lucide-react';
import { format, addDays, startOfWeek, addMonths, subMonths, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import AvailabilityCreationModal from '../components/AvailabilityCreationModal';
import ConfirmationModal from '../components/ConfirmationModal';

import api from '../services/api';

const CalendarView: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<number | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    interface Student {
        id: number;
        name: string;
    }

    interface Meeting {
        id: number;
        student?: Student;
        status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
        joinUrl?: string;
    }

    interface Course {
        id: number;
        name: string;
    }

    interface Batch {
        id: number;
        name: string;
        course: Course;
    }

    interface Availability {
        id: number;
        startAt: Date;
        endAt: Date;
        status: 'AVAILABLE' | 'UNAVAILABLE';
        slotDuration: number;
        batches: Batch[];
    }

    interface Slot {
        id: number;
        startAt: Date;
        endAt: Date;
        status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED';
        batches: Batch[];
        meeting?: Meeting | null;
        availabilityId: number;
        availability: Availability;
    }

    const fetchSlots = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);
            const startDate = format(startOfWeek(start), 'yyyy-MM-dd');
            const endDate = format(endOfWeek(end), 'yyyy-MM-dd');

            const response = await api.get(`/availability?startDate=${startDate}&endDate=${endDate}`);

            const fetchedSlots = response.data.map((slot: any) => ({
                ...slot,
                startAt: new Date(slot.startAt),
                endAt: new Date(slot.endAt),
                availability: {
                    ...slot.availability,
                    startAt: new Date(slot.availability.startAt),
                    endAt: new Date(slot.availability.endAt),
                }
            }));

            setSlots(fetchedSlots);
        } catch (error) {
            console.error('Failed to fetch slots:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentMonth]);

    React.useEffect(() => {
        fetchSlots();
    }, [fetchSlots]);

    const getSlotsForDate = (date: Date) => {
        return slots.filter(s => isSameDay(s.startAt, date));
    };

    const selectedSlots = getSlotsForDate(selectedDate);

    // Group selected slots by availability
    const availabilitiesForSelectedDate = Array.from(
        new Map(selectedSlots.map(s => [s.availabilityId, s.availability])).values()
    ).sort((a: any, b: any) => a.startAt.getTime() - b.startAt.getTime());

    interface AvailabilityData {
        startTime: string;
        endTime: string;
        duration: number;
        batchIds: number[];
    }

    const handleSaveAvailability = async (data: AvailabilityData) => {
        setIsSaving(true);
        try {
            const { startTime, endTime, duration, batchIds } = data;

            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);

            const startAt = new Date(selectedDate);
            startAt.setHours(startHour, startMinute, 0, 0);

            const endAt = new Date(selectedDate);
            endAt.setHours(endHour, endMinute, 0, 0);

            await api.post('/availability', {
                batchIds,
                startAt,
                endAt,
                slotDuration: duration
            });

            await fetchSlots();
            setIsModalOpen(false);

        } catch (error: any) {
            console.error('Failed to save availability:', error);
            const message = error.response?.data?.error || 'Failed to create availability. Please try again.';
            alert(message);
        }
        finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-screen bg-white overflow-hidden relative">
            {isSaving && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-gray-900">Creating Availability...</span>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <header className="flex items-center justify-between px-8 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h1>
                        <div className="flex items-center rounded-md border border-gray-200 bg-white shadow-sm">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="p-1.5 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors border-r border-gray-200"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentMonth(new Date())}
                                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans uppercase tracking-wider"
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="p-1.5 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-colors border-l border-gray-200"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                                <span>Booked</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                <span>Available</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-white relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {(() => {
                        const monthStart = startOfMonth(currentMonth);
                        const monthEnd = endOfMonth(monthStart);
                        const startDate = startOfWeek(monthStart);
                        const endDate = endOfWeek(monthEnd);
                        const dateFormat = "d";
                        const rows = [];
                        let daysHeader = [];
                        let day = startDate;
                        let formattedDate = "";

                        while (day <= endDate) {
                            for (let i = 0; i < 7; i++) {
                                formattedDate = format(day, dateFormat);
                                const cloneDay = day;
                                const isSelected = isSameDay(day, selectedDate);
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isToday = isSameDay(day, new Date());
                                const daySlots = getSlotsForDate(cloneDay);
                                const hasSlots = daySlots.length > 0;

                                daysHeader.push(
                                    <div
                                        key={day.toString()}
                                        onClick={() => setSelectedDate(cloneDay)}
                                        className={clsx(
                                            "min-h-[120px] relative p-2 transition-all cursor-pointer group border-b border-r border-gray-100 last:border-r-0",
                                            !isCurrentMonth && "bg-gray-50/30 text-gray-400",
                                            isSelected ? "bg-gray-50" : "hover:bg-gray-50/30"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={clsx(
                                                "text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                                                !isCurrentMonth && "text-gray-300",
                                                isCurrentMonth && "text-gray-700",
                                                isToday && "bg-gray-900 text-white font-bold shadow-sm",
                                                isSelected && !isToday && "text-gray-900 bg-gray-200"
                                            )}>
                                                {formattedDate}
                                            </span>

                                            {hasSlots && (
                                                <div className="flex gap-1 mt-1 pr-1">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-gray-900"></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-2 space-y-1">
                                            {daySlots.slice(0, 3).map((slot, idx) => {
                                                const isPast = slot.endAt < new Date();
                                                return (
                                                    <div key={idx} className={clsx(
                                                        "text-[10px] px-1.5 py-0.5 rounded truncate font-medium border transition-all",
                                                        slot.status === 'BOOKED'
                                                            ? (isPast ? "bg-gray-400 text-white border-gray-400 opacity-60" : "bg-gray-900 text-white border-gray-900")
                                                            : (isPast ? "bg-gray-50 text-gray-400 border-gray-100" : "bg-white text-gray-600 border-gray-200")
                                                    )}>
                                                        {format(slot.startAt, 'hh:mm a')}
                                                    </div>
                                                );
                                            })}
                                            {daySlots.length > 3 && (
                                                <div className="text-[9px] text-gray-400 pl-1 uppercase tracking-wider font-semibold">
                                                    +{daySlots.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                        {/* Simplified Slot Preview (Moved from above for context) */}
                                    </div>
                                );
                                day = addDays(day, 1);
                            }
                            rows.push(daysHeader);
                            daysHeader = [];
                        }
                        return rows;
                    })()}
                </div>
            </div>

            <div className="w-[380px] bg-white border-l border-gray-200 flex flex-col shadow-[0_0_40px_-10px_rgba(0,0,0,0.05)] z-20 transition-all duration-300">
                <div className="p-8 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-medium text-gray-900 font-display tracking-tight leading-none mb-1">
                                {format(selectedDate, 'EEEE')}
                            </h2>
                            <p className="text-gray-500 font-medium text-lg">{format(selectedDate, 'MMMM do')}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                            <CalendarIcon className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl text-sm font-bold shadow-lg shadow-gray-200 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Availability</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                        <span>Daily Availability</span>
                        <span>{availabilitiesForSelectedDate.length} Sessions</span>
                    </div>

                    {availabilitiesForSelectedDate.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                            <Clock className="w-6 h-6 mb-2 text-gray-300" />
                            <p className="text-sm font-medium text-gray-500">No availability set</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {availabilitiesForSelectedDate.map((availability) => {
                                    const isSelected = selectedAvailabilityId === availability.id;
                                    const availabilitySlots = selectedSlots.filter(s => s.availabilityId === availability.id);

                                    return (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={availability.id}
                                            className={clsx(
                                                "group bg-white rounded-2xl border transition-all overflow-hidden",
                                                availability.status === 'UNAVAILABLE' ? "bg-gray-50/50 grayscale" : "border-gray-200 shadow-sm hover:shadow-md",
                                                isSelected && "ring-2 ring-gray-900 border-gray-900 shadow-xl shadow-gray-100"
                                            )}
                                        >
                                            <div
                                                className="p-5 cursor-pointer"
                                                onClick={() => setSelectedAvailabilityId(isSelected ? null : availability.id)}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={clsx(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            availability.status === 'UNAVAILABLE' ? "bg-red-400" : "bg-emerald-400"
                                                        )} />
                                                        <span className={clsx(
                                                            "text-[10px] font-bold uppercase tracking-widest",
                                                            availability.status === 'UNAVAILABLE' ? "text-red-500" : "text-emerald-600"
                                                        )}>
                                                            {availability.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const nextStatus = availability.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
                                                                setConfirmModal({
                                                                    isOpen: true,
                                                                    title: nextStatus === 'UNAVAILABLE' ? 'Deactivate Session?' : 'Activate Session?',
                                                                    message: `Are you sure you want to mark this ${format(availability.startAt, 'hh:mm a')} session as ${nextStatus.toLowerCase()}?`,
                                                                    isDestructive: nextStatus === 'UNAVAILABLE',
                                                                    onConfirm: async () => {
                                                                        try {
                                                                            await api.patch(`/availability/status/${availability.id}`, { status: nextStatus });
                                                                            await fetchSlots();
                                                                        } catch (err: any) {
                                                                            const message = err.response?.data?.error || 'Failed to update status';
                                                                            alert(message);
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            className="text-[10px] font-bold text-gray-400 hover:text-gray-900 uppercase tracking-tighter"
                                                        >
                                                            Toggle Session
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="text-xl font-medium font-display tracking-wider text-gray-900">
                                                    {format(availability.startAt, 'hh:mm a')} - {format(availability.endAt, 'hh:mm a')}
                                                </div>
                                                <div className="text-sm text-gray-500 mt-1 font-medium italic">
                                                    {availability.slotDuration} min slots • {availabilitySlots.length} slots
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {selectedAvailabilityId && (
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="w-[450px] bg-white border-l border-gray-200 flex flex-col shadow-[0_0_50px_-15px_rgba(0,0,0,0.1)] z-10"
                    >
                        {(() => {
                            const availability = availabilitiesForSelectedDate.find(a => a.id === selectedAvailabilityId);
                            if (!availability) return null;
                            const availabilitySlots = selectedSlots.filter(s => s.availabilityId === selectedAvailabilityId);

                            return (
                                <>
                                    <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={clsx(
                                                    "w-2 h-2 rounded-full",
                                                    availability.status === 'UNAVAILABLE' ? "bg-red-400" : "bg-emerald-400"
                                                )} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                    Slot Breakdown
                                                </span>
                                            </div>
                                            <h2 className="text-2xl font-medium text-gray-900 font-display tracking-tight">
                                                {format(availability.startAt, 'hh:mm a')} - {format(availability.endAt, 'hh:mm a')}
                                            </h2>
                                        </div>
                                        <button
                                            onClick={() => setSelectedAvailabilityId(null)}
                                            className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"
                                        >
                                            <Plus className="w-5 h-5 rotate-45" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-gray-50/30">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                                            <span>Individual Slots</span>
                                            <span>{availabilitySlots.length} Total</span>
                                        </div>

                                        {availabilitySlots.map((slot) => {
                                            const isSlotPast = slot.endAt < new Date();
                                            return (
                                                <motion.div
                                                    key={slot.id}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={clsx(
                                                        "bg-white p-5 rounded-2xl border transition-all flex items-center justify-between group/slot",
                                                        slot.status === 'CANCELLED' ? "border-gray-100 bg-gray-50/50 grayscale" : "border-gray-200 shadow-sm hover:shadow-md",
                                                        isSlotPast && "opacity-40"
                                                    )}
                                                >
                                                    <div>
                                                        <div className="text-base font-bold text-gray-900 mb-1">
                                                            {format(slot.startAt, 'hh:mm a')} - {format(slot.endAt, 'hh:mm a')}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={clsx(
                                                                "w-1.5 h-1.5 rounded-full",
                                                                slot.status === 'BOOKED' ? "bg-gray-900" : (slot.status === 'CANCELLED' ? "bg-red-400" : "bg-emerald-400")
                                                            )} />
                                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                                                {slot.status}
                                                                {slot.meeting?.student && ` • ${slot.meeting.student.name}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {slot.status !== 'BOOKED' && !isSlotPast && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const nextStatus = slot.status === 'AVAILABLE' ? 'CANCELLED' : 'AVAILABLE';
                                                                    setConfirmModal({
                                                                        isOpen: true,
                                                                        title: nextStatus === 'CANCELLED' ? 'Cancel Slot?' : 'Restore Slot?',
                                                                        message: `Are you sure you want to ${nextStatus === 'CANCELLED' ? 'cancel' : 'restore'} the ${format(slot.startAt, 'hh:mm a')} slot?`,
                                                                        isDestructive: nextStatus === 'CANCELLED',
                                                                        onConfirm: async () => {
                                                                            try {
                                                                                await api.patch(`/availability/slot/status/${slot.id}`, { status: nextStatus });
                                                                                await fetchSlots();
                                                                            } catch (err: any) {
                                                                                const message = err.response?.data?.error || 'Failed to update slot';
                                                                                alert(message);
                                                                            }
                                                                        }
                                                                    });
                                                                }}
                                                                className={clsx(
                                                                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                                                    slot.status === 'AVAILABLE'
                                                                        ? "text-red-500 bg-red-50 hover:bg-red-100"
                                                                        : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                                                )}
                                                            >
                                                                {slot.status === 'AVAILABLE' ? 'Cancel' : 'Restore'}
                                                            </button>
                                                        )}
                                                        {slot.status === 'BOOKED' && (
                                                            slot.meeting?.joinUrl ? (
                                                                <a
                                                                    href={slot.meeting.joinUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all"
                                                                >
                                                                    <Video className="w-3.5 h-3.5" />
                                                                    Join
                                                                </a>
                                                            ) : (
                                                                <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                                                                    <Clock className="w-4 h-4" />
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

            <AvailabilityCreationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedDate={selectedDate}
                onSave={handleSaveAvailability}
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
            />
        </div>
    );
};

export default CalendarView;
