'use client'

import { useEffect, useRef, useState } from 'react'

export interface WheelSegment {
  id: string
  label: string
}

interface WheelProps {
  segments: WheelSegment[]
  targetIndex: number | null
  spinning: boolean
  onSpinEnd: () => void
  accent?: string
  className?: string
  isFullscreen?: boolean
}

const PALETTE = [
  '#D3100E',
  '#1A1E24',
  '#9E0C0B',
  '#242830',
  '#E81B18',
  '#15181D',
  '#8F0B0A',
  '#343A45',
  '#B00D0C',
  '#101216',
  '#FF5A57',
  '#2A0A0A',
]

const SIZE = 360
const CENTER = SIZE / 2
const RADIUS = 166

function pointOnCircle(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  }
}

function slicePath(startDeg: number, endDeg: number, radius: number) {
  const start = pointOnCircle(startDeg, radius)
  const end = pointOnCircle(endDeg, radius)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

export function Wheel({
  segments,
  targetIndex,
  spinning,
  onSpinEnd,
  accent = '#FF5A57',
  className,
  isFullscreen = false,
}: WheelProps) {
  const [rotation, setRotation] = useState(0)
  const rotationRef = useRef(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!spinning || targetIndex === null || targetIndex < 0 || segments.length === 0) return

    const slice = 360 / segments.length
    // Segment i starts at -90deg (top) and runs clockwise. Rotating the wheel
    // by -(i + 0.5) * slice brings that segment's centre under the pointer.
    const targetMod = ((360 - (targetIndex + 0.5) * slice) % 360 + 360) % 360
    const currentMod = ((rotationRef.current % 360) + 360) % 360
    const delta = (targetMod - currentMod + 360) % 360
    const next = rotationRef.current + (reducedMotion ? 0 : 360 * 5) + delta

    rotationRef.current = next
    setRotation(next)
  }, [spinning, targetIndex, segments.length, reducedMotion])

  useEffect(() => {
    if (!spinning) return
    const timer = window.setTimeout(onSpinEnd, reducedMotion ? 80 : 4300)
    return () => window.clearTimeout(timer)
  }, [spinning, onSpinEnd, reducedMotion])

  const count = segments.length
  const slice = count > 0 ? 360 / count : 360
  const showLabels = count > 0 && count <= 16

  const containerClasses =
    className ||
    (isFullscreen
      ? 'relative mx-auto w-full max-w-[540px] sm:max-w-[620px] lg:max-w-[680px] xl:max-w-[720px] select-none transition-all'
      : 'relative mx-auto w-full max-w-[420px] sm:max-w-[460px] select-none transition-all')

  return (
    <div className={containerClasses}>
      {/* Pointer */}
      <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1.5 sm:-translate-y-2">
        <div
          className={`h-0 w-0 border-x-transparent transition-all ${
            isFullscreen
              ? 'border-x-[14px] sm:border-x-[18px] border-t-[26px] sm:border-t-[32px] drop-shadow-[0_0_10px_rgba(255,90,87,0.65)]'
              : 'border-x-[11px] sm:border-x-[13px] border-t-[20px] sm:border-t-[24px] drop-shadow-[0_0_8px_rgba(255,90,87,0.55)]'
          }`}
          style={{ borderTopColor: accent }}
        />
      </div>

      <div className="relative aspect-square w-full">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="Pairing draw wheel">
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 6} fill="#08090B" stroke="#242830" strokeWidth="2" />

          <g
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: `${CENTER}px ${CENTER}px`,
              transition: spinning && !reducedMotion ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 1)' : 'none',
            }}
          >
            {count === 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="#101216"
                stroke="#343A45"
                strokeDasharray="6 6"
              />
            )}

            {segments.map((segment, index) => {
              const start = -90 + index * slice
              const end = start + slice
              const center = start + slice / 2
              const isTarget = !spinning && targetIndex === index
              const color = PALETTE[index % PALETTE.length]
              const labelPoint = pointOnCircle(center, RADIUS * 0.58)
              const numberPoint = pointOnCircle(center, RADIUS * 0.84)
              const flip = center > 90 && center < 270
              const maxLabel = count > 8 ? 12 : 18
              const labelText =
                segment.label.length > maxLabel
                  ? `${segment.label.slice(0, maxLabel - 1)}…`
                  : segment.label

              return (
                <g key={segment.id}>
                  {count === 1 ? (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={RADIUS}
                      fill={color}
                      fillOpacity={isTarget ? 0.95 : 0.72}
                      stroke="#08090B"
                      strokeWidth="2"
                    />
                  ) : (
                    <path
                      d={slicePath(start, end, RADIUS)}
                      fill={color}
                      fillOpacity={isTarget ? 0.95 : 0.72}
                      stroke="#08090B"
                      strokeWidth="2"
                    />
                  )}
                  {showLabels && (
                    <text
                      x={labelPoint.x}
                      y={labelPoint.y}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${flip ? center + 180 : center} ${labelPoint.x} ${labelPoint.y})`}
                      style={{ pointerEvents: 'none' }}
                    >
                      {labelText}
                    </text>
                  )}
                  <text
                    x={numberPoint.x}
                    y={numberPoint.y}
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    opacity="0.9"
                    style={{ pointerEvents: 'none' }}
                  >
                    {index + 1}
                  </text>
                </g>
              )
            })}
          </g>

          {/* Hub */}
          <circle cx={CENTER} cy={CENTER} r="40" fill="#08090B" stroke={accent} strokeWidth="3" />
          <text
            x={CENTER}
            y={CENTER - 3}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="11"
            fontWeight="700"
            letterSpacing="1.5"
          >
            ELITE
          </text>
          <text x={CENTER} y={CENTER + 12} textAnchor="middle" fill={accent} fontSize="9" fontWeight="700" letterSpacing="1">
            DRAW
          </text>
        </svg>
      </div>
    </div>
  )
}
