// F-27 stdout 출력 패널 — 현재 스텝까지의 출력만 표시 (스텝 동기화)
import styled from 'styled-components'
import { theme } from '../styles/theme'
import type { RunError } from '../types/snapshot'

interface Props {
  stdout: string
  /** 현재 스텝까지 누적된 stdout 글자 수 */
  upto: number
  error: RunError | null
  limitHit: boolean
  /** 마지막 스텝에 도달했는가 — 오류·한도 안내는 끝에서만 보여준다 */
  isLast: boolean
}

export default function OutputPanel({ stdout, upto, error, limitHit, isLast }: Props) {
  const visible = stdout.slice(0, upto)

  return (
    <Wrap>
      <Header>출력</Header>
      <Body>
        {visible ? <pre>{visible}</pre> : <Muted>print() 출력이 여기에 나와요</Muted>}
        {isLast && limitHit && (
          <Notice>⚠ 4000스텝까지만 기록했어요 — 여기까지 재생할 수 있어요.</Notice>
        )}
        {isLast && error && (
          <ErrorLine>
            ✕ {error.message}
            {error.line !== null && ` (${error.line}번째 줄)`}
          </ErrorLine>
        )}
      </Body>
    </Wrap>
  )
}

const Wrap = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vs-text-dim, ${theme.subtext});
  background: var(--vs-tabsbar, ${theme.panelLight});
`

const Body = styled.div`
  flex: 1;
  overflow: auto;
  padding: 8px 14px;
  font-family: ${theme.mono};
  font-size: 14px;
  color: var(--vs-text, ${theme.text});
  line-height: 1.6;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
`

const Muted = styled.span`
  color: var(--vs-text-dim, ${theme.subtext});
`

const Notice = styled.div`
  color: ${theme.warn};
  margin-top: 6px;
`

const ErrorLine = styled.div`
  color: ${theme.danger};
  margin-top: 6px;
  white-space: pre-wrap;
`
