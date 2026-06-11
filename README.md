<div align="center">

# 🎲 Ludo Multiplayer

### A real-time, full-stack multiplayer Ludo game built with React + Spring Boot

[![CI](https://github.com/JatinThakur-797/Ludo/actions/workflows/ci.yml/badge.svg)](https://github.com/JatinThakur-797/Ludo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-17-orange?logo=openjdk)](https://openjdk.org/projects/jdk/17/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-brightgreen?logo=spring)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**[Live Demo →](https://ludo-three-sandy.vercel.app/)** &nbsp;|&nbsp; **[API Docs →](#api-reference)**

</div>

---

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Core Workflows & Architecture Design](#-core-workflows--architecture-design)
  - [1. System Topology & Infrastructure](#1-system-topology--infrastructure)
  - [2. State Machine & Turn Lifecycle](#2-state-machine--turn-lifecycle)
  - [3. Real-Time Multiplayer Sync & Network Flow](#3-real-time-multiplayer-sync--network-flow)
  - [4. Database Schema & Data Persistence Strategy](#4-database-schema--data-persistence-strategy)
  - [5. Authentication & JWT Handshake Lifecycle](#5-authentication--jwt-handshake-lifecycle)
  - [6. AI Heuristic Decision Model](#6-ai-heuristic-decision-model)
  - [7. Anti-Cheat Validation Pipeline](#7-anti-cheat-validation-pipeline)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development (IDE)](#local-development-ide)
  - [Local Development (Docker)](#local-development-docker-compose)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [WebSocket Events](#-websocket-events)
- [Deployment](#-deployment)
- [Game Rules](#-game-rules)
- [Roadmap](#-roadmap)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎮 **Local Multiplayer** | 2–4 players on the same device (pass-and-play) |
| 🤖 **AI Opponent** | Heuristic-based bot player for single-player mode |
| 🌐 **Online Multiplayer** | Real-time rooms with 6-character invite codes |
| ⚡ **Live WebSocket Sync** | STOMP over WebSocket — all moves broadcast instantly |
| 🔐 **JWT Authentication** | Secure login with access + refresh token pair |
| 📊 **Dashboard & Leaderboard** | ELO/MMR ratings, match history, win/loss stats |
| 🏠 **Game Rooms** | Create/join rooms, invite friends, player reconnection |
| ♟️ **Server-Authoritative** | All moves validated server-side — no cheating |
| 🎨 **Animated UI** | SVG board, animated dice, token highlight effects |
| 📱 **Responsive** | Works on desktop and mobile viewports |

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| [React](https://react.dev) | 19 | UI framework |
| [TypeScript](https://www.typescriptlang.org) | 5 | Type safety |
| [Vite](https://vitejs.dev) | 8 | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Styling |
| [Zustand](https://zustand-demo.pmnd.rs) | 5 | Client state management |
| [@stomp/stompjs](https://stomp-js.github.io) | 7 | WebSocket STOMP client |
| [Axios](https://axios-http.com) | 1 | HTTP client with interceptors |
| [React Router](https://reactrouter.com) | 7 | Client-side routing |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| [Spring Boot](https://spring.io/projects/spring-boot) | 3.4.2 | Application framework |
| [Java](https://openjdk.org) | 17 | Runtime |
| [Spring Security](https://spring.io/projects/spring-security) | 6 | JWT auth & CORS |
| [Spring WebSocket](https://docs.spring.io/spring-framework/reference/web/websocket.html) | — | STOMP message broker |
| [Spring Data JPA](https://spring.io/projects/spring-data-jpa) | — | ORM / database layer |
| [Spring Data Redis](https://spring.io/projects/spring-data-redis) | — | Redis caching & pub/sub |
| [Flyway](https://flywaydb.org) | — | Database migrations |
| [JJWT](https://github.com/jwtk/jjwt) | 0.12.5 | JWT token generation |
| [Lombok](https://projectlombok.org) | — | Boilerplate reduction |
| [PostgreSQL](https://www.postgresql.org) | 15 | Persistent database |
| [Redis](https://redis.io) | 7 | Active game state & caching |

### Infrastructure
| Service | Role | Free Tier |
|---------|------|-----------|
| [Koyeb](https://www.koyeb.com) | Backend hosting | ✅ Eco instance |
| [Neon](https://neon.tech) | Managed PostgreSQL | ✅ 500MB |
| [Upstash](https://upstash.com) | Managed Redis | ✅ 10k req/day |
| [Vercel](https://vercel.com) | Frontend hosting | ✅ Unlimited |
| [GitHub Actions](https://github.com/features/actions) | CI/CD | ✅ Free |
| [GHCR](https://ghcr.io) | Docker image registry | ✅ Free |

---

## 🏗 Core Workflows & Architecture Design

The system is architected around a decoupled presentation layer (React SPA) and a server-authoritative backend (Spring Boot), utilizing WebSocket STOMP for sub-100ms real-time sync and Redis for session caching.

### 1. System Topology & Infrastructure
The diagram below shows the end-to-end infrastructure, where the API gateway forwards REST/WebSocket requests using sticky sessions to horizontal Spring Boot instances, backed by a Redis Cache layer for active game rooms and PostgreSQL for persistent data.

```mermaid
graph TD
    Client1[React Web App Client 1] <-->|WebSocket + STOMP| LB[ALB / Reverse Proxy]
    Client2[React Web App Client 2] <-->|WebSocket + STOMP| LB
    LB <-->|Sticky Sessions| SB1[Spring Boot Instance 1]
    LB <-->|Sticky Sessions| SB2[Spring Boot Instance 2]
    
    SB1 <--> Redis[(Redis Cluster)]
    SB2 <--> Redis
    
    SB1 <--> RDBMS[(PostgreSQL DB)]
    SB2 <--> RDBMS
    
    subgraph Spring Boot Architecture
        Controller[REST Controllers]
        WSHandler[STOMP Message Handlers]
        Security[Spring Security & JWT]
        Engine[Ludo Game Engine]
        Service[Transactional Services]
        Repo[JPA Repositories]
    end
```

### 2. State Machine & Turn Lifecycle
The Ludo Game Engine behaves as a deterministic, side-effect-free finite state machine. A game lifecycle transitions from a pre-start Lobby, moves through active turn phases, and terminates when a player lands all four tokens in the home goal.

```mermaid
stateDiagram-v2
    [*] --> LOBBY
    LOBBY --> ACTIVE : Host Starts Game
    
    state ACTIVE {
        [*] --> WAITING_FOR_ROLL
        WAITING_FOR_ROLL --> ROLLING : ROLL_DICE Event Received
        WAITING_FOR_ROLL --> PASS_TURN : Timeout (No Roll)
        
        ROLLING --> EVALUATING_MOVES
        
        state EVALUATING_MOVES <<choice>>
        EVALUATING_MOVES --> WAITING_FOR_MOVE : Has Valid Moves
        EVALUATING_MOVES --> PASS_TURN : No Valid Moves OR Triple Six
        
        WAITING_FOR_MOVE --> APPLYING_MOVE : MOVE_TOKEN Event Received
        WAITING_FOR_MOVE --> APPLYING_MOVE : Timeout (Auto-Move)
        
        APPLYING_MOVE --> EVALUATING_BONUS
        
        state EVALUATING_BONUS <<choice>>
        EVALUATING_BONUS --> WAITING_FOR_ROLL : Rolled 6 OR Capture OR Entered Goal
        EVALUATING_BONUS --> PASS_TURN : Standard Turn End
        
        PASS_TURN --> WAITING_FOR_ROLL : Next Active Player
    }
    
    ACTIVE --> COMPLETED : Win Condition Met (All 4 Tokens of a Player in Goal)
    COMPLETED --> [*]
```

#### Detailed Workflow:
1. **Lobby Creation**: Host generates a room, prompting the server to mint a unique 6-character room invite code mapped to Redis. Players join, select colors, and mark themselves as `READY`.
2. **Turn Progression**: Turn order flows clockwise (Red $\rightarrow$ Green $\rightarrow$ Yellow $\rightarrow$ Blue). Each active turn has a 15-second timer.
3. **Rolling Phase**:
   - The active player submits a `ROLL_DICE` request.
   - The server draws a cryptographically secure random number `[1-6]`.
   - If the player rolls a `6`, they get an extra roll. However, rolling three consecutive `6`s cancels the turn, reverting token positions and passing the turn immediately.
4. **Moving Phase**:
   - The server computes valid moves based on the dice value and the player's token coordinates.
   - If no valid moves are possible, the turn is skipped automatically.
   - If valid moves exist, the player selects a token to move (`MOVE_TOKEN`).
   - If the player times out (15 seconds), the server auto-selects the optimal move (or rolls and moves automatically).
5. **Bonus & Captures**:
   - Landing on an opponent's token (outside Safe Zones) captures it, returning it to their base and awarding the active player a bonus roll.
   - Entering the Home Goal with a token awards a bonus roll.
   - Entering the Home Goal requires an exact dice roll.

---

### 3. Real-Time Multiplayer Sync & Network Flow
To maintain real-time sync with latency under 100ms, the application utilizes STOMP over WebSockets. The client has zero authority over token positions or game state; it only requests actions. The server handles validation and broadcasts delta-updates.

```mermaid
sequenceDiagram
    participant Client as React Client
    participant Server_WS as STOMP Handler
    participant Engine as Ludo Game Engine
    participant DB as PostgreSQL / Redis
    participant Clients as Room Broadcast Topic
    
    Client->>Server_WS: SEND /app/room.{roomId}.move (TokenIndex)
    Note over Server_WS: Inspect JWT in socket session & confirm player turn
    Server_WS->>Engine: validateAndApply(currentState, tokenIndex, playerColor)
    
    alt Move is Illegal
        Engine-->>Server_WS: InvalidMoveException
        Server_WS-->>Client: SEND /queue/errors (ErrorMessage)
    else Move is Legal
        Engine-->>Server_WS: NewGameState + SideEffects
        Server_WS->>DB: Update room state in Redis & Batch-persist Match to Postgres
        Server_WS->>Clients: BCAST /topic/room.{roomId} (NewGameState)
    end
```

---

### 4. Database Schema & Data Persistence Strategy
The application employs a dual-database pattern:
* **Redis** is used as a fast, in-memory store for transient real-time entities (e.g., active room lobby sessions, socket connection mappings, and room invite code mapping) to support highly responsive gameplay.
* **PostgreSQL** is the persistent transactional relational database that stores long-term records like user profiles, credentials, MMR ratings, and historical match stats.

```
  +---------------+         1         n +---------------+
  |     users     |-------------------->|    matches    |
  +---------------+                     +---------------+
  | id (UUID, PK) |                     | id (UUID, PK) |
  | email         |                     | room_code     |
  | password_hash |                     | status        |
  | display_name  |                     | start_time    |
  | rating_mmr    |                     | end_time      |
  | created_at    |                     | winner_id (FK)|
  +---------------+                     +---------------+
          | 1                                   | 1
          |                                     |
          | n                                   | n
  +---------------+                             |
  | match_players |<----------------------------+
  +---------------+
  | id (UUID, PK) |
  | match_id (FK) |
  | user_id (FK)  |
  | player_color  |
  | rank_position |
  | total_kills   |
  | total_deaths  |
  +---------------+
```

* **Persistence Lifecycle**: When a room is created, the state is cached in Redis. As turns occur, state updates are written back to Redis. Once a player satisfies the win condition (all 4 tokens in the goal), the match status is set to `COMPLETED`, a final transaction is opened to commit the user stats, ELO/MMR rating updates, and the full match performance records to PostgreSQL, and the transient Redis cache is cleared.

---

### 5. Authentication & JWT Handshake Lifecycle
The system secures REST APIs and WebSocket channels using stateless JWT authentication with access/refresh token pairs.

1. **REST Authentication**: The client registers/logs in via `/api/v1/auth`. The server responds with a short-lived Access Token (15 mins) and sets a secure, HTTP-only, SameSite=Strict Refresh Token cookie (7 days).
2. **WebSocket Handshake**:
   - WebSockets do not natively support custom headers during the initial HTTP Upgrade handshake. 
   - To bypass this, the React client passes the access token as a query parameter (`ws://localhost:8080/ws?token=<JWT>`).
   - A custom `ChannelInterceptor` in Spring Security intercepts the handshake, extracts and decodes the JWT, validates the user claims, and binds the authenticated Principal user entity to the WebSocket connection context.
   - For all subsequent STOMP messages over the established connection, the handler validates that the session's authenticated user matches the player making the game request.

---

### 6. AI Heuristic Decision Model
In single-player vs. Bot mode, the AI evaluates all legal moves for its active tokens on a turn and scores them using a weighted utility function:

$$\text{Utility} = w_1 \cdot \text{KillOpportunity} + w_2 \cdot \text{EnterHomeGoal} + w_3 \cdot \text{EscapeDanger} + w_4 \cdot \text{ProgressToHome} - w_5 \cdot \text{EnterDangerZone}$$

Where:
* **KillOpportunity ($w_1 = 100$)**: High weight; prioritized to capture opponent tokens.
* **EnterHomeGoal ($w_2 = 80$)**: High priority; moves token into the final terminal goal.
* **EscapeDanger ($w_3 = 50$)**: Prioritizes moving a token if an opponent is directly behind it in capture range.
* **ProgressToHome ($w_4 = 10$)**: Encourages forward movement of tokens on the global track.
* **EnterDangerZone ($w_5 = 20$)**: Penalizes moving a token to a cell directly within an opponent's reach unless it is a Safe Zone.

---

### 7. Anti-Cheat Validation Pipeline
To combat client-side manipulation (e.g. modifying token coordinates, forcing dice rolls, or manipulating turn timers), the engine enforces **Zero Client Trust**:
1. **Server-Side Dice Rolls**: The client requests a roll, but the server generates the dice value using `java.security.SecureRandom`. Client-side values are rejected.
2. **Server-Side Position Mapping**: The server maintains the master coordinate map. When a move is requested, the server asserts:
   - Does the sender's authenticated principal ID match the active player's user ID?
   - Is the game phase currently `WAITING_FOR_MOVE`?
   - Does the target token index belong to the player's color?
   - Is the move mathematically valid based on the current dice value?
3. **Desynchronization Recovery**: If a client sends an invalid request, the server drops the message, logs a security warning, and broadcasts a full `GameState` sync payload to force the client UI to align with the server.

---

## 📁 Project Structure

```
ludo/
├── .github/
│   └── workflows/
│       ├── ci.yml            # Tests on every push/PR
│       └── deploy.yml        # Deploy to Koyeb + Vercel on main
│
├── ludo-backend/             # Spring Boot application
│   ├── src/main/java/com/ludo/game/
│   │   ├── config/           # Security, WebSocket, Redis config
│   │   ├── controller/       # REST endpoints (Auth, Room, Profile, Leaderboard)
│   │   ├── dto/              # Request/Response DTOs
│   │   ├── engine/           # LudoEngine.java — server-side game rules
│   │   ├── model/            # JPA entities (User, Match, MatchPlayer, Room)
│   │   ├── repository/       # Spring Data JPA repositories
│   │   ├── security/         # JWT filter, channel interceptor
│   │   ├── service/          # Business logic
│   │   └── websocket/        # GameActionHandler, WebSocketEventListener
│   ├── src/main/resources/
│   │   ├── application.yml         # Main config (env-var driven)
│   │   ├── application-prod.yml    # Production overrides
│   │   └── db/migration/           # Flyway SQL migrations
│   ├── Dockerfile            # Multi-stage Maven → JRE 17 Alpine
│   ├── koyeb.yaml            # Koyeb deployment config
│   └── pom.xml
│
├── ludo-frontend/            # React + Vite application
│   ├── src/
│   │   ├── components/game/  # Board.tsx, Dice.tsx, Token.tsx (SVG)
│   │   ├── engine/           # ludoEngine.ts, aiHeuristics.ts (client-side)
│   │   ├── hooks/            # useWebSocket.ts (singleton STOMP client)
│   │   ├── pages/            # Login, Register, GameRoom, OnlineGameRoom, Dashboard
│   │   ├── routes/           # ProtectedRoute.tsx
│   │   ├── services/         # api.ts (Axios + JWT interceptors)
│   │   ├── store/            # useAuthStore.ts, useGameStore.ts (Zustand)
│   │   └── utils/            # coordinates.ts, audio.ts
│   ├── Dockerfile            # Multi-stage Node → Nginx Alpine
│   ├── nginx.conf            # SPA routing + /api + /ws proxy
│   └── vercel.json           # Vercel SPA routing config
│
├── docker-compose.yml        # Full local stack (all 4 services)
├── .env.example              # Environment variables template
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Java | 17+ | [adoptium.net](https://adoptium.net) |
| Maven | 3.9+ | [maven.apache.org](https://maven.apache.org) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Docker Desktop | Latest | [docker.com](https://www.docker.com/products/docker-desktop) |

---

### Local Development (IDE)

This is the recommended approach for active development — run databases in Docker, apps in your IDE.

#### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ludo-game.git
cd ludo-game
```

#### 2. Start Postgres & Redis

```bash
cd ludo-backend
docker compose up -d
```

This spins up:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

#### 3. Run the Backend

```bash
# From ludo-backend/
mvn spring-boot:run
```

Backend starts at **http://localhost:8080**

#### 4. Run the Frontend

```bash
# From ludo-frontend/
npm install
npm run dev
```

Frontend starts at **http://localhost:5173**

> The Vite dev server proxies `/api` → `localhost:8080` automatically.

---

### Local Development (Docker Compose)

Run the entire stack as production-like containers:

```bash
# 1. Copy and configure environment variables
cp .env.example .env
# Edit .env and set a JWT_SECRET (required even locally)

# 2. Build and start all services
docker compose up --build

# 3. Open in browser
open http://localhost
```

Services started:
| Service | URL |
|---------|-----|
| Frontend (Nginx) | http://localhost |
| Backend (Spring Boot) | http://localhost:8080 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in your values.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SPRING_DATASOURCE_URL` | ✅ | JDBC connection URL | `jdbc:postgresql://host/db?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | ✅ | Database username | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | ✅ | Database password | `yourpassword` |
| `REDIS_URL` | ✅ | Redis connection URL | `rediss://default:pass@host:6379` |
| `JWT_SECRET` | ✅ | 256-bit signing secret | `openssl rand -base64 64` |
| `CORS_ALLOWED_ORIGINS` | ✅ | Comma-separated origins | `https://your-app.vercel.app` |
| `SPRING_PROFILES_ACTIVE` | ✅ prod | Spring profile | `prod` |
| `VITE_API_BASE_URL` | ✅ prod | Backend REST URL | `https://backend.koyeb.app/api/v1` |
| `VITE_WS_BASE_URL` | ✅ prod | Backend WebSocket URL | `wss://backend.koyeb.app` |

> **Never commit `.env` to git.** It is listed in `.gitignore`.

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/signup` | ❌ | Register a new user |
| `POST` | `/api/v1/auth/login` | ❌ | Login, returns access token |
| `POST` | `/api/v1/auth/refresh` | 🍪 | Refresh access token via cookie |
| `POST` | `/api/v1/auth/logout` | ✅ | Invalidate refresh token |

### Rooms

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/rooms` | ✅ | Create a new game room |
| `POST` | `/api/v1/rooms/{code}/join` | ✅ | Join room by invite code |
| `GET` | `/api/v1/rooms/{code}` | ✅ | Get room state |
| `DELETE` | `/api/v1/rooms/{code}` | ✅ | Leave/close room |

### Profile & Leaderboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/profile` | ✅ | Get own profile & stats |
| `PUT` | `/api/v1/profile` | ✅ | Update profile |
| `GET` | `/api/v1/leaderboard` | ✅ | Paginated global leaderboard |

---

## 📨 WebSocket Events

Connect to: `ws://localhost:8080/ws?token=<JWT>`

### Client → Server (publish to `/app/...`)

| Destination | Payload | Description |
|-------------|---------|-------------|
| `/app/game/{roomCode}/roll` | `{}` | Roll the dice |
| `/app/game/{roomCode}/move` | `{ tokenId, targetPosition }` | Move a token |
| `/app/game/{roomCode}/ready` | `{}` | Mark ready in lobby |

### Server → Client (subscribe to `/topic/...`)

| Destination | Payload | Description |
|-------------|---------|-------------|
| `/topic/room/{roomCode}` | `RoomState` | Room & lobby updates |
| `/topic/game/{roomCode}` | `GameState` | Full game state after each action |
| `/user/queue/errors` | `ErrorMessage` | Personal error messages |

> See [`websocket-events.md`](websocket-events.md) for full payload schemas.

---

## ☁️ Deployment

This project uses a **100% free** cloud stack.

```
Frontend  →  Vercel    (https://vercel.com)
Backend   →  Koyeb     (https://www.koyeb.com)
Database  →  Neon      (https://neon.tech)
Redis     →  Upstash   (https://upstash.com)
Images    →  GHCR      (ghcr.io — GitHub Container Registry)
```

### CI/CD Pipeline

| Trigger | Action |
|---------|--------|
| Push to any branch | Run backend tests (Maven) + frontend tests (Vitest) |
| Push to `main` | Build Docker image → push to GHCR → deploy to Koyeb + Vercel |

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Where to get it |
|--------|----------------|
| `KOYEB_TOKEN` | Koyeb → Account → API → Create Token |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |

> `GITHUB_TOKEN` is auto-provided by GitHub Actions — no setup needed.

### Full step-by-step deployment guide → [`walkthrough.md`](walkthrough.md)

---

## 🎮 Game Rules

- 2 to 4 players; each controls 4 tokens of their colour
- Roll a **6** to release a token from base onto the board
- Tokens travel clockwise around the 52-tile outer track, then up their home path
- **Landing on an opponent** sends their token back to base (safe tiles are immune)
- **Three consecutive 6s** cancel the turn
- First player to get all 4 tokens home **wins**
- **Server-authoritative** — the `LudoEngine.java` validates every move; invalid moves are rejected with a WebSocket error

---

## 🗺 Roadmap

- [x] Phase 1 — SVG Board rendering
- [x] Phase 2 — Core game engine (TypeScript)
- [x] Phase 3 — Local pass-and-play multiplayer
- [x] Phase 4 — AI heuristic bot opponent
- [x] Phase 5 — Spring Boot backend + PostgreSQL + Flyway
- [x] Phase 6 — JWT authentication system
- [x] Phase 7 — WebSocket STOMP real-time layer
- [x] Phase 8 — Online rooms + invite codes + reconnection
- [x] Phase 9 — Dashboard, ELO ratings, leaderboard
- [x] Phase 10 — Dockerized deployment + CI/CD
- [ ] Sound effects toggle
- [ ] Spectator mode
- [ ] Tournament brackets
- [ ] Mobile PWA

---

## 🤝 Contributing

Pull requests are welcome.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
# Open a Pull Request
```

Please make sure tests pass before opening a PR:
```bash
# Backend
cd ludo-backend && mvn test

# Frontend
cd ludo-frontend && npm run test
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Built with ❤️ as a student project · <a href="https://github.com/YOUR_USERNAME/ludo-game">GitHub</a>
</div>
