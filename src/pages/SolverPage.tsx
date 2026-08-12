import { useMemo, useState } from 'react'
import { CandidateTable, type SortState } from '../components/CandidateTable/CandidateTable'
import { GuessFeedbackEditor } from '../components/GuessFeedbackEditor/GuessFeedbackEditor'
import { ScreenshotImporter } from '../components/ScreenshotImporter/ScreenshotImporter'
import { emptyFeedback, type GuessFeedback, type GuessRecord } from '../domain/feedback'
import { MAX_GUESSES } from '../domain/gameRules'
import type { Player } from '../domain/player'
import { rankGuesses } from '../engine/informationGain'

interface SolverPageProps {
  players: Player[]
  candidates: Player[]
  guesses: GuessRecord[]
  sort: SortState
  onSortChange: (sort: SortState) => void
  onGuessesChange: (guesses: GuessRecord[]) => void
}

export function SolverPage({
  players,
  candidates,
  guesses,
  sort,
  onSortChange,
  onGuessesChange,
}: SolverPageProps) {
  const [guessName, setGuessName] = useState('')
  const [draft, setDraft] = useState<GuessFeedback>(() => emptyFeedback())
  const selectedGuess = players.find((player) => player.nickname === guessName)
  const hasTeamHistory = players.some((player) => player.team_history.length > 0)
  const recommendations = useMemo(
    () => rankGuesses(candidates, players, 8),
    [candidates, players],
  )

  const addGuess = () => {
    if (!selectedGuess || guesses.length >= MAX_GUESSES) return
    onGuessesChange([
      ...guesses,
      {
        id: `${Date.now()}-${selectedGuess.nickname}`,
        playerNickname: selectedGuess.nickname,
        feedback: draft,
      },
    ])
    setGuessName('')
    setDraft(emptyFeedback())
  }

  const resetGame = () => {
    setGuessName('')
    setDraft(emptyFeedback())
    onGuessesChange([])
  }

  return (
    <div className="solver-stack">
      <ScreenshotImporter
        players={players}
        hasTeamHistory={hasTeamHistory}
        onApply={onGuessesChange}
      />
      <section className="solver-card guess-composer">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">FEEDBACK → CONSTRAINTS</span>
            <h2>添加猜测 <small>Guess {guesses.length + 1} / {MAX_GUESSES}</small></h2>
          </div>
          {guesses.length > 0 && (
            <button type="button" className="ghost-button danger" onClick={resetGame}>Reset 对局</button>
          )}
        </div>
        <label className="guess-search">
          <span>Guess Player</span>
          <input
            id="guess-player-search"
            list="guess-player-list"
            value={guessName}
            placeholder="输入昵称 · Ctrl+K"
            autoComplete="off"
            onChange={(event) => setGuessName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setGuessName('')
              if (event.key === 'Enter' && selectedGuess) {
                event.preventDefault()
                addGuess()
              }
            }}
          />
          <datalist id="guess-player-list">
            {players.map((player) => <option value={player.nickname} key={player.nickname}>{player.team}</option>)}
          </datalist>
        </label>
        {selectedGuess ? (
          <>
            <GuessFeedbackEditor
              guess={selectedGuess}
              feedback={draft}
              teamHistoryEnabled={hasTeamHistory}
              onChange={setDraft}
            />
            <button type="button" className="primary-button" disabled={guesses.length >= MAX_GUESSES} onClick={addGuess}>
              {guesses.length >= MAX_GUESSES ? '已达到 8 次上限' : '添加并重新计算'}
            </button>
          </>
        ) : (
          <p className="empty-hint">从完整游戏候选池选择一名选手后，录入游戏返回的 7 个可见反馈列。</p>
        )}
      </section>

      {guesses.length > 0 && (
        <section className="solver-card">
          <div className="panel-heading">
            <div><span className="eyebrow">ALL CONDITIONS ARE AND</span><h2>已录入猜测</h2></div>
            <span className="count-chip">{guesses.length}</span>
          </div>
          <div className="guess-list">
            {guesses.map((record, index) => {
              const guess = players.find((player) => player.nickname === record.playerNickname)
              if (!guess) return null
              return (
                <article className="guess-record" key={record.id}>
                  <div className="guess-record-heading">
                    <div><span>Guess {index + 1}</span><strong>{guess.nickname}</strong><small>{guess.team}</small></div>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => onGuessesChange(guesses.filter((item) => item.id !== record.id))}
                      title="删除后从全部选手重新计算"
                    >×</button>
                  </div>
                  <GuessFeedbackEditor
                    compact
                    guess={guess}
                    feedback={record.feedback}
                    teamHistoryEnabled={hasTeamHistory}
                    includedFields={record.includedFields}
                    onChange={(feedback) => onGuessesChange(guesses.map((item) => (
                      item.id === record.id ? { ...item, feedback } : item
                    )))}
                  />
                </article>
              )
            })}
          </div>
        </section>
      )}

      <section className="solver-card recommendations">
        <div className="panel-heading">
          <div><span className="eyebrow">EXPECTED INFORMATION GAIN</span><h2>下一猜推荐</h2></div>
          <span className="subtle">基于当前 {candidates.length} 名候选</span>
        </div>
        {recommendations.length ? (
          <div className="recommendation-grid">
            {recommendations.map((item, index) => (
              <button
                type="button"
                className="recommendation"
                key={item.player.nickname}
                onClick={() => setGuessName(item.player.nickname)}
              >
                <span className="recommendation-rank">#{index + 1}</span>
                <strong>{item.player.nickname}</strong>
                <small>Info {item.informationScore.toFixed(3)}</small>
                <small>期望 {item.expectedRemaining.toFixed(1)} · 最坏 {item.worstCaseRemaining}</small>
              </button>
            ))}
          </div>
        ) : <p className="empty-hint">当前没有可计算的候选。</p>}
      </section>

      <CandidateTable players={candidates} total={players.length} sort={sort} onSortChange={onSortChange} />
    </div>
  )
}
