// Worker 통신 + 실행 상태 관리 (F-05, F-08, F-10, F-28)
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RunResult } from '../types/snapshot'

export type RunnerStatus = 'boot' | 'ready' | 'running'

type WorkerMsg =
  | { type: 'ready' }
  | { type: 'result'; payload: RunResult }
  | { type: 'error'; message: string }

/** F-10 무한루프 방어 ② — 시간 상한. 초과 시 Worker를 강제 종료한다 */
const RUN_TIMEOUT_MS = 30_000

export function usePythonRunner(onResult?: (result: RunResult) => void) {
  const workerRef = useRef<Worker | null>(null)
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  })
  const timeoutRef = useRef<number | null>(null)
  const [status, setStatus] = useState<RunnerStatus>('boot')
  const [result, setResult] = useState<RunResult | null>(null)
  const [fatal, setFatal] = useState<string | null>(null)

  const clearRunTimeout = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  // 주의: spawn은 setState를 하지 않는다 (마운트 effect에서 호출되므로).
  // 상태 전환은 호출자(이벤트 핸들러·타임아웃·onmessage)가 책임진다.
  const spawn = useCallback(() => {
    workerRef.current?.terminate()
    const worker = new Worker(new URL('../worker/pyodide.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const msg = e.data
      if (msg.type === 'ready') {
        setStatus('ready')
      } else if (msg.type === 'result') {
        clearRunTimeout()
        setResult(msg.payload)
        setStatus('ready')
        onResultRef.current?.(msg.payload)
      } else if (msg.type === 'error') {
        clearRunTimeout()
        setFatal(`실행 환경에 문제가 생겼어요: ${msg.message}`)
        setStatus('ready')
      }
    }
    worker.postMessage({ type: 'preload' }) // F-31 사전 로딩
    workerRef.current = worker
  }, [])

  useEffect(() => {
    spawn()
    return () => {
      clearRunTimeout()
      workerRef.current?.terminate()
    }
  }, [spawn])

  const run = useCallback(
    (code: string) => {
      if (!workerRef.current) return
      setResult(null)
      setFatal(null)
      setStatus('running')
      workerRef.current.postMessage({ type: 'run', code })
      timeoutRef.current = window.setTimeout(() => {
        setFatal('실행이 너무 오래 걸려서 중단했어요 (30초 제한). 무한 루프가 있는지 확인해 보세요.')
        setStatus('boot')
        spawn() // terminate + 재생성 — C-레벨 장기 연산의 유일한 탈출구
      }, RUN_TIMEOUT_MS)
    },
    [spawn],
  )

  /** F-28 실행 중단 버튼 */
  const stop = useCallback(() => {
    clearRunTimeout()
    setFatal('실행을 중단했어요.')
    setStatus('boot')
    spawn()
  }, [spawn])

  const clearResult = useCallback(() => {
    setResult(null)
    setFatal(null)
  }, [])

  return { status, result, fatal, run, stop, clearResult }
}
