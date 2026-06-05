# 알고해 (AlgoHae)

> **알고리즘, 알면서 해 — 알고해**

내가 쓴 코드가 한 줄 한 줄 실행되는 과정을 **눈으로 보는** 알고리즘 학습 플랫폼.
코드를 붙여넣고 실행하면, 변수의 변화·자료구조의 움직임·함수 호출 스택까지 동영상처럼 재생됩니다.

**👉 바로 써보기: https://algohae.vercel.app**

## 무엇이 되나요

- **한 줄씩 실행** — Python 코드를 브라우저 안에서(Pyodide/WASM) 실제로 실행하고, 매 줄의 변수 스냅샷을 기록해 재생·되감기·배속
- **자료구조 시각화** — 리스트(박스/막대), 스택(PUSH/POP), 큐(Enqueue/Dequeue), 이진 트리, 딕셔너리, 2차원 배열(DP 테이블)이 자동으로 그려짐
- **포인터 마커** — `i`, `j`, `left`, `right` 같은 인덱스 변수가 가리키는 원소를 화살표로 표시
- **호출 스택** — 재귀 호출이 쌓였다 풀리는 과정을 디버거처럼
- **12개 언어 실행** — Python(시각화), JS·TS·Java·C·C++·C#·Kotlin·Swift·Rust·Ruby(실행·출력)
- **VS Code 스타일 작업공간** — 멀티 파일, 탭, 테마 11종, 탐색기, 예제 라이브러리 17종

## 동작 원리 (2-레이어)

1. **범용 레이어** — `sys.settrace`로 모든 코드를 라인 단위 추적, 매 줄 변수를 캡처 즉시 직렬화
2. **특화 레이어** — 스냅샷의 타입 태그를 보고 전용 렌더러로 분기 (없으면 변수 테이블로 폴백)

> 원칙: **"하나의 스냅샷, 두 가지 렌더링"** — 새 자료구조 지원 = 타입 태그 + 렌더러 한 쌍 추가.
> 상세 설계는 [기능 명세서](./algohae_spec_v2.md) 참고.

Python은 Web Worker 안의 Pyodide에서 실행되며 코드가 서버로 전송되지 않습니다.
다른 언어는 공개 실행 서버(Wandbox · Compiler Explorer)로 컴파일·실행됩니다.

## 개발

```bash
pnpm install
pnpm dev      # 개발 서버
pnpm build    # 타입체크 + 빌드
pnpm lint     # ESLint
```

기술 스택: React 19 · TypeScript · Vite · styled-components · CodeMirror 6 · Pyodide

## 만든 사람

[@eunchan2815](https://github.com/eunchan2815) · kec1208@gmail.com

폰트: [Pretendard](https://github.com/orioncactus/pretendard) (OFL)
