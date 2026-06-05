<div align="center">

# 🎲 Ludo Multiplayer

### A real-time, full-stack multiplayer Ludo game built with React + Spring Boot

[![CI](https://github.com/JatinThakur-797/Ludo/actions/workflows/ci.yml/badge.svg)](https://github.com/JatinThakur-797/Ludo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-17-orange?logo=openjdk)](https://openjdk.org/projects/jdk/17/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-brightgreen?logo=spring)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**[Live Demo →](https://ludo-game-xxxx.vercel.app)** &nbsp;|&nbsp; **[API Docs →](#api-reference)**

</div>

---

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
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

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser Client                       │
│  React 19 + Zustand + STOMP.js + Axios + TailwindCSS    │
└──────────────┬───────────────────────┬──────────────────┘
               │ REST /api/v1          │ WebSocket /ws
               ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│              Spring Boot Backend (Java 17)               │
│                                                         │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────┐  │
│  │ AuthController│  │ GameActionHandler│  │RoomController│
│  │ JWT Security  │  │ STOMP Broker    │  │ LudoEngine │  │
│  └──────┬───────┘  └────────┬────────┘  └─────┬─────┘  │
│         │                   │                  │        │
│  ┌──────▼───────────────────▼──────────────────▼──────┐ │
│  │              Service Layer                          │ │
│  └──────┬──────────────────────────────┬──────────────┘ │
│         │                              │                 │
│  ┌──────▼──────┐              ┌────────▼──────┐         │
│  │ PostgreSQL  │              │    Redis       │         │
│  │ (Neon)      │              │ (Upstash)      │         │
│  │ Users/Matches│              │ Active Rooms  │         │
│  └─────────────┘              └───────────────┘         │
└─────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- **Server-authoritative game engine** — `LudoEngine.java` validates all moves; clients cannot cheat
- **Redis for active state** — room/game state is stored in Redis during a match; only written to PostgreSQL on completion
- **Stateless JWT** — enables horizontal scaling; refresh tokens stored in HTTP-only cookies
- **Immutable engine** — both `ludoEngine.ts` (client) and `LudoEngine.java` (server) treat game state as immutable

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
| `NORTHFLANK_API_KEY` | Northflank → Account Settings → API Keys |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |

> `GITHUB_TOKEN` is auto-provided by GitHub Actions — no setup needed.
> 
> Legacy fallback: if you already have `NORTHFLANK_TOKEN` configured, the deploy workflow will use it when `NORTHFLANK_API_KEY` is not set.

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
