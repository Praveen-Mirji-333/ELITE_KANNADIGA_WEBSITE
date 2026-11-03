'use client'

import { useState, useEffect } from 'react'
import { SitePage } from '../../components/layout/SitePage'
import { PageHeader } from '../../components/layout/PageHeader'
import { TournamentRegisterModal } from '../../components/tournaments/TournamentRegisterModal'
import { ShowRegistrationModal } from '../../components/tournaments/ShowRegistrationModal'
import {
  ArrowRight,
  Search,
  Trophy,
  CheckCircle2,
  Award,
  Calendar,
  Clock,
  FileText,
  X,
  Users,
  Music,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  fetchTournaments,
  fetchTournamentRegistrationsForAdmin,
  fetchAvatarMap,
  getUserProfile,
  fetchUserTournamentRegistrations,
  supabase,
} from '../../lib/supabase'
import { Tournament, TournamentRegistration, Profile } from '../../lib/types'
import { UserAvatar } from '../../components/ui/UserAvatar'

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [filterType, setFilterType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [avatarMap, setAvatarMap] = useState<Map<string, string>>(new Map())

  // Current User & User Registrations State
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [userRegistrationsMap, setUserRegistrationsMap] = useState<Map<string, TournamentRegistration>>(new Map())

  // Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)

  // Show Registration Modal for Registered Users
  const [showRegTournament, setShowRegTournament] = useState<Tournament | null>(null)
  const [showRegUserRegistration, setShowRegUserRegistration] = useState<TournamentRegistration | null>(null)

  // Rules Modal State
  const [rulesTournament, setRulesTournament] = useState<Tournament | null>(null)

  // Selected Results State
  const [resultsTournament, setResultsTournament] = useState<Tournament | null>(null)
  const [resultsList, setResultsList] = useState<TournamentRegistration[]>([])

  // View Results Modal State for Finished Tournaments
  const [viewResultsModalTourney, setViewResultsModalTourney] = useState<Tournament | null>(null)
  const [viewResultsRegs, setViewResultsRegs] = useState<TournamentRegistration[]>([])
  const [resultsSearchQuery, setResultsSearchQuery] = useState('')
  const [resultsAudio, setResultsAudio] = useState<HTMLAudioElement | null>(null)
  const [isBgmPlaying, setIsBgmPlaying] = useState(false)

  async function loadUserData() {
    const prof = await getUserProfile()
    setCurrentUserProfile(prof)
    if (prof) {
      const userRegs = await fetchUserTournamentRegistrations(prof.id, prof.free_fire_uid)
      const map = new Map<string, TournamentRegistration>()
      for (const r of userRegs) {
        if (r.tournament_id) {
          map.set(r.tournament_id, r)
        }
      }
      setUserRegistrationsMap(map)
    } else {
      setUserRegistrationsMap(new Map())
    }
  }

  useEffect(() => {
    async function load() {
      const [data, avMap] = await Promise.all([
        fetchTournaments(),
        fetchAvatarMap(),
      ])
      setTournaments(data)
      setAvatarMap(avMap)
      if (data.length > 0) {
        loadResults(data[0])
      }
      await loadUserData()
    }
    load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserData()
    })

    const handleUpdate = async () => {
      const refreshed = await fetchTournaments()
      setTournaments(refreshed)
    }
    window.addEventListener('tournaments_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('tournaments_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const modalOpen = Boolean(
    registerModalOpen ||
      showRegTournament ||
      rulesTournament ||
      resultsTournament ||
      viewResultsModalTourney
  )

  useEffect(() => {
    if (!modalOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [modalOpen])

  async function loadResults(t: Tournament) {
    setResultsTournament(t)
    const regs = await fetchTournamentRegistrationsForAdmin(t.id)
    const verified = regs.filter((r) => r.result_verified || r.placement)
    verified.sort((a, b) => (a.placement || 99) - (b.placement || 99))
    setResultsList(verified)
  }

  // Cleanup BGM audio on unmount or change
  useEffect(() => {
    return () => {
      if (resultsAudio) {
        resultsAudio.pause()
        resultsAudio.src = ''
      }
    }
  }, [resultsAudio])

  async function handleOpenResultsModal(t: Tournament) {
    // Read live media override from localStorage if available
    let liveTourney = t
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`tourney_media_${t.id}`)
        if (raw) {
          const parsed = JSON.parse(raw)
          liveTourney = {
            ...t,
            champions_image_url: parsed.champions_image_url || t.champions_image_url,
            results_bgm_url: parsed.results_bgm_url || t.results_bgm_url,
            top_3_teams: parsed.top_3_teams && parsed.top_3_teams.length > 0 ? parsed.top_3_teams : t.top_3_teams,
          }
        }
      } catch {}
    }

    setViewResultsModalTourney(liveTourney)
    setResultsSearchQuery('')

    // Play Victory Song / Anthem if attached to the tournament (supports MP3 and MP4)
    const songUrl = liveTourney.results_bgm_url || liveTourney.top_3_teams?.[0]?.results_bgm_url
    if (songUrl && songUrl.trim() !== '') {
      try {
        if (resultsAudio) {
          resultsAudio.pause()
          resultsAudio.src = ''
        }
        const audio = new Audio(songUrl)
        audio.preload = 'auto'
        audio.loop = true
        audio.volume = 0.75
        audio.play().then(() => {
          setIsBgmPlaying(true)
        }).catch((err) => {
          console.warn('Browser autoplay prevented audio:', err)
          setIsBgmPlaying(false)
        })
        setResultsAudio(audio)
      } catch (err) {
        console.error('Audio initialization error:', err)
      }
    } else {
      if (resultsAudio) {
        resultsAudio.pause()
        resultsAudio.src = ''
        setResultsAudio(null)
        setIsBgmPlaying(false)
      }
    }

    const regs = await fetchTournamentRegistrationsForAdmin(t.id)
    regs.sort((a, b) => (a.placement || 99) - (b.placement || 99))
    setViewResultsRegs(regs)
  }

  function handleCloseResultsModal() {
    if (resultsAudio) {
      resultsAudio.pause()
      resultsAudio.src = ''
      setResultsAudio(null)
      setIsBgmPlaying(false)
    }
    setViewResultsModalTourney(null)
  }

  const handleRegisterClick = (t: Tournament) => {
    setSelectedTournament(t)
    setRegisterModalOpen(true)
  }

  const filteredTournaments = tournaments.filter((t) => {
    const matchesFilter =
      filterType === 'ALL' ||
      t.game_mode?.toUpperCase().includes(filterType) ||
      t.tournament_type?.toUpperCase().includes(filterType)
    const matchesSearch =
      !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.game_mode?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <SitePage>
      <div className="site-container pb-20 pt-16 sm:pt-20 lg:pb-28">
        <PageHeader
          kicker="Arena tournaments"
          title={
            <>
              Find your <span className="text-brand-bright">next battle</span>
            </>
          }
          description="Verified Free Fire tournaments across Karnataka. Clear rules, real prize pools, and published results — no duplicate UIDs, no guesswork."
          meta={
            <>
              <span className="badge">{filteredTournaments.length} events</span>
              <span className="badge">CS &amp; BR formats</span>
              <span className="badge">Verified brackets</span>
            </>
          }
        />

        {/* Search & Filters Bar */}
        <div className="surface mb-8 flex flex-col gap-3 p-2 md:sticky md:top-20 md:z-30 lg:flex-row lg:items-center lg:justify-between">
          <div className="sm:hidden">
            <label className="sr-only" htmlFor="tournament-format-filter">
              Tournament format
            </label>
            <select
              id="tournament-format-filter"
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className="field h-10 text-sm"
            >
              {['ALL', 'CS SQUAD BATTLE', 'BR SQUAD BATTLE', 'BR SOLO', 'GUILD'].map((tab) => (
                <option key={tab} value={tab}>
                  {tab}
                </option>
              ))}
            </select>
          </div>

          <div className="no-scrollbar hidden min-w-0 items-center gap-1.5 overflow-x-auto sm:flex">
            {['ALL', 'CS SQUAD BATTLE', 'BR SQUAD BATTLE', 'BR SOLO', 'GUILD'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-xs font-bold tracking-[0.05em] uppercase transition-all ${
                  filterType === tab
                    ? 'neu-btn-crimson !min-h-9 !py-0 !px-3.5 text-white'
                    : 'neu-btn-dark !min-h-9 !py-0 !px-3 text-ink-muted hover:text-ink'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:max-w-xs lg:shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={16} />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field h-10 pl-9 pr-9 text-sm"
              aria-label="Search tournaments"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-line bg-surface-2 text-ink-subtle">
              <Trophy size={22} />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink">No tournaments found</h2>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              {searchQuery || filterType !== 'ALL'
                ? 'Try a different filter or clear your search.'
                : 'New events will be published here as soon as the admin announces them.'}
            </p>
            {(searchQuery || filterType !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFilterType('ALL')
                  setSearchQuery('')
                }}
                className="btn-secondary btn-sm mt-5"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
            {filteredTournaments.map((t) => {
              const isRegistered = userRegistrationsMap.has(t.id)
              const isCompleted = t.status === 'completed'
              const isAdmin = currentUserProfile?.role === 'admin'
              const canRegister = !isCompleted && !isRegistered

              return (
                <article key={t.id} className="card card-hover flex flex-col overflow-hidden">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`badge ${t.status === 'registration_open' ? 'badge-brand' : ''}`}>
                          {t.status.replace(/_/g, ' ')}
                        </span>
                        <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-ink">
                          {t.title}
                        </h3>
                        <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-bright">
                          {t.game_mode}
                        </p>
                      </div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand-border bg-brand-muted text-brand-bright">
                        <Trophy size={19} />
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      <div className="neu-inset-sm p-3">
                        <p className="label">Prize pool</p>
                        <p className="mt-1 text-sm font-semibold text-ink">{t.prize_pool}</p>
                      </div>
                      <div className="neu-inset-sm p-3">
                        <p className="label">Slots filled</p>
                        <p className="mt-1 text-sm font-semibold text-ink">
                          {t.slots_filled || 0}{' '}
                          <span className="text-ink-subtle">/ {t.max_slots}</span>
                        </p>
                      </div>
                    </div>

                    <dl className="mt-4 space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="flex items-center gap-1.5 text-ink-subtle">
                          <Clock size={13} className="shrink-0" />
                          Registration closes
                        </dt>
                        <dd className="max-w-[55%] text-right font-medium text-ink-muted">
                          {t.registration_end
                            ? new Date(t.registration_end).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'Open until full'}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="flex items-center gap-1.5 text-ink-subtle">
                          <Calendar size={13} className="shrink-0" />
                          Tournament starts
                        </dt>
                        <dd className="max-w-[55%] text-right font-medium text-ink-muted">
                          {new Date(t.tournament_start).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle bg-surface-2/60 px-5 py-3.5">
                    <button
                      onClick={() => setRulesTournament(t)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
                    >
                      <FileText size={14} />
                      Rules
                    </button>

                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {(isCompleted || (t.top_3_teams && t.top_3_teams.length > 0)) && (
                        <button
                          onClick={() => handleOpenResultsModal(t)}
                          className="btn-secondary btn-sm"
                        >
                          <Trophy size={13} />
                          Results
                        </button>
                      )}

                      {!isCompleted && isRegistered && (
                        <>
                          <button
                            onClick={() => {
                              setShowRegTournament(t)
                              setShowRegUserRegistration(userRegistrationsMap.get(t.id) || null)
                            }}
                            className="btn-secondary btn-sm"
                          >
                            <CheckCircle2 size={13} />
                            My team
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleRegisterClick(t)}
                              className="btn-ghost btn-sm text-ink-muted"
                              title="Admin can register additional teams"
                            >
                              + Team
                            </button>
                          )}
                        </>
                      )}

                      {canRegister && (
                        <button
                          onClick={() => handleRegisterClick(t)}
                          className="btn-primary btn-sm"
                        >
                          {isAdmin && t.status !== 'registration_open' ? 'Admin register' : 'Register'}
                          <ArrowRight size={13} />
                        </button>
                      )}

                      {isCompleted && isAdmin && (
                        <button
                          onClick={() => handleRegisterClick(t)}
                          className="btn-ghost btn-sm text-ink-muted"
                          title="Admin can register teams even to completed tournaments"
                        >
                          + Admin
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Live Published Match Standings & Results */}
        <div className="mt-16 border-t border-line-subtle pt-12 sm:mt-20 sm:pt-16">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 md:flex-row md:items-end">
            <div>
              <p className="kicker">
                <span className="kicker-line" aria-hidden="true" />
                Verified standings
              </p>
              <h2 className="display-section mt-2">Published results</h2>
              <p className="text-body mt-2 max-w-xl text-sm">
                Official placements and verified scores from completed events.
              </p>
            </div>
            {tournaments.length > 0 && (
              <select
                value={resultsTournament?.id}
                onChange={(e) => {
                  const found = tournaments.find((t) => t.id === e.target.value)
                  if (found) loadResults(found)
                }}
                className="field h-10 w-full text-sm md:w-auto"
                aria-label="Select tournament results"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {resultsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface-2 text-ink-subtle">
                <Award size={20} />
              </span>
              <p className="mt-4 text-sm font-medium text-ink">Results not published yet</p>
              <p className="mt-1 max-w-md text-xs text-ink-subtle">
                Verified scores appear here after the admin closes the event.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line-subtle border border-line-subtle bg-surface-2">
              {resultsList.map((res, i) => (
                <div key={res.id} className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <span className="font-display text-xl sm:text-2xl font-extrabold text-brand-bright shrink-0 w-8 text-center">
                      #{res.placement || i + 1}
                    </span>
                    <UserAvatar
                      src={avatarMap.get((res.captain_free_fire_uid || '').trim().toLowerCase()) || avatarMap.get((res.captain_name || '').trim().toLowerCase())}
                      name={res.captain_name}
                      size="md"
                      className="border border-brand shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display text-sm sm:text-lg font-extrabold text-ink truncate">
                        {res.team_name || res.captain_name || 'REGISTERED SQUAD'}
                      </h4>
                      <p className="text-xs sm:text-xs text-ink-subtle truncate">Captain: {res.captain_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-line-subtle pt-2 sm:pt-0 w-full sm:w-auto shrink-0">
                    <span className="font-display text-sm sm:text-lg font-bold text-brand-bright">
                      {res.kills} KILLS
                    </span>
                    <p className="text-xs sm:text-xs font-bold text-ink bg-surface-3 border border-line-strong px-2 py-0.5 rounded">
                      VERIFIED
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      <TournamentRegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        tournament={selectedTournament}
        currentUserProfile={currentUserProfile}
        onSuccess={async () => {
          await loadUserData()
          const refreshedT = await fetchTournaments()
          setTournaments(refreshedT)
          if (selectedTournament) loadResults(selectedTournament)
        }}
      />

      {/* Show Registration Modal for Registered Users */}
      <ShowRegistrationModal
        isOpen={!!showRegTournament}
        onClose={() => {
          setShowRegTournament(null)
          setShowRegUserRegistration(null)
        }}
        tournament={showRegTournament}
        userRegistration={showRegUserRegistration}
        avatarMap={avatarMap}
      />

      {/* Rules Modal Overlay */}
      {rulesTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/90 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
          <div className="relative my-auto w-full max-w-lg border border-brand-border bg-surface p-5 sm:p-6 shadow-2xl space-y-4 text-ink max-h-[92vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => setRulesTournament(null)}
              className="absolute right-4 top-4 text-ink-muted hover:text-ink"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 border-b border-line-subtle pb-4">
              <FileText className="text-brand-bright shrink-0" size={26} />
              <div className="min-w-0">
                <h3 className="font-display text-lg sm:text-xl font-extrabold uppercase text-ink truncate">
                  TOURNAMENT RULES & REGULATIONS
                </h3>
                <p className="text-xs text-brand-bright font-bold truncate">{rulesTournament.title}</p>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto space-y-3 text-xs leading-relaxed text-ink pr-2">
              <p className="font-bold text-brand-bright uppercase">
                OFFICIAL RULEBOOK ({rulesTournament.game_mode}):
              </p>
              <div className="whitespace-pre-wrap border border-line-subtle bg-surface-2 p-3.5 sm:p-4 rounded text-xs text-ink">
                {rulesTournament.rules ||
                  `1. All players must register with valid Free Fire UIDs.
2. Duplicate Free Fire UIDs are strictly forbidden across teams.
3. Teams must check in 15 minutes before official match start time.
4. Use of hacks, third-party scripts, or bug exploits results in immediate disqualification.
5. Admin decisions on room credentials and points calculations are final.`}
              </div>
            </div>

            <button
              onClick={() => setRulesTournament(null)}
              className="w-full bg-brand py-2.5 font-display text-xs font-extrabold tracking-widest text-ink hover:bg-brand"
            >
              I UNDERSTAND THE RULES
            </button>
          </div>
        </div>
      )}

      {/* Finished Tournament View Results Modal */}
      {viewResultsModalTourney && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/90 p-2.5 sm:p-4 backdrop-blur-md"
          onClick={handleCloseResultsModal}
        >
          <div
            className="relative flex max-h-[92vh] w-full min-w-0 max-w-4xl flex-col space-y-4 rounded-xl border border-brand bg-surface p-4 text-ink shadow-2xl sm:space-y-5 sm:p-6 2xl:max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseResultsModal}
              className="absolute right-3 top-3 rounded-md p-1 text-ink-muted transition hover:bg-surface-2 hover:text-ink"
              aria-label="Close results"
            >
              <X size={20} />
            </button>

            {/* Header with Title, BGM Player & Prize */}
            <div className="flex flex-col justify-between gap-3 border-b border-line-subtle pb-4 pr-10 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 min-w-0">
                <Trophy className="text-brand-bright shrink-0" size={28} />
                <div className="min-w-0">
                  <span className="text-xs sm:text-xs font-bold text-brand-bright tracking-widest uppercase block truncate">
                    {viewResultsModalTourney.game_mode} • OFFICIAL STANDINGS & RESULTS
                  </span>
                  <h3 className="font-display text-lg sm:text-2xl font-extrabold text-ink truncate">
                    {viewResultsModalTourney.title}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                {/* Victory Song Play/Pause Controller */}
                {(viewResultsModalTourney.results_bgm_url || viewResultsModalTourney.top_3_teams?.[0]?.results_bgm_url) && (
                  <button
                    type="button"
                    onClick={() => {
                      const songUrl = viewResultsModalTourney.results_bgm_url || viewResultsModalTourney.top_3_teams?.[0]?.results_bgm_url
                      if (!songUrl) return

                      if (!resultsAudio) {
                        const audio = new Audio(songUrl)
                        audio.preload = 'auto'
                        audio.loop = true
                        audio.volume = 0.75
                        audio.play().then(() => setIsBgmPlaying(true)).catch(() => {})
                        setResultsAudio(audio)
                        return
                      }

                      if (isBgmPlaying) {
                        resultsAudio.pause()
                        setIsBgmPlaying(false)
                      } else {
                        resultsAudio.play().then(() => setIsBgmPlaying(true)).catch(() => {})
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold tracking-wide transition shadow-md ${
                      isBgmPlaying
                        ? 'border-brand bg-brand-muted text-brand-bright animate-pulse'
                        : 'border-line-strong bg-surface-2 text-ink-muted hover:text-ink'
                    }`}
                    title="Toggle Victory Song"
                  >
                    {isBgmPlaying ? (
                      <>
                        <Volume2 size={14} className="text-brand-bright" />
                        <span className="hidden sm:inline">VICTORY SONG PLAYING</span>
                        <span className="sm:hidden">SONG ON</span>
                      </>
                    ) : (
                      <>
                        <VolumeX size={14} />
                        <span className="hidden sm:inline">PLAY VICTORY SONG</span>
                        <span className="sm:hidden">SONG OFF</span>
                      </>
                    )}
                  </button>
                )}

                {viewResultsModalTourney.prize_pool && viewResultsModalTourney.prize_pool.trim() !== '' && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">TOTAL PRIZE</p>
                    <p className="font-display text-base sm:text-xl font-extrabold text-brand-bright">
                      {viewResultsModalTourney.prize_pool}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden pr-2">
              {/* TOP CHAMPIONS SHOWCASE (1:1 Aspect Ratio, No White Shadow, Inner Black Vignette) */}
              <div className="mx-auto w-full max-w-[460px] sm:max-w-[500px]">
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-brand bg-black">
                  <img
                    src={viewResultsModalTourney.champions_image_url || '/images/carousel-aliens-champions.jpg'}
                    alt="Tournament Champions"
                    className="h-full w-full object-cover object-center"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/images/carousel-aliens-champions.jpg'
                    }}
                  />

                  {/* Subtle, Balanced Inner Black Vignette & Gentle Bottom Scrim */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      boxShadow: 'inset 0 0 35px rgba(0, 0, 0, 0.45)',
                    }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />

                  {/* Corner Badge */}
                  <div className="absolute left-3 top-3 sm:left-4 sm:top-4 z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/60 bg-black/85 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-brand-bright backdrop-blur-md">
                      <Trophy size={13} className="text-brand-bright" />
                      OFFICIAL TOURNAMENT CHAMPIONS
                    </span>
                  </div>

                  {/* Champion Team Info Overlay */}
                  {viewResultsModalTourney.top_3_teams && viewResultsModalTourney.top_3_teams.length > 0 && (
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3 z-10">
                      <div className="drop-shadow-lg">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-bright">
                          🥇 1ST PLACE CHAMPION SQUAD
                        </p>
                        <h4 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white drop-shadow-md">
                          {viewResultsModalTourney.top_3_teams.find((t) => t.rank === 1)?.team_name || 'CHAMPION TEAM'}
                        </h4>
                        <p className="text-xs text-white/90">
                          Leader: <strong className="text-white">{viewResultsModalTourney.top_3_teams.find((t) => t.rank === 1)?.captain_name}</strong>
                          {viewResultsModalTourney.top_3_teams.find((t) => t.rank === 1)?.captain_uid && (
                            <span className="font-mono text-brand-bright ml-2 font-bold">
                              UID: {viewResultsModalTourney.top_3_teams.find((t) => t.rank === 1)?.captain_uid}
                            </span>
                          )}
                        </p>
                      </div>

                      {viewResultsModalTourney.top_3_teams.find((t) => t.rank === 1)?.prize && (
                        <div className="rounded-lg border border-brand bg-black/85 px-3.5 py-1.5 backdrop-blur-md self-start sm:self-auto">
                          <p className="text-[10px] uppercase font-bold text-white/70">CHAMPION REWARD</p>
                          <p className="font-display text-base sm:text-lg font-extrabold text-brand-bright">
                            {viewResultsModalTourney.top_3_teams.find((t) => t.rank === 1)?.prize}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* TOP 3 PODIUM DISPLAY */}
              <div className="space-y-3">
                <h4 className="eyebrow flex items-center gap-2 text-brand-bright">
                  <Award size={16} /> TOP 3 WINNING SQUADS PODIUM
                </h4>

                {viewResultsModalTourney.top_3_teams && viewResultsModalTourney.top_3_teams.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {viewResultsModalTourney.top_3_teams.map((top) => {
                      const isGold = top.rank === 1
                      const isSilver = top.rank === 2

                      return (
                        <div
                          key={top.rank}
                          className={`card relative flex min-w-0 flex-col justify-between p-4 sm:p-5 ${
                            isGold
                              ? 'border-brand-border bg-brand-muted'
                              : isSilver
                                ? 'border-line-strong'
                                : ''
                          }`}
                        >
                          {/* Rank badge header */}
                          <div>
                            <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-line-subtle pb-3">
                              <span
                                className={`badge ${
                                  isGold
                                    ? 'badge-brand'
                                    : isSilver
                                      ? 'border-line-strong text-ink'
                                      : ''
                                }`}
                              >
                                {isGold
                                  ? '1st · Champion'
                                  : isSilver
                                    ? '2nd · Runner up'
                                    : '3rd · Second runner up'}
                              </span>
                              {top.prize && top.prize.trim() !== '' && (
                                <span
                                  className={`badge ${
                                    isGold ? 'border-brand-border text-brand-bright' : ''
                                  }`}
                                >
                                  {top.prize}
                                </span>
                              )}
                            </div>

                            {/* Team Name */}
                            <h5
                              className={`break-words font-display text-lg font-extrabold uppercase tracking-wide sm:text-xl ${
                                isGold ? 'text-brand-bright' : isSilver ? 'text-ink' : 'text-brand-bright'
                              }`}
                            >
                              {top.team_name}
                            </h5>

                            {/* 4 Squad Players List with Names and Free Fire UIDs */}
                            {top.player_names && top.player_names.length > 0 ? (
                              <div className="mt-3 text-xs space-y-1.5 border-t border-line-subtle pt-3">
                                <div className="flex items-center justify-between">
                                  <p
                                    className={`text-xs font-bold uppercase tracking-wider ${
                                      isGold ? 'text-brand-bright' : isSilver ? 'text-ink' : 'text-brand-bright'
                                    }`}
                                  >
                                    4 SQUAD PLAYERS
                                  </p>
                                  <span className="text-[10px] font-mono text-ink-subtle">IGN & FF UID</span>
                                </div>
                                <div className="space-y-1.5 font-medium">
                                  {top.player_names.map((rawName, pIdx) => {
                                    const isLeader = pIdx === 0
                                    const name = rawName?.trim() || (isLeader ? top.captain_name?.trim() || '' : '')
                                    const pUid = top.player_uids?.[pIdx]?.trim() || (isLeader ? top.captain_uid?.trim() || '' : '')

                                    if (!name && !pUid) return null
                                    const pAvatar =
                                      avatarMap.get(pUid.toLowerCase()) ||
                                      avatarMap.get(name.toLowerCase()) ||
                                      null

                                    return (
                                      <div
                                        key={pIdx}
                                        className={`flex items-center justify-between gap-2 rounded px-2.5 py-1.5 text-xs ${
                                          isLeader
                                            ? isGold
                                              ? 'border border-brand bg-brand/20 font-bold text-brand-bright'
                                              : isSilver
                                              ? 'border border-line bg-surface-3 font-bold text-ink'
                                              : 'border border-brand-border bg-brand-muted font-bold text-brand-bright'
                                            : 'border border-line-subtle bg-canvas/40 text-ink'
                                        }`}
                                      >
                                        <div className="flex min-w-0 items-center gap-1.5">
                                          <UserAvatar
                                            src={pAvatar}
                                            name={name || `Player ${pIdx + 1}`}
                                            size="xs"
                                            className="h-5 w-5 shrink-0 border border-line"
                                          />
                                          <span className="truncate">
                                            {pIdx + 1}. {name || `Player ${pIdx + 1}`} {isLeader ? ' (Leader)' : ''}
                                          </span>
                                        </div>
                                        {pUid && (
                                          <span className="shrink-0 font-mono text-[11px] font-bold text-brand-bright bg-canvas/80 px-1.5 py-0.5 rounded border border-line-subtle">
                                            UID: {pUid}
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs flex items-center justify-between gap-2 border-t border-line-subtle pt-2">
                                <div className="flex items-center gap-2">
                                  <UserAvatar
                                    src={avatarMap.get((top.captain_uid || '').trim().toLowerCase()) || avatarMap.get((top.captain_name || '').trim().toLowerCase())}
                                    name={top.captain_name}
                                    size="xs"
                                    className="h-6 w-6 border border-line"
                                  />
                                  <span className="text-ink font-semibold">Leader: {top.captain_name}</span>
                                </div>
                                {top.captain_uid && (
                                  <span className="shrink-0 font-mono text-[11px] font-bold text-brand-bright bg-canvas/80 px-1.5 py-0.5 rounded border border-line-subtle">
                                    UID: {top.captain_uid}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Stats Footer */}
                          <div className="mt-4 flex items-center justify-between text-xs font-bold border-t border-line-subtle pt-2.5">
                            {top.kills && top.kills > 0 ? (
                              <span className="flex items-center gap-1 text-brand-bright">
                                {top.kills} KILLS
                              </span>
                            ) : <span />}
                            <span
                              className={isGold ? 'text-brand-bright' : isSilver ? 'text-ink' : 'text-brand-bright'}
                            >
                              {top.points || 0} POINTS
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-line-subtle p-4 text-center text-xs text-ink-subtle">
                    Top 3 podium details pending admin announcement.
                  </div>
                )}
              </div>

              {/* ALL REGISTERED TEAMS & STANDINGS TABLE */}
              <div className="space-y-3 border-t border-line-subtle pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="eyebrow flex items-center gap-2">
                    <Users size={16} /> ALL REGISTERED TEAMS & FINAL STANDINGS ({viewResultsRegs.length})
                  </h4>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-ink-subtle" size={14} />
                    <input
                      type="text"
                      placeholder="Search team name..."
                      value={resultsSearchQuery}
                      onChange={(e) => setResultsSearchQuery(e.target.value)}
                      className="h-9 w-full rounded-md border border-line bg-canvas/60 py-1.5 pl-9 pr-3 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                {viewResultsRegs.length === 0 ? (
                  <div className="rounded-lg border border-line-subtle p-6 text-center text-xs text-ink-subtle">
                    No registered teams found for this tournament.
                  </div>
                ) : (
                  <div className="max-h-80 divide-y divide-line-subtle overflow-y-auto rounded-lg border border-line-subtle bg-surface-2 pr-1">
                    {viewResultsRegs
                      .filter((r) => {
                        if (!resultsSearchQuery) return true
                        const q = resultsSearchQuery.toLowerCase()
                        return (
                          (r.team_name && r.team_name.toLowerCase().includes(q)) ||
                          (r.captain_name && r.captain_name.toLowerCase().includes(q)) ||
                          (r.captain_free_fire_uid && r.captain_free_fire_uid.includes(q))
                        )
                      })
                      .map((r, idx) => (
                        <div key={r.id} className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2 transition">
                          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                            <span className="font-display text-lg sm:text-xl font-extrabold text-brand-bright w-7 sm:w-8 text-center shrink-0 mt-0.5 sm:mt-0">
                              #{r.placement || idx + 1}
                            </span>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <h5 className="font-display text-sm sm:text-base font-extrabold text-brand-bright truncate">
                                {r.team_name || r.captain_name}
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs sm:text-xs bg-canvas/40 p-2 sm:p-2.5 border border-line-subtle rounded">
                                <div className="text-ink flex items-center gap-2 min-w-0">
                                  <UserAvatar
                                    src={avatarMap.get((r.captain_free_fire_uid || '').trim().toLowerCase()) || avatarMap.get((r.captain_name || '').trim().toLowerCase())}
                                    name={r.captain_name}
                                    size="xs"
                                    className="h-6 w-6 border border-brand shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="block truncate font-bold text-brand-bright">Leader: <strong className="text-ink">{r.captain_name}</strong></span>
                                    <span className="block font-mono text-xs text-brand-bright truncate">UID: {r.captain_free_fire_uid || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="text-ink flex items-center gap-2 min-w-0">
                                  <UserAvatar
                                    src={avatarMap.get((r.teammate_uids?.[0] || '').trim().toLowerCase()) || avatarMap.get((r.teammate_names?.[0] || '').trim().toLowerCase())}
                                    name={r.teammate_names?.[0]}
                                    size="xs"
                                    className="h-6 w-6 border border-line shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="block truncate">2nd: <strong className="text-ink">{r.teammate_names?.[0] || 'N/A'}</strong></span>
                                    <span className="block font-mono text-xs text-brand-bright truncate">UID: {r.teammate_uids?.[0] || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="text-ink flex items-center gap-2 min-w-0">
                                  <UserAvatar
                                    src={avatarMap.get((r.teammate_uids?.[1] || '').trim().toLowerCase()) || avatarMap.get((r.teammate_names?.[1] || '').trim().toLowerCase())}
                                    name={r.teammate_names?.[1]}
                                    size="xs"
                                    className="h-6 w-6 border border-line shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="block truncate">3rd: <strong className="text-ink">{r.teammate_names?.[1] || 'N/A'}</strong></span>
                                    <span className="block font-mono text-xs text-brand-bright truncate">UID: {r.teammate_uids?.[1] || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="text-ink flex items-center gap-2 min-w-0">
                                  <UserAvatar
                                    src={avatarMap.get((r.teammate_uids?.[2] || '').trim().toLowerCase()) || avatarMap.get((r.teammate_names?.[2] || '').trim().toLowerCase())}
                                    name={r.teammate_names?.[2]}
                                    size="xs"
                                    className="h-6 w-6 border border-line shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="block truncate">4th: <strong className="text-ink">{r.teammate_names?.[2] || 'N/A'}</strong></span>
                                    <span className="block font-mono text-xs text-brand-bright truncate">UID: {r.teammate_uids?.[2] || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-line-subtle pt-2 sm:pt-0 w-full sm:w-auto shrink-0">
                            {r.kills && r.kills > 0 ? (
                              <span className="font-display text-sm sm:text-base font-extrabold text-brand-bright block">
                                {r.kills} KILLS
                              </span>
                            ) : null}
                            <p className="text-xs sm:text-xs font-bold text-ink bg-surface-3 border border-line-strong px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 size={11} /> VERIFIED
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </SitePage>
  )
}
