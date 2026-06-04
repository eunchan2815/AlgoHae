// 특화 레이어 — F-17 리스트 → 박스열 (레퍼런스 스타일)
// 현재 줄이 접근 중인 원소를 파랑/골드 글로우로 하이라이트 + 자리가 바뀐 박스는 슬라이드 애니메이션
import type { CSSProperties } from 'react'
import styled, { keyframes } from 'styled-components'
import { theme } from '../styles/theme'
import type { CapturedValue, Snapshot } from '../types/snapshot'

interface Props {
  snap: Snapshot
  prev: Snapshot | null
  /** 현재 실행 중인 줄의 코드 텍스트 — arr[j] 같은 접근 패턴 감지용 */
  currentLineText: string
}

type Ring = 'teal' | 'gold' | 'none'

/** 박스 한 칸의 가로 이동 거리 (min-width 46 + gap 11) */
const BOX_STEP = 57

/** 박스열로 그릴 수 있는 리스트인가 — 원소가 전부 스칼라 */
function isBoxable(value: CapturedValue): boolean {
  return (
    value.t === 'list' &&
    Array.isArray(value.v) &&
    (value.v as CapturedValue[]).every((item) => item.t === 'scalar')
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

/**
 * 각 위치의 값이 직전 스냅샷의 어디에서 왔는지 추적 (FLIP 애니메이션용).
 * 값이 같은 자리에 그대로면 null, 이동해 왔으면 출발 인덱스.
 */
function fromIndices(prevItems: CapturedValue[] | null, items: CapturedValue[]): (number | null)[] {
  if (!prevItems) return items.map(() => null)
  const used = new Set<number>()
  const cur = items.map((item) => JSON.stringify(item))
  const old = prevItems.map((item) => JSON.stringify(item))
  // 1차: 안 움직인 값이 자기 자리를 먼저 차지
  items.forEach((_, i) => {
    if (old[i] === cur[i]) used.add(i)
  })
  // 2차: 움직인 값은 가장 가까운 같은 값의 옛 위치와 매칭
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

export default function VizPanel({ snap, prev, currentLineText }: Props) {
  const boxLists = Object.entries(snap.vars).filter(([, value]) => isBoxable(value))

  if (boxLists.length === 0) {
    return <Empty>리스트 변수가 생기면 여기에 박스로 그려져요</Empty>
  }

  return (
    <Panel>
      {boxLists.map(([name, value]) => {
        const items = value.v as CapturedValue[]
        const prevValue = prev?.vars[name]
        const prevItems =
          prevValue && isBoxable(prevValue) ? (prevValue.v as CapturedValue[]) : null
        const accessed = accessedIndices(name, currentLineText, snap.vars)
        const origins = fromIndices(prevItems, items)

        return (
          <Group key={name}>
            {boxLists.length > 1 && <VarName>{name}</VarName>}
            <BoxRow>
              {items.map((item, i) => {
                const changed =
                  prevItems !== null && JSON.stringify(prevItems[i]) !== JSON.stringify(item)
                // 레퍼런스: 비교 쌍의 첫 번째는 파랑, 두 번째는 골드. 값이 바뀐 원소도 골드
                let ring: Ring = 'none'
                if (accessed[0] === i) ring = 'teal'
                if (accessed[1] === i || changed) ring = 'gold'
                const from = origins[i]
                return (
                  <Box
                    // 스텝마다 key가 바뀌어 이동 애니메이션이 다시 실행된다
                    key={`${snap.step}-${i}`}
                    $ring={ring}
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
              {value.len !== undefined && value.len > items.length && (
                <Ellipsis>… 전체 {value.len}개</Ellipsis>
              )}
            </BoxRow>
          </Group>
        )
      })}
    </Panel>
  )
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
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
  font-family: ${theme.mono};
  font-size: 12.5px;
  color: var(--vs-text-dim, ${theme.subtext});
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

// 출발 위치(--dx)에서 제자리로 미끄러져 들어온다
const slideIn = keyframes`
  from {
    transform: translateX(var(--dx, 0));
  }
  to {
    transform: translateX(0);
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

const Ellipsis = styled.span`
  color: ${theme.subtext};
  font-size: 12px;
`
