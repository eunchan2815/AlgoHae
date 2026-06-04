// 재생 모드 코드 카드 — F-12 현재 줄 하이라이트 + 간이 파이썬 문법 색상 (레퍼런스 팔레트)
import { useEffect, useRef, type ReactNode } from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'

interface Props {
  code: string
  currentLine: number
  errorLine: number | null
}

// 간이 파이썬 토크나이저 — 주석 / 문자열 / 키워드 / 내장함수 / 숫자
const TOKEN_RE =
  /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(def|class|for|while|if|elif|else|in|not|and|or|return|break|continue|import|from|as|pass|lambda|True|False|None)\b|\b(print|len|range|list|dict|set|str|int|float|abs|min|max|sum|sorted|enumerate|zip|join|append)\b|(\b\d+(?:\.\d+)?\b)/g

function highlightLine(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0
    if (idx > last) nodes.push(text.slice(last, idx))
    const [matched, comment, str, keyword, builtin, num] = m
    if (comment) nodes.push(<Comment key={idx}>{matched}</Comment>)
    else if (str) nodes.push(<Str key={idx}>{matched}</Str>)
    else if (keyword) nodes.push(<Keyword key={idx}>{matched}</Keyword>)
    else if (builtin) nodes.push(<Builtin key={idx}>{matched}</Builtin>)
    else if (num) nodes.push(<Num key={idx}>{matched}</Num>)
    last = idx + matched.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export default function CodePane({ code, currentLine, errorLine }: Props) {
  const currentRef = useRef<HTMLDivElement>(null)
  const lines = code.replace(/\n$/, '').split('\n')

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentLine])

  return (
    <Card>
      {lines.map((text, i) => {
        const lineNo = i + 1
        const isCurrent = lineNo === currentLine
        const isError = lineNo === errorLine
        return (
          <Line
            key={i}
            ref={isCurrent ? currentRef : undefined}
            $current={isCurrent}
            $error={isError}
          >
            <LineNo>{lineNo}</LineNo>
            <CodeText>{text ? highlightLine(text) : ' '}</CodeText>
            {isError && <ErrorMark>✕</ErrorMark>}
          </Line>
        )
      })}
      <Watermark>알고해</Watermark>
    </Card>
  )
}

const Card = styled.div`
  width: 100%;
  background: ${theme.panel};
  border-radius: ${theme.radius};
  padding: 18px 0 10px;
  font-family: ${theme.mono};
  font-size: 13.5px;
  line-height: 1.95;
  overflow-x: auto;
`

const Line = styled.div<{ $current: boolean; $error: boolean }>`
  display: flex;
  align-items: baseline;
  padding: 0 20px;
  background: ${({ $current, $error }) =>
    $error ? 'rgba(248, 81, 73, 0.14)' : $current ? theme.currentLineBg : 'transparent'};
`

const LineNo = styled.span`
  width: 24px;
  flex-shrink: 0;
  text-align: right;
  margin-right: 18px;
  color: #4a4a4a;
  user-select: none;
  font-size: 12px;
`

const CodeText = styled.span`
  white-space: pre;
  color: ${theme.text};
`

const ErrorMark = styled.span`
  margin-left: 10px;
  color: ${theme.danger};
  font-size: 11px;
`

const Keyword = styled.span`
  color: #6d8cab;
`

const Builtin = styled.span`
  color: #7a99b8;
`

const Str = styled.span`
  color: #3aa183;
`

const Num = styled.span`
  color: #7090b0;
`

const Comment = styled.span`
  color: #5a5a5a;
  font-style: italic;
`

const Watermark = styled.div`
  margin-top: 10px;
  text-align: center;
  font-family: ${theme.font};
  font-size: 11px;
  font-weight: 600;
  color: #3a3a3a;
  user-select: none;
`
