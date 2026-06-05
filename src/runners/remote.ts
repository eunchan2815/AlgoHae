// F-35 다국어 실행 — 실행 서버로 컴파일·실행 (출력만)
// Wandbox(기본) + godbolt/Compiler Explorer(Wandbox가 깨졌거나 없는 언어: Swift, Kotlin)
// 주의: 이 경로로 실행하면 코드가 외부 서버로 전송된다. Python(브라우저 내 실행)과 구분할 것.
import type { RemoteRunner } from '../data/langs'

const WANDBOX_API = 'https://wandbox.org/api'
const GODBOLT_API = 'https://godbolt.org/api'

export interface RemoteOutput {
  stdout: string
  stderr: string
  exitCode: number | null
}

// ── Wandbox ──

interface WandboxCompiler {
  name: string
  language: string
}

let compilersPromise: Promise<WandboxCompiler[]> | null = null

function getWandboxCompilers(): Promise<WandboxCompiler[]> {
  if (!compilersPromise) {
    compilersPromise = fetch(`${WANDBOX_API}/list.json`).then((res) => {
      if (!res.ok) {
        compilersPromise = null
        throw new Error(`실행 서버에 연결하지 못했어요 (${res.status})`)
      }
      return res.json() as Promise<WandboxCompiler[]>
    })
  }
  return compilersPromise
}

// JVM 계열은 서버 기본 인코딩이 ASCII라 한글 출력이 ?로 깨진다.
// main 진입 직후에 UTF-8 PrintStream 설정을 자동 주입해서 해결 (실험으로 검증됨)
function injectJavaUtf8(content: string): string {
  return content.replace(
    /(public\s+static\s+void\s+main\s*\([^)]*\)\s*\{)/,
    '$1\n        System.setOut(new java.io.PrintStream(System.out, true, java.nio.charset.StandardCharsets.UTF_8));',
  )
}

function injectCsUtf8(content: string): string {
  // mono 콘솔도 한글이 ?로 깨진다 — Main 진입 직후 UTF-8(BOM 없이) 설정
  return content.replace(
    /(static\s+\w+\s+Main\s*\([^)]*\)\s*\{)/,
    '$1\n        System.Console.OutputEncoding = new System.Text.UTF8Encoding(false);',
  )
}

function injectKotlinUtf8(content: string): string {
  return content.replace(
    /(fun\s+main\s*\([^)]*\)\s*\{)/,
    '$1\n    System.setOut(java.io.PrintStream(System.out, true, "UTF-8"))',
  )
}

async function runWandbox(
  language: string,
  content: string,
  signal?: AbortSignal,
): Promise<RemoteOutput> {
  const compilers = await getWandboxCompilers()
  // 목록 첫 항목이 최신
  const compiler = compilers.find((c) => c.language === language)
  if (!compiler) throw new Error(`이 언어의 실행 환경을 찾지 못했어요: ${language}`)
  if (language === 'Java') content = injectJavaUtf8(content)
  if (language === 'C#') content = injectCsUtf8(content)

  const res = await fetch(`${WANDBOX_API}/compile.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ compiler: compiler.name, code: content }),
  })
  if (!res.ok) throw new Error(`실행 서버 오류 (${res.status}) — 잠시 후 다시 시도해 주세요`)

  const data = await res.json()
  const stderr = [data.compiler_error, data.program_error].filter(Boolean).join('\n')
  // 서버 쪽 언어 컨테이너 고장 (예: Swift catatonit 오류) — 사용자 잘못이 아님
  if (stderr.includes('catatonit')) {
    throw new Error('실행 서버의 이 언어 환경이 점검 중이에요 — 잠시 후 다시 시도해 주세요')
  }
  return {
    stdout: (data.program_output ?? '').replace(/^\uFEFF/, ''),
    stderr,
    exitCode: data.status !== undefined && data.status !== '' ? Number(data.status) : null,
  }
}

// ── godbolt (Compiler Explorer) ──

interface GodboltLine {
  text: string
}

async function runGodbolt(
  compiler: string,
  content: string,
  signal?: AbortSignal,
): Promise<RemoteOutput> {
  if (compiler.startsWith('kotlinc')) content = injectKotlinUtf8(content)
  const res = await fetch(`${GODBOLT_API}/compiler/${compiler}/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal,
    body: JSON.stringify({
      source: content,
      options: {
        compilerOptions: { executorRequest: true },
        filters: { execute: true },
        executeParameters: { args: [], stdin: '' },
      },
    }),
  })
  if (!res.ok) throw new Error(`실행 서버 오류 (${res.status}) — 잠시 후 다시 시도해 주세요`)

  const data = await res.json()
  const lines = (arr: GodboltLine[] | undefined) => (arr ?? []).map((l) => l.text).join('\n')
  // 빌드가 성공했으면 빌드 경고(jansi 등 노이즈)는 숨기고 프로그램 stderr만 보여준다
  const buildOk = data.buildResult?.code === 0
  const buildStderr = buildOk ? '' : lines(data.buildResult?.stderr)
  return {
    stdout: lines(data.stdout),
    stderr: [buildStderr, lines(data.stderr)].filter(Boolean).join('\n'),
    exitCode: typeof data.code === 'number' ? data.code : null,
  }
}

// ── 공통 진입점 ──

/** F-10과 같은 취지의 시간 상한 — 서버가 응답을 안 주면 무한 "실행 중"에 갇히지 않게 */
const REMOTE_TIMEOUT_MS = 90_000

export async function runRemote(
  runner: RemoteRunner,
  content: string,
  signal?: AbortSignal,
): Promise<RemoteOutput> {
  const timeout = AbortSignal.timeout(REMOTE_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  try {
    return runner.type === 'wandbox'
      ? await runWandbox(runner.language, content, combined)
      : await runGodbolt(runner.compiler, content, combined)
  } catch (err) {
    if (timeout.aborted && !signal?.aborted) {
      throw new Error('실행 서버 응답이 너무 늦어요 (90초 초과) — 잠시 후 다시 시도해 주세요', {
        cause: err,
      })
    }
    throw err
  }
}
