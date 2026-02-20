/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'],
                display: ['"Inter Tight"', 'sans-serif'],
            },
            colors: {
                // Neutral Base (Warm range)
                gray: {
                    25: '#FCFCFD',
                    50: '#F9FAFB',
                    100: '#F2F4F7',
                    200: '#EAECF0',
                    300: '#D0D5DD',
                    400: '#98A2B3',
                    500: '#667085',
                    600: '#475467',
                    700: '#344054',
                    800: '#1D2939',
                    900: '#101828',
                    950: '#0C111D',
                },
                // Brand Accent (Deep Indigo/Violet)
                primary: {
                    50: '#EEF2FF',
                    100: '#E0E7FF',
                    200: '#C7D2FE',
                    300: '#A5B4FC',
                    400: '#818CF8',
                    500: '#6366F1',
                    600: '#4F46E5', // Main brand
                    700: '#4338CA',
                    800: '#3730A3',
                    900: '#312E81',
                    950: '#1E1B4B',
                },
                // Functional Colors
                success: {
                    surface: '#ECFDF3',
                    text: '#027A48',
                    border: '#6CE9A6',
                },
                warning: {
                    surface: '#FFFAEB',
                    text: '#B54708',
                    border: '#FEDF89',
                },
                error: {
                    surface: '#FEF3F2',
                    text: '#B42318',
                    border: '#FECDCA',
                }
            },
            boxShadow: {
                'xs': '0px 1px 2px rgba(16, 24, 40, 0.05)',
                'sm': '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
                'md': '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
                'lg': '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
                'xl': '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)',
            },
            letterSpacing: {
                tighter: '-0.025em',
                tight: '-0.015em',
                normal: '0',
                wide: '0.015em',
                wider: '0.025em',
                widest: '0.1em',
            }
        },
    },
    plugins: [],
}
