import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Lock, ShieldCheck, Smartphone, ChevronLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

type LoginMode = 'USER' | 'ADMIN';

const LoginPage: React.FC = () => {
    const [loginMode, setLoginMode] = useState<LoginMode>('USER');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [showOtp, setShowOtp] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', {
                email,
                password
            });

            const { token, user } = response.data;
            login(token, user);
            navigate('/dashboard/admin/forms');
        } catch (error: any) {
            console.error('Login failed:', error);
            setError(error.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        // Simulate OTP sending
        setTimeout(() => {
            setShowOtp(true);
            setLoading(false);
        }, 1000);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const enteredOtp = otp.join('');
            const response = await api.post('/auth/login', {
                phoneNumber: phone,
                otp: enteredOtp
            });

            const { token, user } = response.data;
            login(token, user);
            navigate('/dashboard/calendar');
        } catch (error: any) {
            console.error('OTP verification failed:', error);
            setError(error.response?.data?.error || 'Invalid verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[440px]">
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="h-14 w-14 bg-gray-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-gray-200 mb-5"
                    >
                        <ShieldCheck className="text-white w-7 h-7" />
                    </motion.div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">
                        Institutional Access
                    </h2>
                </div>

                {/* Mode Selector */}
                <div className="bg-gray-100 p-1 rounded-2xl mb-8 flex gap-1 relative overflow-hidden">
                    <motion.div
                        layoutId="selector"
                        className="absolute inset-y-1 bg-white rounded-xl shadow-sm border border-gray-200"
                        animate={{
                            left: loginMode === 'USER' ? '4px' : '50.5%',
                            right: loginMode === 'USER' ? '50.5%' : '4px'
                        }}
                    />
                    <button
                        onClick={() => { setLoginMode('USER'); setError(''); setShowOtp(false); }}
                        className={clsx(
                            "relative z-10 flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2",
                            loginMode === 'USER' ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Smartphone className="w-4 h-4" />
                        Student / Teacher
                    </button>
                    <button
                        onClick={() => { setLoginMode('ADMIN'); setError(''); setShowOtp(false); }}
                        className={clsx(
                            "relative z-10 flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2",
                            loginMode === 'ADMIN' ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Lock className="w-4 h-4" />
                        Administrator
                    </button>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[32px] p-10 border border-gray-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {!showOtp ? (
                            <motion.div
                                key={loginMode}
                                initial={{ opacity: 0, x: loginMode === 'USER' ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: loginMode === 'USER' ? -20 : 20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="mb-8">
                                    <h1 className="text-3xl font-medium text-gray-900 font-display tracking-tight mb-2">
                                        {loginMode === 'USER' ? 'Sign in with OTP' : 'Admin Login'}
                                    </h1>
                                    <p className="text-gray-500 text-sm">
                                        {loginMode === 'USER'
                                            ? 'Enter your mobile number to receive a secure code.'
                                            : 'Enter your credentials to manage the platform.'}
                                    </p>
                                </div>

                                <form onSubmit={loginMode === 'USER' ? handleSendOtp : handleAdminLogin} className="space-y-5">
                                    {error && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[13px] font-medium animate-shake">
                                            {error}
                                        </div>
                                    )}

                                    {loginMode === 'USER' ? (
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-1">
                                                Mobile Number
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-2 border-r border-gray-200">
                                                    <span className="text-sm font-bold text-gray-500">+91</span>
                                                </div>
                                                <input
                                                    type="tel"
                                                    placeholder="98765 43210"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                    className="w-full pl-16 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-mono tracking-wider"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-1">
                                                    Email Address
                                                </label>
                                                <div className="relative group">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                                                    <input
                                                        type="email"
                                                        placeholder="admin@ptm.com"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-1">
                                                    password
                                                </label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                                                    <input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-[15px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group shadow-xl shadow-gray-200 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-none mt-4"
                                    >
                                        {loading ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span>{loginMode === 'USER' ? 'Get Verification Code' : 'Sign In'}</span>
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="otp-screen"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <button
                                    onClick={() => setShowOtp(false)}
                                    className="flex items-center gap-1 text-gray-400 hover:text-gray-900 text-xs font-bold uppercase tracking-widest mb-8 group transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                                    Change Number
                                </button>

                                <div className="mb-8">
                                    <h1 className="text-3xl font-medium text-gray-900 font-display tracking-tight mb-2">
                                        Verify Code
                                    </h1>
                                    <p className="text-gray-500 text-sm">
                                        Sent to <span className="text-gray-900 font-bold">+91 {phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</span>
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyOtp} className="space-y-8">
                                    <div className="flex justify-between gap-2">
                                        {otp.map((digit, i) => (
                                            <input
                                                key={i}
                                                id={`otp-${i}`}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(i, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Backspace' && !digit && i > 0) {
                                                        document.getElementById(`otp-${i - 1}`)?.focus();
                                                    }
                                                }}
                                                className="w-12 h-14 bg-gray-50 border-2 border-gray-100 rounded-xl text-center text-xl font-bold text-gray-900 focus:outline-none focus:border-gray-900 focus:bg-white transition-all"
                                            />
                                        ))}
                                    </div>

                                    <div className="text-center">
                                        <button type="button" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
                                            Didn't receive the code? <span className="text-gray-900 underline decoration-gray-200 underline-offset-4">Resend</span>
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || otp.some(d => !d)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group shadow-xl shadow-emerald-100 disabled:shadow-none hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                                    >
                                        {loading ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span>Verify & Sign In</span>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <p className="mt-12 text-center text-xs text-gray-400 font-medium tracking-wide">
                    SECURE GATEWAY • ENCRYPTED SESSION
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
