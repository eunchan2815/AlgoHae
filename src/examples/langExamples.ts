// F-35 언어별 실행 예제 — 탐색기 "언어 예제" 섹션에서 클릭하면 파일로 생성됨
// 주의: Java·Kotlin 실행 서버는 한글 출력이 깨지므로 영문 출력 사용
export interface LangExample {
  name: string
  content: string
}

export const LANG_EXAMPLES: LangExample[] = [
  {
    name: 'hello.js',
    content: `// 1부터 10까지 합 구하기
let sum = 0
for (let i = 1; i <= 10; i++) {
  sum += i
}
console.log("합계:", sum)
`,
  },
  {
    name: 'hello.ts',
    content: `// 타입과 함께 — 배열에서 최댓값 찾기
const nums: number[] = [5, 2, 8, 1, 9, 3]
let max: number = nums[0]
for (const n of nums) {
  if (n > max) max = n
}
console.log("최댓값:", max)
`,
  },
  {
    name: 'hello.java',
    content: `// 실행 서버에서는 클래스 이름이 prog 여야 해요
public class prog {
    public static void main(String[] args) {
        int sum = 0;
        for (int i = 1; i <= 10; i++) {
            sum += i;
        }
        System.out.println("sum = " + sum);
    }
}
`,
  },
  {
    name: 'hello.cpp',
    content: `#include <iostream>

int main() {
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        sum += i;
    }
    std::cout << "합계: " << sum << std::endl;
    return 0;
}
`,
  },
  {
    name: 'hello.cs',
    content: `class Program {
    static void Main() {
        int sum = 0;
        for (int i = 1; i <= 10; i++) {
            sum += i;
        }
        System.Console.WriteLine("합계: " + sum);
    }
}
`,
  },
  {
    name: 'hello.kt',
    content: `fun main() {
    var sum = 0
    for (i in 1..10) {
        sum += i
    }
    println("sum = " + sum)
}
`,
  },
  {
    name: 'hello.swift',
    content: `var sum = 0
for i in 1...10 {
    sum += i
}
print("합계: \\(sum)")
`,
  },
  {
    name: 'hello.rs',
    content: `fn main() {
    let mut sum = 0;
    for i in 1..=10 {
        sum += i;
    }
    println!("합계: {}", sum);
}
`,
  },
  {
    name: 'hello.rb',
    content: `sum = 0
(1..10).each do |i|
  sum += i
end
puts "합계: #{sum}"
`,
  },
]
