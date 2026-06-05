// F-11 호출 스택 패널 — 재귀 호출이 쌓였다 풀리는 과정 (현재 프레임이 맨 위, 디버거 관례)
import styled, { keyframes } from 'styled-components'
import { theme } from '../styles/theme'
import type { Snapshot } from '../types/snapshot'

interface Props {
  snap: Snapshot
  prev: Snapshot | null
}

export default function CallStackPanel({ snap, prev }: Props) {
  const frames = [...(snap.stack ?? [])].reverse() // 현재 프레임 먼저
  const grew = prev !== null && (snap.stack?.length ?? 0) > (prev.stack?.length ?? 0)

  if (frames.length === 0) {
    return <EmptyMsg>실행이 끝났어요 — 스텝을 되감으면 호출 스택이 보여요</EmptyMsg>
  }

  return (
    <List>
      {frames.map((frame, i) => {
        const isCurrent = i === 0
        const label =
          frame.f === '<module>' ? '<module> (전체 코드)' : `${frame.f}(${frame.a})`
        return (
          <Row
            key={`${snap.step}-${frames.length - i}`}
            $current={isCurrent}
            $enter={isCurrent && grew}
          >
            <DepthBadge $current={isCurrent}>{frames.length - i - 1}</DepthBadge>
            <FuncName $current={isCurrent}>{label}</FuncName>
            <LineNo>줄 {frame.l}</LineNo>
            {isCurrent && <NowTag>← 실행 중</NowTag>}
          </Row>
        )
      })}
    </List>
  )
}

const frameEnter = keyframes`
  0% {
    transform: translateY(-14px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  gap: 3px;
`

const Row = styled.div<{ $current: boolean; $enter: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 7px;
  background: ${({ $current }) => ($current ? 'var(--vs-list-active, #2c313a)' : 'transparent')};
  border-left: 3px solid
    ${({ $current }) => ($current ? 'var(--vs-accent, #0088ff)' : 'transparent')};
  animation: ${({ $enter }) => ($enter ? frameEnter : 'none')} 0.25s ease;
`

const DepthBadge = styled.span<{ $current: boolean }>`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${theme.mono};
  font-size: 11.5px;
  font-weight: 700;
  border-radius: 6px;
  color: ${({ $current }) => ($current ? '#fff' : 'var(--vs-text-dim, #888)')};
  background: ${({ $current }) =>
    $current ? 'var(--vs-accent, #0088ff)' : 'var(--vs-list-hover, #23272d)'};
`

const FuncName = styled.span<{ $current: boolean }>`
  font-family: ${theme.mono};
  font-size: 14px;
  font-weight: ${({ $current }) => ($current ? 700 : 400)};
  color: ${({ $current }) => ($current ? 'var(--vs-text, #e2e6ec)' : 'var(--vs-text-dim, #999)')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LineNo = styled.span`
  margin-left: auto;
  font-family: ${theme.mono};
  font-size: 12px;
  color: var(--vs-text-dim, ${theme.subtext});
  white-space: nowrap;
`

const NowTag = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: var(--vs-accent, ${theme.teal});
  white-space: nowrap;
`

const EmptyMsg = styled.p`
  margin: 14px;
  font-size: 14px;
  font-family: ${theme.mono};
  color: var(--vs-text-dim, ${theme.subtext});
`
