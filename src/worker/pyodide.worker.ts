// Pyodide 실행 Worker (명세서 1.4 실행 격리)
// 메인 스레드 실행 금지 — UI 프리즈 방지 + 무한루프 시 terminate()로 강제 종료
import tracerCode from './tracer.py?raw'
import type { RunResult } from '../types/snapshot'

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

interface PyProxy {
  (code: string): string
  destroy: () => void
}

interface PyodideApi {
  runPython: (code: string) => unknown
  globals: { get: (name: string) => PyProxy }
}

interface LoadPyodideModule {
  loadPyodide: (opts: { indexURL: string }) => Promise<PyodideApi>
}

type InMsg = { type: 'preload' } | { type: 'run'; code: string }
type OutMsg =
  | { type: 'ready' }
  | { type: 'result'; payload: RunResult }
  | { type: 'error'; message: string }

const post = (msg: OutMsg) => self.postMessage(msg)

let pyodidePromise: Promise<PyodideApi> | null = null

function getPyodide(): Promise<PyodideApi> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const moduleUrl = `${PYODIDE_URL}pyodide.mjs`
      const mod = (await import(/* @vite-ignore */ moduleUrl)) as LoadPyodideModule
      const pyodide = await mod.loadPyodide({ indexURL: PYODIDE_URL })
      pyodide.runPython(tracerCode) // 추적 엔진 로드
      return pyodide
    })()
  }
  return pyodidePromise
}

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data
  try {
    if (msg.type === 'preload') {
      await getPyodide()
      post({ type: 'ready' })
    } else if (msg.type === 'run') {
      const pyodide = await getPyodide()
      const runTraced = pyodide.globals.get('run_traced')
      try {
        const json = runTraced(msg.code)
        post({ type: 'result', payload: JSON.parse(json) as RunResult })
      } finally {
        runTraced.destroy()
      }
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
