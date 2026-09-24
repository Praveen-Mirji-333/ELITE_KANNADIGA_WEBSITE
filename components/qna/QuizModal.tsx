'use client'

import { useState, useEffect } from 'react'
import { HelpCircle, CheckCircle2, XCircle, X, Award, Sparkles } from 'lucide-react'
import { QnAQuestion } from '../../lib/types'
import { fetchQnAs, submitQnAAnswer } from '../../lib/supabase'

interface QuizModalProps {
  isOpen: boolean
  onClose: () => void
  onXPClaimed?: () => void
}

export function QuizModal({ isOpen, onClose, onXPClaimed }: QuizModalProps) {
  const [questions, setQuestions] = useState<QnAQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    submitted: boolean
    correct: boolean
    msg: string
    xpEarned: number
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadQuestions()
    }
  }, [isOpen])

  async function loadQuestions() {
    const data = await fetchQnAs()
    setQuestions(data)
    setCurrentIndex(0)
    setSelectedOption(null)
    setResult(null)
  }

  if (!isOpen) return null

  const currentQ = questions[currentIndex]

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !currentQ) return
    setSubmitting(true)

    const res = await submitQnAAnswer(currentQ.id, selectedOption)
    setSubmitting(false)

    if (res.success) {
      setResult({
        submitted: true,
        correct: !!res.correct,
        msg: res.message || (res.correct ? 'Correct answer!' : 'Incorrect answer!'),
        xpEarned: res.xp_earned || 0,
      })
      if (res.correct && onXPClaimed) {
        onXPClaimed()
      }
    } else {
      setResult({
        submitted: true,
        correct: false,
        msg: res.error || 'Failed to submit answer',
        xpEarned: 0,
      })
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedOption(null)
      setResult(null)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-xl border border-red-800/60 bg-[#0c0c0e] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/60 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <HelpCircle className="text-red-500" size={28} />
            <div>
              <h3 className="font-display text-xl font-black uppercase text-white">
                FREE FIRE QnA ARENA
              </h3>
              <p className="text-[10px] font-bold tracking-widest text-red-500">
                SERVER-VALIDATED XP QUIZ
              </p>
            </div>
          </div>
          {questions.length > 0 && (
            <span className="text-xs font-bold tracking-widest text-white/50">
              {currentIndex + 1} / {questions.length}
            </span>
          )}
        </div>

        {!currentQ ? (
          <div className="py-12 text-center text-sm text-white/40">
            Loading Quiz Questions...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-white/60 uppercase">
                {currentQ.category}
              </span>
              <span className="flex items-center gap-1 font-display text-xs font-bold text-amber-400">
                <Sparkles size={14} /> +{currentQ.xp_reward} XP REWARD
              </span>
            </div>

            <h4 className="font-display text-lg font-black leading-snug text-white">
              {currentQ.question}
            </h4>

            <div className="space-y-3">
              {currentQ.options.map((option, idx) => (
                <button
                  key={idx}
                  disabled={result?.submitted}
                  onClick={() => setSelectedOption(idx)}
                  className={`w-full border p-4 text-left text-sm font-bold transition ${
                    selectedOption === idx
                      ? 'border-red-600 bg-red-950/40 text-white'
                      : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span className="mr-3 font-display text-red-500">
                    0{idx + 1}.
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {result && (
              <div
                className={`flex items-start gap-3 border p-4 text-xs ${
                  result.correct
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                    : 'border-red-500/40 bg-red-950/40 text-red-300'
                }`}
              >
                {result.correct ? (
                  <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                ) : (
                  <XCircle size={20} className="text-red-400 shrink-0" />
                )}
                <div>
                  <p className="font-bold">{result.msg}</p>
                  {currentQ.explanation && (
                    <p className="mt-1 text-[11px] opacity-80">{currentQ.explanation}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              {!result?.submitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null || submitting}
                  className="cut-button bg-red-600 px-6 py-3 font-display text-xs font-black tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {submitting ? 'VALIDATING...' : 'SUBMIT ANSWER'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="cut-button bg-white px-6 py-3 font-display text-xs font-black tracking-widest text-black transition hover:bg-red-600 hover:text-white"
                >
                  {currentIndex < questions.length - 1 ? 'NEXT QUESTION' : 'CLOSE QUIZ'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
