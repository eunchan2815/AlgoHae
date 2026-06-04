// 특화 레이어 — F-17 리스트 → 박스열 (레퍼런스 스타일)
// 현재 줄이 접근 중인 원소를 틸/골드 글로우로 하이라이트 (레퍼런스의 비교 쌍 표현)
import styled from 'styled-components'
import { theme } from '../styles/theme'
import type { CapturedValue, Snapshot } from '../types/snapshot'

interface Props {
  snap: Snapshot
  prev: Snapshot | null
  /** 현재 실행 중인 줄의 코드 텍스트 — arr[j] 같은 접근 패턴 감지용 */
  currentLineText: string
}

type Ring = 'teal' | 'gold' | 'none'

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

        return (
          <Group key={name}>
            {boxLists.length > 1 && <VarName>{name}</VarName>}
            <BoxRow>
              {items.map((item, i) => {
                const changed =
                  prevItems !== null && JSON.stringify(prevItems[i]) !== JSON.stringify(item)
                // 레퍼런스: 비교 쌍의 첫 번째는 틸, 두 번째는 골드. 값이 바뀐 원소도 골드
                let ring: Ring = 'none'
                if (accessed[0] === i) ring = 'teal'
                if (accessed[1] === i || changed) ring = 'gold'
                return (
                  <Box key={i} $ring={ring}>
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

const Box = styled.div<{ $ring: Ring }>`
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
`

const Ellipsis = styled.span`
  color: ${theme.subtext};
  font-size: 12px;
`
