/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        moss: {
          darkest: '#0d2419',
          deep:    '#163828',
          mid:     '#2d5a3d',
          leaf:    '#3f8a55',
          fresh:   '#7ab87a',
          mint:    '#aedcae',
          mist:    '#d4e8c6',
          cream:   '#f0ead2',
          paper:   '#f7f1de',
          50:  '#f0ead2',
          100: '#d4e8c6',
          200: '#aedcae',
          300: '#7ab87a',
          400: '#3f8a55',
          500: '#2d5a3d',
          600: '#163828',
          700: '#0d2419',
          800: '#0d2419',
        },
        gold: {
          50:  '#fff8e1',
          100: '#fff3b8',
          200: '#f7e6a4',
          300: '#f7d56b',
          400: '#d4b870',
          500: '#b8862a',
          600: '#8a6420',
        },
        bark: {
          50: '#f7eedd', 100: '#ecdcb6', 200: '#d9bf86', 300: '#c9a06d',
          400: '#ad8554', 500: '#8e6a3f', 600: '#5a3a22', 700: '#4d381f',
        },
        stone: {
          DEFAULT: '#6b6450',
          dark:    '#4a4538',
          light:   '#9b937a',
        },
        water: {
          deep:  '#2a5a6a',
          DEFAULT: '#4a8ea0',
          light: '#8fc8d0',
        },
        cream: {
          50:  '#fbfaf2', 100: '#f7f1de', 200: '#f0ead2',
          300: '#ddd09e', 400: '#cbb976', 500: '#b29c4f',
        },
        laurel: {
          50: '#f0ead2', 100: '#d4e8c6', 200: '#aedcae', 300: '#7ab87a', 400: '#3f8a55', 500: '#2d5a3d',
        },
        sky2: {
          50: '#f1f7fb', 100: '#dcebf4', 200: '#b8d6e7', 300: '#8ebbd4', 400: '#6ba1bf', 500: '#4b819f',
        },
        rose2: {
          100: '#fadfd9', 200: '#f0b9ad', 300: '#dc8170', 400: '#b75946',
        },
        ink: {
          900: '#0d2419',
          700: '#163828',
          500: '#2d5a3d',
          300: '#5a6b4f',
        },
      },
      fontFamily: {
        pixel:   ['"Galmuri11"', '"Apple SD Gothic Neo"', 'monospace'],
        pixelb:  ['"Galmuri11-Bold"', '"Galmuri11"', 'sans-serif'],
        display: ['"Galmuri11-Bold"', '"Galmuri11"', '"Pretendard Variable"', 'sans-serif'],
        body:    ['"Pretendard Variable"', '"Pretendard"', '"Apple SD Gothic Neo"', 'sans-serif'],
        serif:   ['"Galmuri11-Bold"', '"Galmuri11"', 'serif'],
      },
      boxShadow: {
        'pixel':      '3px 3px 0 0 #0d2419',
        'pixel-sm':   '2px 2px 0 0 #0d2419',
        'pixel-lg':   '4px 4px 0 0 #0d2419',
        'temple':     '3px 3px 0 0 #0d2419',
        'temple-lg':  '4px 4px 0 0 #0d2419, 0 16px 32px rgba(13,36,25,0.18)',
        'gold-ring':  '0 0 0 2px #f7d56b, 3px 3px 0 0 #0d2419',
        'gold-glow':  '0 0 16px rgba(247, 213, 107, 0.55)',
        'moss-ring':  '0 0 0 2px #3f8a55, 3px 3px 0 0 #0d2419',
      },
      backgroundImage: {
        'marble':
          'linear-gradient(180deg, #f7f1de 0%, #f0ead2 60%, #d4e8c6 100%)',
        'moss-sky':
          'radial-gradient(900px 500px at 50% -10%, #d4e8c6 0%, rgba(212,232,198,0) 60%),' +
          'linear-gradient(180deg, #aedcae 0%, #7ab87a 55%, #2d5a3d 100%)',
      },
    },
  },
  plugins: [],
}
