// 에디터 스타일(테마) 목록 — 사이드바 "스타일" 패널 (VS Code 확장 마켓 느낌)
import type { Extension } from '@codemirror/state'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import {
  dracula,
  monokai,
  githubDark,
  githubLight,
  tokyoNight,
  andromeda,
  atomone,
  materialDark,
  sublime,
  xcodeLight,
} from '@uiw/codemirror-themes-all'

export interface EditorTheme {
  id: string
  name: string
  desc: string
  theme: Extension
  /** 미리보기 색 견본 — [배경, 키워드, 문자열] */
  swatch: [string, string, string]
}

export const EDITOR_THEMES: EditorTheme[] = [
  {
    id: 'vscode-dark',
    name: 'Dark+ (기본)',
    desc: 'VS Code 기본 다크 테마',
    theme: vscodeDark,
    swatch: ['#1e1e1e', '#569cd6', '#ce9178'],
  },
  {
    id: 'dracula',
    name: 'Dracula',
    desc: '보라빛 포인트의 인기 다크 테마',
    theme: dracula,
    swatch: ['#282a36', '#ff79c6', '#f1fa8c'],
  },
  {
    id: 'monokai',
    name: 'Monokai',
    desc: 'Sublime의 클래식 컬러',
    theme: monokai,
    swatch: ['#272822', '#f92672', '#e6db74'],
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    desc: 'GitHub 코드 뷰 다크',
    theme: githubDark,
    swatch: ['#0d1117', '#ff7b72', '#a5d6ff'],
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    desc: '네온빛 도쿄의 밤',
    theme: tokyoNight,
    swatch: ['#1a1b26', '#bb9af7', '#9ece6a'],
  },
  {
    id: 'andromeda',
    name: 'Andromeda',
    desc: '진한 남색 베이스',
    theme: andromeda,
    swatch: ['#23262e', '#c74ded', '#96e072'],
  },
  {
    id: 'atomone',
    name: 'Atom One',
    desc: 'Atom 에디터의 One Dark',
    theme: atomone,
    swatch: ['#272c35', '#c678dd', '#98c379'],
  },
  {
    id: 'material-dark',
    name: 'Material Dark',
    desc: '머티리얼 디자인 다크',
    theme: materialDark,
    swatch: ['#212121', '#c792ea', '#c3e88d'],
  },
  {
    id: 'sublime',
    name: 'Sublime',
    desc: 'Sublime Text 감성',
    theme: sublime,
    swatch: ['#303841', '#ff3d71', '#ffb454'],
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    desc: '밝은 배경 (라이트)',
    theme: githubLight,
    swatch: ['#ffffff', '#cf222e', '#0a3069'],
  },
  {
    id: 'xcode-light',
    name: 'Xcode Light',
    desc: 'Xcode 기본 라이트',
    theme: xcodeLight,
    swatch: ['#ffffff', '#9b2393', '#c41a16'],
  },
]

export const DEFAULT_THEME_ID = 'vscode-dark'

export function themeById(id: string): EditorTheme {
  return EDITOR_THEMES.find((t) => t.id === id) ?? EDITOR_THEMES[0]
}
