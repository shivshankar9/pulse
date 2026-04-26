/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
    theme: {
        extend: {
            fontFamily: {
                heading: ['"Cabinet Grotesk"', 'sans-serif'],
                sans: ['"Satoshi"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                bg: '#F5F5F3',
                surface: '#FFFFFF',
                ink: '#0A0A0A',
                inkSecondary: '#5C5C5C',
                line: '#E5E5E5',
                brand: {
                    DEFAULT: '#FF3B00',
                    hover: '#CC2F00',
                    soft: '#FFF0ED',
                },
                ok: '#008A27',
                warn: '#FFB800',
                bad: '#E50000',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
                popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
                primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
                muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
                destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            borderRadius: {
                lg: '0px',
                md: '0px',
                sm: '0px',
            },
            keyframes: {
                'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            },
            animation: {
                'fade-in': 'fade-in 220ms ease-out both',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
