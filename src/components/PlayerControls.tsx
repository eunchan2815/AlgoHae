// F-22~F-26 재생 컨트롤 — 재생·일시정지 / 스텝 이동 / 스크럽 / 속도
import styled from 'styled-components'
import { theme } from '../styles/theme'

interface Props {
  step: number
  total: number
  playing: boolean
  speed: number
  onStepChange: (step: number) => void
  onTogglePlay: () => void
  onSpeedChange: (speed: number) => void
}

const SPEEDS = [0.5, 1, 2, 4]

export default function PlayerControls({
  step,
  total,
  playing,
  speed,
  onStepChange,
  onTogglePlay,
  onSpeedChange,
}: Props) {
  return (
    <Bar>
      <Btn type="button" onClick={() => onStepChange(0)} disabled={step === 0} title="처음으로">
        ⏮
      </Btn>
      <Btn
        type="button"
        onClick={() => onStepChange(Math.max(0, step - 1))}
        disabled={step === 0}
        title="한 스텝 뒤로"
      >
        ◀
      </Btn>
      <PlayBtn type="button" onClick={onTogglePlay} title={playing ? '일시정지' : '재생'}>
        {playing ? '❚❚' : '▶'}
      </PlayBtn>
      <Btn
        type="button"
        onClick={() => onStepChange(Math.min(total - 1, step + 1))}
        disabled={step >= total - 1}
        title="한 스텝 앞으로"
      >
        ▶
      </Btn>

      <Slider
        type="range"
        min={0}
        max={total - 1}
        value={step}
        onChange={(e) => onStepChange(Number(e.target.value))}
        aria-label="타임라인"
      />

      <StepLabel>
        {step + 1} / {total}
      </StepLabel>

      <SpeedSelect
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        aria-label="재생 속도"
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}x
          </option>
        ))}
      </SpeedSelect>
    </Bar>
  )
}

const Bar = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
`

const Btn = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid var(--vs-border, ${theme.border});
  border-radius: 8px;
  background: var(--vs-list-hover, ${theme.panel});
  color: var(--vs-text, ${theme.text});
  font-size: 12px;
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:not(:disabled):hover {
    background: var(--vs-list-active, ${theme.border});
  }
`

const PlayBtn = styled(Btn)`
  width: 38px;
  height: 38px;
  font-size: 14px;
  border-radius: 50%;
  background: ${theme.teal};
  border-color: ${theme.teal};
  color: #fff;

  &:not(:disabled):hover {
    background: #2a9bff;
  }
`

const Slider = styled.input`
  flex: 1;
  min-width: 60px;
  accent-color: ${theme.teal};
  cursor: pointer;
`

const StepLabel = styled.span`
  font-family: ${theme.mono};
  font-size: 12.5px;
  color: var(--vs-text-dim, ${theme.subtext});
  white-space: nowrap;
`

const SpeedSelect = styled.select`
  background: var(--vs-list-hover, ${theme.panel});
  color: var(--vs-text, ${theme.text});
  border: 1px solid var(--vs-border, ${theme.border});
  border-radius: 8px;
  padding: 5px 7px;
  font-size: 12px;
  cursor: pointer;
`
