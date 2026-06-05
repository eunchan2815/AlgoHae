import { createGlobalStyle } from 'styled-components'
import { theme } from './theme'

// Pretendard 자체 호스팅 (public/fonts) — 실제 쓰는 굵기만 선언한다
const FONT_WEIGHTS = [
  ['Regular', 400],
  ['Medium', 500],
  ['SemiBold', 600],
  ['Bold', 700],
  ['ExtraBold', 800],
] as const

const fontFaces = FONT_WEIGHTS.map(
  ([name, weight]) => `
  @font-face {
    font-family: 'Pretendard';
    src: local('Pretendard ${name}'), url('/fonts/Pretendard-${name}.otf') format('opentype');
    font-weight: ${weight};
    font-display: swap;
  }`,
).join('\n')

// $light: 랜딩(라이트) ↔ 앱(다크) — 오버스크롤 시 드러나는 배경도 페이지와 맞춘다
export const GlobalStyle = createGlobalStyle<{ $light?: boolean }>`
  ${fontFaces}

  * {
    box-sizing: border-box;
  }
  html {
    height: 100%;
    overscroll-behavior: none;
    background: ${({ $light }) => ($light ? '#ffffff' : theme.bg)};
    /* 랜딩에서는 스크롤바 숨김 (휠 스크롤은 유지) */
    ${({ $light }) =>
      $light
        ? `scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }`
        : ''}
  }
  body, #root {
    height: 100%;
  }
  body {
    margin: 0;
    overscroll-behavior: none;
    background: ${({ $light }) => ($light ? '#ffffff' : theme.bg)};
    color: ${theme.text};
    font-family: ${theme.font};
    -webkit-font-smoothing: antialiased;
  }
  button, select, input {
    font-family: inherit;
  }
`
