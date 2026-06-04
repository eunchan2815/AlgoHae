// 코드 실행 페이지 (/playground) — VS Code와 동일한 디자인
// 멀티 파일(F-34): 탐색기에서 파일 생성·삭제·전환. 확장자로 언어 결정.
// 실행(F-05/F-35): .py는 브라우저 내 Pyodide 추적+시각화, 그 외 언어는 실행 서버(Wandbox)로 출력 실행.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
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
import { FilesIcon, RunIcon, StopIcon, HomeIcon, NewFileIcon, CloseIcon, ExtensionsIcon } from './icons'
import VizPanel from './VizPanel'
import VariableTable from './VariableTable'
import OutputPanel from './OutputPanel'
import PlayerControls from './PlayerControls'

const FILES_KEY = 'algohae:files' // F-34 멀티 파일 저장
const ACTIVE_KEY = 'algohae:activeFile'
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
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
    case 'cpp':
    case 'cs':
      return [cpp()]
    default:
      return []
  }
}

type PanelTab = 'vars' | 'output'

type RemoteState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; out: RemoteOutput }
  | { status: 'error'; message: string }

// VS Code Dark+ 팔레트
const VS = {
  titleBar: '#323233',
  activityBar: '#333333',
  sideBar: '#252526',
  sideBarHeader: '#bbbbbb',
  tabsBar: '#252526',
  tabInactive: '#2d2d2d',
  tabActive: '#1e1e1e',
  editor: '#1e1e1e',
  panel: '#1e1e1e',
  statusBar: '#007acc',
  text: '#cccccc',
  textDim: '#858585',
  listHover: '#2a2d2e',
  listActive: '#37373d',
  run: '#89d185',
} as const

export default function Playground() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<UserFile[]>(loadFiles)
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_KEY)
    const initial = loadFiles()
    return initial.some((f) => f.id === saved) ? (saved as string) : initial[0].id
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
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [remote, setRemote] = useState<RemoteState>({ status: 'idle' })
  const remoteAbort = useRef<AbortController | null>(null)
  const editorRef = useRef<EditorView | null>(null)
  const runner = usePythonRunner()

  const editorTheme = themeById(themeId)

  const selectTheme = (id: string) => {
    setThemeId(id)
    localStorage.setItem('algohae:theme', id)
  }

  const activeFile = files.find((f) => f.id === activeId) ?? files[0]
  const code = activeFile.content
  const lang = langOf(activeFile.name)
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

  // F-22 자동 재생 — 한 틱씩 예약 (끝에 도달하면 자동 정지)
  useEffect(() => {
    if (!playing) return
    if (step >= total - 1) return
    const id = window.setTimeout(() => {
      setStep(step + 1)
      if (step + 1 >= total - 1) setPlaying(false)
    }, 500 / speed)
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
    updateFiles(files.map((f) => (f.id === activeFile.id ? { ...f, content: value } : f)))
    // 코드가 바뀌면 이전 실행 결과는 무효
    if (result || remote.status !== 'idle') clearRunState()
  }

  const selectFile = (id: string) => {
    if (id === activeId) return
    setActiveId(id)
    localStorage.setItem(ACTIVE_KEY, id)
    setEditNotice(null)
    clearRunState()
  }

  const createFile = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setCreating(false)
      return
    }
    const name = trimmed.includes('.') ? trimmed : `${trimmed}.py`
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
    if (files.length <= 1) return
    const next = files.filter((f) => f.id !== id)
    updateFiles(next)
    if (id === activeId) {
      setActiveId(next[0].id)
      localStorage.setItem(ACTIVE_KEY, next[0].id)
      clearRunState()
    }
  }

  // 예제/템플릿 클릭 → 같은 이름의 파일을 내 파일에 만들고(있으면 갱신) 연다
  const loadTemplate = (name: string, content: string) => {
    const existing = files.find((f) => f.name === name)
    if (existing) {
      updateFiles(files.map((f) => (f.id === existing.id ? { ...f, content } : f)))
      selectFile(existing.id)
    } else {
      const file: UserFile = { id: newFileId(), name, content }
      updateFiles([...files, file])
      setActiveId(file.id)
      localStorage.setItem(ACTIVE_KEY, file.id)
      clearRunState()
    }
  }

  const loadExample = (example: Example) => {
    loadTemplate(`${example.id.replace(/-/g, '_')}.py`, example.code)
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

  const handleRun = () => {
    setEditNotice(null)
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
  const runDisabled = isPython ? runner.status !== 'ready' : remote.status === 'running'

  const notice =
    editNotice ??
    startFailedNotice ??
    runner.fatal ??
    (remote.status === 'error' ? remote.message : null)

  return (
    <Wrap>
      {/* ── 타이틀 바 ── */}
      <TitleBar>
        <TrafficLights aria-hidden="true">
          <i style={{ background: '#ff5f57' }} />
          <i style={{ background: '#febc2e' }} />
          <i style={{ background: '#28c840' }} />
        </TrafficLights>
        <TitleText>{activeFile.name} — 알고해</TitleText>
      </TitleBar>

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
            onClick={handleRun}
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

            <SideBarSection>
              내 파일
              <NewFileBtn
                type="button"
                title="새 파일"
                onClick={() => {
                  setCreating(true)
                  setNewName('')
                }}
              >
                <NewFileIcon />
              </NewFileBtn>
            </SideBarSection>
            <FileList>
              {files.map((file) => {
                const fileLang = langOf(file.name)
                return (
                  <FileItem key={file.id} $active={file.id === activeFile.id}>
                    <FileButton type="button" onClick={() => selectFile(file.id)}>
                      <img src={fileLang?.logo ?? pythonLogo} alt="" width={14} height={14} />
                      {file.name}
                    </FileButton>
                    {files.length > 1 && (
                      <FileDelete
                        type="button"
                        title="파일 삭제"
                        onClick={() => deleteFile(file.id)}
                      >
                        <CloseIcon />
                      </FileDelete>
                    )}
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

            <SideBarSection>예제</SideBarSection>
            <FileList>
              {EXAMPLES.map((ex) => (
                <FileItem key={ex.id} $active={false}>
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

            <SideBarSection>언어 예제</SideBarSection>
            <FileList>
              {LANG_EXAMPLES.map((le) => (
                <FileItem key={le.name} $active={false}>
                  <FileButton
                    type="button"
                    onClick={() => loadTemplate(le.name, le.content)}
                    title={`${langOf(le.name)?.name ?? ''} 실행 예제`}
                  >
                    <img src={langOf(le.name)?.logo ?? pythonLogo} alt="" width={15} height={15} />
                    {le.name}
                  </FileButton>
                </FileItem>
              ))}
            </FileList>
          </SideBar>
        )}

        {/* ── 중앙: 에디터 그룹 + 시각화 그룹 + 하단 패널 ── */}
        <Center>
          <EditorRow>
            <EditorGroup>
              <TabsBar>
                <Tab $active>
                  <img src={lang?.logo ?? pythonLogo} alt="" width={14} height={14} />
                  {activeFile.name}
                  <TabClose aria-hidden="true">×</TabClose>
                </Tab>
                <TabsSpacer />
                {isRunning ? (
                  <RunAction type="button" onClick={handleStop} title="실행 중단" $stop>
                    <StopIcon />
                  </RunAction>
                ) : (
                  <RunAction
                    type="button"
                    onClick={handleRun}
                    disabled={runDisabled}
                    title={isPython ? '실행 (변수 추적 시작)' : `실행 (${lang?.name ?? ''} — 실행 서버)`}
                  >
                    <RunIcon size={20} />
                  </RunAction>
                )}
              </TabsBar>
              <Breadcrumbs>ALGOHAE › {activeFile.name}</Breadcrumbs>
              <EditorHost>
                <CodeMirror
                  key={activeFile.id}
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
                    {isPython ? (
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
          <Panel>
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
                  {(extOf(activeFile.name) === 'java' || extOf(activeFile.name) === 'kt') &&
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
          {isPython ? (
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
        <StatusItem>줄 {codeLines.length}</StatusItem>
        <StatusItem>UTF-8</StatusItem>
        <StatusItem>{isPython ? 'Python (Pyodide)' : (lang?.name ?? '텍스트')}</StatusItem>
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
`

// ── 타이틀 바 ──

const TitleBar = styled.div`
  position: relative;
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${VS.titleBar};
  border-bottom: 1px solid #252525;
`

const TrafficLights = styled.div`
  position: absolute;
  left: 12px;
  display: flex;
  gap: 8px;

  i {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
`

const TitleText = styled.span`
  font-size: 12.5px;
  color: #9d9d9d;
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
  color: ${({ $active }) => ($active ? '#ffffff' : '#858585')};
  border-left: 2px solid ${({ $active }) => ($active ? '#ffffff' : 'transparent')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: #ffffff;
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
  border-right: 1px solid #1e1e1e;
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
  justify-content: space-between;
  padding: 8px 12px 5px 18px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: ${VS.text};
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
    color: #fff;
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
    color: #fff;
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
    background: #3c3c3c;
    border: 1px solid #007fd4;
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
  border: 1px solid ${({ $active }) => ($active ? '#007fd4' : 'transparent')};
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
  display: flex;
  flex-direction: column;
  border-right: 1px solid #1e1e1e;
`

const VizGroup = styled.div`
  min-width: 0;
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
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  font-size: 14px;
  color: ${({ $active }) => ($active ? '#ffffff' : '#969696')};
  background: ${({ $active }) => ($active ? VS.tabActive : VS.tabInactive)};
  border-right: 1px solid #252525;
`

const TabClose = styled.span`
  margin-left: 4px;
  color: #858585;
  font-size: 14px;
`

const TabBadge = styled.span`
  margin-left: 6px;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 10px;
  color: #858585;
`

const TabsSpacer = styled.div`
  flex: 1;
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

  .cm-editor {
    height: 100%;
    font-size: 15px;
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
  border-top: 1px solid #2b2b2b;
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
    color: #3a3f47;
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

const Panel = styled.div`
  height: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: ${VS.panel};
  border-top: 1px solid #2b2b2b;
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
  color: ${({ $active }) => ($active ? '#e7e7e7' : VS.textDim)};
  border-bottom: 1px solid ${({ $active }) => ($active ? '#e7e7e7' : 'transparent')};
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
  border-top: 1px solid #2b2b2b;
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
