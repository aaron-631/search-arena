import { useState, useEffect, useRef } from 'react';
import { generatePuzzle, runBFS, runDFS, runGreedy, runAStar, pickRaceWinner, runBenchmark } from './puzzles/eightPuzzle.js';
import { nqBacktrack, nqHillClimb, countAttacks } from './puzzles/nQueens.js';
import { manhattanDistance } from './heuristics/manhattan.js';
import { misplacedTiles }    from './heuristics/misplaced.js';
import { stateToKey, goalKey, GOAL_STATE, isSolvable } from './utils/stateUtils.js';
import { Panel }         from './components/Panel.jsx';
import { MetricBox }     from './components/MetricBox.jsx';
import { PuzzleBoard }   from './components/PuzzleBoard.jsx';
import { NQueensBoard }  from './components/NQueensBoard.jsx';
import { SearchTreeViz } from './components/SearchTreeViz.jsx';
import { db, auth, provider }                          from './firebase.js';
import {
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { collection, addDoc, getDocs, orderBy, query,
         limit, doc, setDoc, getDoc }                   from 'firebase/firestore';

// ─── Google "G" SVG icon ────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24"
    style={{ display:'inline', verticalAlign:'middle', marginRight:6, flexShrink:0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ─── Algorithm metadata ──────────────────────────────────────────────────────
const AMETA = [
  { id: 'bfs',    label: 'BFS',    color: '#00ff88' },
  { id: 'dfs',    label: 'DFS',    color: '#ff6b35' },
  { id: 'greedy', label: 'Greedy', color: '#ffdd00' },
  { id: 'astar',  label: 'A*',     color: '#00cfff' },
];

// ─── Button style helpers ────────────────────────────────────────────────────
function Btn(active, color, extra = {}) {
  return {
    padding: '8px 14px', border: `1px solid ${active ? color : '#2a2a3e'}`,
    background: active ? `${color}22` : 'transparent', color: active ? color : '#777',
    borderRadius: 6, cursor: 'pointer', fontSize: 12,
    fontFamily: "'Courier New',monospace", letterSpacing: 1,
    transition: 'all 0.15s', fontWeight: active ? 700 : 400,
    minHeight: 40, touchAction: 'manipulation', ...extra,
  };
}
const SBtn = {
  padding: '8px 14px', border: '1px solid #2a2a3e', background: 'transparent',
  color: '#888', borderRadius: 6, cursor: 'pointer', fontSize: 15,
  fontFamily: "'Courier New',monospace", minHeight: 40, touchAction: 'manipulation',
};

// ─── Score formula ───────────────────────────────────────────────────────────
function calcScore(secs, mv, difficulty) {
  const base = { easy: 1000, medium: 2500, hard: 5000 };
  const mult = { easy: 1,    medium: 1.5,  hard: 2    };
  const raw  = base[difficulty] - (secs * 10) - (mv * 5);
  return Math.round(Math.max(0, raw) * mult[difficulty]);
}

// ─── Parse puzzle from URL ───────────────────────────────────────────────────
function puzzleFromURL() {
  const params = new URLSearchParams(window.location.search);
  const raw    = params.get('puzzle');
  if (!raw) return null;
  const parsed = raw.split(',').map(Number);
  if (parsed.length === 9 && isSolvable(parsed)) return parsed;
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
export default function App() {

  // ── Core puzzle state ──────────────────────────────────────────────────
  const [tab, setTab]             = useState('8puzzle');
  const [diff, setDiff]           = useState(() => {
    const d = new URLSearchParams(window.location.search).get('diff');
    return ['easy','medium','hard'].includes(d) ? d : 'medium';
  });
  const [puzzle, setPuzzle]       = useState(() => {
    const urlDiff  = new URLSearchParams(window.location.search).get('diff');
    const initDiff = ['easy','medium','hard'].includes(urlDiff) ? urlDiff : 'medium';
    return puzzleFromURL() ?? generatePuzzle(initDiff);
  });
  const [algos, setAlgos]         = useState(['bfs', 'astar']);
  const [heuristic, setHeuristic] = useState('manhattan');
  const [raceRes, setRaceRes]     = useState(null);
  const [racing, setRacing]       = useState(false);
  const [pb, setPb]               = useState(null);
  const [pbStep, setPbStep]       = useState(0);
  const [playing, setPlaying]     = useState(false);
  const [moves, setMoves]         = useState(0);
  const [solved, setSolved]       = useState(false);
  const [showHint, setShowHint]   = useState(false);
  const [showTree, setShowTree]   = useState(false);

  // ── Benchmark state ────────────────────────────────────────────────────
  const [benchRes, setBenchRes]   = useState(null);
  const [benching, setBenching]   = useState(false);
  const [benchDiff, setBenchDiff] = useState('medium');
  const [benchLB, setBenchLB]     = useState([]);

  // ── N-Queens state ─────────────────────────────────────────────────────
  const [nqSize, setNqSize] = useState(8);
  const [nqAlgo, setNqAlgo] = useState('backtrack');
  const [nqRes,  setNqRes]  = useState(null);
  const [nqStep, setNqStep] = useState(0);
  const [nqPlay, setNqPlay] = useState(false);
  const [userNq, setUserNq] = useState(Array(8).fill(-1));

  // ── Auth & game state ──────────────────────────────────────────────────
  const [user,          setUser]          = useState(null);
  const [timerSecs,     setTimerSecs]     = useState(0);
  const [timerActive,   setTimerActive]   = useState(false);
  const [leaderboard,   setLeaderboard]   = useState([]);
  const [lbLoading,     setLbLoading]     = useState(false);
  const [lbDiff,        setLbDiff]        = useState('all');
  const [personalBest,  setPersonalBest]  = useState(null);
  const [challengeLink, setChallengeLink] = useState(null);
  const [scoreFlash,    setScoreFlash]    = useState(null);
  const [signingIn,     setSigningIn]     = useState(false);

  const playRef  = useRef(null);
  const nqRef    = useRef(null);
  const timerRef = useRef(null);

  // ── Effects ────────────────────────────────────────────────────────────

  // Auth listener + handle redirect result (critical for Capacitor WebView)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    getRedirectResult(auth).catch(() => {});
    return unsub;
  }, []);

  // Fetch personal best on login
  useEffect(() => {
    if (!user) { setPersonalBest(null); return; }
    const fetchBest = async () => {
      try {
        const snap = await getDoc(doc(db, 'leaderboard', user.uid));
        if (snap.exists()) setPersonalBest(snap.data().score);
      } catch (e) { console.error('Failed to fetch personal best', e); }
    };
    fetchBest();
  }, [user]);

  // Timer
  useEffect(() => {
    clearInterval(timerRef.current);
    if (timerActive) {
      timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  // Score flash auto-clear
  useEffect(() => {
    if (scoreFlash === null) return;
    const t = setTimeout(() => setScoreFlash(null), 3500);
    return () => clearTimeout(t);
  }, [scoreFlash]);

  // Playback effect
  useEffect(() => {
    if (playing && pb) {
      playRef.current = setInterval(() => {
        setPbStep(s => {
          if (s >= pb.steps.length - 1) { setPlaying(false); return s; }
          return s + 1;
        });
      }, 100);
    } else clearInterval(playRef.current);
    return () => clearInterval(playRef.current);
  }, [playing, pb]);

  // N-Queens playback
  useEffect(() => {
    clearInterval(nqRef.current);
    if (nqPlay && nqRes) {
      nqRef.current = setInterval(() => {
        setNqStep(s => {
          if (s >= nqRes.steps.length - 1) { clearInterval(nqRef.current); setNqPlay(false); return s; }
          return s + 1;
        });
      }, 80);
    }
    return () => clearInterval(nqRef.current);
  }, [nqPlay, nqRes]);

  // Fetch leaderboard on tab switch
  useEffect(() => {
    if (tab === 'play') fetchLeaderboard();
    if (tab === 'benchmark' && benchLB.length === 0) fetchBenchLB();
  }, [tab, lbDiff]);

  // ── Puzzle functions ───────────────────────────────────────────────────

  const newPuzzle = () => {
    window.history.replaceState({}, '', window.location.pathname);
    const state = generatePuzzle(diff);
    setPuzzle(state);
    setRaceRes(null); setPb(null); setMoves(0);
    setSolved(false); setShowTree(false); setShowHint(false);
    setChallengeLink(null); setScoreFlash(null);
    setTimerSecs(0); setTimerActive(false);
  };

  const tileClick = (idx) => {
    if (solved || pb) return;
    if (!timerActive) setTimerActive(true);
    const blank = puzzle.indexOf(0);
    const r = Math.floor(idx / 3), c = idx % 3;
    const br = Math.floor(blank / 3), bc = blank % 3;
    if ((Math.abs(r - br) === 1 && c === bc) || (Math.abs(c - bc) === 1 && r === br)) {
      const next = [...puzzle];
      [next[blank], next[idx]] = [next[idx], next[blank]];
      setPuzzle(next);
      const newMoves = moves + 1;
      setMoves(newMoves);
      setShowHint(false);
      if (stateToKey(next) === goalKey) {
        setSolved(true);
        setTimerActive(false);
        saveScore(timerSecs, newMoves);
      }
    }
  };

  const makeChallenge = () => {
    const url = `${window.location.origin}${window.location.pathname}?puzzle=${puzzle.join(',')}&diff=${diff}`;
    setChallengeLink(url);
    navigator.clipboard.writeText(url).catch(() => {});
  };

  // ── Score / Firestore ──────────────────────────────────────────────────

  const saveScore = async (secs, mv) => {
    if (!user) return;
    const score = calcScore(secs, mv, diff);
    const entry = {
      uid: user.uid, name: user.displayName, photoURL: user.photoURL,
      score, moves: mv, timeSecs: secs, difficulty: diff, timestamp: Date.now(),
    };
    try {
      await addDoc(collection(db, 'scores', user.uid, 'personal'), entry);
      const best = personalBest ?? -1;
      if (score > best) {
        await setDoc(doc(db, 'leaderboard', user.uid), entry);
        setPersonalBest(score);
      }
      setScoreFlash(score);
      fetchLeaderboard();
    } catch (e) { console.error('Score save failed:', e); }
  };

  const fetchLeaderboard = async () => {
    setLbLoading(true);
    try {
      const q    = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(20));
      const snap = await getDocs(q);
      let rows   = snap.docs.map(d => d.data());
      if (lbDiff !== 'all') rows = rows.filter(r => r.difficulty === lbDiff);
      setLeaderboard(rows);
    } catch (e) { console.error('Leaderboard fetch failed:', e); }
    setLbLoading(false);
  };

  // ── Benchmark functions ────────────────────────────────────────────────

  const fetchBenchLB = async () => {
    try {
      const q    = query(collection(db, 'benchmarks'), orderBy('timestamp', 'desc'), limit(10));
      const snap = await getDocs(q);
      setBenchLB(snap.docs.map(d => d.data()));
    } catch (e) { console.error('Bench LB fetch failed:', e); }
  };

  const bench = async () => {
    setBenching(true); setBenchRes(null);
    await new Promise(r => setTimeout(r, 60));
    const result = runBenchmark(algos, heuristic, benchDiff, 40);
    setBenchRes(result);
    setBenching(false);
    try {
      await addDoc(collection(db, 'benchmarks'), {
        difficulty: benchDiff, heuristic, algos: algos.join('+'), timestamp: Date.now(),
      });
      fetchBenchLB();
    } catch (e) { console.error('Firestore write failed:', e); }
  };

  // ── Race ───────────────────────────────────────────────────────────────

  const race = () => {
    setRacing(true); setRaceRes(null); setPb(null); setShowTree(false);
    setTimeout(() => {
      const res = {};
      algos.forEach(a => {
        if (a === 'bfs')    res.bfs    = runBFS(puzzle);
        if (a === 'dfs')    res.dfs    = runDFS(puzzle);
        if (a === 'greedy') res.greedy = runGreedy(puzzle, heuristic);
        if (a === 'astar')  res.astar  = runAStar(puzzle, heuristic);
      });
      res.winner = pickRaceWinner(res);
      setRaceRes(res); setRacing(false);
    }, 50);
  };

  const startPb = (id, result) => {
    setPb({ id, steps: result.steps, treeNodes: result.treeNodes });
    setPbStep(0); setPlaying(false); setShowTree(false);
  };

  // ── N-Queens ───────────────────────────────────────────────────────────

  const solveNQ = () => {
    clearInterval(nqRef.current);
    const result = nqAlgo === 'backtrack' ? nqBacktrack(nqSize) : nqHillClimb(nqSize);
    setNqRes(result); setNqStep(0); setNqPlay(true);
  };

  const handleNqClick = (row, col) => {
    if (nqRes) return;
    setUserNq(prev => { const next = [...prev]; next[row] = next[row] === col ? -1 : col; return next; });
  };

  // ── Auth helpers ───────────────────────────────────────────────────────

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      // signInWithRedirect works in both browser and Capacitor WebView
      await signInWithRedirect(auth, provider);
      // Page redirects — setSigningIn(false) not needed here
    } catch (e) {
      console.error('Sign-in failed:', e);
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try { await signOut(auth); }
    catch (e) { console.error('Sign-out failed:', e); }
  };

  // ── Derived values ─────────────────────────────────────────────────────

  const curState       = pb?.steps[pbStep]?.state ?? puzzle;
  const pbMeta         = AMETA.find(a => a.id === pb?.id);
  const curNqBoard     = nqRes ? nqRes.steps[nqStep].board : userNq;
  const queensPlaced   = userNq.filter(q => q !== -1).length;
  const isBoardFull    = queensPlaced === nqSize;
  const manualAttacks  = isBoardFull ? countAttacks(userNq) : 0;
  const isManualSolved = isBoardFull && manualAttacks === 0;
  const hint = (() => {
    if (stateToKey(puzzle) === goalKey || solved) return null;
    return runAStar(puzzle, 'manhattan').path[0] ?? null;
  })();

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily:"'Courier New',Courier,monospace", background:'#0a0a0f', minHeight:'100vh', color:'#e0e0e0', WebkitTextSizeAdjust:'100%' }}>
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(0,200,100,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,100,0.035) 1px,transparent 1px)',
        backgroundSize:'32px 32px' }} />

      <div style={{ position:'relative', zIndex:1, maxWidth:1120, margin:'0 auto', padding:'16px 12px' }}>

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:6 }}>
            <div>
              <div style={{ fontSize:10, color:'#00ff88', letterSpacing:6, marginBottom:4 }}>SEARCH ARENA</div>
              <h1 style={{ fontSize:'clamp(16px,5vw,30px)', fontWeight:900, margin:0, letterSpacing:2,
                background:'linear-gradient(90deg,#00ff88,#00cfff,#ffdd00)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                AI ALGORITHM VISUALIZER
              </h1>
            </div>
            <div style={{ flexShrink:0 }}>
              {user ? (
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <img src={user.photoURL} alt="" style={{ width:32, height:32, borderRadius:'50%', border:'2px solid #00ff88', flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:11, color:'#00ff88', fontWeight:700 }}>{user.displayName?.split(' ')[0]}</div>
                    {personalBest && <div style={{ fontSize:9, color:'#555' }}>BEST: {personalBest}pts</div>}
                  </div>
                  <button onClick={handleSignOut} style={{ ...Btn(false,'#ff4444'), fontSize:10, padding:'6px 10px' }}>
                    SIGN OUT
                  </button>
                </div>
              ) : (
                <button onClick={handleSignIn} disabled={signingIn}
                  style={{ ...Btn(false,'#00cfff'), fontSize:10, padding:'8px 14px', display:'flex', alignItems:'center', opacity: signingIn?0.6:1 }}>
                  <GoogleIcon />{signingIn ? 'REDIRECTING...' : 'SIGN IN'}
                </button>
              )}
            </div>
          </div>
          <div style={{ fontSize:10, color:'#333', letterSpacing:2 }}>◈ BFS · DFS · GREEDY · A* · BACKTRACKING · HILL CLIMBING ◈</div>
        </div>

        {/* ── TABS ────────────────────────────────────────────────────── */}
        <div style={{ display:'flex', overflowX:'auto', gap:2, marginBottom:18, borderBottom:'1px solid #1a1a2e',
          WebkitOverflowScrolling:'touch', scrollbarWidth:'none', msOverflowStyle:'none' }}>
          {[['8puzzle','⊞ 8-PUZZLE'],['nqueens','♛ N-QUEENS'],['benchmark','📊 BENCHMARK'],['play','🏆 LEADERBOARD']].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding:'10px 14px', border:'none', cursor:'pointer', fontSize:11, letterSpacing:1,
              fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, touchAction:'manipulation',
              background: tab===id ? '#00ff88' : 'transparent',
              color:      tab===id ? '#0a0a0f' : '#555',
              fontWeight: tab===id ? 900 : 400,
              borderBottom: tab===id ? '2px solid #00ff88' : '2px solid transparent',
              transition:'all 0.2s',
            }}>{lbl}</button>
          ))}
        </div>

        {/* ══ 8-PUZZLE TAB ══ */}
        {tab === '8puzzle' && (
          <div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16 }}>
              <Panel title="DIFFICULTY" style={{ flex:'1 1 140px', minWidth:0 }}>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {['easy','medium','hard'].map(d => (
                    <button key={d} onClick={() => setDiff(d)} style={Btn(diff===d, d==='easy'?'#00ff88':d==='medium'?'#ffdd00':'#ff4444')}>
                      {d.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={newPuzzle} style={{ ...Btn(false,'#00cfff'), marginTop:9, width:'100%', padding:'10px 0' }}>
                  ⟳ NEW PUZZLE
                </button>
              </Panel>

              <Panel title="ALGORITHMS" style={{ flex:'2 1 240px', minWidth:0 }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {AMETA.map(a => (
                    <label key={a.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13, minHeight:40 }}>
                      <input type="checkbox" checked={algos.includes(a.id)}
                        onChange={() => setAlgos(p => p.includes(a.id) ? p.filter(x=>x!==a.id) : [...p,a.id])}
                        style={{ accentColor:a.color, width:18, height:18 }} />
                      <span style={{ color:a.color, letterSpacing:1 }}>{a.label}</span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop:9, display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:10, color:'#444', letterSpacing:1 }}>HEURISTIC:</span>
                  {['manhattan','misplaced'].map(h => (
                    <button key={h} onClick={() => setHeuristic(h)} style={Btn(heuristic===h,'#ffdd00')}>
                      {h==='manhattan' ? 'MANHATTAN' : 'MISPLACED'}
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title="BATTLE ARENA" style={{ flex:'1 1 120px', minWidth:0 }}>
                <button onClick={race} disabled={racing || algos.length < 1}
                  style={{ ...Btn(false,'#ff6b35',{ width:'100%', padding:'14px 0', fontSize:13, letterSpacing:2, opacity: racing?0.5:1 }) }}>
                  {racing ? 'RACING...' : '⚡ RACE'}
                </button>
              </Panel>
            </div>

            <div style={{ display:'flex', flexWrap:'wrap', gap:16, alignItems:'flex-start' }}>
              {/* Board column */}
              <div style={{ display:'flex', flexDirection:'column', gap:12, flex:'0 0 auto', width:'100%', maxWidth:320 }}>
                <Panel title={solved ? '✓ SOLVED!' : `PUZZLE  [MOVES: ${moves}]`} gc={solved?'#00ff88':'#00cfff'}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, fontSize:12 }}>
                    <span style={{ color: timerActive?'#00ff88':solved?'#00ff88':'#444', letterSpacing:2, fontWeight:700, fontSize:16 }}>
                      ⏱ {String(Math.floor(timerSecs/60)).padStart(2,'0')}:{String(timerSecs%60).padStart(2,'0')}
                    </span>
                    {user ? <span style={{ fontSize:10, color:'#555' }}>✓ scores saved</span>
                          : <span style={{ fontSize:10, color:'#ff4444' }}>sign in to save</span>}
                  </div>

                  <PuzzleBoard state={curState} onClick={pb ? undefined : tileClick} solved={solved} />

                  {scoreFlash !== null && (
                    <div style={{ textAlign:'center', padding:'12px 0', fontSize:28, fontWeight:900, color:'#ffdd00', letterSpacing:3 }}>
                      +{scoreFlash} PTS
                    </div>
                  )}

                  {solved && (
                    <>
                      <button onClick={makeChallenge}
                        style={{ ...Btn(false,'#ffdd00'), width:'100%', marginTop:10, padding:'10px 0', fontSize:11, letterSpacing:1 }}>
                        🔗 CHALLENGE A FRIEND — COPY LINK
                      </button>
                      {challengeLink && (
                        <div style={{ marginTop:6, padding:'6px 9px', background:'#0a0a0f', borderRadius:4,
                          fontSize:10, color:'#555', wordBreak:'break-all', lineHeight:1.6 }}>
                          {challengeLink} <span style={{ color:'#00ff88' }}>✓ copied</span>
                        </div>
                      )}
                    </>
                  )}

                  {!pb && (
                    <div style={{ marginTop:10, padding:'7px 9px', background:'#0a0a0f', borderRadius:4, fontSize:12, color:'#555' }}>
                      {solved
                        ? <span style={{ color:'#00ff88' }}>✓ Solved in {moves} moves · {timerSecs}s</span>
                        : stateToKey(puzzle) === goalKey
                          ? <span style={{ color:'#00ff88' }}>✓ At goal!</span>
                          : (
                            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                              <button onClick={() => setShowHint(h => !h)}
                                style={{ padding:'6px 12px', border:'1px solid #ffdd0055', background:'transparent',
                                  color:'#ffdd00', borderRadius:4, cursor:'pointer', fontSize:12,
                                  fontFamily:"'Courier New',monospace", letterSpacing:1, minHeight:36, touchAction:'manipulation' }}>
                                {showHint ? 'HIDE HINT' : '💡 SHOW HINT'}
                              </button>
                              {showHint && hint && (
                                <span>Move tile <span style={{ color:'#ffdd00', fontWeight:700 }}>{hint.tile}</span> {hint.move}</span>
                              )}
                            </div>
                          )
                      }
                    </div>
                  )}

                  {pb && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:11, color:'#555', marginBottom:6 }}>
                        STEP {pbStep+1}/{pb.steps.length}
                        {pb.steps[pbStep] && <span style={{ marginLeft:9, color:'#ffdd00' }}>nodes: {pb.steps[pbStep].nodesExplored}</span>}
                        {pb.steps[pbStep]?.h !== undefined && <span style={{ marginLeft:7, color:'#00cfff' }}>h={pb.steps[pbStep].h}</span>}
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <button onClick={() => setPbStep(s=>Math.max(0,s-1))} style={SBtn}>◀</button>
                        <button onClick={() => setPlaying(p=>!p)} style={SBtn}>{playing?'⏸':'▶'}</button>
                        <button onClick={() => setPbStep(s=>Math.min(pb.steps.length-1,s+1))} style={SBtn}>▶|</button>
                        <button onClick={() => setShowTree(t=>!t)} style={{ ...SBtn, color: showTree?'#00cfff':'#444' }}>🌳</button>
                        <button onClick={() => { setPb(null); setPlaying(false); setShowTree(false); }} style={{ ...SBtn, color:'#ff4444' }}>✕</button>
                      </div>
                      <input type="range" min={0} max={pb.steps.length-1} value={pbStep}
                        onChange={e => setPbStep(+e.target.value)}
                        style={{ width:'100%', marginTop:8, accentColor:'#00cfff', height:24 }} />
                    </div>
                  )}
                </Panel>

                {(algos.includes('astar') || algos.includes('greedy')) && (
                  <Panel title="HEURISTIC VALUES">
                    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                      <MetricBox label="Manhattan h" value={manhattanDistance(curState)} color="#00cfff" />
                      <MetricBox label="Misplaced h" value={misplacedTiles(curState)}    color="#ffdd00" />
                    </div>
                  </Panel>
                )}
              </div>

              {/* Results column */}
              <div style={{ display:'flex', flexDirection:'column', gap:12, flex:'1 1 280px', minWidth:0 }}>
                {showTree && pb && (
                  <Panel title={`🌳 SEARCH TREE — ${pbMeta?.label} (${pb.treeNodes?.length} nodes)`} gc={pbMeta?.color}>
                    <SearchTreeViz treeNodes={pb.treeNodes} algoColor={pbMeta?.color ?? '#00cfff'} />
                    <div style={{ fontSize:10, color:'#333', marginTop:5 }}>Each node = one state expanded. Root = start.</div>
                  </Panel>
                )}

                {raceRes ? (
                  <Panel title="⚡ RACE RESULTS" gc="#ff6b35">
                    {raceRes.winner && (
                      <div style={{ background:`${AMETA.find(a=>a.id===raceRes.winner)?.color}18`,
                        border:`1px solid ${AMETA.find(a=>a.id===raceRes.winner)?.color}44`,
                        borderRadius:5, padding:'8px 11px', marginBottom:10, fontSize:12,
                        color: AMETA.find(a=>a.id===raceRes.winner)?.color }}>
                        🏆 WINNER: <strong>{AMETA.find(a=>a.id===raceRes.winner)?.label}</strong>
                        <span style={{ color:'#444', fontSize:10, marginLeft:8 }}>(shortest path → fewest nodes)</span>
                      </div>
                    )}
                    <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:280 }}>
                        <thead>
                          <tr style={{ color:'#444', letterSpacing:1 }}>
                            {['ALGO','NODES','TIME','DEPTH','✓'].map(h => (
                              <th key={h} style={{ textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #1a1a2e' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {AMETA.filter(a=>raceRes[a.id]).map(a => {
                            const r=raceRes[a.id], isW=raceRes.winner===a.id;
                            return (
                              <tr key={a.id} style={{ background:isW?'rgba(0,255,136,0.06)':'transparent', borderLeft:isW?'3px solid #00ff88':'3px solid transparent' }}>
                                <td style={{ padding:'8px', color:a.color, fontWeight:900 }}>{isW?'🏆 ':''}{a.label}</td>
                                <td style={{ padding:'8px' }}>{r.nodesExplored}</td>
                                <td style={{ padding:'8px' }}>{r.time.toFixed(1)}ms</td>
                                <td style={{ padding:'8px' }}>{r.found ? r.path.length : '—'}</td>
                                <td style={{ padding:'8px' }}>{r.found ? <span style={{ color:'#00ff88' }}>✓</span> : <span style={{ color:'#ff4444' }}>✗</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop:12 }}>
                      {AMETA.filter(a=>raceRes[a.id]).map(a => {
                        const r=raceRes[a.id];
                        const max=Math.max(...AMETA.filter(x=>raceRes[x.id]).map(x=>raceRes[x.id].nodesExplored));
                        return (
                          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                            <span style={{ width:50, color:a.color, fontSize:11, flexShrink:0 }}>{a.label}</span>
                            <div style={{ flex:1, background:'#1a1a2e', borderRadius:2, height:14, overflow:'hidden' }}>
                              <div style={{ width:`${(r.nodesExplored/max)*100}%`, height:'100%', background:a.color, opacity:0.7, transition:'width 0.7s ease' }} />
                            </div>
                            <span style={{ fontSize:10, color:'#555', width:38, textAlign:'right', flexShrink:0 }}>{r.nodesExplored}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop:11, display:'flex', flexWrap:'wrap', gap:6 }}>
                      {AMETA.filter(a=>raceRes[a.id]?.found).map(a => (
                        <button key={a.id} onClick={() => startPb(a.id, raceRes[a.id])}
                          style={{ ...Btn(pb?.id===a.id, a.color), fontSize:11 }}>▶ {a.label}</button>
                      ))}
                    </div>
                  </Panel>
                ) : (
                  <Panel title="RACE RESULTS">
                    <div style={{ padding:'32px 0', textAlign:'center', color:'#1e1e2e', fontSize:12, letterSpacing:2 }}>
                      SELECT ALGORITHMS<br />AND PRESS RACE
                    </div>
                  </Panel>
                )}

                <Panel title="ALGORITHM REFERENCE">
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    {[
                      { label:'BFS',    color:'#00ff88', desc:'Level-by-level. Complete & optimal.',       tag:'O(b^d)'   },
                      { label:'DFS',    color:'#ff6b35', desc:'Stack-based. Memory-light, not optimal.',   tag:'O(bm)'    },
                      { label:'GREEDY', color:'#ffdd00', desc:'Minimises h(n) only. Fast, suboptimal.',    tag:'INFORMED' },
                      { label:'A*',     color:'#00cfff', desc:'f=g+h. Optimal with admissible heuristic.', tag:'OPTIMAL'  },
                    ].map(a => (
                      <div key={a.label} style={{ background:'#0a0a0f', border:`1px solid ${a.color}22`, borderRadius:5, padding:'10px 11px', flex:'1 1 120px', minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ color:a.color, fontWeight:900, fontSize:12 }}>{a.label}</span>
                          <span style={{ fontSize:9, color:'#2a2a2a', border:'1px solid #1a1a1a', padding:'1px 4px', borderRadius:2 }}>{a.tag}</span>
                        </div>
                        <div style={{ fontSize:11, color:'#555', lineHeight:1.5 }}>{a.desc}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        )}

        {/* ══ N-QUEENS TAB ══ */}
        {tab === 'nqueens' && (
          <div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16 }}>
              <Panel title="BOARD SIZE" style={{ flex:'1 1 150px', minWidth:0 }}>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[['easy','4'],['medium','8'],['hard','12']].map(([d,n]) => (
                    <button key={d} onClick={() => { setNqSize(+n); setNqRes(null); setUserNq(Array(+n).fill(-1)); }}
                      style={Btn(nqSize===+n, d==='easy'?'#00ff88':d==='medium'?'#ffdd00':'#ff4444')}>{n}×{n}</button>
                  ))}
                </div>
              </Panel>
              <Panel title="ALGORITHM" style={{ flex:'2 1 200px', minWidth:0 }}>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {[['backtrack','BACKTRACKING','#00ff88'],['hillclimbing','HILL CLIMBING','#ffdd00']].map(([id,lbl,col]) => (
                    <button key={id} onClick={() => setNqAlgo(id)} style={Btn(nqAlgo===id,col)}>{lbl}</button>
                  ))}
                </div>
              </Panel>
              <Panel title="SOLVE" style={{ flex:'1 1 110px', minWidth:0 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <button onClick={solveNQ} style={{ ...Btn(false,'#00cfff'), width:'100%', padding:'12px 0', fontSize:13, letterSpacing:2 }}>⚡ SOLVE</button>
                  <button onClick={() => { setUserNq(Array(nqSize).fill(-1)); setNqRes(null); }}
                    style={{ ...Btn(false,'#ff4444'), width:'100%', padding:'8px 0', fontSize:11 }}>⟳ RESET</button>
                </div>
              </Panel>
            </div>

            <div style={{ display:'flex', flexWrap:'wrap', gap:16, alignItems:'flex-start' }}>
              <Panel title="CHESSBOARD" gc="#ffdd00" style={{ flex:'0 0 auto' }}>
                <NQueensBoard board={curNqBoard} n={nqSize} stepInfo={nqRes?.steps[nqStep]} onSquareClick={nqRes ? undefined : handleNqClick} />
                {nqRes && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:11, color:'#444', marginBottom:6 }}>
                      STEP {nqStep+1}/{nqRes.steps.length}
                      {nqRes.steps[nqStep] && (
                        <span style={{ marginLeft:8, color: nqRes.steps[nqStep].action==='place'?'#00ff88':'#ff4444' }}>
                          [{nqRes.steps[nqStep].action?.toUpperCase()}]
                        </span>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button onClick={() => setNqStep(s=>Math.max(0,s-1))} style={SBtn}>◀</button>
                      <button onClick={() => setNqPlay(p=>!p)} style={SBtn}>{nqPlay?'⏸':'▶'}</button>
                      <button onClick={() => setNqStep(s=>Math.min(nqRes.steps.length-1,s+1))} style={SBtn}>▶|</button>
                      <button onClick={() => setNqStep(nqRes.steps.length-1)} style={SBtn}>⏭</button>
                    </div>
                    <input type="range" min={0} max={nqRes.steps.length-1} value={nqStep}
                      onChange={e => setNqStep(+e.target.value)}
                      style={{ width:'100%', marginTop:8, accentColor:'#ffdd00', height:24 }} />
                  </div>
                )}
              </Panel>

              <div style={{ display:'flex', flexDirection:'column', gap:12, flex:'1 1 240px', minWidth:0 }}>
                {nqRes && (
                  <Panel title="METRICS" gc="#00cfff">
                    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                      <MetricBox label="Nodes Explored" value={nqRes.nodesExplored} color="#00cfff" />
                      <MetricBox label="Steps"          value={nqRes.steps.length}  color="#ffdd00" />
                      <MetricBox label="Time"           value={`${nqRes.time.toFixed(1)}ms`} color="#00ff88" />
                      <MetricBox label="Status"
                        value={nqStep===nqRes.steps.length-1 ? (nqRes.found?'✓ SOLVED':'✗ FAILED') : '⏳ RUNNING'}
                        color={nqStep===nqRes.steps.length-1 ? (nqRes.found?'#00ff88':'#ff4444') : '#ffdd00'} />
                    </div>
                  </Panel>
                )}
                {!nqRes && (
                  <Panel title="MANUAL PLAY" gc={isManualSolved ? "#00ff88" : "#ffdd00"}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                      <MetricBox label="Queens"    value={`${queensPlaced} / ${nqSize}`} color={isBoardFull?'#00cfff':'#ffdd00'} />
                      <MetricBox label="Conflicts" value={isBoardFull ? manualAttacks : '-'}
                        color={isBoardFull&&manualAttacks>0 ? '#ff4444' : isManualSolved ? '#00ff88' : '#555'} />
                      <MetricBox label="Status"
                        value={isManualSolved ? '✓ SOLVED!' : isBoardFull ? '✗ CONFLICTS' : 'PLACE QUEENS'}
                        color={isManualSolved ? '#00ff88' : isBoardFull ? '#ff4444' : '#ffdd00'} />
                    </div>
                  </Panel>
                )}
                <Panel title="ALGORITHM NOTES">
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    {[
                      { label:'BACKTRACKING',  color:'#00ff88', desc:'Systematic DFS with pruning. Complete — always finds a solution.', tag:'COMPLETE'    },
                      { label:'HILL CLIMBING', color:'#ffdd00', desc:'Local search minimising attacks. Fast but may need random restarts.', tag:'LOCAL SEARCH' },
                    ].map(a => (
                      <div key={a.label} style={{ background:'#0a0a0f', border:`1px solid ${a.color}22`, borderRadius:5, padding:'11px 12px', flex:'1 1 140px', minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ color:a.color, fontWeight:900, fontSize:11 }}>{a.label}</span>
                          <span style={{ fontSize:9, color:'#2a2a2a', border:'1px solid #1a1a1a', padding:'1px 4px', borderRadius:2 }}>{a.tag}</span>
                        </div>
                        <div style={{ fontSize:11, color:'#555', lineHeight:1.5 }}>{a.desc}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        )}

        {/* ══ BENCHMARK TAB ══ */}
        {tab === 'benchmark' && (
          <div>
            <Panel title="BATCH BENCHMARK — ALGORITHM RESEARCH MODE" gc="#00cfff" style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:'#555', marginBottom:14, lineHeight:1.8 }}>
                Runs <strong style={{ color:'#00cfff' }}>40 random puzzles</strong> automatically and averages performance across all selected algorithms.
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:14, alignItems:'flex-end' }}>
                <div>
                  <div style={{ fontSize:10, color:'#333', letterSpacing:2, marginBottom:7 }}>DIFFICULTY</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {['easy','medium','hard'].map(d => (
                      <button key={d} onClick={() => setBenchDiff(d)}
                        style={Btn(benchDiff===d, d==='easy'?'#00ff88':d==='medium'?'#ffdd00':'#ff4444')}>{d.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'#333', letterSpacing:2, marginBottom:7 }}>ALGORITHMS</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:9 }}>
                    {AMETA.map(a => (
                      <label key={a.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, minHeight:36 }}>
                        <input type="checkbox" checked={algos.includes(a.id)}
                          onChange={() => setAlgos(p => p.includes(a.id) ? p.filter(x=>x!==a.id) : [...p,a.id])}
                          style={{ accentColor:a.color, width:16, height:16 }} />
                        <span style={{ color:a.color }}>{a.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'#333', letterSpacing:2, marginBottom:7 }}>HEURISTIC</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {['manhattan','misplaced'].map(h => (
                      <button key={h} onClick={() => setHeuristic(h)} style={Btn(heuristic===h,'#ffdd00')}>
                        {h==='manhattan' ? 'MANHATTAN' : 'MISPLACED'}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={bench} disabled={benching || algos.length < 1}
                  style={{ ...Btn(false,'#00cfff',{ padding:'12px 18px', fontSize:13, letterSpacing:2, opacity: benching?0.5:1 }) }}>
                  {benching ? 'RUNNING...' : '▶ RUN BENCHMARK'}
                </button>
              </div>
            </Panel>

            {benchRes && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Panel title={`RESULTS — ${benchDiff.toUpperCase()} (n=40)`} gc="#00ff88">
                  <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:320 }}>
                      <thead>
                        <tr style={{ color:'#444', letterSpacing:1 }}>
                          {['ALGO','AVG NODES','AVG TIME','AVG DEPTH','SOLVE RATE'].map(h => (
                            <th key={h} style={{ textAlign:'left', padding:'7px 9px', borderBottom:'1px solid #1a1a2e' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {AMETA.filter(a=>benchRes.results[a.id]).map(a => {
                          const r = benchRes.results[a.id];
                          const bestN = Math.min(...AMETA.filter(x=>benchRes.results[x.id]).map(x=>benchRes.results[x.id].avgNodes));
                          const isTop = r.avgNodes === bestN;
                          return (
                            <tr key={a.id} style={{ borderLeft: isTop ? '3px solid '+a.color : '3px solid transparent' }}>
                              <td style={{ padding:'9px', color:a.color, fontWeight:900 }}>{a.label}</td>
                              <td style={{ padding:'9px', color:isTop?'#00ff88':'#e0e0e0', fontWeight:isTop?700:400 }}>{r.avgNodes}{isTop?' 🏆':''}</td>
                              <td style={{ padding:'9px' }}>{r.avgTime}ms</td>
                              <td style={{ padding:'9px' }}>{r.avgDepth}</td>
                              <td style={{ padding:'9px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <div style={{ flex:1, background:'#1a1a2e', borderRadius:2, height:8 }}>
                                    <div style={{ width:`${r.solveRate}%`, height:'100%', background:a.color, borderRadius:2 }} />
                                  </div>
                                  <span style={{ color:a.color, fontSize:11, width:36 }}>{r.solveRate}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                  {[{ key:'avgNodes', label:'AVG NODES EXPLORED' },{ key:'avgTime', label:'AVG TIME (ms)' }].map(({ key, label }) => (
                    <Panel key={key} title={label} style={{ flex:'1 1 240px', minWidth:0 }}>
                      {AMETA.filter(a=>benchRes.results[a.id]).map(a => {
                        const r=benchRes.results[a.id];
                        const max=Math.max(...AMETA.filter(x=>benchRes.results[x.id]).map(x=>benchRes.results[x.id][key]));
                        return (
                          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                            <span style={{ width:52, color:a.color, fontSize:11, flexShrink:0 }}>{a.label}</span>
                            <div style={{ flex:1, background:'#1a1a2e', borderRadius:2, height:16, overflow:'hidden' }}>
                              <div style={{ width:`${(r[key]/max)*100}%`, height:'100%', background:a.color, opacity:0.7, transition:'width 0.7s ease' }} />
                            </div>
                            <span style={{ fontSize:10, color:'#555', width:46, textAlign:'right', flexShrink:0 }}>{r[key]}</span>
                          </div>
                        );
                      })}
                    </Panel>
                  ))}
                </div>

                <Panel title="INTERPRETATION">
                  <div style={{ fontSize:12, color:'#555', lineHeight:2.1 }}>
                    {benchRes.results.astar && benchRes.results.bfs && (
                      <div>• A* explored <span style={{ color:'#00cfff' }}>{Math.round((1-benchRes.results.astar.avgNodes/benchRes.results.bfs.avgNodes)*100)}%</span> fewer nodes than BFS on {benchDiff} difficulty.</div>
                    )}
                    {benchRes.results.greedy && benchRes.results.astar && (
                      <div>• Greedy avg depth {benchRes.results.greedy.avgDepth} vs A* {benchRes.results.astar.avgDepth} — {benchRes.results.greedy.avgDepth > benchRes.results.astar.avgDepth ? 'suboptimal paths (trades quality for speed)' : 'comparable path quality'}.</div>
                    )}
                    {benchRes.results.dfs && (
                      <div>• DFS solve rate <span style={{ color:'#ff6b35' }}>{benchRes.results.dfs.solveRate}%</span> — demonstrates incompleteness without depth bounding.</div>
                    )}
                  </div>
                </Panel>
              </div>
            )}

            {!benchRes && !benching && (
              <div style={{ textAlign:'center', padding:'48px 0', color:'#555', fontSize:12, letterSpacing:2 }}>
                SELECT ALGORITHMS AND RUN BENCHMARK
              </div>
            )}

            <Panel title="🕒 RECENT BENCHMARK RUNS" gc="#00cfff" style={{ marginTop:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
                <span style={{ fontSize:11, color:'#555' }}>Last 10 runs saved to Firestore.</span>
                <button onClick={fetchBenchLB} style={{ ...Btn(false,'#00cfff'), fontSize:10 }}>⟳ REFRESH</button>
              </div>
              {benchLB.length === 0 ? (
                <div style={{ color:'#2a2a2a', fontSize:12, textAlign:'center', padding:'18px 0' }}>No runs yet. Run a benchmark first.</div>
              ) : (
                <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:280 }}>
                    <thead>
                      <tr style={{ color:'#444', letterSpacing:1 }}>
                        {['#','ALGOS','DIFF','HEURISTIC','WHEN'].map(h => (
                          <th key={h} style={{ textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #1a1a2e' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {benchLB.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding:'7px 8px', color:'#555' }}>{i+1}</td>
                          <td style={{ padding:'7px 8px', color:'#00cfff' }}>{row.algos}</td>
                          <td style={{ padding:'7px 8px', color: row.difficulty==='hard'?'#ff4444':row.difficulty==='medium'?'#ffdd00':'#00ff88' }}>{row.difficulty?.toUpperCase()}</td>
                          <td style={{ padding:'7px 8px', color:'#888' }}>{row.heuristic}</td>
                          <td style={{ padding:'7px 8px', color:'#555' }}>{new Date(row.timestamp).toLocaleDateString('en-IN',{ day:'2-digit', month:'short' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* ══ LEADERBOARD TAB ══ */}
        {tab === 'play' && (
          <div>
            {!user && (
              <Panel title="SIGN IN TO COMPETE" gc="#ffdd00" style={{ marginBottom:14, textAlign:'center' }}>
                <div style={{ padding:'14px 0', fontSize:13, color:'#555', lineHeight:1.8, marginBottom:14 }}>
                  Sign in with Google to save your puzzle scores and appear on the global leaderboard.<br/>
                  Your best score per account is tracked. Beat your friends.
                </div>
                <button onClick={handleSignIn} disabled={signingIn}
                  style={{ ...Btn(false,'#00cfff'), padding:'12px 28px', fontSize:13, display:'inline-flex', alignItems:'center', opacity: signingIn?0.6:1 }}>
                  <GoogleIcon />{signingIn ? 'REDIRECTING...' : 'SIGN IN WITH GOOGLE'}
                </button>
              </Panel>
            )}

            {user && (
              <Panel title={`WELCOME BACK, ${user.displayName?.split(' ')[0].toUpperCase()}`} gc="#00ff88" style={{ marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <img src={user.photoURL} alt="" style={{ width:52, height:52, borderRadius:'50%', border:'2px solid #00ff88', flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, color:'#00ff88', fontWeight:900 }}>{user.displayName}</div>
                    <div style={{ fontSize:11, color:'#555', marginTop:2 }}>{user.email}</div>
                    {personalBest !== null && (
                      <div style={{ fontSize:13, color:'#ffdd00', marginTop:5, fontWeight:700 }}>🏆 Personal Best: {personalBest} pts</div>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <button onClick={() => { setTab('8puzzle'); newPuzzle(); }} style={{ ...Btn(false,'#00cfff'), fontSize:12 }}>▶ PLAY NOW</button>
                    <button onClick={handleSignOut} style={{ ...Btn(false,'#ff4444'), fontSize:11 }}>SIGN OUT</button>
                  </div>
                </div>
              </Panel>
            )}

            <Panel title="📐 HOW SCORING WORKS" gc="#555" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10 }}>
                {[
                  { d:'EASY',   base:'1,000', mult:'×1',   color:'#00ff88' },
                  { d:'MEDIUM', base:'2,500', mult:'×1.5', color:'#ffdd00' },
                  { d:'HARD',   base:'5,000', mult:'×2',   color:'#ff4444' },
                ].map(s => (
                  <div key={s.d} style={{ background:'#0a0a0f', border:`1px solid ${s.color}22`, borderRadius:5, padding:'12px 16px', textAlign:'center', flex:'1 1 90px', minWidth:0 }}>
                    <div style={{ color:s.color, fontWeight:900, fontSize:13, marginBottom:6 }}>{s.d}</div>
                    <div style={{ fontSize:12, color:'#888' }}>Base: <span style={{ color:s.color }}>{s.base}</span></div>
                    <div style={{ fontSize:12, color:'#888' }}>Mult: <span style={{ color:s.color }}>{s.mult}</span></div>
                    <div style={{ marginTop:4, fontSize:10, color:'#333' }}>−10/sec · −5/move</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, fontSize:11, color:'#333', textAlign:'center' }}>
                score = max(0, base − time×10 − moves×5) × multiplier
              </div>
            </Panel>

            <Panel title="🌐 GLOBAL LEADERBOARD — TOP 20" gc="#00cfff">
              <div style={{ display:'flex', gap:6, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontSize:10, color:'#444', letterSpacing:1 }}>FILTER:</span>
                {['all','easy','medium','hard'].map(d => (
                  <button key={d} onClick={() => setLbDiff(d)}
                    style={Btn(lbDiff===d, d==='easy'?'#00ff88':d==='medium'?'#ffdd00':d==='hard'?'#ff4444':'#00cfff')}>
                    {d.toUpperCase()}
                  </button>
                ))}
                <button onClick={fetchLeaderboard} style={{ ...Btn(false,'#555'), marginLeft:'auto', fontSize:10 }}>
                  {lbLoading ? 'LOADING...' : '⟳ REFRESH'}
                </button>
              </div>

              {leaderboard.length === 0 ? (
                <div style={{ textAlign:'center', padding:'36px 0', color:'#2a2a2a', fontSize:12, letterSpacing:2 }}>
                  NO SCORES YET — GO SOLVE A PUZZLE
                </div>
              ) : (
                <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:300 }}>
                    <thead>
                      <tr style={{ color:'#444', letterSpacing:1 }}>
                        {['#','PLAYER','SCORE','DIFF','MOVES','TIME'].map(h => (
                          <th key={h} style={{ textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #1a1a2e' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row, i) => (
                        <tr key={i} style={{
                          background: row.uid===user?.uid ? '#00ff8808' : 'transparent',
                          borderLeft: row.uid===user?.uid ? '3px solid #00ff88' : '3px solid transparent',
                        }}>
                          <td style={{ padding:'9px 8px', fontWeight:900, color: i===0?'#ffdd00':i===1?'#aaaaaa':i===2?'#cd7f32':'#555' }}>
                            {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                          </td>
                          <td style={{ padding:'9px 8px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <img src={row.photoURL} alt="" style={{ width:24, height:24, borderRadius:'50%', flexShrink:0 }} />
                              <span style={{ color: row.uid===user?.uid ? '#00ff88' : '#e0e0e0', fontSize:11 }}>{row.name?.split(' ')[0]}</span>
                              {row.uid===user?.uid && <span style={{ fontSize:9, color:'#00ff88' }}>YOU</span>}
                            </div>
                          </td>
                          <td style={{ padding:'9px 8px', color:'#ffdd00', fontWeight:900 }}>{row.score}</td>
                          <td style={{ padding:'9px 8px', fontSize:10, color: row.difficulty==='hard'?'#ff4444':row.difficulty==='medium'?'#ffdd00':'#00ff88' }}>
                            {row.difficulty?.toUpperCase()}
                          </td>
                          <td style={{ padding:'9px 8px', color:'#888' }}>{row.moves}</td>
                          <td style={{ padding:'9px 8px', color:'#555' }}>{row.timeSecs}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        )}

        <div style={{ marginTop:32, textAlign:'center', fontSize:10, color:'#555', letterSpacing:3, paddingBottom:16 }}>
          SEARCH ARENA ◈ AI ALGORITHM VISUALIZER
        </div>
      </div>
    </div>
  );
}
