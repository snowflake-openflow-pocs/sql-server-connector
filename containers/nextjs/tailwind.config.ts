import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0E1117',
        'background-secondary': '#1A1D24',
        'background-tertiary': '#262730',
        foreground: '#FAFAFA',
        'foreground-muted': '#A0AEC0',
        primary: '#29B5E8',
        success: '#00D26A',
        warning: '#FFC107',
        error: '#FF4B4B',
        purple: '#A78BFA',
        orange: '#FB923C',
        pink: '#F472B6',
      },
    },
  },
  plugins: [],
}
export default config
