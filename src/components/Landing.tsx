// F-32 홈(메인) 페이지 — 레퍼런스.png 기반 라이트 랜딩
// 구조: 네비 → 히어로 → 기능 → 동작 원리 → 예제 카드 → 사용자 후기 → 지원 언어 → CTA → 푸터
import { useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { EXAMPLES } from '../examples'
import { LANGS } from '../data/langs'

// 레퍼런스.png 기반 라이트 팔레트 — primary는 브랜드 컬러 #0088FF (앱 내부는 다크 유지)
const L = {
  primary: '#0088ff',
  primaryDark: '#006fd6',
  primarySoft: '#e8f3ff',
  cream: '#f5faff',
  navy: '#282840',
  gray: '#707070',
  line: '#eceff3',
  blob: 'linear-gradient(140deg, #38a8ff 0%, #4f6cf7 55%, #b44bd2 100%)',
} as const

// 예제별 미니 UI 프리뷰 — 코드 대신 그 알고리즘의 시각화 모습을 보여준다
function previewFor(id: string) {
  switch (id) {
    case 'bubble-sort':
    case 'insertion-sort':
      return (
        <MiniBars>
          {[16, 34, 10, 42, 24].map((h, i) => (
            <i key={i} style={{ height: h }} className={i === 2 ? 'hl' : ''} />
          ))}
        </MiniBars>
      )
    case 'binary-search':
      return (
        <MiniCol>
          <MiniBoxes>
            {[1, 3, 5, 7].map((v, i) => (
              <i key={i} className={i === 2 ? 'hl' : ''}>{v}</i>
            ))}
          </MiniBoxes>
          <MiniPtr>↑ mid</MiniPtr>
        </MiniCol>
      )
    case 'reverse-string':
      return (
        <MiniBoxes>
          {['a', 'l', 'g', 'o'].map((v, i) => (
            <i key={i} className={i === 0 || i === 3 ? 'hl' : ''}>{v}</i>
          ))}
        </MiniBoxes>
      )
    case 'char-count':
      return (
        <MiniDict>
          {[['a', 2], ['l', 1], ['g', 1]].map(([k, v]) => (
            <div key={String(k)}>
              <b>{k}</b>
              <span>{v}</span>
            </div>
          ))}
        </MiniDict>
      )
    case 'dp-grid':
      return (
        <MiniGrid>
          {[1, 1, 1, 1, 2, 3].map((v, i) => (
            <i key={i} className={i === 5 ? 'hl' : ''}>{v}</i>
          ))}
        </MiniGrid>
      )
    case 'paren-check':
      return (
        <MiniStack>
          <i className="hl">(</i>
          <i>(</i>
        </MiniStack>
      )
    case 'queue-line':
      return (
        <MiniQueue>
          <i>철</i>
          <i>영</i>
          <i className="hl">민</i>
        </MiniQueue>
      )
    case 'bst-insert':
      return (
        <svg width="86" height="58" viewBox="0 0 86 58" aria-hidden="true">
          <line x1="43" y1="14" x2="20" y2="44" stroke="#b6bec9" strokeWidth="1.5" />
          <line x1="43" y1="14" x2="66" y2="44" stroke="#b6bec9" strokeWidth="1.5" />
          {[[43, 14, '5'], [20, 44, '3'], [66, 44, '8']].map(([cx, cy, t]) => (
            <g key={String(t)}>
              <circle cx={Number(cx)} cy={Number(cy)} r={11} fill="#fff" stroke="#0088ff" strokeWidth="1.6" />
              <text x={Number(cx)} y={Number(cy) + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#282840">
                {t}
              </text>
            </g>
          ))}
        </svg>
      )
    default:
      // fibonacci · hanoi · gcd → 호출 스택 미니
      return (
        <MiniFrames>
          <i className="hl" style={{ width: '52%' }} />
          <i style={{ width: '70%' }} />
          <i style={{ width: '88%' }} />
        </MiniFrames>
      )
  }
}

const FEATURES = [
  { icon: '▶', title: '한 줄씩 실행', desc: '내 파이썬 코드가 실제로 실행되는 순서를 한 줄 한 줄 따라가요.' },
  { icon: '</>', title: '변수 시각화', desc: '매 순간 모든 변수의 값을 보여주고, 방금 바뀐 값은 강조해요.' },
]

const VOICES = [
  {
    emoji: '🐣',
    name: '알고리즘 입문자',
    quote: '책으로는 안 외워지던 버블 정렬이, 박스가 움직이는 걸 보니까 한 번에 이해됐어요.',
  },
  {
    emoji: '👩‍🏫',
    name: '코딩 강사',
    quote: '수업 중에 학생 코드를 바로 붙여넣고 변수 변화를 보여줄 수 있어서 설명이 훨씬 쉬워졌어요.',
  },
]

interface Props {
  onStart: () => void
}

export default function Landing({ onStart }: Props) {
  // 히어로를 지나 스크롤하면 플로팅 네비가 나타난다 (첫 화면은 깨끗하게)
  const [navVisible, setNavVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setNavVisible(window.scrollY > 420)
    window.addEventListener('scroll', onScroll, { passive: true })
    const initial = window.setTimeout(onScroll, 0)
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(initial)
    }
  }, [])

  return (
    <Page>
      {/* ── 플로팅 네비 (스크롤 시 등장) ── */}
      <FloatingNav $visible={navVisible}>
        <FloatLogo
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          알고
          <Collapse key={navVisible ? 'show' : 'hide'}>리즘&nbsp;알면서&nbsp;</Collapse>
          해
        </FloatLogo>
        <FloatLinks>
          <a href="#features">기능</a>
          <a href="#how">동작 원리</a>
          <a href="#examples">예제</a>
          <a href="#langs">지원 언어</a>
        </FloatLinks>
        <FloatCta type="button" onClick={onStart}>
          코드 돌리러 가기
        </FloatCta>
      </FloatingNav>
      {/* ── 히어로 ── */}
      <Hero>
        <HeroInner>
          <HeroText>
              <Slogan>알고리즘, 알면서 해 — 알고해</Slogan>
              <H1>
                알고리즘이 동작하는
                <br />
                과정을 눈으로 보세요
              </H1>
              <HeroSub>
                내가 쓴 파이썬 코드를 브라우저에서 실제로 실행하고,
                <br />한 줄 한 줄 변수가 어떻게 변하는지 그대로 보여드려요.
              </HeroSub>
              <HeroBtns>
                <PrimaryBtn type="button" onClick={onStart}>
                  코드 돌리러 가기
                </PrimaryBtn>
                <GhostBtn as="a" href="#examples">
                  예제 보기
                </GhostBtn>
              </HeroBtns>
          </HeroText>

          <HeroVisual aria-hidden="true">
            <Blob />
            <VisualBoxes>
              {[5, 2, 8, 1, 9].map((v, i) => (
                <VBox key={i} $ring={i === 1 ? 'teal' : i === 2 ? 'gold' : 'none'}>
                  {v}
                </VBox>
              ))}
            </VisualBoxes>
            <VisualCode>
              <code>
                <em>for</em> j <em>in</em> <em>range</em>(n - 1):
              </code>
              <code className="hl">
                {'    '}
                <em>if</em> arr[j] {'>'} arr[j + 1]:
              </code>
              <code>{'        '}arr[j], arr[j+1] = …</code>
            </VisualCode>
          </HeroVisual>
        </HeroInner>
      </Hero>

      {/* ── 기능 ── */}
      <Section id="features">
        <SplitInner>
          <SplitText>
            <Eyebrow>OUR ACTIVITY</Eyebrow>
            <H2>무엇을 할 수 있나요</H2>
            <P>
              어떤 파이썬 코드든 붙여넣고 실행 버튼만 누르면 돼요. 정렬, 재귀, 딕셔너리, 문자열 —
              종류를 가리지 않아요.
            </P>
          </SplitText>
          <FeatureCards>
            {FEATURES.map((f) => (
              <FeatureCard key={f.title}>
                <FeatureIcon>{f.icon}</FeatureIcon>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </FeatureCard>
            ))}
          </FeatureCards>
        </SplitInner>
      </Section>

      {/* ── 동작 원리 ── */}
      <Section id="how" $tinted>
        <SplitInner>
          <HowVisual aria-hidden="true">
            <BlobSmall />
            <HowSteps>
              <li>
                <b>1</b> 코드를 쓰면
              </li>
              <li>
                <b>2</b> 브라우저 안에서 실행하고
              </li>
              <li>
                <b>3</b> 매 줄의 변수를 기록해서
              </li>
              <li>
                <b>4</b> 동영상처럼 재생해요
              </li>
            </HowSteps>
          </HowVisual>
          <SplitText>
            <Eyebrow>HOW IT WORKS</Eyebrow>
            <H2>서버 없이, 브라우저에서</H2>
            <P>
              Python은 브라우저 안의 실행기(WebAssembly)가 직접
              돌면서 한 줄마다 변수 스냅샷을 남기고, 알고해는 그걸 재생해요. 일시정지, 되감기,
              배속까지 전부요.
            </P>
          </SplitText>
        </SplitInner>
      </Section>

      {/* ── 예제 ── */}
      <Section id="examples">
        <CenterInner>
          <Eyebrow>THE BEST REFERENCE</Eyebrow>
          <H2>예제로 바로 시작해보세요</H2>
          <ExampleGrid>
            {EXAMPLES.map((ex) => (
              <ExampleCard key={ex.id}>
                <ExamplePreview>{previewFor(ex.id)}</ExamplePreview>
                <ExampleBody>
                  <ChipRow>
                    <MiniChip>TIME · {ex.time}</MiniChip>
                    <MiniChip>SPACE · {ex.space}</MiniChip>
                  </ChipRow>
                  <h3>{ex.name}</h3>
                  <p>{ex.desc}</p>
                  <LearnMore type="button" onClick={onStart}>
                    돌려보기 →
                  </LearnMore>
                </ExampleBody>
              </ExampleCard>
            ))}
          </ExampleGrid>
        </CenterInner>
      </Section>

      {/* ── 후기 ── */}
      <Section $tinted>
        <CenterInner>
          <Eyebrow>SEE OUR IMPRESSIONS</Eyebrow>
          <H2>이런 분들께 좋아요</H2>
          <VoiceGrid>
            {VOICES.map((v) => (
              <VoiceCard key={v.name}>
                <VoiceEmoji>{v.emoji}</VoiceEmoji>
                <blockquote>“{v.quote}”</blockquote>
                <cite>{v.name}</cite>
              </VoiceCard>
            ))}
          </VoiceGrid>
        </CenterInner>
      </Section>

      {/* ── 지원 언어 ── */}
      <Section id="langs">
        <CenterInner>
          <Eyebrow>OUR TEAM</Eyebrow>
          <H2>지원 언어</H2>
          <P $center>
            <b>Python</b>은 한 줄씩 시각화까지, 다른 언어는 코드 실행과 출력을 지원해요.
          </P>
          <LangGrid>
            {LANGS.map((lang) => (
              <LangCard key={lang.name} $ready={lang.traced}>
                <img src={lang.logo} alt={lang.name} width={34} height={34} />
                <span>{lang.name}</span>
                <small>{lang.traced ? '시각화 지원' : '실행 지원'}</small>
              </LangCard>
            ))}
          </LangGrid>
        </CenterInner>
      </Section>

      {/* ── CTA ── */}
      <JoinSection>
        <CenterInner>
          <Eyebrow>JOIN US</Eyebrow>
          <H2>지금 바로 돌려보세요</H2>
          <P $center>회원가입도, 설치도 없어요. 버튼 하나면 충분해요.</P>
          <PrimaryBtn type="button" onClick={onStart}>
            코드 돌리러 가기 →
          </PrimaryBtn>
        </CenterInner>
      </JoinSection>

      {/* ── 푸터 ── */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <strong>
              <img src="/logo.png" alt="" width={26} height={28} />
              알고해
            </strong>
            <p>알고리즘이 동작하는 과정을 보여주는 학습 플랫폼</p>
          </FooterBrand>
          <FooterCols>
            <div>
              <h4>서비스</h4>
              <a href="#features">기능</a>
              <a href="#examples">예제</a>
              <a href="#langs">지원 언어</a>
            </div>
            <div>
              <h4>시작하기</h4>
              <FooterLinkBtn type="button" onClick={onStart}>
                코드 돌리러 가기
              </FooterLinkBtn>
            </div>
            <div>
              <h4>만든 사람</h4>
              <a href="https://github.com/eunchan2815" target="_blank" rel="noreferrer">
                GitHub · eunchan2815
              </a>
              <a href="mailto:kec1208@gmail.com">kec1208@gmail.com</a>
            </div>
          </FooterCols>
        </FooterInner>
        <Copyright>© 2026 알고해 (AlgoHae)</Copyright>
      </Footer>
    </Page>
  )
}

// ── 공통 ──

const Page = styled.main`
  min-height: 100%;
  background: #fff;
  color: ${L.navy};
`

const FloatingNav = styled.nav<{ $visible: boolean }>`
  position: fixed;
  top: 14px;
  left: 50%;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 10px 8px 22px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px);
  border: 1px solid ${L.line};
  border-radius: 999px;
  box-shadow: 0 10px 34px rgba(40, 40, 64, 0.13);
  transform: translateX(-50%) translateY(${({ $visible }) => ($visible ? '0' : '-90px')});
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transition: transform 0.28s ease, opacity 0.28s ease;
`

const FloatLogo = styled.button`
  border: none;
  background: none;
  padding: 0;
  font-family: 'Baby Shark', 'Pretendard', sans-serif;
  font-size: 19px;
  font-weight: 700;
  color: ${L.primary};
  letter-spacing: 1px;
  cursor: pointer;
`

// "알고리즘 해" → "리즘"이 접히며 → "알고해"
const collapseText = keyframes`
  0%, 45% {
    max-width: 7.5em;
    opacity: 1;
  }
  85% {
    max-width: 0;
    opacity: 0;
  }
  100% {
    max-width: 0;
    opacity: 0;
  }
`

const Collapse = styled.span`
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  vertical-align: bottom;
  max-width: 7.5em;
  animation: ${collapseText} 2.2s cubic-bezier(0.6, 0, 0.2, 1) 0.6s forwards;
`

const FloatLinks = styled.div`
  display: flex;
  gap: 18px;

  a {
    font-size: 13.5px;
    font-weight: 600;
    color: ${L.navy};
    text-decoration: none;

    &:hover {
      color: ${L.primary};
    }
  }

  @media (max-width: 700px) {
    display: none;
  }
`

const FloatCta = styled.button`
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: ${L.primary};
  border: none;
  border-radius: 999px;
  cursor: pointer;

  &:hover {
    background: ${L.primaryDark};
  }
`

const Section = styled.section<{ $tinted?: boolean }>`
  padding: 84px 24px;
  background: ${({ $tinted }) => ($tinted ? L.cream : '#fff')};
`

const SplitInner = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
  align-items: center;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

const CenterInner = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  text-align: center;
`

const Slogan = styled.p`
  margin: 0 0 12px;
  font-family: 'Baby Shark', 'Pretendard', sans-serif;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: ${L.primary};
`

const Eyebrow = styled.p`
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 3px;
  color: ${L.primary};
`

const H1 = styled.h1`
  margin: 0 0 18px;
  font-size: 44px;
  font-weight: 800;
  line-height: 1.25;
  color: ${L.navy};
`

const H2 = styled.h2`
  margin: 0 0 16px;
  font-size: 32px;
  font-weight: 800;
  color: ${L.navy};
`

const P = styled.p<{ $center?: boolean }>`
  margin: 0 0 18px;
  font-size: 15px;
  line-height: 1.75;
  color: ${L.gray};
  ${({ $center }) => $center && 'max-width: 520px; margin-left: auto; margin-right: auto;'}

  b {
    color: ${L.primary};
  }
`

const PrimaryBtn = styled.button`
  padding: 13px 30px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: ${L.primary};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;

  &:hover {
    background: ${L.primaryDark};
    transform: translateY(-1px);
  }
`

const GhostBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 13px 30px;
  font-size: 15px;
  font-weight: 700;
  color: ${L.primary};
  background: #fff;
  border: 2px solid ${L.primary};
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    background: ${L.primarySoft};
  }
`

// ── 히어로 ──

const Hero = styled.header`
  background: ${L.cream};
  padding: 72px 24px 88px;
`

const HeroInner = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 40px;
  align-items: center;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

const HeroText = styled.div``

const HeroSub = styled.p`
  margin: 0 0 28px;
  font-size: 16px;
  line-height: 1.8;
  color: ${L.gray};
`

const HeroBtns = styled.div`
  display: flex;
  gap: 14px;
`

const HeroVisual = styled.div`
  position: relative;
  min-height: 340px;

  @media (max-width: 860px) {
    display: none;
  }
`

const Blob = styled.div`
  position: absolute;
  inset: 10px 0 10px 30px;
  background: ${L.blob};
  border-radius: 58% 42% 50% 50% / 45% 52% 48% 55%;
  opacity: 0.9;
`

const VisualBoxes = styled.div`
  position: absolute;
  top: 52px;
  left: 64px;
  display: flex;
  gap: 8px;
  padding: 14px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 14px 36px rgba(40, 40, 64, 0.18);
`

const VBox = styled.div<{ $ring: 'teal' | 'gold' | 'none' }>`
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 15px;
  font-weight: 700;
  border-radius: 9px;
  color: ${L.navy};
  background: #f4f6f8;
  border: 2px solid
    ${({ $ring }) => ($ring === 'teal' ? L.primary : $ring === 'gold' ? '#e3a008' : '#e3e7ec')};
`

const VisualCode = styled.div`
  position: absolute;
  bottom: 46px;
  left: 96px;
  display: flex;
  flex-direction: column;
  padding: 16px 18px;
  background: #1b1b1b;
  border-radius: 14px;
  box-shadow: 0 14px 36px rgba(40, 40, 64, 0.25);
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 12px;
  line-height: 1.9;
  color: #c8c8c8;

  code {
    white-space: pre;
  }

  code.hl {
    background: rgba(16, 64, 48, 0.85);
    border-radius: 4px;
  }

  em {
    font-style: normal;
    color: #6d8cab;
  }
`

// ── 기능 ──

const SplitText = styled.div``

const FeatureCards = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const FeatureCard = styled.div`
  padding: 26px 22px;
  background: #fff;
  border: 1px solid ${L.line};
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(40, 40, 64, 0.06);

  h3 {
    margin: 14px 0 8px;
    font-size: 17px;
    color: ${L.navy};
  }

  p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.7;
    color: ${L.gray};
  }
`

const FeatureIcon = styled.div`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: ${L.primary};
  border-radius: 12px;
`

// ── 동작 원리 ──

const HowVisual = styled.div`
  position: relative;
  min-height: 280px;
`

const BlobSmall = styled.div`
  position: absolute;
  inset: 0 60px 0 0;
  background: ${L.blob};
  border-radius: 47% 53% 58% 42% / 50% 46% 54% 50%;
  opacity: 0.16;
`

const HowSteps = styled.ol`
  position: relative;
  margin: 0;
  padding: 26px 28px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 600;
    color: ${L.navy};
    background: #fff;
    border: 1px solid ${L.line};
    border-radius: 12px;
    padding: 13px 18px;
    box-shadow: 0 8px 20px rgba(40, 40, 64, 0.06);
  }

  b {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #fff;
    background: ${L.primary};
    border-radius: 50%;
  }
`

// ── 예제 ──

const ExampleGrid = styled.div`
  margin-top: 36px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  text-align: left;

  @media (max-width: 1000px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const ExampleCard = styled.div`
  background: #fff;
  border: 1px solid ${L.line};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(40, 40, 64, 0.06);
  display: flex;
  flex-direction: column;
`

const ExamplePreview = styled.div`
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f8fa;
  border-bottom: 1px solid ${L.line};
`

const MiniBars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 5px;

  i {
    width: 13px;
    border-radius: 4px 4px 2px 2px;
    background: #e3efff;
    border: 1.5px solid #9cc3ee;
  }

  i.hl {
    background: #dcffe4;
    border-color: #1a7f37;
  }
`

const MiniCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
`

const MiniPtr = styled.span`
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 10.5px;
  font-weight: 700;
  color: ${L.primary};
`

const MiniBoxes = styled.div`
  display: flex;
  gap: 5px;

  i {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 12px;
    font-weight: 700;
    font-style: normal;
    color: ${L.navy};
    background: #fff;
    border: 1.5px solid #c4cdd8;
    border-radius: 7px;
  }

  i.hl {
    border-color: ${L.primary};
    background: #e8f3ff;
  }
`

const MiniDict = styled.div`
  display: flex;
  gap: 6px;

  div {
    display: flex;
    flex-direction: column;
    border: 1.5px solid #c4cdd8;
    border-radius: 7px;
    overflow: hidden;
  }

  b {
    padding: 1px 9px;
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 10.5px;
    color: ${L.primary};
    background: #eef2f6;
    text-align: center;
  }

  span {
    padding: 3px 9px;
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 12px;
    font-weight: 700;
    color: ${L.navy};
    background: #fff;
    text-align: center;
  }
`

const MiniGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 22px);
  gap: 4px;

  i {
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 11px;
    font-weight: 700;
    font-style: normal;
    color: ${L.navy};
    background: #fff;
    border: 1.5px solid #c4cdd8;
    border-radius: 5px;
  }

  i.hl {
    border-color: #1a7f37;
    background: #dcffe4;
  }
`

const MiniStack = styled.div`
  width: 46px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 4px 4px;
  border-left: 2.5px solid #b6bec9;
  border-right: 2.5px solid #b6bec9;
  border-bottom: 2.5px solid #b6bec9;
  border-radius: 0 0 4px 4px;

  i {
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 11px;
    font-weight: 700;
    font-style: normal;
    color: ${L.navy};
    background: #fff;
    border: 1.5px solid #c4cdd8;
    border-radius: 4px;
  }

  i.hl {
    border-color: ${L.primary};
    background: #e8f3ff;
  }
`

const MiniQueue = styled.div`
  display: flex;
  gap: 4px;
  padding: 5px 10px;
  border-top: 2.5px solid #b6bec9;
  border-bottom: 2.5px solid #b6bec9;

  i {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    font-style: normal;
    color: ${L.navy};
    background: #fff;
    border: 1.5px solid #c4cdd8;
    border-radius: 6px;
  }

  i.hl {
    border-color: ${L.primary};
    background: #e8f3ff;
  }
`

const MiniFrames = styled.div`
  width: 90px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;

  i {
    height: 12px;
    border-radius: 4px;
    background: #e3efff;
    border: 1.5px solid #9cc3ee;
  }

  i.hl {
    background: #dcffe4;
    border-color: #1a7f37;
  }
`

const ExampleBody = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;

  h3 {
    margin: 10px 0 6px;
    font-size: 16px;
    color: ${L.navy};
  }

  p {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.65;
    color: ${L.gray};
    flex: 1;
  }
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const MiniChip = styled.span`
  white-space: nowrap;
  padding: 3px 9px;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 10px;
  font-weight: 600;
  color: ${L.primary};
  background: ${L.primarySoft};
  border-radius: 999px;
`

const LearnMore = styled.button`
  align-self: flex-start;
  border: none;
  background: none;
  padding: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: ${L.primary};
  cursor: pointer;

  &:hover {
    color: ${L.primaryDark};
  }
`

// ── 후기 ──

const VoiceGrid = styled.div`
  margin-top: 36px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`

const VoiceCard = styled.div`
  padding: 28px 26px;
  background: #fff;
  border: 1px solid ${L.line};
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(40, 40, 64, 0.06);

  blockquote {
    margin: 14px 0 10px;
    font-size: 14.5px;
    line-height: 1.75;
    color: ${L.navy};
  }

  cite {
    font-style: normal;
    font-size: 13px;
    font-weight: 700;
    color: ${L.primary};
  }
`

const VoiceEmoji = styled.div`
  width: 48px;
  height: 48px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: ${L.primarySoft};
  border-radius: 50%;
`

// ── 지원 언어 ──

const LangGrid = styled.div`
  margin-top: 32px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;

  @media (max-width: 860px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const LangCard = styled.div<{ $ready: boolean }>`
  padding: 18px 12px 14px;
  background: #fff;
  border: 1px solid ${({ $ready }) => ($ready ? L.primary : L.line)};
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;

  img {
    opacity: 1;
  }

  span {
    font-size: 13px;
    font-weight: 700;
    color: ${L.navy};
  }

  small {
    font-size: 11px;
    font-weight: 600;
    color: ${({ $ready }) => ($ready ? L.primary : '#9aa1ab')};
  }
`

// ── CTA / 푸터 ──

const JoinSection = styled.section`
  padding: 84px 24px;
  background: ${L.cream};
  text-align: center;
`

const Footer = styled.footer`
  background: ${L.navy};
  color: #c3c7d6;
  padding: 56px 24px 28px;
`

const FooterInner = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 40px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`

const FooterBrand = styled.div`
  strong {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: 'Baby Shark', 'Pretendard', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 1px;
  }

  p {
    margin: 10px 0 0;
    font-size: 13.5px;
    color: #8e93a8;
  }
`

const FooterCols = styled.div`
  display: flex;
  gap: 56px;

  h4 {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 800;
    color: #fff;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  a {
    font-size: 13.5px;
    color: #c3c7d6;
    text-decoration: none;

    &:hover {
      color: ${L.primary};
    }
  }
`

const FooterLinkBtn = styled.button`
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  font-size: 13.5px;
  color: #c3c7d6;
  cursor: pointer;

  &:hover {
    color: ${L.primary};
  }
`

const Copyright = styled.p`
  max-width: 1080px;
  margin: 40px auto 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 12px;
  color: #8e93a8;
`
