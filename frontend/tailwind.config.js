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
                bg: '#F2F0EA',
                surface: '#FFFCF7',
                ink: '#17212B',
                inkSecondary: '#66727D',
                line: '#D9D6CE',
                brand: {
                    DEFAULT: '#F05A47',
                    hover: '#C94032',
                    soft: '#E9F0FF',
                },
                ok: '#2C826B',
                warn: '#D39A3D',
                bad: '#C94B4B',
                blue: '#3767D6',
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
                lg: '0.85rem',
                md: '0.65rem',
                sm: '0.45rem',
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
