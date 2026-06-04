// F-02 예제 라이브러리 — 정렬 / 재귀 / 딕셔너리 / 문자열 (명세서 6.1 예제 4종)
export interface Example {
  id: string
  name: string
  /** 재생 화면 타이틀 (레퍼런스 스타일 — 모노 대문자) */
  enName: string
  /** 재생 화면 상단에 보여줄 한 줄 설명 */
  desc: string
  /** 시간 복잡도 (재생 화면 칩) */
  time: string
  /** 공간 복잡도 (재생 화면 칩) */
  space: string
  code: string
}

export const EXAMPLES: Example[] = [
  {
    id: 'bubble-sort',
    name: '버블 정렬',
    enName: 'BUBBLE SORT',
    desc: '이웃한 두 값을 비교해서, 큰 값을 거품처럼 뒤로 보내요',
    time: 'O(n²)',
    space: 'O(1)',
    code: `arr = [5, 2, 8, 1, 9, 3]
n = len(arr)
for i in range(n - 1):
    for j in range(n - 1 - i):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]
print("정렬 완료:", arr)
`,
  },
  {
    id: 'fibonacci',
    name: '피보나치 재귀',
    enName: 'FIBONACCI',
    desc: '함수가 자기 자신을 다시 부르면서 답을 만들어가요',
    time: 'O(2ⁿ)',
    space: 'O(n)',
    code: `def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

answer = fib(6)
print("fib(6) =", answer)
`,
  },
  {
    id: 'char-count',
    name: '글자 수 세기',
    enName: 'CHAR COUNT',
    desc: '딕셔너리에 글자별 등장 횟수를 차곡차곡 쌓아요',
    time: 'O(n)',
    space: 'O(k)',
    code: `word = "algohae"
counts = {}
for ch in word:
    if ch in counts:
        counts[ch] += 1
    else:
        counts[ch] = 1
print(counts)
`,
  },
  {
    id: 'reverse-string',
    name: '문자열 뒤집기',
    enName: 'REVERSE STRING',
    desc: '양 끝의 두 포인터가 가운데로 모이며 자리를 바꿔요',
    time: 'O(n)',
    space: 'O(1)',
    code: `chars = list("algohae")
left = 0
right = len(chars) - 1
while left < right:
    chars[left], chars[right] = chars[right], chars[left]
    left += 1
    right -= 1
result = "".join(chars)
print(result)
`,
  },
]

export const DEFAULT_CODE = EXAMPLES[0].code
