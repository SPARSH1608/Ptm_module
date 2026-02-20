import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
                    >
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className={clsx(
                                    "p-3 rounded-2xl",
                                    isDestructive ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                                )}>
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-xl font-medium text-gray-900 font-display mb-2">
                                {title}
                            </h3>
                            <p className="text-gray-500 leading-relaxed text-[15px]">
                                {message}
                            </p>
                        </div>

                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={clsx(
                                    "flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 shadow-lg",
                                    isDestructive
                                        ? "bg-red-500 hover:bg-red-600 shadow-red-100"
                                        : "bg-gray-900 hover:bg-gray-800 shadow-gray-100"
                                )}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
