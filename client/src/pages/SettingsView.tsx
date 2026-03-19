import React, { useState } from 'react';
import { Video, Check, ExternalLink, Shield, Smartphone } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import api from '../services/api';

const SectionHeader = ({ title, description }: { title: string, description: string }) => (
    <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
    </div>
);

const SettingsView: React.FC = () => {
    const [selectedProvider, setSelectedProvider] = useState</* 'google_meet' | */ 'zoom'>('zoom');
    const [profile, setProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const zoomStatus = new URLSearchParams(window.location.search).get('zoom');

    const fetchProfile = () => {
        setProfileLoading(true);
        api.get('/teacher/profile')
            .then(res => setProfile(res.data))
            .catch(console.error)
            .finally(() => setProfileLoading(false));
    };

    React.useEffect(() => {
        fetchProfile();
    }, []);

    const handleConnectProvider = async () => {
        // Google Meet connect — commented out (Zoom only)
        // if (selectedProvider === 'google_meet') {
        //     try {
        //         const res = await api.get('/teacher/google-auth-url');
        //         if (res.data.url) {
        //             window.location.href = res.data.url;
        //         }
        //     } catch (error) {
        //         console.error('Error getting auth URL:', error);
        //     }
        // }
        if (selectedProvider === 'zoom') {
            try {
                const res = await api.get('/teacher/zoom-auth-url');
                if (res.data.url) {
                    // Set cookie client-side so the server receives it on the Zoom callback redirect.
                    // Server-side Set-Cookie is dropped by browsers on XHR without withCredentials.
                    if (profile?.id) {
                        document.cookie = `zoom_oauth_teacher=${profile.id}; path=/; max-age=600; SameSite=Lax`;
                    }
                    window.location.href = res.data.url;
                }
            } catch (error) {
                console.error('Error getting Zoom auth URL:', error);
            }
        }
    };

    const defaultProvider = (profile as any)?.providerSetting?.defaultProvider;
    const hasToken = !!(profile as any)?.providerSetting?.refreshToken;
    // const isGoogleConnected = hasToken && defaultProvider === 'GOOGLE_MEET';
    const isZoomConnected = hasToken && defaultProvider === 'ZOOM';

    const providers = [
        // Google Meet — commented out (Zoom only)
        // {
        //     id: 'google_meet',
        //     name: 'Google Meet',
        //     description: 'Sync your calendar and generate meet links automatically.',
        //     icon: Video,
        //     connectedText: isGoogleConnected ? `Connected as ${profile?.email}` : 'Not connected',
        //     connected: isGoogleConnected
        // },
        {
            id: 'zoom',
            name: 'Zoom',
            description: 'Integrate your Zoom account for video conferences.',
            icon: Video,
            connectedText: isZoomConnected ? `Connected as ${profile?.email}` : 'Not connected',
            connected: isZoomConnected
        }
    ];

    const currentProvider = providers.find(p => p.id === selectedProvider);

    return (
        <div className="max-w-2xl mx-auto space-y-12 px-8 py-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display tracking-tight mb-2">Settings</h1>
                <p className="text-gray-500">Manage your integrations and preferences</p>
            </div>

            {zoomStatus === 'connected' && (
                <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                    Zoom account connected successfully.
                </div>
            )}
            {zoomStatus === 'error' && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                    Failed to connect Zoom. Please try again.
                </div>
            )}

            <section>
                <SectionHeader
                    title="Conferencing"
                    description="Choose your preferred video conferencing provider for meetings."
                />

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                    {profileLoading ? (
                        [1, 2].map(i => (
                            <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-100 rounded w-24" />
                                    <div className="h-2.5 bg-gray-100 rounded w-48" />
                                    <div className="h-2.5 bg-gray-100 rounded w-32" />
                                </div>
                            </div>
                        ))
                    ) : providers.map((provider) => (
                        <div
                            key={provider.id}
                            onClick={() => setSelectedProvider(provider.id as 'zoom')}
                            className={clsx(
                                "p-4 cursor-pointer transition-colors flex items-center justify-between group",
                                selectedProvider === provider.id ? "bg-gray-50/50" : "hover:bg-gray-50"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                    selectedProvider === provider.id ? "bg-white border border-gray-200 shadow-sm text-primary-600" : "bg-gray-100 text-gray-500"
                                )}>
                                    <provider.icon className="w-5 h-5 stroke-[1.5]" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-gray-900">{provider.name}</h3>
                                        {provider.connected && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                                                Connected
                                            </span>
                                        )}
                                        {selectedProvider === provider.id && !provider.connected && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-50 text-primary-700 border border-primary-100">
                                                Selected
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{provider.description}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{provider.connectedText}</p>
                                </div>
                            </div>

                            <div className="flex items-center">
                                {selectedProvider === provider.id && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-primary-600">
                                        <Check className="w-5 h-5" />
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    {currentProvider?.connected && (
                        <button
                            onClick={async () => {
                                try {
                                    await api.delete('/teacher/provider');
                                    fetchProfile();
                                } catch (error) {
                                    console.error('Error disconnecting provider:', error);
                                }
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm border border-red-200 text-red-500 hover:bg-red-50"
                        >
                            Disconnect
                        </button>
                    )}
                    <button
                        onClick={handleConnectProvider}
                        disabled={currentProvider?.connected}
                        className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm border",
                            currentProvider?.connected
                                ? "bg-white border-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-gray-900 text-white border-transparent hover:bg-gray-800"
                        )}
                    >
                        {currentProvider?.connected ? "Account Connected" : `Connect ${currentProvider?.name}`}
                    </button>
                </div>
            </section >

            <section>
                <SectionHeader
                    title="Privacy & Security"
                    description="Manage your account security settings."
                />

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Two-Factor Authentication</span>
                        </div>
                        <div className="w-10 h-5 bg-gray-200 rounded-full relative">
                            <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Smartphone className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Device Management</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
            </section>
        </div >
    );
};

export default SettingsView;