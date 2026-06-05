// 특화 레이어 — 타입 태그별 렌더러 분기 (명세서 "하나의 스냅샷, 두 가지 렌더링")
// F-17 리스트 → 박스열 / F-19 스택·큐 / F-20 트리 노드 그래프
import type { CSSProperties, ReactNode } from 'react'
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

/** 어떤 렌더러를 쓸까 — 타입 태그 + 변수명 휴리스틱 (F-19) */
function pickRenderer(name: string, value: CapturedValue): 'boxes' | 'stack' | 'queue' | 'tree' | null {
  if (value.t === 'tree') return 'tree'
  if (scalarItems(value) === null) return null
  if (value.t === 'deque') return 'queue'
  if (/stack|스택/i.test(name)) return 'stack'
  if (/queue|큐/i.test(name)) return 'queue'
  return 'boxes'
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
  const sections: ReactNode[] = []

  for (const [name, value] of Object.entries(snap.vars)) {
    const kind = pickRenderer(name, value)
    if (!kind) continue
    const prevValue = prev?.vars[name]
    const items = scalarItems(value) ?? []
    const prevItems = prevValue ? scalarItems(prevValue) : null
    const accessed = accessedIndices(name, currentLineText, snap.vars)

    sections.push(
      <Group key={name}>
        <VarName>{name}</VarName>
        {kind === 'boxes' && (
          <BoxesViz name={name} items={items} prevItems={prevItems} accessed={accessed} step={snap.step} />
        )}
        {kind === 'stack' && (
          <StackViz name={name} items={items} prevItems={prevItems} step={snap.step} />
        )}
        {kind === 'queue' && (
          <QueueViz name={name} items={items} prevItems={prevItems} step={snap.step} />
        )}
        {kind === 'tree' && value.v !== null && <TreeViz root={value.v as TreeNode} />}
      </Group>,
    )
  }

  if (sections.length === 0) {
    return <Empty>리스트·스택·큐·트리 변수가 생기면 여기에 그려져요</Empty>
  }

  return <Panel>{sections}</Panel>
}

// ── 스타일 ──

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 26px;
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
