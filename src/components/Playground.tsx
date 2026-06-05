// 코드 실행 페이지 (/playground) — VS Code와 동일한 디자인
// 멀티 파일(F-34): 탐색기에서 파일 생성·삭제·전환. 확장자로 언어 결정.
// 실행(F-05/F-35): .py는 브라우저 내 Pyodide 추적+시각화, 그 외 언어는 실행 서버(Wandbox)로 출력 실행.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { rust } from '@codemirror/lang-rust'
import { StreamLanguage } from '@codemirror/language'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { swift } from '@codemirror/legacy-modes/mode/swift'
import { kotlin } from '@codemirror/legacy-modes/mode/clike'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import pythonLogo from '../assets/langs/python.svg'
import { EXAMPLES, DEFAULT_CODE, type Example } from '../examples'
import { LANG_EXAMPLES } from '../examples/langExamples'
import { langOf, extOf } from '../data/langs'
import { EDITOR_THEMES, DEFAULT_THEME_ID, themeById } from '../data/themes'
import { usePythonRunner } from '../hooks/usePythonRunner'
import { runRemote, type RemoteOutput } from '../runners/remote'
import { execLineExtensions, setExecLine, setErrorLine } from './editorExecLine'
import { FilesIcon, RunIcon, StopIcon, HomeIcon, NewFileIcon, CloseIcon, ExtensionsIcon, DocIcon, StepRunIcon } from './icons'
import VizPanel from './VizPanel'
import VariableTable from './VariableTable'
import OutputPanel from './OutputPanel'
import PlayerControls from './PlayerControls'
import CallStackPanel from './CallStackPanel'

const FILES_KEY = 'algohae:files' // F-34 멀티 파일 저장
const ACTIVE_KEY = 'algohae:activeFile'
const TABS_KEY = 'algohae:openTabs'
const LEGACY_CODE_KEY = 'algohae:code'

interface UserFile {
  id: string
  name: string
  content: string
}

function loadFiles(): UserFile[] {
  try {
    const raw = localStorage.getItem(FILES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as UserFile[]
      if (Array.isArray(parsed)) return parsed // 빈 배열(파일 0개)도 유효한 상태
    }
  } catch {
    /* 손상된 저장값은 무시 */
  }
  // 구버전(단일 코드) 마이그레이션
  const legacy = localStorage.getItem(LEGACY_CODE_KEY)
  return [{ id: 'main', name: 'main.py', content: legacy ?? DEFAULT_CODE }]
}

function persistFiles(files: UserFile[]) {
  localStorage.setItem(FILES_KEY, JSON.stringify(files))
}

// 예제는 "가상 탭"으로 연다 (내 파일에 추가하지 않음) — id 접두사 ex:
const VIRTUAL_PREFIX = 'ex:'

function templateByName(name: string): string | null {
  const example = EXAMPLES.find((ex) => `${ex.id.replace(/-/g, '_')}.py` === name)
  if (example) return example.code
  const langExample = LANG_EXAMPLES.find((le) => le.name === name)
  return langExample ? langExample.content : null
}

function resolveVirtual(id: string): UserFile | null {
  if (!id.startsWith(VIRTUAL_PREFIX)) return null
  const name = id.slice(VIRTUAL_PREFIX.length)
  const content = templateByName(name)
  return content !== null ? { id, name, content } : null
}

let fileSeq = 0
function newFileId(): string {
  fileSeq += 1
  return `f_${Date.now()}_${fileSeq}`
}

function editorLangExtensions(fileName: string): Extension[] {
  switch (extOf(fileName)) {
    case 'py':
      return [python(), ...execLineExtensions]
    case 'js':
      return [javascript()]
    case 'ts':
      return [javascript({ typescript: true })]
    case 'java':
      return [java()]
    case 'c':
    case 'cpp':
    case 'cs':
      return [cpp()]
    case 'rs':
      return [rust()]
    case 'rb':
      return [StreamLanguage.define(ruby)]
    case 'swift':
      return [StreamLanguage.define(swift)]
    case 'kt':
      return [StreamLanguage.define(kotlin)]
    default:
      return []
  }
}

type PanelTab = 'vars' | 'output' | 'stack'

type RemoteState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; out: RemoteOutput }
  | { status: 'error'; message: string }

// 테마 UI 팔레트 — 선택한 스타일이 CSS 변수로 전체 크롬에 주입된다 (Wrap의 style)
const VS = {
  titleBar: 'var(--vs-titlebar)',
  activityBar: 'var(--vs-activitybar)',
  sideBar: 'var(--vs-sidebar)',
  sideBarHeader: 'var(--vs-text-dim)',
  tabsBar: 'var(--vs-tabsbar)',
  tabInactive: 'var(--vs-tab-inactive)',
  tabActive: 'var(--vs-tab-active)',
  editor: 'var(--vs-editor)',
  panel: 'var(--vs-panel)',
  statusBar: 'var(--vs-statusbar)',
  text: 'var(--vs-text)',
  textDim: 'var(--vs-text-dim)',
  border: 'var(--vs-border)',
  listHover: 'var(--vs-list-hover)',
  listActive: 'var(--vs-list-active)',
  run: 'var(--vs-run)',
  accent: 'var(--vs-accent)',
} as const

export default function Playground() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<UserFile[]>(loadFiles)
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_KEY)
    const initial = loadFiles()
    return initial.some((f) => f.id === saved) ? (saved as string) : (initial[0]?.id ?? '')
  })
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [editNotice, setEditNotice] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sideView, setSideView] = useState<'explorer' | 'styles'>('explorer')
  const [themeId, setThemeId] = useState<string>(
    () => localStorage.getItem('algohae:theme') ?? DEFAULT_THEME_ID,
  )
  const [panelTab, setPanelTab] = useState<PanelTab>('vars')
  // 하단 패널 높이 — 위 가장자리를 드래그해서 조절 (VS Code 패널과 동일)
  const [panelHeight, setPanelHeight] = useState<number>(() => {
    const saved = Number(localStorage.getItem('algohae:panelHeight'))
    return saved >= 64 ? saved : 200
  })
  const panelDrag = useRef<{ startY: number; startH: number } | null>(null)
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const all = loadFiles()
    const raw = localStorage.getItem(TABS_KEY)
    if (raw !== null) {
      try {
        const saved = JSON.parse(raw) as string[]
        // 빈 배열(탭 0개)도 유효한 상태 — 그대로 복원
        if (Array.isArray(saved))
          return saved.filter(
            (id) => all.some((f) => f.id === id) || resolveVirtual(id) !== null,
          )
      } catch {
        /* 손상된 저장값은 무시 */
      }
    }
    const savedActive = localStorage.getItem(ACTIVE_KEY)
    const active = all.some((f) => f.id === savedActive) ? (savedActive as string) : all[0]?.id
    return active ? [active] : []
  })
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [creating, setCreating] = useState(false)
  // 탐색기 섹션 접기/펼치기 (VS Code 폴더처럼)
  const [folders, setFolders] = useState<Record<'my' | 'ex' | 'langEx', boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('algohae:folders') ?? '')
      if (saved && typeof saved === 'object') {
        return { my: saved.my !== false, ex: saved.ex !== false, langEx: saved.langEx !== false }
      }
    } catch {
      /* 기본값 사용 */
    }
    return { my: true, ex: true, langEx: true }
  })

  const toggleFolder = (key: 'my' | 'ex' | 'langEx') => {
    setFolders((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('algohae:folders', JSON.stringify(next))
      return next
    })
  }
  const [newName, setNewName] = useState('')
  const [remote, setRemote] = useState<RemoteState>({ status: 'idle' })
  const remoteAbort = useRef<AbortController | null>(null)
  const editorRef = useRef<EditorView | null>(null)
  const activeTabRef = useRef<HTMLDivElement | null>(null)
  // ▷ 실행: 결과부터 (마지막 스텝 + 출력 탭) / ▶▶ 한 줄씩 실행: 스텝 0부터 자동 재생
  const autoPlayRef = useRef(false)
  const runner = usePythonRunner((res) => {
    if (autoPlayRef.current) {
      autoPlayRef.current = false
      setStep(0)
      setPanelTab('vars')
      setPlaying(true)
    } else {
      setStep(Math.max(0, res.snapshots.length - 1))
      setPanelTab('output')
    }
  })

  const editorTheme = themeById(themeId)
  const cssVars = {
    '--vs-titlebar': editorTheme.ui.titleBar,
    '--vs-activitybar': editorTheme.ui.activityBar,
    '--vs-sidebar': editorTheme.ui.sideBar,
    '--vs-tabsbar': editorTheme.ui.tabsBar,
    '--vs-tab-inactive': editorTheme.ui.tabInactive,
    '--vs-tab-active': editorTheme.ui.tabActive,
    '--vs-editor': editorTheme.ui.editor,
    '--vs-panel': editorTheme.ui.panel,
    '--vs-statusbar': editorTheme.ui.statusBar,
    '--vs-text': editorTheme.ui.text,
    '--vs-text-dim': editorTheme.ui.textDim,
    '--vs-border': editorTheme.ui.border,
    '--vs-list-hover': editorTheme.ui.listHover,
    '--vs-list-active': editorTheme.ui.listActive,
    '--vs-run': editorTheme.ui.run,
    '--vs-accent': editorTheme.ui.accent,
  } as CSSProperties

  const selectTheme = (id: string) => {
    setThemeId(id)
    localStorage.setItem('algohae:theme', id)
  }

  // 탭이 하나도 없으면 빈 에디터 상태 (VS Code와 동일). 예제는 가상 파일로 해석
  const resolveFile = (id: string): UserFile | null =>
    resolveVirtual(id) ?? files.find((f) => f.id === id) ?? null
  const activeFile =
    openTabs.length > 0
      ? (resolveFile(openTabs.includes(activeId) ? activeId : openTabs[openTabs.length - 1]) ??
        null)
      : null
  const code = activeFile?.content ?? ''
  const lang = activeFile ? langOf(activeFile.name) : null
  const isPython = lang?.traced === true
  // 내용이 예제와 일치하면 예제 메타(제목·복잡도) 사용 — 파생값
  const activeExample = EXAMPLES.find((ex) => ex.code === code) ?? null

  const { result } = runner
  const snapshots = result?.snapshots ?? []
  const total = snapshots.length
  const snap = snapshots[step]
  const prev = step > 0 ? snapshots[step - 1] : null
  const codeLines = code.replace(/\n$/, '').split('\n')
  const currentLineText = snap && snap.line >= 1 ? (codeLines[snap.line - 1] ?? '') : ''

  // 브라우저 탭 제목 = 현재 파일 (타이틀바 제거 대체)
  useEffect(() => {
    document.title = activeFile ? `${activeFile.name} — 알고해` : '알고해'
  }, [activeFile])

  // Cmd+W / Ctrl+W / Alt+W → 탭 닫기 (Cmd+W는 브라우저가 가로챌 수 있어 Alt+W 병행)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' && (e.metaKey || e.ctrlKey || e.altKey)) {
        e.preventDefault()
        const next = openTabs.filter((t) => t !== activeId)
        setOpenTabs(next)
        localStorage.setItem(TABS_KEY, JSON.stringify(next))
        const fallback = next[next.length - 1]
        if (fallback) {
          setActiveId(fallback)
          localStorage.setItem(ACTIVE_KEY, fallback)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openTabs, activeId])

  // 활성 탭이 탭바 밖에 있으면 자동으로 스크롤해서 보이게
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }, [activeId, openTabs.length])

  // F-22 자동 재생 — 한 틱씩 예약 (끝에 도달하면 자동 정지)
  useEffect(() => {
    if (!playing) return
    if (step >= total - 1) return
    const id = window.setTimeout(() => {
      setStep(step + 1)
      if (step + 1 >= total - 1) setPlaying(false)
    }, 2000 / speed) // 1x = 스텝당 2초 (기존 0.5x), 2x = 1초 (기존 1x) — 한 단계씩 전체 하향
    return () => clearTimeout(id)
  }, [playing, step, speed, total])

  // F-12 실행 줄·오류 줄을 에디터 안에 하이라이트 + 현재 줄로 스크롤 (Python 전용)
  useEffect(() => {
    const view = editorRef.current
    if (!view || !isPython) return
    const docLines = view.state.doc.lines
    const execLine = result && snap && snap.line >= 1 && snap.line <= docLines ? snap.line : null
    const errorLine =
      result?.error?.line != null && result.error.line >= 1 && result.error.line <= docLines
        ? result.error.line
        : null
    view.dispatch({
      effects: [
        setExecLine.of(execLine),
        setErrorLine.of(errorLine),
        ...(execLine !== null
          ? [EditorView.scrollIntoView(view.state.doc.line(execLine).from, { y: 'center' })]
          : []),
      ],
    })
  }, [result, snap, isPython])

  const onPanelResizeStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    panelDrag.current = { startY: e.clientY, startH: panelHeight }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPanelResizeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!panelDrag.current) return
    const raw = panelDrag.current.startH + (panelDrag.current.startY - e.clientY)
    const clamped = Math.min(Math.max(raw, 64), window.innerHeight - 220)
    setPanelHeight(clamped)
  }

  const onPanelResizeEnd = () => {
    if (!panelDrag.current) return
    panelDrag.current = null
    setPanelHeight((h) => {
      localStorage.setItem('algohae:panelHeight', String(Math.round(h)))
      return h
    })
  }

  const clearRunState = () => {
    setPlaying(false)
    runner.clearResult()
    remoteAbort.current?.abort()
    setRemote({ status: 'idle' })
  }

  const updateFiles = (next: UserFile[]) => {
    setFiles(next)
    persistFiles(next)
  }

  const handleCodeChange = (value: string) => {
    if (!activeFile) return
    if (activeFile.id.startsWith(VIRTUAL_PREFIX)) {
      // 예제를 수정하는 순간 내 파일로 승격 (이름이 겹치면 _2, _3…)
      let name = activeFile.name
      if (files.some((f) => f.name === name)) {
        const dot = name.lastIndexOf('.')
        const base = dot > 0 ? name.slice(0, dot) : name
        const ext = dot > 0 ? name.slice(dot) : ''
        let n = 2
        while (files.some((f) => f.name === `${base}_${n}${ext}`)) n += 1
        name = `${base}_${n}${ext}`
      }
      const file: UserFile = { id: newFileId(), name, content: value }
      updateFiles([...files, file])
      persistTabs(openTabs.map((t) => (t === activeFile.id ? file.id : t)))
      setActiveId(file.id)
      localStorage.setItem(ACTIVE_KEY, file.id)
      if (result || remote.status !== 'idle') clearRunState()
      return
    }
    updateFiles(files.map((f) => (f.id === activeFile.id ? { ...f, content: value } : f)))
    // 코드가 바뀌면 이전 실행 결과는 무효
    if (result || remote.status !== 'idle') clearRunState()
  }

  const persistTabs = (tabs: string[]) => {
    setOpenTabs(tabs)
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs))
  }

  const selectFile = (id: string) => {
    if (!openTabs.includes(id)) persistTabs([...openTabs, id])
    if (id === activeId) return
    setActiveId(id)
    localStorage.setItem(ACTIVE_KEY, id)
    setEditNotice(null)
    clearRunState()
  }

  const closeTab = (id: string) => {
    const next = openTabs.filter((t) => t !== id)
    persistTabs(next)
    if (id === activeId) {
      const fallback = next[next.length - 1]
      if (fallback) {
        setActiveId(fallback)
        localStorage.setItem(ACTIVE_KEY, fallback)
      }
      clearRunState()
    }
  }

  // 파일 이름 변경 — 탐색기에서 Enter(이미 선택된 파일) 또는 더블클릭
  const startRename = (file: UserFile) => {
    setRenamingId(file.id)
    setRenameValue(file.name)
  }

  const commitRename = () => {
    if (renamingId === null) return
    const target = files.find((f) => f.id === renamingId)
    const trimmed = renameValue.trim()
    setRenamingId(null)
    if (!target || !trimmed || trimmed === target.name) return
    if (files.some((f) => f.id !== renamingId && f.name === trimmed)) {
      setEditNotice(`"${trimmed}" 파일이 이미 있어요`)
      return
    }
    updateFiles(files.map((f) => (f.id === renamingId ? { ...f, name: trimmed } : f)))
    // 확장자가 바뀌면 언어·실행 방식도 바뀌므로 결과 초기화
    if (renamingId === activeId) clearRunState()
  }

  const createFile = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setCreating(false)
      return
    }
    const name = trimmed // 입력한 그대로 생성 (VS Code처럼 — 확장자 자동 추가 없음)
    if (files.some((f) => f.name === name)) {
      setEditNotice(`"${name}" 파일이 이미 있어요`)
      return
    }
    const file: UserFile = { id: newFileId(), name, content: '' }
    updateFiles([...files, file])
    setCreating(false)
    setNewName('')
    selectFile(file.id)
  }

  const deleteFile = (id: string) => {
    const next = files.filter((f) => f.id !== id)
    updateFiles(next)
    const nextTabs = openTabs.filter((t) => t !== id)
    persistTabs(nextTabs)
    if (id === activeId) {
      const fallback = nextTabs[nextTabs.length - 1]
      if (fallback) {
        setActiveId(fallback)
        localStorage.setItem(ACTIVE_KEY, fallback)
      }
      clearRunState()
    }
  }

  // 예제 클릭 → 가상 탭으로 연다 (내 파일에는 추가하지 않음 — 수정하면 그때 승격)
  const openExample = (name: string) => {
    const id = `${VIRTUAL_PREFIX}${name}`
    if (!openTabs.includes(id)) persistTabs([...openTabs, id])
    if (id !== activeId) {
      setActiveId(id)
      localStorage.setItem(ACTIVE_KEY, id)
      setEditNotice(null)
      clearRunState()
    }
  }

  const loadExample = (example: Example) => {
    openExample(`${example.id.replace(/-/g, '_')}.py`)
  }

  const runRemoteFile = async () => {
    if (!lang?.remote) return
    clearRunState()
    const controller = new AbortController()
    remoteAbort.current = controller
    setRemote({ status: 'running' })
    try {
      const out = await runRemote(lang.remote, code, controller.signal)
      setRemote({ status: 'done', out })
      setPanelTab('output')
    } catch (err) {
      if (controller.signal.aborted) {
        setRemote({ status: 'idle' })
      } else {
        setRemote({ status: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    }
  }

  const handleRun = (autoPlay = false) => {
    autoPlayRef.current = autoPlay && isPython
    setEditNotice(null)
    if (!activeFile) return
    if (!lang) {
      setEditNotice(`이 파일은 실행할 수 없어요 — 지원 확장자: py, js, ts, java, cpp, cs, kt, swift, rs, rb`)
      return
    }
    if (!lang.traced && lang.remote === null) {
      setEditNotice(`${lang.name}은(는) 실행 환경 준비 중이에요 — 조금만 기다려 주세요!`)
      return
    }
    if (isPython) {
      if (/\binput\s*\(/.test(code)) {
        setEditNotice('input()은 아직 지원하지 않아요. 변수에 직접 값을 넣어 보세요. 예) n = 10')
        return
      }
      setStep(0)
      setPlaying(false)
      runner.run(code)
    } else {
      void runRemoteFile()
    }
  }

  const handleStop = () => {
    if (isPython) runner.stop()
    else {
      remoteAbort.current?.abort()
      setRemote({ status: 'idle' })
    }
  }

  const handleTogglePlay = () => {
    // 끝에서 재생을 누르면 처음부터
    if (!playing && step >= total - 1) setStep(0)
    setPlaying((p) => !p)
  }

  // 시작도 못 한 오류(문법 등 — 스냅샷이 done 하나뿐)는 배너로 안내
  const startFailed = result !== null && result.error !== null && result.snapshots.length <= 1
  const startFailedNotice = startFailed
    ? `${result.error!.message}${result.error!.line !== null ? ` (${result.error!.line}번째 줄)` : ''}`
    : null
  const hasPlayback = isPython && result !== null && !startFailed && snap !== undefined
  const isRunning = isPython ? runner.status === 'running' : remote.status === 'running'
  const runDisabled =
    !activeFile || (isPython ? runner.status !== 'ready' : remote.status === 'running')

  const notice =
    editNotice ??
    startFailedNotice ??
    runner.fatal ??
    (remote.status === 'error' ? remote.message : null)

  return (
    <Wrap style={cssVars}>
      <MainRow>
        {/* ── 액티비티 바 ── */}
        <ActivityBar>
          <ActivityIcon
            type="button"
            $active={sidebarOpen && sideView === 'explorer'}
            title="탐색기"
            onClick={() => {
              if (sidebarOpen && sideView === 'explorer') setSidebarOpen(false)
              else {
                setSideView('explorer')
                setSidebarOpen(true)
              }
            }}
          >
            <FilesIcon />
          </ActivityIcon>
          <ActivityIcon
            type="button"
            $active={sidebarOpen && sideView === 'styles'}
            title="스타일 (에디터 테마)"
            onClick={() => {
              if (sidebarOpen && sideView === 'styles') setSidebarOpen(false)
              else {
                setSideView('styles')
                setSidebarOpen(true)
              }
            }}
          >
            <ExtensionsIcon />
          </ActivityIcon>
          <ActivityIcon
            type="button"
            title={isRunning ? '실행 중…' : '실행'}
            onClick={() => handleRun()}
            disabled={runDisabled}
          >
            <RunIcon />
          </ActivityIcon>
          <ActivitySpacer />
          <ActivityIcon type="button" title="홈으로" onClick={() => navigate('/')}>
            <HomeIcon />
          </ActivityIcon>
        </ActivityBar>

        {/* ── 사이드바 (탐색기) ── */}
        {sidebarOpen && sideView === 'styles' && (
          <SideBar>
            <SideBarTitle>스타일</SideBarTitle>
            <SideBarSection>에디터 테마</SideBarSection>
            <ThemeList>
              {EDITOR_THEMES.map((t) => (
                <ThemeItem
                  key={t.id}
                  type="button"
                  $active={t.id === themeId}
                  onClick={() => selectTheme(t.id)}
                >
                  <Swatch aria-hidden="true">
                    {t.swatch.map((color, i) => (
                      <i key={i} style={{ background: color }} />
                    ))}
                  </Swatch>
                  <ThemeMeta>
                    <strong>{t.name}</strong>
                    <span>{t.desc}</span>
                  </ThemeMeta>
                  {t.id === themeId && <AppliedBadge>적용됨</AppliedBadge>}
                </ThemeItem>
              ))}
            </ThemeList>
          </SideBar>
        )}

        {sidebarOpen && sideView === 'explorer' && (
          <SideBar>
            <SideBarTitle>탐색기</SideBarTitle>

            <SideBarSection onClick={() => toggleFolder('my')}>
              <Chev $open={folders.my} aria-hidden="true">▸</Chev>
              내 파일
              <HeadSpacer />
              <NewFileBtn
                type="button"
                title="새 파일"
                onClick={(e) => {
                  e.stopPropagation()
                  setFolders((prev) => ({ ...prev, my: true }))
                  setCreating(true)
                  setNewName('')
                }}
              >
                <NewFileIcon />
              </NewFileBtn>
            </SideBarSection>
            {folders.my && (
            <FileList>
              {files.length === 0 && !creating && (
                <EmptyFiles>파일이 없어요 — 위 + 버튼으로 만들어보세요</EmptyFiles>
              )}
              {files.map((file) => {
                const fileLang = langOf(file.name)
                return (
                  <FileItem key={file.id} $active={file.id === activeFile?.id}>
                    {renamingId === file.id ? (
                      <RenameRow>
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename()
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          onBlur={commitRename}
                        />
                      </RenameRow>
                    ) : (
                    <FileButton
                      type="button"
                      onClick={() => selectFile(file.id)}
                      onDoubleClick={() => startRename(file)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && file.id === activeFile?.id) {
                          e.preventDefault()
                          startRename(file)
                        }
                      }}
                      title="Enter 또는 더블클릭으로 이름 바꾸기"
                    >
                      {fileLang ? (
                        <img src={fileLang.logo} alt="" width={14} height={14} />
                      ) : (
                        <DocIcon size={14} />
                      )}
                      {file.name}
                    </FileButton>
                    )}
                    <FileDelete
                      type="button"
                      title="파일 삭제"
                      onClick={() => deleteFile(file.id)}
                    >
                      <CloseIcon />
                    </FileDelete>
                  </FileItem>
                )
              })}
              {creating && (
                <NewFileRow>
                  <input
                    autoFocus
                    value={newName}
                    placeholder="이름.확장자 (예: solve.cpp)"
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createFile()
                      if (e.key === 'Escape') setCreating(false)
                    }}
                    onBlur={() => setCreating(false)}
                  />
                </NewFileRow>
              )}
            </FileList>
            )}

            <SideBarSection onClick={() => toggleFolder('ex')}>
              <Chev $open={folders.ex} aria-hidden="true">▸</Chev>
              예제
            </SideBarSection>
            {folders.ex && (
            <FileList>
              {EXAMPLES.map((ex) => (
                <FileItem
                  key={ex.id}
                  $active={activeFile?.id === `${VIRTUAL_PREFIX}${ex.id.replace(/-/g, '_')}.py`}
                >
                  <FileButton
                    type="button"
                    onClick={() => loadExample(ex)}
                    title={`${ex.name} — ${ex.desc}`}
                  >
                    <img src={pythonLogo} alt="" width={15} height={15} />
                    {ex.id.replace(/-/g, '_')}.py
                  </FileButton>
                </FileItem>
              ))}
            </FileList>
            )}

            <SideBarSection onClick={() => toggleFolder('langEx')}>
              <Chev $open={folders.langEx} aria-hidden="true">▸</Chev>
              언어 예제
            </SideBarSection>
            {folders.langEx && (
            <FileList>
              {LANG_EXAMPLES.map((le) => (
                <FileItem key={le.name} $active={activeFile?.id === `${VIRTUAL_PREFIX}${le.name}`}>
                  <FileButton
                    type="button"
                    onClick={() => openExample(le.name)}
                    title={`${langOf(le.name)?.name ?? ''} 실행 예제`}
                  >
                    <img src={langOf(le.name)?.logo ?? pythonLogo} alt="" width={15} height={15} />
                    {le.name}
                  </FileButton>
                </FileItem>
              ))}
            </FileList>
            )}
          </SideBar>
        )}

        {/* ── 중앙: 에디터 그룹 + 시각화 그룹 + 하단 패널 ── */}
        <Center>
          <EditorRow>
            <EditorGroup>
              <TabsBar>
                <TabsScroll
                  onWheel={(e) => {
                    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                      e.currentTarget.scrollLeft += e.deltaY
                    }
                  }}
                >
                {openTabs.map((tabId) => {
                  const tabFile = resolveFile(tabId)
                  if (!tabFile) return null
                  const tabLang = langOf(tabFile.name)
                  return (
                    <Tab
                      key={tabId}
                      ref={tabId === activeFile?.id ? activeTabRef : undefined}
                      $active={tabId === activeFile?.id}
                      onClick={() => selectFile(tabId)}
                    >
                      {tabLang ? (
                        <img src={tabLang.logo} alt="" width={14} height={14} />
                      ) : (
                        <DocIcon size={14} />
                      )}
                      {tabFile.name}
                      <TabClose
                        type="button"
                        title="탭 닫기 (⌥W 또는 Ctrl+W)"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeTab(tabId)
                        }}
                      >
                        <CloseIcon size={16} />
                      </TabClose>
                    </Tab>
                  )
                })}
                </TabsScroll>
                {isRunning ? (
                  <RunAction type="button" onClick={handleStop} title="실행 중단" $stop>
                    <StopIcon />
                  </RunAction>
                ) : (
                  <>
                    {isPython && (
                      <StepRunAction
                        type="button"
                        onClick={() => handleRun(true)}
                        disabled={runDisabled}
                        title="한 줄씩 실행 — 처음부터 자동 재생"
                      >
                        <StepRunIcon size={19} />
                      </StepRunAction>
                    )}
                    <RunAction
                      type="button"
                      onClick={() => handleRun()}
                      disabled={runDisabled}
                      title={isPython ? '실행 — 결과 바로 보기' : `실행 (${lang?.name ?? ''} — 실행 서버)`}
                    >
                      <RunIcon size={20} />
                    </RunAction>
                  </>
                )}
              </TabsBar>
              <Breadcrumbs>{activeFile ? `ALGOHAE › ${activeFile.name}` : '\u00a0'}</Breadcrumbs>
              <EditorHost>
                {activeFile ? (
                  <CodeMirror
                    key={activeFile.name}
                    value={code}
                    onChange={handleCodeChange}
                    theme={editorTheme.theme}
                    extensions={editorLangExtensions(activeFile.name)}
                    height="100%"
                    style={{ height: '100%' }}
                    onCreateEditor={(view) => {
                      editorRef.current = view
                    }}
                  />
                ) : (
                  <EmptyEditor>
                    <span>{'</>'}</span>
                    <p>열린 파일이 없어요</p>
                    <small>왼쪽 탐색기에서 파일을 선택하거나 새 파일을 만들어보세요</small>
                  </EmptyEditor>
                )}
              </EditorHost>
            </EditorGroup>

            <VizGroup>
              <TabsBar>
                <Tab $active>
                  시각화
                  {activeExample && hasPlayback && (
                    <TabBadge>
                      {activeExample.time} · {activeExample.space}
                    </TabBadge>
                  )}
                </Tab>
              </TabsBar>
              <VizBody>
                {hasPlayback ? (
                  <>
                    <VizScroll>
                      <VizPanel snap={snap} prev={prev} currentLineText={currentLineText} />
                      {step === total - 1 && !playing && total > 1 && (
                        <ReplayCta
                          type="button"
                          onClick={() => {
                            setStep(0)
                            setPanelTab('vars')
                            setPlaying(true)
                          }}
                        >
                          ▶ 처음부터 한 줄씩 보기
                        </ReplayCta>
                      )}
                    </VizScroll>
                    <VizControls>
                      <PlayerControls
                        step={step}
                        total={total}
                        playing={playing}
                        speed={speed}
                        onStepChange={(s) => {
                          setStep(s)
                          setPlaying(false)
                        }}
                        onTogglePlay={handleTogglePlay}
                        onSpeedChange={setSpeed}
                      />
                    </VizControls>
                  </>
                ) : (
                  <Placeholder>
                    <span>▷</span>
                    {!activeFile ? (
                      <p>파일을 열고 실행하면 여기에 시각화가 나와요</p>
                    ) : isPython ? (
                      <p>
                        실행하면 코드가 한 줄씩 재생되고,
                        <br />
                        변수의 변화가 여기에 그려져요
                      </p>
                    ) : (
                      <p>
                        {lang?.name ?? '이 언어'}는 지금 <b>출력 실행</b>만 지원해요.
                        <br />
                        한 줄씩 시각화는 Python에서 볼 수 있어요!
                      </p>
                    )}
                  </Placeholder>
                )}
              </VizBody>
            </VizGroup>
          </EditorRow>

          {/* ── 하단 패널: 변수 / 출력 ── */}
          <PanelResizer
            onPointerDown={onPanelResizeStart}
            onPointerMove={onPanelResizeMove}
            onPointerUp={onPanelResizeEnd}
            onDoubleClick={() => {
              setPanelHeight(200)
              localStorage.setItem('algohae:panelHeight', '200')
            }}
            title="드래그로 패널 크기 조절 · 더블클릭으로 초기화"
          />
          <Panel style={{ height: panelHeight }}>
            <PanelTabs>
              <PanelTabBtn
                type="button"
                $active={panelTab === 'vars'}
                onClick={() => setPanelTab('vars')}
              >
                변수
              </PanelTabBtn>
              <PanelTabBtn
                type="button"
                $active={panelTab === 'output'}
                onClick={() => setPanelTab('output')}
              >
                출력
              </PanelTabBtn>
              <PanelTabBtn
                type="button"
                $active={panelTab === 'stack'}
                onClick={() => setPanelTab('stack')}
              >
                호출 스택
              </PanelTabBtn>
            </PanelTabs>
            <PanelBody>
              {panelTab === 'vars' ? (
                hasPlayback ? (
                  <VariableTable snap={snap} prev={prev} />
                ) : (
                  <PanelEmpty>
                    {isPython
                      ? '실행하면 매 스텝의 변수가 여기에 나와요'
                      : '변수 추적은 Python에서 지원해요'}
                  </PanelEmpty>
                )
              ) : panelTab === 'stack' ? (
                hasPlayback ? (
                  <CallStackPanel snap={snap} prev={prev} />
                ) : (
                  <PanelEmpty>
                    {isPython
                      ? '실행하면 함수 호출 스택이 여기에 나와요 — 재귀 예제에서 진가를 발휘해요!'
                      : '호출 스택은 Python에서 지원해요'}
                  </PanelEmpty>
                )
              ) : hasPlayback && snap ? (
                <OutputPanel
                  stdout={result?.stdout ?? ''}
                  upto={snap.out}
                  error={result?.error ?? null}
                  limitHit={result?.limitHit ?? false}
                  isLast={step === total - 1}
                />
              ) : remote.status === 'done' ? (
                <RemoteResult>
                  {remote.out.stdout && <pre>{remote.out.stdout}</pre>}
                  {remote.out.stderr && <pre className="err">{remote.out.stderr}</pre>}
                  {!remote.out.stdout && !remote.out.stderr && (
                    <PanelEmpty>출력 없이 종료됐어요 (종료 코드 {remote.out.exitCode ?? '?'})</PanelEmpty>
                  )}
                  {/* JVM 계열 실행 서버는 한글 stdout이 ?로 깨짐 — 서버 측 인코딩 한계 */}
                  {activeFile !== null &&
                    (extOf(activeFile.name) === 'java' || extOf(activeFile.name) === 'kt') &&
                    remote.out.stdout.includes('?') && (
                      <Hint>💡 Java·Kotlin 실행 서버는 한글 출력이 ?로 깨질 수 있어요 (영문·숫자는 정상)</Hint>
                    )}
                </RemoteResult>
              ) : remote.status === 'running' ? (
                <PanelEmpty>
                  ⏳ 실행 서버에서 컴파일·실행 중… (컴파일 언어는 수십 초 걸릴 수 있어요)
                </PanelEmpty>
              ) : (
                <PanelEmpty>실행하면 출력이 여기에 나와요</PanelEmpty>
              )}
            </PanelBody>
          </Panel>
        </Center>
      </MainRow>

      {notice && <Notice>⚠ {notice}</Notice>}

      {/* ── 상태 바 (VS Code 블루) ── */}
      <StatusBar>
        <StatusItem>
          {!activeFile ? (
            '탐색기에서 파일을 열어보세요'
          ) : isPython ? (
            <>
              {runner.status === 'boot' && '⏳ 파이썬 실행 환경 준비 중 (최초 1회)'}
              {runner.status === 'ready' && '✓ 실행 준비 완료'}
              {runner.status === 'running' && '▶ 실행 중…'}
            </>
          ) : (
            <>
              {remote.status === 'running' && '▶ 실행 서버에서 컴파일·실행 중… (수십 초 걸릴 수 있어요)'}
              {remote.status === 'done' && '✓ 실행 완료'}
              {(remote.status === 'idle' || remote.status === 'error') &&
                `${lang?.name ?? '?'} — 실행 서버로 출력 실행`}
            </>
          )}
        </StatusItem>
        <StatusSpacer />
        {hasPlayback && (
          <StatusItem>
            스텝 {step + 1}/{total}
          </StatusItem>
        )}
        {activeFile && <StatusItem>줄 {codeLines.length}</StatusItem>}
        <StatusItem>UTF-8</StatusItem>
        {activeFile && (
          <StatusItem>{isPython ? 'Python (Pyodide)' : (lang?.name ?? '텍스트')}</StatusItem>
        )}
      </StatusBar>
    </Wrap>
  )
}

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
`

const Wrap = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${VS.editor};
  color: ${VS.text};
  animation: ${fadeUp} 0.3s ease both;

  /* 스크롤바도 적용된 테마를 따라간다 */
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--vs-list-active) transparent;
  }
`

// ── 메인 행 ──

const MainRow = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
`

const ActivityBar = styled.div`
  width: 48px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
  background: ${VS.activityBar};
`

const ActivityIcon = styled.button<{ $active?: boolean }>`
  width: 48px;
  height: 48px;
  border: none;
  background: none;
  color: ${({ $active }) => ($active ? 'var(--vs-text)' : 'var(--vs-text-dim)')};
  border-left: 2px solid ${({ $active }) => ($active ? 'var(--vs-text)' : 'transparent')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: var(--vs-text);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const ActivitySpacer = styled.div`
  flex: 1;
`

// ── 사이드바 ──

const SideBar = styled.div`
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: ${VS.sideBar};
  border-right: 1px solid var(--vs-border);
`

const SideBarTitle = styled.div`
  padding: 12px 18px 8px;
  font-size: 12px;
  letter-spacing: 0.5px;
  color: ${VS.sideBarHeader};
`

const SideBarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px 5px 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: ${VS.text};
  cursor: pointer;
  user-select: none;

  &:hover {
    background: ${VS.listHover};
  }
`

const Chev = styled.span<{ $open: boolean }>`
  display: inline-flex;
  width: 12px;
  justify-content: center;
  font-size: 10px;
  color: ${VS.textDim};
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  transition: transform 0.15s ease;
`

const HeadSpacer = styled.span`
  flex: 1;
`

const EmptyFiles = styled.p`
  margin: 4px 18px 8px 26px;
  font-size: 12px;
  color: ${VS.textDim};
`

const NewFileBtn = styled.button`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: none;
  color: ${VS.textDim};
  cursor: pointer;

  &:hover {
    background: ${VS.listHover};
    color: var(--vs-text);
  }
`

const FileList = styled.div`
  display: flex;
  flex-direction: column;
`

const FileItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  background: ${({ $active }) => ($active ? VS.listActive : 'transparent')};

  &:hover {
    background: ${({ $active }) => ($active ? VS.listActive : VS.listHover)};
  }

  &:hover button:last-child {
    opacity: 1;
  }
`

const FileButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 4px 5px 26px;
  border: none;
  text-align: left;
  font-size: 14px;
  font-family: inherit;
  color: ${VS.text};
  background: none;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FileDelete = styled.button`
  width: 28px;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: ${VS.textDim};
  cursor: pointer;
  opacity: 0;

  &:hover {
    color: var(--vs-text);
  }
`

const NewFileRow = styled.div`
  padding: 3px 10px 3px 26px;

  input {
    width: 100%;
    padding: 3px 6px;
    font-size: 12.5px;
    font-family: inherit;
    color: ${VS.text};
    background: var(--vs-list-hover);
    border: 1px solid var(--vs-accent);
    border-radius: 2px;
    outline: none;
  }
`

const ThemeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 8px 12px;
`

const ThemeItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--vs-accent)' : 'transparent')};
  border-radius: 6px;
  background: ${({ $active }) => ($active ? VS.listActive : 'transparent')};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ $active }) => ($active ? VS.listActive : VS.listHover)};
  }
`

const Swatch = styled.span`
  display: flex;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid #00000055;

  i {
    flex: 1;
  }
`

const ThemeMeta = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: 13.5px;
    font-weight: 600;
    color: ${VS.text};
  }

  span {
    font-size: 11.5px;
    color: ${VS.textDim};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const AppliedBadge = styled.span`
  flex-shrink: 0;
  padding: 2px 7px;
  font-size: 10.5px;
  font-weight: 700;
  color: #fff;
  background: ${VS.statusBar};
  border-radius: 999px;
`

// ── 에디터/시각화 그룹 ──

const Center = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`

const EditorRow = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
`

const EditorGroup = styled.div`
  min-width: 0;
  min-height: 0; /* 그리드 행 높이를 넘지 않게 — 없으면 긴 코드가 행을 뚫고 자란다 */
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--vs-border);
`

const VizGroup = styled.div`
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: ${VS.editor};
`

const TabsBar = styled.div`
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  background: ${VS.tabsBar};
`

const Tab = styled.div<{ $active?: boolean }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  font-size: 14px;
  color: ${({ $active }) => ($active ? 'var(--vs-text)' : 'var(--vs-text-dim)')};
  background: ${({ $active }) => ($active ? VS.tabActive : VS.tabInactive)};
  border-right: 1px solid var(--vs-border);
  cursor: pointer;
  white-space: nowrap;
`

const TabClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-left: 5px;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--vs-text-dim);
  cursor: pointer;

  &:hover {
    background: ${VS.listHover};
    color: var(--vs-text);
  }
`

const RenameRow = styled.div`
  flex: 1;
  padding: 3px 10px 3px 26px;

  input {
    width: 100%;
    padding: 3px 6px;
    font-size: 13px;
    font-family: inherit;
    color: ${VS.text};
    background: ${VS.listHover};
    border: 1px solid ${VS.accent};
    border-radius: 2px;
    outline: none;
  }
`

const TabBadge = styled.span`
  margin-left: 6px;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 10px;
  color: var(--vs-text-dim);
`

const TabsScroll = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  scrollbar-width: none; /* 탭바는 스크롤바 숨김 — 휠/트랙패드로 스크롤 */

  &::-webkit-scrollbar {
    display: none;
  }
`

const RunAction = styled.button<{ $stop?: boolean }>`
  width: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: ${({ $stop }) => ($stop ? '#f48771' : VS.run)};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${VS.tabInactive};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const StepRunAction = styled.button`
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--vs-accent, #0088ff);
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${VS.tabInactive};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const ReplayCta = styled.button`
  margin: 18px auto 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border: 1px solid var(--vs-accent, #0088ff);
  border-radius: 8px;
  background: transparent;
  color: var(--vs-accent, #0088ff);
  font-size: 13.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--vs-accent, #0088ff);
    color: #fff;
  }
`

const Breadcrumbs = styled.div`
  height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 14px;
  font-size: 12px;
  color: ${VS.textDim};
  background: ${VS.editor};
`

const EditorHost = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;

  /* @uiw/react-codemirror 래퍼까지 높이 체인을 이어줘야 내부 스크롤이 생긴다 */
  > div {
    height: 100%;
  }

  .cm-editor {
    height: 100%;
    font-size: 15px;
  }

  .cm-scroller {
    overflow: auto;
  }
`

const EmptyEditor = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;

  span {
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 44px;
    font-weight: 700;
    color: var(--vs-list-active);
  }

  p {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: ${VS.textDim};
  }

  small {
    font-size: 12.5px;
    color: ${VS.textDim};
    opacity: 0.8;
  }
`

const VizBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

const VizScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px 14px;
`

const VizControls = styled.div`
  flex-shrink: 0;
  padding: 10px 14px;
  border-top: 1px solid var(--vs-border);
`

const Placeholder = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;

  span {
    font-size: 36px;
    color: var(--vs-text-dim);
  }

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    color: ${VS.textDim};
  }

  b {
    color: ${VS.text};
  }
`

// ── 하단 패널 ──

const PanelResizer = styled.div`
  height: 5px;
  margin-bottom: -5px;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
  cursor: row-resize;
  touch-action: none;
  background: transparent;
  transition: background 0.15s ease;

  &:hover,
  &:active {
    background: var(--vs-accent);
  }
`

const Panel = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: ${VS.panel};
  border-top: 1px solid var(--vs-border);
`

const PanelTabs = styled.div`
  flex-shrink: 0;
  display: flex;
  gap: 14px;
  padding: 0 14px;
`

const PanelTabBtn = styled.button<{ $active: boolean }>`
  padding: 8px 2px 6px;
  border: none;
  background: none;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: ${({ $active }) => ($active ? 'var(--vs-text)' : VS.textDim)};
  border-bottom: 1px solid ${({ $active }) => ($active ? 'var(--vs-text)' : 'transparent')};
  cursor: pointer;
`

const PanelBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

const PanelEmpty = styled.p`
  margin: 14px;
  font-size: 14px;
  font-family: 'SF Mono', Menlo, monospace;
  color: ${VS.textDim};
`

const Hint = styled.p`
  margin: 10px 0 0;
  font-size: 12px;
  color: ${VS.textDim};
`

const RemoteResult = styled.div`
  padding: 10px 14px;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.6;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }

  pre.err {
    color: #f48771;
    margin-top: 6px;
  }
`

// ── 알림 / 상태바 ──

const Notice = styled.div`
  padding: 8px 14px;
  font-size: 12.5px;
  color: #ddb45f;
  background: rgba(217, 168, 51, 0.08);
  border-top: 1px solid var(--vs-border);
  white-space: pre-wrap;
`

const StatusBar = styled.footer`
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 12px;
  background: ${VS.statusBar};
  color: #ffffff;
`

const StatusItem = styled.span`
  font-size: 12.5px;
  white-space: nowrap;
`

const StatusSpacer = styled.div`
  flex: 1;
`
