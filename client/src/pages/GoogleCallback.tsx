import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const GoogleCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');

    useEffect(() => {
        if (code) {
            api.post('/teacher/google-callback', { code })
                .then(() => {
                    navigate('/dashboard/settings?google_connected=success');
                })
                .catch((err) => {
                    console.error('Callback Error:', err);
                    navigate('/dashboard/settings?google_connected=error');
                });
        } else {
            navigate('/dashboard/settings');
        }
    }, [code, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 font-medium">Connecting your Google account...</p>
        </div>
    );
};

export default GoogleCallback;
