// 에디터 스타일(테마) 목록 — 사이드바 "스타일" 패널 (VS Code 확장 마켓 느낌)
// ui: 에디터 밖 크롬(사이드바·탭·패널·상태바)까지 통째로 바꾸는 팔레트
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

export interface UiPalette {
  titleBar: string
  activityBar: string
  sideBar: string
  tabsBar: string
  tabInactive: string
  tabActive: string
  editor: string
  panel: string
  statusBar: string
  text: string
  textDim: string
  border: string
  listHover: string
  listActive: string
  run: string
  accent: string
}

export interface EditorTheme {
  id: string
  name: string
  desc: string
  theme: Extension
  /** 미리보기 색 견본 — [배경, 키워드, 문자열] */
  swatch: [string, string, string]
  ui: UiPalette
}

export const EDITOR_THEMES: EditorTheme[] = [
  {
    id: 'vscode-dark',
    name: 'Dark+ (기본)',
    desc: 'VS Code 기본 다크 테마',
    theme: vscodeDark,
    swatch: ['#1e1e1e', '#569cd6', '#ce9178'],
    ui: {
      titleBar: '#323233',
      activityBar: '#333333',
      sideBar: '#252526',
      tabsBar: '#252526',
      tabInactive: '#2d2d2d',
      tabActive: '#1e1e1e',
      editor: '#1e1e1e',
      panel: '#1e1e1e',
      statusBar: '#007acc',
      text: '#cccccc',
      textDim: '#858585',
      border: '#2b2b2b',
      listHover: '#2a2d2e',
      listActive: '#37373d',
      run: '#89d185',
      accent: '#007fd4',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    desc: '보라빛 포인트의 인기 다크 테마',
    theme: dracula,
    swatch: ['#282a36', '#ff79c6', '#f1fa8c'],
    ui: {
      titleBar: '#191a21',
      activityBar: '#1d1e26',
      sideBar: '#21222c',
      tabsBar: '#191a21',
      tabInactive: '#21222c',
      tabActive: '#282a36',
      editor: '#282a36',
      panel: '#282a36',
      statusBar: '#bd93f9',
      text: '#f8f8f2',
      textDim: '#6272a4',
      border: '#191a21',
      listHover: '#313241',
      listActive: '#44475a',
      run: '#50fa7b',
      accent: '#bd93f9',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    desc: 'Sublime의 클래식 컬러',
    theme: monokai,
    swatch: ['#272822', '#f92672', '#e6db74'],
    ui: {
      titleBar: '#1d1e19',
      activityBar: '#1d1e19',
      sideBar: '#22231e',
      tabsBar: '#1d1e19',
      tabInactive: '#22231e',
      tabActive: '#272822',
      editor: '#272822',
      panel: '#272822',
      statusBar: '#75715e',
      text: '#f8f8f2',
      textDim: '#90908a',
      border: '#1d1e19',
      listHover: '#2e2f29',
      listActive: '#3e3d32',
      run: '#a6e22e',
      accent: '#66d9ef',
    },
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    desc: 'GitHub 코드 뷰 다크',
    theme: githubDark,
    swatch: ['#0d1117', '#ff7b72', '#a5d6ff'],
    ui: {
      titleBar: '#010409',
      activityBar: '#0d1117',
      sideBar: '#010409',
      tabsBar: '#010409',
      tabInactive: '#010409',
      tabActive: '#0d1117',
      editor: '#0d1117',
      panel: '#0d1117',
      statusBar: '#1f6feb',
      text: '#e6edf3',
      textDim: '#7d8590',
      border: '#21262d',
      listHover: '#161b22',
      listActive: '#21262d',
      run: '#3fb950',
      accent: '#1f6feb',
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    desc: '네온빛 도쿄의 밤',
    theme: tokyoNight,
    swatch: ['#1a1b26', '#bb9af7', '#9ece6a'],
    ui: {
      titleBar: '#15161e',
      activityBar: '#16161e',
      sideBar: '#16161e',
      tabsBar: '#15161e',
      tabInactive: '#16161e',
      tabActive: '#1a1b26',
      editor: '#1a1b26',
      panel: '#1a1b26',
      statusBar: '#7aa2f7',
      text: '#a9b1d6',
      textDim: '#565f89',
      border: '#101014',
      listHover: '#1e202e',
      listActive: '#292e42',
      run: '#9ece6a',
      accent: '#7aa2f7',
    },
  },
  {
    id: 'andromeda',
    name: 'Andromeda',
    desc: '진한 남색 베이스',
    theme: andromeda,
    swatch: ['#23262e', '#c74ded', '#96e072'],
    ui: {
      titleBar: '#1b1d23',
      activityBar: '#1b1d23',
      sideBar: '#1e2026',
      tabsBar: '#1b1d23',
      tabInactive: '#1e2026',
      tabActive: '#23262e',
      editor: '#23262e',
      panel: '#23262e',
      statusBar: '#c74ded',
      text: '#d5ced9',
      textDim: '#746f77',
      border: '#1b1d23',
      listHover: '#2a2d37',
      listActive: '#373941',
      run: '#96e072',
      accent: '#c74ded',
    },
  },
  {
    id: 'atomone',
    name: 'Atom One',
    desc: 'Atom 에디터의 One Dark',
    theme: atomone,
    swatch: ['#272c35', '#c678dd', '#98c379'],
    ui: {
      titleBar: '#1d2026',
      activityBar: '#1d2026',
      sideBar: '#21252d',
      tabsBar: '#1d2026',
      tabInactive: '#21252d',
      tabActive: '#272c35',
      editor: '#272c35',
      panel: '#272c35',
      statusBar: '#528bff',
      text: '#abb2bf',
      textDim: '#5c6370',
      border: '#1d2026',
      listHover: '#2c313b',
      listActive: '#383e4a',
      run: '#98c379',
      accent: '#528bff',
    },
  },
  {
    id: 'material-dark',
    name: 'Material Dark',
    desc: '머티리얼 디자인 다크',
    theme: materialDark,
    swatch: ['#2e3235', '#c792ea', '#c3e88d'],
    ui: {
      titleBar: '#212529',
      activityBar: '#212529',
      sideBar: '#282c2f',
      tabsBar: '#212529',
      tabInactive: '#282c2f',
      tabActive: '#2e3235',
      editor: '#2e3235',
      panel: '#2e3235',
      statusBar: '#009688',
      text: '#eeffff',
      textDim: '#8a9ba0',
      border: '#212529',
      listHover: '#343a3d',
      listActive: '#3d4447',
      run: '#c3e88d',
      accent: '#80cbc4',
    },
  },
  {
    id: 'sublime',
    name: 'Sublime',
    desc: 'Sublime Text 감성',
    theme: sublime,
    swatch: ['#303841', '#ff3d71', '#ffb454'],
    ui: {
      titleBar: '#22282f',
      activityBar: '#22282f',
      sideBar: '#2a323b',
      tabsBar: '#22282f',
      tabInactive: '#2a323b',
      tabActive: '#303841',
      editor: '#303841',
      panel: '#303841',
      statusBar: '#ff8f40',
      text: '#d8dee9',
      textDim: '#7b8693',
      border: '#22282f',
      listHover: '#363f49',
      listActive: '#3f4750',
      run: '#99c794',
      accent: '#ff8f40',
    },
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    desc: '밝은 배경 (라이트)',
    theme: githubLight,
    swatch: ['#ffffff', '#cf222e', '#0a3069'],
    ui: {
      titleBar: '#e7ebf0',
      activityBar: '#f6f8fa',
      sideBar: '#f6f8fa',
      tabsBar: '#eaeef2',
      tabInactive: '#f6f8fa',
      tabActive: '#ffffff',
      editor: '#ffffff',
      panel: '#ffffff',
      statusBar: '#0969da',
      text: '#1f2328',
      textDim: '#656d76',
      border: '#d0d7de',
      listHover: '#eaeef2',
      listActive: '#ddf4ff',
      run: '#1a7f37',
      accent: '#0969da',
    },
  },
  {
    id: 'xcode-light',
    name: 'Xcode Light',
    desc: 'Xcode 기본 라이트',
    theme: xcodeLight,
    swatch: ['#ffffff', '#9b2393', '#c41a16'],
    ui: {
      titleBar: '#e8e8e8',
      activityBar: '#f2f2f2',
      sideBar: '#f2f2f2',
      tabsBar: '#e8e8e8',
      tabInactive: '#f2f2f2',
      tabActive: '#ffffff',
      editor: '#ffffff',
      panel: '#ffffff',
      statusBar: '#007aff',
      text: '#262626',
      textDim: '#8e8e93',
      border: '#d1d1d6',
      listHover: '#e8e8ed',
      listActive: '#d9e8ff',
      run: '#28a745',
      accent: '#007aff',
    },
  },
]

export const DEFAULT_THEME_ID = 'vscode-dark'

export function themeById(id: string): EditorTheme {
  return EDITOR_THEMES.find((t) => t.id === id) ?? EDITOR_THEMES[0]
}
