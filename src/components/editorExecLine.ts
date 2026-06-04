// CodeMirror 확장 — 에디터 안에 실행 중인 줄(초록)·오류 줄(빨강)을 표시 (F-12)
import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'

function makeLineHighlighter(className: string) {
  const setLine = StateEffect.define<number | null>()
  const deco = Decoration.line({ class: className })

  const field = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, tr) {
      value = value.map(tr.changes)
      for (const effect of tr.effects) {
        if (effect.is(setLine)) {
          if (effect.value === null || effect.value < 1 || effect.value > tr.state.doc.lines) {
            return Decoration.none
          }
          const line = tr.state.doc.line(effect.value)
          return Decoration.set([deco.range(line.from)])
        }
      }
      return value
    },
    provide: (f) => EditorView.decorations.from(f),
  })

  return { setLine, field }
}

export const { setLine: setExecLine, field: execLineField } = makeLineHighlighter('cm-exec-line')
export const { setLine: setErrorLine, field: errorLineField } = makeLineHighlighter('cm-error-line')

export const lineHighlightTheme = EditorView.baseTheme({
  '.cm-exec-line': { backgroundColor: 'rgba(16, 64, 48, 0.55)' },
  '.cm-error-line': { backgroundColor: 'rgba(248, 81, 73, 0.18)' },
})

export const execLineExtensions = [execLineField, errorLineField, lineHighlightTheme]
