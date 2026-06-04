// 등장 애니메이션 래퍼 — 뷰포트에 들어오면 페이드 + 슬라이드 업
import { useEffect, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'

interface Props {
  children: ReactNode
  /** 시작 지연(초) — 같은 화면 안에서 순차 등장시킬 때 */
  delay?: number
}

export default function Reveal({ children, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Wrap ref={ref} $shown={shown} $delay={delay}>
      {children}
    </Wrap>
  )
}

const Wrap = styled.div<{ $shown: boolean; $delay: number }>`
  opacity: ${({ $shown }) => ($shown ? 1 : 0)};
  transform: translateY(${({ $shown }) => ($shown ? '0' : '20px')});
  transition:
    opacity 0.65s ease ${({ $delay }) => $delay}s,
    transform 0.65s ease ${({ $delay }) => $delay}s;
`
