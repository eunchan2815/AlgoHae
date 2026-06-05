// 지원 언어 목록 (명세서 F-33, F-35)
// traced: 라인 추적 시각화 지원 (브라우저 내 실행) / piston: 실행 서버 언어 키 (출력 실행)
import pythonLogo from '../assets/langs/python.svg'
import javascriptLogo from '../assets/langs/javascript.svg'
import typescriptLogo from '../assets/langs/typescript.svg'
import javaLogo from '../assets/langs/java.svg'
import cppLogo from '../assets/langs/cpp.svg'
import cLogo from '../assets/langs/c.png'
import csharpLogo from '../assets/langs/csharp.svg'
import kotlinLogo from '../assets/langs/kotlin.svg'
import swiftLogo from '../assets/langs/swift.svg'
import rustLogo from '../assets/langs/rust.svg'
import rubyLogo from '../assets/langs/ruby.svg'

/** 서버 실행 경로 — Wandbox(언어 이름) 또는 godbolt(컴파일러 ID) */
export type RemoteRunner =
  | { type: 'wandbox'; language: string }
  | { type: 'godbolt'; compiler: string }

export interface LangInfo {
  name: string
  logo: string
  /** 파일 확장자 (소문자) */
  ext: string
  /** 라인 추적 + 시각화 지원 (브라우저 내 실행) */
  traced: boolean
  /** 실행 서버 정보 (null이면 서버 실행 미지원) */
  remote: RemoteRunner | null
}

const wandbox = (language: string): RemoteRunner => ({ type: 'wandbox', language })
const godbolt = (compiler: string): RemoteRunner => ({ type: 'godbolt', compiler })

export const LANGS: LangInfo[] = [
  { name: 'Python', logo: pythonLogo, ext: 'py', traced: true, remote: null },
  { name: 'JavaScript', logo: javascriptLogo, ext: 'js', traced: false, remote: wandbox('JavaScript') },
  { name: 'TypeScript', logo: typescriptLogo, ext: 'ts', traced: false, remote: wandbox('TypeScript') },
  { name: 'Java', logo: javaLogo, ext: 'java', traced: false, remote: wandbox('Java') },
  { name: 'C', logo: cLogo, ext: 'c', traced: false, remote: wandbox('C') },
  { name: 'C++', logo: cppLogo, ext: 'cpp', traced: false, remote: wandbox('C++') },
  { name: 'C#', logo: csharpLogo, ext: 'cs', traced: false, remote: wandbox('C#') },
  // Wandbox에 없거나(Kotlin) 환경이 깨진(Swift, catatonit 오류) 언어는 godbolt로 실행
  { name: 'Kotlin', logo: kotlinLogo, ext: 'kt', traced: false, remote: godbolt('kotlinc2120') },
  { name: 'Swift', logo: swiftLogo, ext: 'swift', traced: false, remote: godbolt('swift61') },
  { name: 'Rust', logo: rustLogo, ext: 'rs', traced: false, remote: wandbox('Rust') },
  { name: 'Ruby', logo: rubyLogo, ext: 'rb', traced: false, remote: wandbox('Ruby') },
]

export const LANG_BY_EXT: Record<string, LangInfo> = Object.fromEntries(
  LANGS.map((lang) => [lang.ext, lang]),
)

export function extOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export function langOf(fileName: string): LangInfo | null {
  return LANG_BY_EXT[extOf(fileName)] ?? null
}
