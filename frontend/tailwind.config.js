export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
      colors: {
        brand: {
          50:'#faf5ff', 100:'#f3e8ff', 200:'#e9d5ff',
          300:'#d8b4fe', 400:'#c084fc', 500:'#a855f7',
          600:'#9333ea', 700:'#7e22ce', 800:'#6b21a8', 900:'#581c87'
        }
      },
      boxShadow: {
        card:'0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)',
        soft:'0 4px 24px rgba(0,0,0,.08)',
        brand:'0 4px 16px -4px rgba(147,51,234,.35)'
      }
    }
  },
  plugins: []
}