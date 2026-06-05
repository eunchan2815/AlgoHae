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
  {
    id: 'paren-check',
    name: '괄호 검사 (스택)',
    enName: 'STACK',
    desc: '여는 괄호는 스택에 쌓고, 닫는 괄호를 만나면 꺼내요',
    time: 'O(n)',
    space: 'O(n)',
    code: `stack = []
text = "(()())"
ok = True
for ch in text:
    if ch == "(":
        stack.append(ch)
    elif not stack:
        ok = False
        break
    else:
        stack.pop()
if ok and not stack:
    print("괄호 짝이 맞아요!")
else:
    print("짝이 안 맞아요")
`,
  },
  {
    id: 'queue-line',
    name: '줄 서기 (큐)',
    enName: 'QUEUE',
    desc: '먼저 온 사람이 먼저 나가요 — FIFO',
    time: 'O(n)',
    space: 'O(n)',
    code: `from collections import deque

queue = deque(["철수", "영희", "민수"])
queue.append("지영")
while queue:
    person = queue.popleft()
    print(person, "차례예요!")
`,
  },
  {
    id: 'bst-insert',
    name: '이진 탐색 트리 (트리)',
    enName: 'BINARY TREE',
    desc: '작으면 왼쪽, 크면 오른쪽 — 값을 넣을 때마다 트리가 자라요',
    time: 'O(log n)',
    space: 'O(n)',
    code: `class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(root, val):
    if root is None:
        return Node(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

root = None
for val in [5, 3, 8, 1, 4, 9]:
    root = insert(root, val)
print("트리 완성!")
`,
  },
  {
    id: 'dp-grid',
    name: '격자 경로 (DP)',
    enName: 'DP GRID',
    desc: '왼쪽 칸과 위 칸의 경로 수를 더해서 표를 채워요',
    time: 'O(n·m)',
    space: 'O(n·m)',
    code: `rows, cols = 3, 4
grid = [[0] * cols for _ in range(rows)]
for c in range(cols):
    grid[0][c] = 1
for r in range(rows):
    grid[r][0] = 1
for r in range(1, rows):
    for c in range(1, cols):
        grid[r][c] = grid[r - 1][c] + grid[r][c - 1]
print("경로 수:", grid[rows - 1][cols - 1])
`,
  },
]

export const DEFAULT_CODE = EXAMPLES[0].code
