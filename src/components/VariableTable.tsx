// 기본 레이어 — F-13 변수 테이블, F-14 변경 변수 강조, F-15 스칼라 표현
import styled from 'styled-components'
import { theme } from '../styles/theme'
import type { CapturedValue, Snapshot } from '../types/snapshot'

interface Props {
  snap: Snapshot
  prev: Snapshot | null
}

const TYPE_LABEL: Record<CapturedValue['t'], string> = {
  scalar: '값',
  list: '리스트',
  dict: '딕셔너리',
  opaque: '객체',
}

function formatValue(value: CapturedValue): string {
  if (value.t === 'scalar' || value.t === 'opaque') {
    return String(value.v)
  }
  if (value.t === 'list') {
    const items = value.v as CapturedValue[]
    const body = items.map(formatValue).join(', ')
    const more = value.len !== undefined && value.len > items.length ? ', …' : ''
    return `[${body}${more}]`
  }
  // dict
  const entries = value.v as [string, CapturedValue][]
  const body = entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ')
  const more = value.len !== undefined && value.len > entries.length ? ', …' : ''
  return `{${body}${more}}`
}

export default function VariableTable({ snap, prev }: Props) {
  const entries = Object.entries(snap.vars)

  return (
    <Wrap>
      <Header>
        변수
        {snap.func && snap.func !== '<module>' && <Func>{snap.func}() 안</Func>}
      </Header>
      {entries.length === 0 ? (
        <Empty>아직 변수가 없어요</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>이름</th>
              <th>타입</th>
              <th>값</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, value]) => {
              const prevValue = prev?.vars[name]
              const changed =
                prevValue === undefined || JSON.stringify(prevValue) !== JSON.stringify(value)
              return (
                <Row key={name} $changed={changed}>
                  <td>
                    {/* 색상 외 기호(•)로도 변경 표시 (접근성) */}
                    {changed && <Dot aria-label="변경됨">•</Dot>}
                    {name}
                  </td>
                  <td>{TYPE_LABEL[value.t]}</td>
                  <td>{formatValue(value)}</td>
                </Row>
              )
            })}
          </tbody>
        </Table>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  height: 100%;
  overflow: auto;
`

const Header = styled.div`
  position: sticky;
  top: 0;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  color: ${theme.subtext};
  background: ${theme.panelLight};
  display: flex;
  gap: 8px;
  align-items: center;
`

const Func = styled.span`
  font-family: ${theme.mono};
  font-weight: 400;
  color: ${theme.accent};
`

const Empty = styled.p`
  margin: 16px 14px;
  font-size: 13px;
  color: ${theme.subtext};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    text-align: left;
    padding: 6px 14px;
    color: ${theme.subtext};
    font-weight: 400;
    border-bottom: 1px solid ${theme.border};
  }

  td {
    padding: 6px 14px;
    font-family: ${theme.mono};
    vertical-align: top;
    word-break: break-all;
  }
`

const Row = styled.tr<{ $changed: boolean }>`
  background: ${({ $changed }) => ($changed ? theme.changedBg : 'transparent')};

  td:first-child {
    color: ${theme.accent};
    white-space: nowrap;
  }

  td:nth-child(2) {
    color: ${theme.subtext};
    white-space: nowrap;
  }
`

const Dot = styled.span`
  color: ${theme.warn};
  margin-right: 5px;
`
