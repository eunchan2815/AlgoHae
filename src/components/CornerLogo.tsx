// 우상단 그라디언트 로고 — 레퍼런스의 "algomaster.io" 위치·스타일
import styled from 'styled-components'
import { theme } from '../styles/theme'

export const CornerLogo = styled.button`
  position: absolute;
  top: 18px;
  right: 24px;
  z-index: 10;
  border: none;
  background: ${theme.logoGrad};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-family: ${theme.font};
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
  padding: 4px;
`
