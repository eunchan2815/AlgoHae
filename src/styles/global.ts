import { createGlobalStyle } from 'styled-components'
import { theme } from './theme'

// Pretendard 가변 폰트 — woff2 한 파일로 모든 굵기(45~920) 커버
const fontFaces = `
  @font-face {
    font-family: 'Pretendard';
    src: local('Pretendard Variable'), url('/fonts/PretendardVariable.woff2') format('woff2-variations');
    font-weight: 45 920;
    font-display: swap;
  }`

// $light: 랜딩(라이트) ↔ 앱(다크) — 오버스크롤 시 드러나는 배경도 페이지와 맞춘다
const brandFontFaces = `
  @font-face {
    font-family: 'Baby Shark';
    src: url('/fonts/babyshark-regular.woff2') format('woff2');
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: 'Baby Shark';
    src: url('/fonts/babyshark-bold.woff2') format('woff2');
    font-weight: 700;
    font-display: swap;
  }`

export const GlobalStyle = createGlobalStyle<{ $light?: boolean }>`
  ${fontFaces}
  ${brandFontFaces}

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
