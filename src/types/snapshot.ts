// 명세서 4장 — 공통 데이터 계약 (하나의 스냅샷, 두 가지 렌더링)

export type TypeTag = 'scalar' | 'list' | 'dict' | 'deque' | 'tree' | 'opaque'

/** F-20 이진 트리 노드 (tracer가 left/right 속성 객체를 직렬화한 결과) */
export interface TreeNode {
  v: number | string
  l: TreeNode | null
  r: TreeNode | null
}

export interface CapturedValue {
  /** 타입 태그 — 특화 렌더러 분기 기준 */
  t: TypeTag
  /** 값 — 타입에 따라 형태가 다름 */
  v: number | string | CapturedValue[] | [string, CapturedValue][] | TreeNode | null
  /** 리스트일 때: 전부 숫자인지 (막대 렌더 가능 판단) */
  num?: boolean
  /** 리스트·딕셔너리·덱의 원본 길이 (축약 시 표시용) */
  len?: number
}

export type SnapshotEvent = 'line' | 'return' | 'exception' | 'done'

export interface Snapshot {
  step: number
  /** 실행 중인 줄 번호 (event가 done이면 -1) */
  line: number
  event: SnapshotEvent
  /** 현재 함수 이름 (모듈 레벨은 "<module>") */
  func: string
  /** 호출 깊이 (0 = 모듈 레벨) */
  depth: number
  /** 현재 프레임의 지역 변수 */
  vars: Record<string, CapturedValue>
  /** 이 스텝까지 누적된 stdout 글자 수 */
  out: number
}

export interface RunError {
  type: 'syntax' | 'runtime' | 'input'
  line: number | null
  message: string
}

export interface RunResult {
  snapshots: Snapshot[]
  stdout: string
  /** 스텝 상한(4000) 도달 여부 */
  limitHit: boolean
  error: RunError | null
}
