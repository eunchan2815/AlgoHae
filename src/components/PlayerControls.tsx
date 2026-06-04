// F-22~F-26 재생 컨트롤 — 고스트 아이콘 버튼 + 진행률이 채워지는 슬라이더
import type { CSSProperties } from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'
import { SkipBackIcon, StepBackIcon, StepForwardIcon, PauseIcon, RunIcon } from './icons'

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
  const pct = total > 1 ? (step / (total - 1)) * 100 : 0

  return (
    <Bar>
      <GhostBtn type="button" onClick={() => onStepChange(0)} disabled={step === 0} title="처음으로">
        <SkipBackIcon />
      </GhostBtn>
      <GhostBtn
        type="button"
        onClick={() => onStepChange(Math.max(0, step - 1))}
        disabled={step === 0}
        title="한 스텝 뒤로"
      >
        <StepBackIcon />
      </GhostBtn>
      <PlayBtn type="button" onClick={onTogglePlay} title={playing ? '일시정지' : '재생'}>
        {playing ? <PauseIcon size={14} /> : <RunIcon size={16} />}
      </PlayBtn>
      <GhostBtn
        type="button"
        onClick={() => onStepChange(Math.min(total - 1, step + 1))}
        disabled={step >= total - 1}
        title="한 스텝 앞으로"
      >
        <StepForwardIcon />
      </GhostBtn>

      <Slider
        type="range"
        min={0}
        max={total - 1}
        value={step}
        onChange={(e) => onStepChange(Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        aria-label="타임라인"
      />

      <StepLabel>
        <b>{step + 1}</b> / {total}
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
  gap: 6px;
`

const GhostBtn = styled.button`
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 7px;
  background: none;
  color: var(--vs-text-dim, ${theme.subtext});
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }

  &:not(:disabled):hover {
    background: var(--vs-list-hover, ${theme.panel});
    color: var(--vs-text, ${theme.text});
  }
`

const PlayBtn = styled.button`
  width: 36px;
  height: 36px;
  margin: 0 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--vs-accent, ${theme.teal});
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.12s ease, filter 0.12s ease;

  &:hover {
    transform: scale(1.08);
    filter: brightness(1.12);
  }

  &:active {
    transform: scale(0.96);
  }
`

const Slider = styled.input`
  flex: 1;
  min-width: 60px;
  margin: 0 6px;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--vs-accent, ${theme.teal}) var(--pct, 0%),
    var(--vs-list-active, #3a3a3a) var(--pct, 0%)
  );
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #fff;
    border: 2.5px solid var(--vs-accent, ${theme.teal});
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    transition: transform 0.12s ease;
  }

  &:hover::-webkit-slider-thumb {
    transform: scale(1.25);
  }

  &::-moz-range-thumb {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #fff;
    border: 2.5px solid var(--vs-accent, ${theme.teal});
  }
`

const StepLabel = styled.span`
  font-family: ${theme.mono};
  font-size: 12px;
  color: var(--vs-text-dim, ${theme.subtext});
  white-space: nowrap;

  b {
    color: var(--vs-text, ${theme.text});
    font-weight: 600;
  }
`

const SpeedSelect = styled.select`
  background: var(--vs-list-hover, ${theme.panel});
  color: var(--vs-text, ${theme.text});
  border: none;
  border-radius: 7px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`
