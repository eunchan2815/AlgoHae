// 특화 레이어 — 타입 태그별 렌더러 분기 (명세서 "하나의 스냅샷, 두 가지 렌더링")
// F-16 막대 / F-17 박스열 / F-18 딕셔너리 카드 / F-19 스택·큐 / F-20 트리 / F-36 2D 그리드 / F-37 포인터 마커
import { useState, type CSSProperties, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { theme } from '../styles/theme'
import type { CapturedValue, Snapshot, TreeNode } from '../types/snapshot'

interface Props {
  snap: Snapshot
  prev: Snapshot | null
  /** 현재 실행 중인 줄의 코드 텍스트 — arr[j] 같은 접근 패턴 감지용 */
  currentLineText: string
}

type Ring = 'teal' | 'gold' | 'none'

/** 박스 한 칸의 가로 이동 거리 (min-width 54 + gap 12) */
const BOX_STEP = 66

/** 원소가 전부 스칼라인 시퀀스인가 */
function scalarItems(value: CapturedValue): CapturedValue[] | null {
  if ((value.t !== 'list' && value.t !== 'deque') || !Array.isArray(value.v)) return null
  const items = value.v as CapturedValue[]
  return items.every((item) => item.t === 'scalar') ? items : null
}

/** F-36: 모든 행이 "스칼라로만 이뤄진 리스트"인 2차원 리스트인가 */
function gridRows(value: CapturedValue): CapturedValue[][] | null {
  if (value.t !== 'list' || !Array.isArray(value.v)) return null
  const rows = value.v as CapturedValue[]
  if (rows.length === 0) return null
  const out: CapturedValue[][] = []
  for (const row of rows) {
    if (row.t !== 'list' || !Array.isArray(row.v)) return null
    const cells = row.v as CapturedValue[]
    if (cells.length === 0 || !cells.every((c) => c.t === 'scalar')) return null
    out.push(cells)
  }
  return out
}

/** F-18: 값이 전부 스칼라인 딕셔너리 엔트리 */
function dictEntries(value: CapturedValue): [string, CapturedValue][] | null {
  if (value.t !== 'dict' || !Array.isArray(value.v)) return null
  const entries = value.v as [string, CapturedValue][]
  return entries.every(([, v]) => v.t === 'scalar') ? entries : null
}

type RendererKind = 'boxes' | 'stack' | 'queue' | 'tree' | 'dict' | 'grid' | null

/** 어떤 렌더러를 쓸까 — 타입 태그 + 변수명 휴리스틱 (F-19) */
function pickRenderer(name: string, value: CapturedValue): RendererKind {
  if (value.t === 'tree') return 'tree'
  if (value.t === 'dict') return dictEntries(value) ? 'dict' : null
  if (gridRows(value)) return 'grid'
  if (scalarItems(value) === null) return null
  if (value.t === 'deque') return 'queue'
  if (/stack|스택/i.test(name)) return 'stack'
  if (/queue|큐/i.test(name)) return 'queue'
  return 'boxes'
}

// ── F-37 인덱스 포인터 마커 ──

const INDEX_NAMES = new Set([
  'i', 'j', 'k', 'left', 'right', 'lo', 'hi', 'low', 'high',
  'start', 'end', 'mid', 'front', 'rear', 'top', 'idx', 'pos',
])

/** 리스트를 가리키는 인덱스 변수들 → { 인덱스: [변수명…] } */
function pointerMap(
  listName: string,
  lineText: string,
  vars: Record<string, CapturedValue>,
  length: number,
): Map<number, string[]> {
  // 현재 줄에서 listName[변수] 형태로 쓰인 변수는 이름과 무관하게 포함
  const usedNames = new Set<string>()
  const re = new RegExp(`\\b${listName}\\[([A-Za-z_]\\w*)\\]`, 'g')
  for (const m of lineText.matchAll(re)) usedNames.add(m[1])

  const out = new Map<number, string[]>()
  for (const [name, v] of Object.entries(vars)) {
    if (v.t !== 'scalar' || typeof v.v !== 'number' || !Number.isInteger(v.v)) continue
    if (v.v < 0 || v.v >= length) continue
    if (!usedNames.has(name) && !INDEX_NAMES.has(name)) continue
    const list = out.get(v.v) ?? []
    list.push(name)
    out.set(v.v, list)
  }
  return out
}

function PointerMarkers({ count, pointers }: { count: number; pointers: Map<number, string[]> }) {
  if (pointers.size === 0) return null
  return (
    <MarkerRow>
      {Array.from({ length: count }, (_, i) => (
        <MarkerCell key={i}>
          {pointers.has(i) && (
            <>
              <MarkerArrow>↑</MarkerArrow>
              {pointers.get(i)!.join(',')}
            </>
          )}
        </MarkerCell>
      ))}
    </MarkerRow>
  )
}

/** 현재 줄에서 `name[i]`, `name[i + 1]`, `name[0]` 패턴을 찾아 인덱스로 해석 */
function accessedIndices(
  name: string,
  lineText: string,
  vars: Record<string, CapturedValue>,
): number[] {
  const re = new RegExp(`\\b${name}\\[(\\w+)(?:\\s*([+-])\\s*(\\d+))?\\]`, 'g')
  const found: number[] = []
  for (const m of lineText.matchAll(re)) {
    const [, base, op, offset] = m
    let idx: number | null = null
    if (/^\d+$/.test(base)) {
      idx = Number(base)
    } else {
      const v = vars[base]
      if (v && v.t === 'scalar' && typeof v.v === 'number') idx = v.v
    }
    if (idx === null) continue
    if (op && offset) idx = op === '+' ? idx + Number(offset) : idx - Number(offset)
    if (!found.includes(idx)) found.push(idx)
  }
  return found
}

/** 각 위치의 값이 직전 스냅샷의 어디에서 왔는지 추적 (FLIP 애니메이션용) */
function fromIndices(prevItems: CapturedValue[] | null, items: CapturedValue[]): (number | null)[] {
  if (!prevItems) return items.map(() => null)
  const used = new Set<number>()
  const cur = items.map((item) => JSON.stringify(item))
  const old = prevItems.map((item) => JSON.stringify(item))
  items.forEach((_, i) => {
    if (old[i] === cur[i]) used.add(i)
  })
  return items.map((_, i) => {
    if (old[i] === cur[i]) return null
    let best: number | null = null
    for (let j = 0; j < old.length; j++) {
      if (used.has(j) || old[j] !== cur[i]) continue
      if (best === null || Math.abs(j - i) < Math.abs(best - i)) best = j
    }
    if (best !== null) used.add(best)
    return best
  })
}

function ringFor(i: number, accessed: number[], changed: boolean): Ring {
  let ring: Ring = 'none'
  if (accessed[0] === i) ring = 'teal'
  if (accessed[1] === i || changed) ring = 'gold'
  return ring
}

// ── F-17 박스열 ──

function BoxesViz({
  name,
  items,
  prevItems,
  accessed,
  step,
}: {
  name: string
  items: CapturedValue[]
  prevItems: CapturedValue[] | null
  accessed: number[]
  step: number
}) {
  const origins = fromIndices(prevItems, items)
  return (
    <BoxRow>
      {items.map((item, i) => {
        const changed = prevItems !== null && JSON.stringify(prevItems[i]) !== JSON.stringify(item)
        const from = origins[i]
        return (
          <Box
            key={`${step}-${name}-${i}`}
            $ring={ringFor(i, accessed, changed)}
            $moved={from !== null}
            style={
              from !== null ? ({ '--dx': `${(from - i) * BOX_STEP}px` } as CSSProperties) : undefined
            }
          >
            {String(item.v)}
          </Box>
        )
      })}
    </BoxRow>
  )
}

// ── F-16 막대 그래프 (숫자 리스트 전용, 박스와 토글) ──

function BarsViz({
  name,
  items,
  prevItems,
  accessed,
  step,
}: {
  name: string
  items: CapturedValue[]
  prevItems: CapturedValue[] | null
  accessed: number[]
  step: number
}) {
  const origins = fromIndices(prevItems, items)
  const values = items.map((item) => (typeof item.v === 'number' ? item.v : 0))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const H_MIN = 16
  const H_MAX = 110

  return (
    <BarRow>
      {items.map((item, i) => {
        const changed = prevItems !== null && JSON.stringify(prevItems[i]) !== JSON.stringify(item)
        const from = origins[i]
        const h = H_MIN + ((values[i] - min) / span) * (H_MAX - H_MIN)
        return (
          <BarCol
            key={`${step}-${name}-${i}`}
            $moved={from !== null}
            style={
              from !== null ? ({ '--dx': `${(from - i) * BOX_STEP}px` } as CSSProperties) : undefined
            }
          >
            <BarValue>{String(item.v)}</BarValue>
            <Bar $ring={ringFor(i, accessed, changed)} style={{ height: `${Math.round(h)}px` }} />
          </BarCol>
        )
      })}
    </BarRow>
  )
}

// ── F-18 딕셔너리 키-값 카드 ──

function DictViz({
  entries,
  prevEntries,
  step,
}: {
  entries: [string, CapturedValue][]
  prevEntries: [string, CapturedValue][] | null
  step: number
}) {
  const prevMap = prevEntries ? new Map(prevEntries.map(([k, v]) => [k, JSON.stringify(v)])) : null
  const shown = entries.slice(0, 12)

  if (entries.length === 0) return <EmptyHint>(빈 딕셔너리)</EmptyHint>

  return (
    <DictRow>
      {shown.map(([key, value]) => {
        const prevJson = prevMap?.get(key)
        const isNew = prevMap !== null && prevJson === undefined
        const changed = prevJson !== undefined && prevJson !== JSON.stringify(value)
        return (
          <DictCard key={`${step}-${key}`} $ring={changed || isNew ? 'gold' : 'none'} $drop={isNew}>
            <DictKey>{key}</DictKey>
            <DictVal>{String(value.v)}</DictVal>
          </DictCard>
        )
      })}
      {entries.length > shown.length && <EmptyHint>… 전체 {entries.length}개</EmptyHint>}
    </DictRow>
  )
}

// ── F-36 2D 그리드 (행렬·DP 테이블) ──

function GridViz({
  rows,
  prevRows,
  step,
  name,
}: {
  rows: CapturedValue[][]
  prevRows: CapturedValue[][] | null
  step: number
  name: string
}) {
  const cols = Math.max(...rows.map((r) => r.length))
  return (
    <GridScroll>
      <GridTable style={{ gridTemplateColumns: `28px repeat(${cols}, 46px)` }}>
        <GridIdx />
        {Array.from({ length: cols }, (_, c) => (
          <GridIdx key={`c${c}`}>{c}</GridIdx>
        ))}
        {rows.map((row, r) => (
          <RowFragment key={r}>
            <GridIdx>{r}</GridIdx>
            {row.map((cell, c) => {
              const prevCell = prevRows?.[r]?.[c]
              const changed =
                prevRows !== null &&
                (prevCell === undefined || JSON.stringify(prevCell) !== JSON.stringify(cell))
              return (
                <GridCell key={`${step}-${name}-${r}-${c}`} $changed={changed}>
                  {String(cell.v)}
                </GridCell>
              )
            })}
          </RowFragment>
        ))}
      </GridTable>
    </GridScroll>
  )
}

// CSS grid 안에서 행을 평평하게 펼치기 위한 프래그먼트
function RowFragment({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// ── F-19 스택: U자 컨테이너 + PUSH(들어옴)/POP(빠져나감) 애니메이션 ──

function ArcInArrow() {
  return (
    <svg width="46" height="30" viewBox="0 0 46 30" fill="none" aria-hidden="true">
      <path d="M4 24 C 8 6, 30 2, 40 16" stroke="#4a9eda" strokeWidth="4.5" strokeLinecap="round" />
      <polygon points="42,22 31,17 40,10" fill="#4a9eda" />
    </svg>
  )
}

function ArcOutArrow() {
  return (
    <svg width="46" height="30" viewBox="0 0 46 30" fill="none" aria-hidden="true">
      <path d="M6 16 C 16 2, 38 6, 42 24" stroke="#d9534f" strokeWidth="4.5" strokeLinecap="round" />
      <polygon points="44,29 35,22 46,20" fill="#d9534f" />
    </svg>
  )
}

function StackViz({
  items,
  prevItems,
  step,
  name,
}: {
  items: CapturedValue[]
  prevItems: CapturedValue[] | null
  step: number
  name: string
}) {
  const pushed = prevItems !== null && items.length > prevItems.length
  const popped = prevItems !== null && items.length < prevItems.length
  const poppedValue = popped && prevItems ? prevItems[prevItems.length - 1] : null
  const reversed = [...items].reverse() // 마지막 원소(top)가 위로

  return (
    <StackWrap>
      <StackArrows>
        <ArrowGroup>
          <ArcInArrow />
          <PushLabel>PUSH</PushLabel>
        </ArrowGroup>
        <PopSlot>
          {poppedValue !== null && (
            <PopGhost key={`pop-${step}`}>{String(poppedValue.v)}</PopGhost>
          )}
        </PopSlot>
        <ArrowGroup>
          <ArcOutArrow />
          <PopLabel>POP</PopLabel>
        </ArrowGroup>
      </StackArrows>

      <Bucket>
        {items.length === 0 && <EmptyHint>(빈 스택)</EmptyHint>}
        {reversed.map((item, idx) => {
          const i = items.length - 1 - idx
          const isTop = i === items.length - 1
          const changed =
            prevItems !== null && JSON.stringify(prevItems[i]) !== JSON.stringify(item)
          return (
            <BucketBox
              key={`${step}-${name}-${i}`}
              $ring={changed ? 'gold' : 'none'}
              $drop={isTop && pushed}
            >
              {String(item.v)}
            </BucketBox>
          )
        })}
      </Bucket>
    </StackWrap>
  )
}

// ── F-19 큐: 열린 통로 — 왼쪽(rear)으로 Enqueue, 오른쪽(front)으로 Dequeue ──

function QueueViz({
  items,
  prevItems,
  step,
  name,
}: {
  items: CapturedValue[]
  prevItems: CapturedValue[] | null
  step: number
  name: string
}) {
  const enqueued = prevItems !== null && items.length > prevItems.length
  const dequeued = prevItems !== null && items.length < prevItems.length
  const dequeuedValue = dequeued && prevItems ? prevItems[0] : null
  // deque의 index 0 = front → 오른쪽 끝에 그린다 (rear가 왼쪽에서 들어오는 그림)
  const display = [...items].reverse()

  return (
    <QueueOuter>
      <QueueRow>
        <FlowLabel $color="#4a9eda">
          Enqueue
          <FlowArrow>→</FlowArrow>
        </FlowLabel>
        <ChannelCol>
          {items.length > 0 ? (
            <QueueMarkers>
              <Marker>rear ↓</Marker>
              <Marker>↓ front</Marker>
            </QueueMarkers>
          ) : (
            <MarkerSpacer />
          )}
          <Channel $empty={items.length === 0}>
          {items.length === 0 && <EmptyHint>(빈 큐)</EmptyHint>}
          {display.map((item, idx) => {
            const i = items.length - 1 - idx // 원래 deque 인덱스
            const isRear = i === items.length - 1
            const changed =
              prevItems !== null && JSON.stringify(prevItems[i]) !== JSON.stringify(item)
            return (
              <ChannelBox
                key={`${step}-${name}-${i}`}
                $ring={changed ? 'gold' : 'none'}
                $enter={isRear && enqueued}
              >
                {String(item.v)}
              </ChannelBox>
            )
          })}
          </Channel>
          {dequeuedValue !== null && (
            <DequeueGhost key={`dq-${step}`}>{String(dequeuedValue.v)}</DequeueGhost>
          )}
        </ChannelCol>
        <FlowLabel $color="#d9534f">
          <FlowArrow>→</FlowArrow>
          Dequeue
        </FlowLabel>
      </QueueRow>
    </QueueOuter>
  )
}

// ── F-20 트리 (SVG 노드 그래프, in-order 가로 배치) ──

const NODE_W = 58
const LEVEL_H = 68

/** in-order 순회 순서를 x 좌표로 — 부모가 항상 두 자식 사이에 놓여 균형 잡힌 모양 */
function layoutTree(root: TreeNode) {
  const nodes: { x: number; y: number; v: number | string }[] = []
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = []
  let cursor = 0
  let maxDepth = 0

  function walk(node: TreeNode, depth: number): { x: number; y: number } {
    maxDepth = Math.max(maxDepth, depth)
    const left = node.l ? walk(node.l, depth + 1) : null
    const x = cursor * NODE_W + NODE_W / 2
    cursor += 1
    const y = depth * LEVEL_H + 30
    const right = node.r ? walk(node.r, depth + 1) : null
    nodes.push({ x, y, v: node.v })
    if (left) edges.push({ x1: x, y1: y, x2: left.x, y2: left.y })
    if (right) edges.push({ x1: x, y1: y, x2: right.x, y2: right.y })
    return { x, y }
  }

  walk(root, 0)
  return { nodes, edges, width: cursor * NODE_W, height: (maxDepth + 1) * LEVEL_H + 8 }
}

function TreeViz({ root }: { root: TreeNode }) {
  const laid = layoutTree(root)
  return (
    <TreeScroll>
      <svg width={laid.width} height={laid.height}>
        {laid.edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="var(--vs-text-dim, #8a8a8a)"
            strokeWidth={2}
            opacity={0.85}
          />
        ))}
        {laid.nodes.map((n, i) => (
          <g key={i}>
            <circle
              cx={n.x}
              cy={n.y}
              r={21}
              fill="var(--vs-list-hover, #141716)"
              stroke="var(--vs-accent, #0088ff)"
              strokeWidth={1.8}
            />
            <text
              x={n.x}
              y={n.y + 4.5}
              textAnchor="middle"
              fontSize={15}
              fontFamily="SF Mono, Menlo, monospace"
              fontWeight={600}
              fill="var(--vs-text, #d8d8d8)"
            >
              {String(n.v).slice(0, 4)}
            </text>
          </g>
        ))}
      </svg>
    </TreeScroll>
  )
}

// ── 메인: 변수별로 렌더러 분기 ──

export default function VizPanel({ snap, prev, currentLineText }: Props) {
  // F-16 숫자 리스트 보기 모드 (박스 ↔ 막대) — 새로고침해도 유지
  const [numMode, setNumMode] = useState<'boxes' | 'bars'>(() =>
    localStorage.getItem('algohae:vizMode') === 'bars' ? 'bars' : 'boxes',
  )
  const selectMode = (mode: 'boxes' | 'bars') => {
    setNumMode(mode)
    localStorage.setItem('algohae:vizMode', mode)
  }

  const sections: ReactNode[] = []
  let hasNumericList = false

  for (const [name, value] of Object.entries(snap.vars)) {
    const kind = pickRenderer(name, value)
    if (!kind) continue
    const prevValue = prev?.vars[name]
    const items = scalarItems(value) ?? []
    const prevItems = prevValue ? scalarItems(prevValue) : null
    const accessed = accessedIndices(name, currentLineText, snap.vars)
    const isNumeric = kind === 'boxes' && value.num === true
    if (isNumeric) hasNumericList = true
    const pointers =
      kind === 'boxes' ? pointerMap(name, currentLineText, snap.vars, items.length) : null

    sections.push(
      <Group key={name}>
        <VarName>{name}</VarName>
        {kind === 'boxes' &&
          (isNumeric && numMode === 'bars' ? (
            <BarsViz
              name={name}
              items={items}
              prevItems={prevItems}
              accessed={accessed}
              step={snap.step}
            />
          ) : (
            <BoxesViz
              name={name}
              items={items}
              prevItems={prevItems}
              accessed={accessed}
              step={snap.step}
            />
          ))}
        {kind === 'boxes' && pointers && (
          <PointerMarkers count={items.length} pointers={pointers} />
        )}
        {kind === 'stack' && (
          <StackViz name={name} items={items} prevItems={prevItems} step={snap.step} />
        )}
        {kind === 'queue' && (
          <QueueViz name={name} items={items} prevItems={prevItems} step={snap.step} />
        )}
        {kind === 'dict' && (
          <DictViz
            entries={dictEntries(value) ?? []}
            prevEntries={prevValue ? dictEntries(prevValue) : null}
            step={snap.step}
          />
        )}
        {kind === 'grid' && (
          <GridViz
            rows={gridRows(value) ?? []}
            prevRows={prevValue ? gridRows(prevValue) : null}
            step={snap.step}
            name={name}
          />
        )}
        {kind === 'tree' && value.v !== null && <TreeViz root={value.v as TreeNode} />}
      </Group>,
    )
  }

  if (sections.length === 0) {
    return <Empty>리스트·딕셔너리·2차원 배열·스택·큐·트리 변수가 생기면 여기에 그려져요</Empty>
  }

  return (
    <PanelOuter>
      {hasNumericList && (
        <ToggleRow>
          <ToggleBtn type="button" $active={numMode === 'boxes'} onClick={() => selectMode('boxes')}>
            박스
          </ToggleBtn>
          <ToggleBtn type="button" $active={numMode === 'bars'} onClick={() => selectMode('bars')}>
            막대
          </ToggleBtn>
        </ToggleRow>
      )}
      <Panel>{sections}</Panel>
    </PanelOuter>
  )
}

// ── 스타일 ──

const PanelOuter = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
`

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 26px;
`

const ToggleRow = styled.div`
  align-self: flex-end;
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--vs-list-hover, #1f2428);
`

const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  color: ${({ $active }) => ($active ? '#fff' : 'var(--vs-text-dim, #888)')};
  background: ${({ $active }) => ($active ? 'var(--vs-accent, #0088ff)' : 'transparent')};
`

// F-37 포인터 마커

const MarkerRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: -2px;
`

const MarkerCell = styled.span`
  width: 54px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  font-family: ${theme.mono};
  font-size: 12px;
  font-weight: 700;
  color: var(--vs-accent, ${theme.teal});
  min-height: 16px;
  white-space: nowrap;
`

const MarkerArrow = styled.span`
  font-size: 13px;
`

// F-16 막대 그래프

const BarRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
`

const BarCol = styled.div<{ $moved: boolean }>`
  width: 54px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  animation: ${({ $moved }) => ($moved ? slideIn : 'none')} 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: relative;
  z-index: ${({ $moved }) => ($moved ? 1 : 0)};
`

const BarValue = styled.span`
  font-family: ${theme.mono};
  font-size: 13.5px;
  font-weight: 600;
  color: var(--vs-text, #d8d8d8);
`

const Bar = styled.div<{ $ring: Ring }>`
  width: 40px;
  border-radius: 8px 8px 4px 4px;
  background: var(--vs-list-hover, #141716);
  border: 2px solid ${({ $ring }) => RING_COLOR[$ring]};
  box-shadow: ${({ $ring }) => RING_GLOW[$ring]};
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
`

// F-18 딕셔너리 카드

const cardPop = keyframes`
  0% {
    transform: translateY(-18px) scale(0.7);
    opacity: 0;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
`

const DictRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 11px;
`

const DictCard = styled.div<{ $ring: Ring; $drop: boolean }>`
  min-width: 58px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  border-radius: 11px;
  overflow: hidden;
  border: 2px solid ${({ $ring }) => RING_COLOR[$ring]};
  box-shadow: ${({ $ring }) => RING_GLOW[$ring]};
  animation: ${({ $drop }) => ($drop ? cardPop : 'none')} 0.35s cubic-bezier(0.3, 1.2, 0.5, 1);
`

const DictKey = styled.span`
  padding: 4px 10px;
  text-align: center;
  font-family: ${theme.mono};
  font-size: 12.5px;
  font-weight: 700;
  color: var(--vs-accent, ${theme.teal});
  background: var(--vs-tabsbar, #1b1f24);
`

const DictVal = styled.span`
  padding: 8px 10px;
  text-align: center;
  font-family: ${theme.mono};
  font-size: 17px;
  font-weight: 600;
  color: var(--vs-text, #d8d8d8);
  background: var(--vs-list-hover, #141716);
`

// F-36 2D 그리드

const cellPop = keyframes`
  0% {
    transform: scale(0.55);
    opacity: 0.2;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`

const GridScroll = styled.div`
  max-width: 100%;
  overflow-x: auto;
`

const GridTable = styled.div`
  display: grid;
  gap: 5px;
  align-items: center;
`

const GridIdx = styled.span`
  text-align: center;
  font-family: ${theme.mono};
  font-size: 11px;
  color: var(--vs-text-dim, ${theme.subtext});
`

const GridCell = styled.div<{ $changed: boolean }>`
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 15.5px;
  font-weight: 600;
  border-radius: 9px;
  background: var(--vs-list-hover, #141716);
  border: 2px solid ${({ $changed }) => ($changed ? '#2ea043' : 'var(--vs-border, #2c3434)')};
  color: var(--vs-text, #d8d8d8);
  box-shadow: ${({ $changed }) => ($changed ? '0 0 14px rgba(46, 160, 67, 0.45)' : 'none')};
  animation: ${({ $changed }) => ($changed ? cellPop : 'none')} 0.3s ease;
`

const Empty = styled.p`
  margin: 0;
  padding: 20px 0;
  text-align: center;
  color: var(--vs-text-dim, ${theme.subtext});
  font-size: 14px;
`

const Group = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`

const VarName = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: ${theme.mono};
  font-size: 12.5px;
  color: var(--vs-text-dim, ${theme.subtext});
`

const BoxRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 12px;
`

// 변경된 원소 = 초록 (진행·성공 느낌), 비교 중 = 파랑
const RING_COLOR: Record<Ring, string> = {
  teal: theme.teal,
  gold: '#2ea043',
  none: 'var(--vs-border, #2c3434)',
}

const RING_GLOW: Record<Ring, string> = {
  teal: '0 0 14px rgba(0, 136, 255, 0.45)',
  gold: '0 0 16px rgba(46, 160, 67, 0.5)',
  none: 'none',
}

const slideIn = keyframes`
  from {
    transform: translateX(var(--dx, 0));
  }
  to {
    transform: translateX(0);
  }
`

const Box = styled.div<{ $ring: Ring; $moved: boolean }>`
  min-width: 54px;
  height: 54px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 19px;
  font-weight: 600;
  border-radius: 11px;
  background: var(--vs-list-hover, #141716);
  border: 2px solid ${({ $ring }) => RING_COLOR[$ring]};
  color: var(--vs-text, #d8d8d8);
  box-shadow: ${({ $ring }) => RING_GLOW[$ring]};
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  animation: ${({ $moved }) => ($moved ? slideIn : 'none')} 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: relative;
  z-index: ${({ $moved }) => ($moved ? 1 : 0)};
`

// 스택 (U자 컨테이너)

const pushDrop = keyframes`
  0% {
    transform: translateY(-72px) translateX(-26px) rotate(-7deg);
    opacity: 0;
  }
  55% {
    transform: translateY(4px) translateX(0) rotate(0deg);
    opacity: 1;
  }
  75% {
    transform: translateY(-3px);
  }
  100% {
    transform: translateY(0);
  }
`

const popFly = keyframes`
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(52px, -44px) rotate(9deg);
    opacity: 0;
  }
`

const StackWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`

const StackArrows = styled.div`
  width: 270px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
`

const ArrowGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
`

const PushLabel = styled.span`
  font-family: ${theme.mono};
  font-size: 12px;
  font-weight: 800;
  color: #4a9eda;
`

const PopLabel = styled.span`
  font-family: ${theme.mono};
  font-size: 12px;
  font-weight: 800;
  color: #d9534f;
`

const PopSlot = styled.div`
  width: 92px;
  height: 42px;
  position: relative;
`

const PopGhost = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  background: var(--vs-list-hover, #141716);
  border: 2px solid #d9534f;
  color: var(--vs-text, #d8d8d8);
  animation: ${popFly} 0.5s ease-in forwards;
  pointer-events: none;
`

const Bucket = styled.div`
  width: 156px;
  min-height: 184px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  gap: 5px;
  padding: 8px 7px 7px;
  border-left: 3px solid var(--vs-text-dim, #777);
  border-right: 3px solid var(--vs-text-dim, #777);
  border-bottom: 3px solid var(--vs-text-dim, #777);
  border-radius: 0 0 6px 6px;
`

const BucketBox = styled.div<{ $ring: Ring; $drop: boolean }>`
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 17.5px;
  font-weight: 600;
  border-radius: 7px;
  background: var(--vs-list-hover, #141716);
  border: 2px solid ${({ $ring }) => RING_COLOR[$ring]};
  color: var(--vs-text, #d8d8d8);
  box-shadow: ${({ $ring }) => RING_GLOW[$ring]};
  animation: ${({ $drop }) => ($drop ? pushDrop : 'none')} 0.55s cubic-bezier(0.3, 1.2, 0.5, 1);
`

// 큐 (열린 통로)

const slideEnter = keyframes`
  0% {
    transform: translateX(-86px);
    opacity: 0;
  }
  60% {
    transform: translateX(5px);
    opacity: 1;
  }
  100% {
    transform: translateX(0);
  }
`

const dequeueFly = keyframes`
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(58px);
    opacity: 0;
  }
`

const QueueOuter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`

const ChannelCol = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`

const QueueMarkers = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0 16px 3px;
  font-family: ${theme.mono};
  font-size: 11.5px;
  color: var(--vs-text-dim, ${theme.subtext});
`

const MarkerSpacer = styled.div`
  height: 18px;
`

const Marker = styled.span`
  white-space: nowrap;
`

const QueueRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
`

const FlowLabel = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: ${theme.mono};
  font-size: 12px;
  font-weight: 800;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`

const FlowArrow = styled.span`
  font-size: 16px;
`

const Channel = styled.div<{ $empty: boolean }>`
  min-width: ${({ $empty }) => ($empty ? '140px' : '0')};
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 8px 14px;
  border-top: 3px solid var(--vs-text-dim, #777);
  border-bottom: 3px solid var(--vs-text-dim, #777);
`

const ChannelBox = styled.div<{ $ring: Ring; $enter: boolean }>`
  min-width: 54px;
  height: 50px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 17px;
  font-weight: 600;
  border-radius: 8px;
  background: var(--vs-list-hover, #141716);
  border: 2px solid ${({ $ring }) => RING_COLOR[$ring]};
  color: var(--vs-text, #d8d8d8);
  box-shadow: ${({ $ring }) => RING_GLOW[$ring]};
  animation: ${({ $enter }) => ($enter ? slideEnter : 'none')} 0.5s cubic-bezier(0.3, 1.1, 0.5, 1);
`

const DequeueGhost = styled.div`
  position: absolute;
  right: -62px;
  top: 50%;
  width: 56px;
  height: 50px;
  margin-top: -12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  background: var(--vs-list-hover, #141716);
  border: 2px solid #d9534f;
  color: var(--vs-text, #d8d8d8);
  animation: ${dequeueFly} 0.5s ease-in forwards;
  pointer-events: none;
`

const EmptyHint = styled.span`
  font-size: 12.5px;
  color: var(--vs-text-dim, ${theme.subtext});
`

// 트리

const TreeScroll = styled.div`
  max-width: 100%;
  overflow-x: auto;
  display: flex;
  justify-content: center;
`
