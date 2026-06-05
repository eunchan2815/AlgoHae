// F-35 언어별 실행 예제 — 각 언어의 시그니처 기능을 보여주는 관용적(idiomatic) 코드
// Java·Kotlin 한글 출력은 실행기가 UTF-8 설정을 자동 주입해서 처리 (runners/remote.ts)
export interface LangExample {
  name: string
  content: string
}

export const LANG_EXAMPLES: LangExample[] = [
  {
    name: 'higher_order.js',
    content: `// 고차 함수 — 배열을 선언형으로 다뤄요 (JS의 꽃)
const scores = [85, 92, 47, 73, 95]

const passed = scores
  .filter((s) => s >= 70)
  .map((s) => s + "점 합격!")

passed.forEach((msg) => console.log(msg))

const avg = scores.reduce((a, b) => a + b, 0) / scores.length
console.log("평균:", avg)
`,
  },
  {
    name: 'interface.ts',
    content: `// 인터페이스와 타입 — 컴파일 타임에 실수를 잡아줘요
interface Student {
  name: string
  score: number
}

const students: Student[] = [
  { name: "철수", score: 85 },
  { name: "영희", score: 92 },
]

function best(list: Student[]): Student {
  return list.reduce((a, b) => (a.score > b.score ? a : b))
}

console.log("1등:", best(students).name)
`,
  },
  {
    name: 'stream.java',
    content: `import java.util.List;

// record + Stream API — 모던 자바
// 실행 서버에서는 클래스 이름이 prog 여야 해요
public class prog {
    record Student(String name, int score) {}

    public static void main(String[] args) {
        List<Student> students = List.of(
            new Student("철수", 85),
            new Student("영희", 92),
            new Student("민수", 64)
        );
        students.stream()
                .filter(s -> s.score() >= 80)
                .forEach(s -> System.out.println(s.name() + " 합격!"));
    }
}
`,
  },
  {
    name: 'pointer.c',
    content: `#include <stdio.h>

// 포인터 — 메모리 주소를 직접 다루는 C의 정체성
void swap(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

int main() {
    int x = 3, y = 7;
    printf("바꾸기 전: x=%d, y=%d\\n", x, y);
    swap(&x, &y);
    printf("바꾼 후:   x=%d, y=%d\\n", x, y);
    return 0;
}
`,
  },
  {
    name: 'vector_stl.cpp',
    content: `#include <iostream>
#include <vector>
#include <algorithm>

// vector + STL 알고리즘 — C++ 표준 라이브러리의 힘
int main() {
    std::vector<int> v = {5, 2, 8, 1, 9};
    std::sort(v.begin(), v.end());
    for (int n : v) {
        std::cout << n << " ";
    }
    std::cout << "\\n최댓값: " << *std::max_element(v.begin(), v.end()) << std::endl;
    return 0;
}
`,
  },
  {
    name: 'linq.cs',
    content: `using System;
using System.Linq;

// LINQ — 컬렉션을 쿼리처럼 다뤄요
class Program {
    static void Main() {
        int[] scores = { 85, 92, 47, 73, 95 };
        var passed = scores
            .Where(s => s >= 70)
            .OrderByDescending(s => s);
        foreach (var s in passed) {
            Console.WriteLine(s + "점 합격!");
        }
    }
}
`,
  },
  {
    name: 'when_expr.kt',
    content: `// when 표현식 — if-else 사다리를 우아하게 (코틀린의 간결함)
fun grade(score: Int) = when {
    score >= 90 -> "A"
    score >= 80 -> "B"
    else -> "C"
}

fun main() {
    val scores = intArrayOf(92, 85, 64)
    for (s in scores) {
        println("\${s}점 -> \${grade(s)} 등급")
    }
}
`,
  },
  {
    name: 'optional.swift',
    content: `// 옵셔널 — "값이 없을 수도 있음"을 타입으로 표현해요
let scores = ["철수": 85, "영희": 92]

func grade(of name: String) -> String {
    if let score = scores[name] {
        return "\\(name): \\(score)점"
    }
    return "\\(name): 기록 없음"
}

print(grade(of: "영희"))
print(grade(of: "민수"))
`,
  },
  {
    name: 'pattern_match.rs',
    content: `// match + Option — 없을 수 있는 값을 컴파일러가 챙겨줘요
fn find(scores: &[i32], target: i32) -> Option<usize> {
    scores.iter().position(|&s| s == target)
}

fn main() {
    let scores = [85, 92, 47, 73];
    match find(&scores, 92) {
        Some(i) => println!("{}번째 칸에 있어요!", i),
        None => println!("못 찾았어요"),
    }
}
`,
  },
  {
    name: 'blocks.rb',
    content: `# 블록 — 루프 대신 우아한 체인
scores = [85, 92, 47, 73, 95]

scores.select { |s| s >= 70 }
      .sort
      .reverse
      .each { |s| puts "#{s}점 합격!" }
`,
  },
]
