// 레퍼런스(algomaster) 스크린샷에서 추출한 팔레트 — 무채색 근검정 + 틸/골드 포인트
export const theme = {
  bg: '#0d0d0d',
  panel: '#1b1b1b',
  panelLight: '#202020',
  border: '#2a2a2a',
  text: '#c8c8c8',
  subtext: '#8a8a8a',
  accent: '#c9cfdd', // 칩 텍스트 — 라이트 라벤더
  accentBg: '#10191d', // 칩 배경 — 다크 틸
  accentBorder: '#27343b',
  teal: '#0088ff', // 비교 글로우 ① — 브랜드 primary
  gold: '#d9a833', // 비교 글로우 ② + 변경 강조
  run: '#2ea043',
  runHover: '#3fb950',
  danger: '#f85149',
  warn: '#d9a833',
  currentLineBg: 'rgba(16, 64, 48, 0.55)', // 현재 줄 다크그린 (#104030)
  changedBg: 'rgba(217, 168, 51, 0.1)',
  logoGrad: 'linear-gradient(90deg, #0088ff, #00c6ff)', // 로고 그라디언트 (브랜드 블루)
  radius: '14px',
  font: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', sans-serif",
  mono: "'SF Mono', Menlo, Consolas, 'Courier New', monospace",
} as const
