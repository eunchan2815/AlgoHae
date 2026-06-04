// F-35 다국어 실행 — Wandbox 공개 실행 서버 (컴파일 언어의 출력 실행)
// 주의: 이 경로로 실행하면 코드가 외부 서버로 전송된다. Python(브라우저 내 실행)과 구분할 것.
const API = 'https://wandbox.org/api'

interface WandboxCompiler {
  name: string
  language: string
}

export interface RemoteOutput {
  stdout: string
  stderr: string
  exitCode: number | null
}

let compilersPromise: Promise<WandboxCompiler[]> | null = null

function getCompilers(): Promise<WandboxCompiler[]> {
  if (!compilersPromise) {
    compilersPromise = fetch(`${API}/list.json`).then((res) => {
      if (!res.ok) {
        compilersPromise = null
        throw new Error(`실행 서버에 연결하지 못했어요 (${res.status})`)
      }
      return res.json() as Promise<WandboxCompiler[]>
    })
  }
  return compilersPromise
}

/** 언어 이름(Wandbox 기준)에 맞는 컴파일러를 고른다 — 목록 첫 항목이 최신 */
async function pickCompiler(language: string): Promise<string> {
  const compilers = await getCompilers()
  const found = compilers.find((c) => c.language === language)
  if (!found) throw new Error(`이 언어의 실행 환경을 찾지 못했어요: ${language}`)
  return found.name
}

export async function runRemote(
  language: string,
  content: string,
  signal?: AbortSignal,
): Promise<RemoteOutput> {
  const compiler = await pickCompiler(language)
  const res = await fetch(`${API}/compile.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ compiler, code: content }),
  })
  if (!res.ok) throw new Error(`실행 서버 오류 (${res.status}) — 잠시 후 다시 시도해 주세요`)

  const data = await res.json()
  const stderr = [data.compiler_error, data.program_error].filter(Boolean).join('\n')
  const exitCode = data.status !== undefined && data.status !== '' ? Number(data.status) : null
  return {
    stdout: data.program_output ?? '',
    stderr,
    exitCode,
  }
}
