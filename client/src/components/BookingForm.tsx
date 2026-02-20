import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import api from '../services/api';

interface Question {
    id: number;
    title: string;
    type: 'TEXT' | 'DROPDOWN';
    options?: string[];
}

interface FormQuestion {
    id: number;
    question: Question;
}

interface BookingFormProps {
    onComplete: (answers: any) => void;
    onCancel: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ onComplete, onCancel }) => {
    const [form, setForm] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActiveForm = async () => {
            try {
                const response = await api.get('/admin/active-form');
                setForm(response.data);
            } catch (error) {
                console.error('Failed to fetch active form:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchActiveForm();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12">
            <div className="h-10 w-10 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading questionnaire...</p>
        </div>
    );

    if (!form || !form.questions?.length) {
        // If no active form, just proceed
        onComplete({});
        return null;
    }

    const questions = form.questions;
    const currentQuestion = questions[currentStep].question;
    const totalSteps = questions.length;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    const handleNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete(answers);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        } else {
            onCancel();
        }
    };

    const updateAnswer = (value: any) => {
        setAnswers({
            ...answers,
            [questions[currentStep].id]: value
        });
    };

    return (
        <div className="space-y-8">
            {/* Progress Header */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-xl font-medium text-gray-900 font-display tracking-tight">
                            Quick Questionnaire
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Please help us prepare for our meeting.</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Step</span>
                        <div className="text-lg font-bold text-gray-900">0{currentStep + 1} <span className="text-gray-300">/</span> 0{totalSteps}</div>
                    </div>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gray-900"
                    />
                </div>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100"
                >
                    <div className="mb-6">
                        <span className="px-2 py-0.5 bg-white text-gray-400 rounded-md text-[9px] font-bold uppercase tracking-widest border border-gray-100 mb-3 block w-max">
                            {currentQuestion.type}
                        </span>
                        <h4 className="text-lg font-medium text-gray-900 leading-tight">
                            {currentQuestion.title}
                        </h4>
                    </div>

                    {currentQuestion.type === 'TEXT' ? (
                        <textarea
                            value={answers[questions[currentStep].id] || ''}
                            onChange={(e) => updateAnswer(e.target.value)}
                            placeholder="Type your response here..."
                            className="w-full h-32 p-4 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all resize-none font-medium"
                            autoFocus
                        />
                    ) : (
                        <div className="space-y-2">
                            {currentQuestion.options?.map((option: string) => (
                                <button
                                    key={option}
                                    onClick={() => updateAnswer(option)}
                                    className={clsx(
                                        "w-full p-4 rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between group",
                                        answers[questions[currentStep].id] === option
                                            ? "bg-gray-900 text-white shadow-lg shadow-gray-200"
                                            : "bg-white border border-gray-200 text-gray-600 hover:border-gray-900"
                                    )}
                                >
                                    {option}
                                    {answers[questions[currentStep].id] === option && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-3">
                <button
                    onClick={handleBack}
                    className="flex-1 py-4 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={handleNext}
                    disabled={!answers[questions[currentStep].id]}
                    className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-gray-100 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
                >
                    {currentStep === totalSteps - 1 ? 'Finish & Book Slot' : 'Continue'}
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default BookingForm;
