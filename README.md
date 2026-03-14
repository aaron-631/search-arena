<div align="center">

<img src="https://img.shields.io/badge/SEARCH-ARENA-00ff88?style=for-the-badge&labelColor=0a0a0f&color=00ff88" alt="Search Arena" />

# AI Algorithm Visualizer

**Watch search algorithms think. Race them against each other. Beat them yourself.**

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-search--arena.vercel.app-00cfff?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0a0a0f)](https://search-arena.vercel.app)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white&labelColor=0a0a0f)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-ffdd00?style=flat-square&logo=firebase&logoColor=white&labelColor=0a0a0f)](https://firebase.google.com)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white&labelColor=0a0a0f)](https://vitejs.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android_APK-119eff?style=flat-square&logo=capacitor&logoColor=white&labelColor=0a0a0f)](https://capacitorjs.com)
[![License](https://img.shields.io/badge/License-MIT-555?style=flat-square&labelColor=0a0a0f)](LICENSE)

<br/>

> An interactive platform for visualising, comparing, and competing against classical AI search algorithms — built as a third-year Computer Science Engineering project at KIIT University.

<br/>

```
◈ BFS · DFS · GREEDY BEST-FIRST · A* · BACKTRACKING · HILL CLIMBING ◈
```

</div>

---

## What Is This?

Search Arena is a browser-based (and Android-native) visualiser that makes abstract AI algorithms tangible. Instead of reading pseudocode in a textbook, you watch each algorithm navigate the 8-Puzzle and N-Queens problems in real time — seeing exactly which nodes they explore, what heuristic values they compute, and how their search trees grow.

Then you race them against each other. Then you play against them yourself.

---

## Features

### 🧩 8-Puzzle — Algorithm Race Mode
Run BFS, DFS, Greedy Best-First, and A* on the same puzzle simultaneously. A ranked results table shows nodes explored, solve depth, and time for each algorithm. Animated step-by-step playback lets you scrub through every single state expansion. An interactive search tree renders the first 200 nodes explored so you can see the shape of each algorithm's search frontier.

### ♛ N-Queens — Backtracking vs Hill Climbing
Watch constraint-based backtracking systematically place and retract queens with full pruning visualisation. Or watch steepest-ascent hill climbing minimise conflicts with random restarts, showing every local minimum it escapes. Manual placement mode lets you attempt the puzzle yourself before seeing the algorithmic solution.

### 📊 Benchmark — Research Mode
Runs 40 randomly generated puzzles automatically and averages performance across every selected algorithm. Produces comparative bar charts for average nodes explored and average solve time. The interpretation panel automatically generates written analysis — e.g., how many percent fewer nodes A* explored compared to BFS at the chosen difficulty. Results are persisted to Firestore so you can compare runs over time.

### 🏆 Competitive Game Mode
A full score-based competitive layer sits on top of the visualiser. Sign in with Google, solve puzzles against the clock, and your best score is saved to a global leaderboard. Scores are calculated as:

```
score = max(0, baseDifficulty − (seconds × 10) − (moves × 5)) × multiplier
```

| Difficulty | Base Score | Multiplier | Max Possible |
|:---:|:---:|:---:|:---:|
| Easy | 1,000 | ×1 | 1,000 |
| Medium | 2,500 | ×1.5 | 3,750 |
| Hard | 5,000 | ×2 | 10,000 |

### 🔗 Challenge Links
Every solved puzzle generates a shareable URL encoding the exact starting board state and difficulty. Send it to a friend — they load the same puzzle, solve it, and their score is automatically compared against yours on the leaderboard. The app validates inversion parity on load so tampered or unsolvable URLs silently fall back to a fresh puzzle.

---

## Algorithms Covered

| Algorithm | Type | Complete | Optimal | Complexity |
|---|---|:---:|:---:|---|
| **BFS** | Uninformed | ✅ | ✅ | O(b^d) |
| **DFS** | Uninformed | ✅ (depth-limited) | ❌ | O(bm) |
| **Greedy Best-First** | Informed | ❌ | ❌ | O(b^m) |
| **A\*** | Informed | ✅ | ✅ (admissible h) | O(b^d) |
| **Backtracking** | Systematic | ✅ | N/A | O(n!) pruned |
| **Hill Climbing** | Local Search | ❌ | ❌ | O(iterations) |

### Heuristics (8-Puzzle)

**Manhattan Distance** — sum of horizontal and vertical distances each tile is from its goal position. Admissible and consistent. Dominates misplaced tiles at every node, meaning A* with Manhattan never expands more nodes than A* with misplaced tiles.

**Misplaced Tiles** — count of tiles not currently in their goal position. Admissible but weaker. Included to demonstrate empirically that heuristic quality directly impacts search efficiency.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 (hooks-only, no class components) |
| Build Tool | Vite 7 |
| Styling | Inline styles with CSS variables (zero external CSS dependencies) |
| Backend / Auth | Firebase Authentication (Google Sign-In) |
| Database | Cloud Firestore |
| Mobile | Capacitor 7 (Android APK) |
| Deployment | Vercel (auto-deploy from GitHub) |
| Visualisation | D3.js (search tree rendering) |

---

## Project Structure

```
search-arena/
├── src/
│   ├── algorithms/
│   │   ├── astar.js          # f(n) = g(n) + h(n), priority queue
│   │   ├── bfs.js            # FIFO queue, optimal by depth
│   │   ├── dfs.js            # LIFO stack, depth-limited to 28
│   │   └── greedy.js         # Priority queue sorted by h(n) only
│   │
│   ├── heuristics/
│   │   ├── manhattan.js      # Admissible + consistent
│   │   └── misplaced.js      # Admissible, weaker baseline
│   │
│   ├── puzzles/
│   │   ├── eightPuzzle.js    # Race runner + batch benchmark
│   │   └── nQueens.js        # Backtracking + hill climbing
│   │
│   ├── utils/
│   │   ├── stateUtils.js     # Neighbour generation, solvability check
│   │   └── puzzleGenerator.js # Random-walk shuffle from goal state
│   │
│   ├── components/
│   │   ├── Panel.jsx         # Themed container card
│   │   ├── MetricBox.jsx     # Single stat display
│   │   ├── PuzzleBoard.jsx   # Interactive 3×3 grid
│   │   ├── NQueensBoard.jsx  # n×n chessboard with queen rendering
│   │   └── SearchTreeViz.jsx # D3-powered tree visualisation
│   │
│   ├── App.jsx               # Root component — all state and logic
│   ├── firebase.js           # Firebase app init + exports
│   └── main.jsx              # React DOM entry point
│
├── android/                  # Capacitor-generated Android project
├── dist/                     # Vite production build output
├── capacitor.config.json
├── vite.config.js
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Firebase project (free Spark plan works)

### Installation

```bash
# Clone the repository
git clone https://github.com/aaron-631/search-arena.git
cd search-arena

# Install dependencies
npm install
```

### Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** (test mode is fine to start)
3. Enable **Authentication → Google Sign-In**
4. Register a web app and copy your config

Create `src/firebase.js`:

```js
import { initializeApp }               from 'firebase/app';
import { getFirestore }                from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_AUTH_DOMAIN",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

const app             = initializeApp(firebaseConfig);
export const db       = getFirestore(app);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();
```

Add these Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /benchmarks/{doc} {
      allow read, write: if true;
    }
    match /scores/{userId}/personal/{docId} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.data.score is number
                   && request.resource.data.score <= 15000;
    }
    match /leaderboard/{docId} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.data.score is number
                   && request.resource.data.score <= 15000;
    }
  }
}
```

### Run Locally

```bash
npm run dev
# → http://localhost:5173
```

### Production Build

```bash
npm run build
```

---

## Deployment

### Vercel (Web)

```bash
# Push to GitHub, then import at vercel.com
# Or via CLI:
npm install -g vercel
vercel --prod
```

After deploying, add your Vercel domain to **Firebase → Authentication → Authorized Domains**.

### Android APK (Capacitor)

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialise (already done if cloning this repo)
npx cap init "Search Arena" "com.searcharena.app" --web-dir dist

# Build and sync
npm run build
npx cap sync

# Open in Android Studio
npx cap open android
# Build → Generate Signed APK
```

> **Note:** Ensure `vite.config.js` has `base: './'` set — required for the WebView to load assets correctly.

---

## How the Solvability Check Works

Not all 8-puzzle configurations are solvable. The app uses an inversion-count parity check before accepting any puzzle state (including those loaded from challenge URLs):

```js
export function isSolvable(state) {
  const arr = state.filter(x => x !== 0);
  let inv = 0;
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      if (arr[i] > arr[j]) inv++;
  return inv % 2 === 0;
}
```

A configuration is solvable if and only if the number of inversions is even. This is a well-known result from the mathematical theory of permutations. The puzzle generator guarantees solvability by checking this after shuffling and swapping the first two tiles if the parity is wrong.

---

## Screenshots

| 8-Puzzle Race Mode | N-Queens Visualiser |
|:---:|:---:|
| *Algorithm race results with node comparison bars* | *Backtracking step-by-step on 8×8 board* |

| Benchmark Research Mode | Global Leaderboard |
|:---:|:---:|
| *40-puzzle batch analysis with interpretation* | *Score-ranked competitive leaderboard* |

---

## Academic Context

Built as a **Web and Mobile Application Development** assignment for the B.Tech CSE programme at KIIT University, Bhubaneswar (2025–26). The project demonstrates practical implementation of core AI search algorithms from the curriculum, extended with a full-stack gamified overlay to illustrate real-world deployment patterns.

**Algorithms covered from syllabus:**
- Uninformed search: BFS, DFS, Depth-Limited DFS
- Informed search: Greedy Best-First, A*
- Local search: Hill Climbing with random restarts
- Systematic search: Backtracking with constraint propagation

---

## Author

**Aaron Chakraborty**
B.Tech CSE · KIIT University · Roll No. 2305671
Cybersecurity AI/ML Researcher · 

[![GitHub](https://img.shields.io/badge/GitHub-aaron--631-181717?style=flat-square&logo=github)](https://github.com/aaron-631)

---

## License

MIT — do whatever you want with it, attribution appreciated.

---

<div align="center">

**[Live Demo](https://search-arena.vercel.app) · [Report Bug](https://github.com/aaron-631/search-arena/issues) · [Request Feature](https://github.com/aaron-631/search-arena/issues)**

<br/>

*Built with obsessive attention to detail at KIIT University*

</div>