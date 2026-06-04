# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**알고해(AlgoHae)** — 사용자가 작성한 임의의 파이썬 코드를 브라우저에서 실제 실행하고(Pyodide/WASM), 한 줄 한 줄 변수 변화를 시각화하는 알고리즘 학습 플랫폼. 서버 없는 정적 웹앱.

**기능 명세서: `algohae_spec_v2.md`** — 기능 ID(F-xx), 우선순위(P0/P1/P2), 데이터 모델(Snapshot/CapturedValue), MVP 범위가 모두 여기 정의되어 있다. 기능 작업 전 반드시 참조하고, 구현 중 범위·설계가 바뀌면 명세서도 함께 갱신한다.

## 명령어

패키지 매니저는 **pnpm** (npm/yarn 아님):

- `pnpm dev` — 개발 서버 (Vite)
- `pnpm build` — `tsc -b` 타입체크 후 `vite build`
- `pnpm lint` — ESLint
- `pnpm preview` — 빌드 결과 미리보기

테스트 프레임워크는 아직 없다.

## 기술 스택 및 규칙

- React 19 + TypeScript + Vite. **React Compiler 활성화됨** (`vite.config.ts`의 babel preset) — 수동 `useMemo`/`useCallback` 최적화는 대부분 불필요.
- 스타일링은 **styled-components** 사용. 새 CSS 파일을 만들지 않는다 (초기 템플릿의 `App.css`/`index.css`는 점진적 마이그레이션 대상).
- Python 실행은 Pyodide를 **Web Worker 안에서** 돌린다 — 메인 스레드 실행 금지 (UI 프리즈 + 무한루프 시 강제 종료 불가).
- UI 텍스트·주석·문서는 한국어 기준.

## 핵심 아키텍처: 2-레이어

명세서 1장이 원본. 요약:

1. **범용 레이어** — `sys.settrace`로 모든 파이썬 코드를 라인 단위 추적, 매 줄 변수 스냅샷 기록. 어떤 코드든 "현재 줄 + 변수 테이블"은 보장.
2. **특화 레이어** — 스냅샷 값의 타입 태그(`t`)를 보고 전용 렌더러로 분기 (숫자 리스트→막대 그래프 등). 렌더러가 없는 타입은 범용 테이블로 자동 폴백.

원칙: **"하나의 스냅샷, 두 가지 렌더링"**. 새 자료구조 지원 = 새 `t` 태그 + 렌더러 컴포넌트 한 쌍 추가 (플러그인 방식).

구현 시 주의: `frame.f_locals`의 리스트·딕셔너리는 참조이므로 스냅샷은 **캡처 시점에 즉시 직렬화(깊은 복사)** 해야 한다. 나중에 읽으면 모든 스냅샷이 최종 상태로 보인다.
