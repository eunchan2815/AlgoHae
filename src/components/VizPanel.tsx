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

/** 박스 한 칸의 가로 이동 거리 (min-width 46 + gap 11) */
const BOX_STEP = 57

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

// ── F-19 스택 (세로 쌓기, 위가 top) ──

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
  const reversed = [...items].reverse() // 마지막 원소(top)가 위로
  return (
    <StackWrap>
      <StackCol>
        {reversed.map((item, idx) => {
          const i = items.length - 1 - idx
          const isTop = i === items.length - 1
          const changed =
            prevItems !== null && JSON.stringify(prevItems[i]) !== JSON.stringify(item)
          return (
            <StackBoxRow key={`${step}-${name}-${i}`}>
              <StackBox $ring={changed ? 'gold' : 'none'} $drop={isTop && pushed}>
                {String(item.v)}
              </StackBox>
              {isTop && <TopLabel>← top</TopLabel>}
            </StackBoxRow>
          )
        })}
        {items.length === 0 && <EmptyHint>(빈 스택)</EmptyHint>}
        <StackBase />
      </StackCol>
    </StackWrap>
  )
}

// ── F-19 큐 (가로, front → rear) ──

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
  const origins = fromIndices(prevItems, items)
  return (
    <QueueWrap>
      <EdgeLabel>front →</EdgeLabel>
      <BoxRow>
        {items.length === 0 && <EmptyHint>(빈 큐)</EmptyHint>}
        {items.map((item, i) => {
          const changed =
            prevItems !== null && JSON.stringify(prevItems[i]) !== JSON.stringify(item)
          const from = origins[i]
          return (
            <Box
              key={`${step}-${name}-${i}`}
              $ring={changed ? 'gold' : 'none'}
              $moved={from !== null}
              style={
                from !== null
                  ? ({ '--dx': `${(from - i) * BOX_STEP}px` } as CSSProperties)
                  : undefined
              }
            >
              {String(item.v)}
            </Box>
          )
        })}
      </BoxRow>
      <EdgeLabel>← rear</EdgeLabel>
    </QueueWrap>
  )
}

// ── F-20 트리 (SVG 노드 그래프, in-order 가로 배치) ──

const NODE_W = 46
const LEVEL_H = 58

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
    const y = depth * LEVEL_H + 26
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
            stroke="var(--vs-border, #2c3434)"
            strokeWidth={1.5}
          />
        ))}
        {laid.nodes.map((n, i) => (
          <g key={i}>
            <circle
              cx={n.x}
              cy={n.y}
              r={17}
              fill="var(--vs-list-hover, #141716)"
              stroke="var(--vs-accent, #0088ff)"
              strokeWidth={1.8}
            />
            <text
              x={n.x}
              y={n.y + 4.5}
              textAnchor="middle"
              fontSize={13}
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
        <VarName>
          {name}
          {kind === 'stack' && <KindTag>스택</KindTag>}
          {kind === 'queue' && <KindTag>큐</KindTag>}
          {kind === 'tree' && <KindTag>트리</KindTag>}
        </VarName>
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

const KindTag = styled.span`
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  color: var(--vs-accent, ${theme.teal});
  border: 1px solid var(--vs-accent, ${theme.teal});
  opacity: 0.85;
`

const BoxRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 11px;
`

const RING_COLOR: Record<Ring, string> = {
  teal: theme.teal,
  gold: theme.gold,
  none: 'var(--vs-border, #2c3434)',
}

const RING_GLOW: Record<Ring, string> = {
  teal: '0 0 14px rgba(0, 136, 255, 0.45)',
  gold: '0 0 14px rgba(217, 168, 51, 0.45)',
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

const dropIn = keyframes`
  from {
    transform: translateY(-26px);
    opacity: 0.2;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`

const Box = styled.div<{ $ring: Ring; $moved: boolean }>`
  min-width: 46px;
  height: 46px;
  padding: 0 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 17px;
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

// 스택

const StackWrap = styled.div`
  display: flex;
  justify-content: center;
`

const StackCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
`

const StackBoxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const StackBox = styled.div<{ $ring: Ring; $drop: boolean }>`
  min-width: 86px;
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 16px;
  font-weight: 600;
  border-radius: 9px;
  background: var(--vs-list-hover, #141716);
  border: 2px solid ${({ $ring }) => RING_COLOR[$ring]};
  color: var(--vs-text, #d8d8d8);
  box-shadow: ${({ $ring }) => RING_GLOW[$ring]};
  animation: ${({ $drop }) => ($drop ? dropIn : 'none')} 0.3s ease;
`

const StackBase = styled.div`
  width: 110px;
  height: 3px;
  border-radius: 2px;
  background: var(--vs-text-dim, #555);
  opacity: 0.6;
`

const TopLabel = styled.span`
  font-family: ${theme.mono};
  font-size: 11.5px;
  color: var(--vs-accent, ${theme.teal});
  white-space: nowrap;
`

// 큐

const QueueWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const EdgeLabel = styled.span`
  font-family: ${theme.mono};
  font-size: 11.5px;
  color: var(--vs-accent, ${theme.teal});
  white-space: nowrap;
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
