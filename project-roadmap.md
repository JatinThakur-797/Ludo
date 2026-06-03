# Engineering Project Roadmap
## Project: Scalable Real-Time Multiplayer Ludo Game
**Document Version:** 1.0.0  
**Status:** APPROVED / READY FOR EXECUTION  

---

## Roadmap Overview
This document outlines a realistic, 10-phase engineering plan designed to take the multiplayer Ludo platform from local layout rendering to a production-grade, containerized, real-time multiplayer application. The sequence prioritizes isolating logical interfaces (clean engine boundaries) early on, before introducing network-tier complexities like WebSockets and STOMP message protocols.

---

### Phase 1: Frontend Setup & Local Board Rendering
*   **Objectives:** Initialize the React-Vite project, configure UI design foundations, and render a responsive, vector-based SVG Ludo Board.
*   **Features:**
    *   Responsive board UI viewport sizing.
    *   Dynamic SVG grid tile layouts (Red, Green, Yellow, Blue quadrants).
    *   Responsive token overlay rendering inside cells and base zones.
*   **Deliverables:**
    *   React-Vite project structure with Tailwind CSS.
    *   `src/components/game/Board.jsx` component.
    *   `src/utils/coordinates.js` mapping engine.
*   **Dependencies:** None.
*   **Estimated Complexity:** Low (Score: 2/10).
*   **Risks:** SVG grid layout alignment issues across varied viewports.
    *   *Mitigation:* Use fixed SVG coordinate viewport grids (`0 0 600 600`) and flex/grid container scaling.
*   **Testing Requirements:**
    *   Visual testing across mobile (375px) and desktop (1920px) screens.
    *   Component snapshot testing using Vitest/Jest.
*   **Exact Tasks:**
    1.  Bootstrap React application using `npm create vite@latest ludo-frontend -- --template react`.
    2.  Install Tailwind CSS, configure `tailwind.config.js` with theme colors matching specifications (Red, Green, Yellow, Blue).
    3.  Create coordinate mapping utility matching cells `0`-`51`, home paths `52`-`56`, and goal `57`.
    4.  Implement SVG board rendering showing bases, starting stars, normal tiles, safe zone tiles, and home paths.
*   **File/Module Ownership:**
    *   `src/components/game/Board.jsx` (Frontend UI Team)
    *   `src/utils/coordinates.js` (Frontend Architecture Team)
*   **Architecture Decisions:**
    *   *Vector vs. Canvas:* SVG is selected over HTML5 Canvas for board rendering due to ease of scaling, native DOM event attachment, and CSS animation integration.
*   **Completion Checklist:**
    *   [ ] Vite server runs locally with zero console errors.
    *   [ ] The Ludo board renders perfectly in all standard desktop and mobile aspect ratios.
    *   [ ] Token base coordinates match the SVG coordinate mappings.

---

### Phase 2: Core Game Engine & Rules
*   **Objectives:** Build the pure, side-effect-free deterministic logical engine representing board rules, movement calculations, and turns.
*   **Features:**
    *   Coordinate translation from relative paths to global path indices.
    *   Dice roll evaluation & rule parsing (e.g. consecutive sixes, base release checks).
    *   Legal move identification logic.
*   **Deliverables:**
    *   Pure JavaScript Engine package `src/engine/ludoEngine.js`.
    *   Unit test suites covering all standard game rules.
*   **Dependencies:** Phase 1 (for token coordinate validation).
*   **Estimated Complexity:** High (Score: 7/10).
*   **Risks:** Complex routing logic around coordinate wrap-around indexes (index 51 to index 0) for green, yellow, and blue players.
    *   *Mitigation:* Use color-specific offset lookup tables and verify thoroughly using unit testing.
*   **Testing Requirements:**
    *   100% code coverage on the core engine logic via Vitest unit tests.
*   **Exact Tasks:**
    1.  Define TypeScript interface configurations/models representing token coordinates and game phases.
    2.  Write base release validator (requires roll value `6`).
    3.  Write home-entry validator (requires exact roll values).
    4.  Write wrap-around coordinate offset resolver for green, yellow, and blue entry tracks.
    5.  Implement consecutive sixes tracking. If three `6`s are rolled in succession, void the actions.
*   **File/Module Ownership:**
    *   `src/engine/ludoEngine.js` (Game Logic Architect)
*   **Architecture Decisions:**
    *   *Immutability:* The Ludo Game Engine must treat game state as immutable. It should accept state and action, and return a new state object without mutating the original.
*   **Completion Checklist:**
    *   [ ] Unit tests pass for normal moves.
    *   [ ] Unit tests pass for base release on rolling 6.
    *   [ ] Unit tests pass for triple-six turn cancellation.
    *   [ ] Unit tests pass for safe zone protection and capture events.

---

### Phase 3: Local Multiplayer Gameplay
*   **Objectives:** Connect the SVG UI layout to a local Zustand state store, allowing offline pass-and-play matches.
*   **Features:**
    *   Local turn lifecycle states.
    *   Offline game preservation via `localStorage` sync.
    *   Turn indicators and interactive token selection overlays.
*   **Deliverables:**
    *   Zustand store `src/store/useGameStore.js`.
    *   Local matching config view `src/pages/GameRoom.jsx`.
*   **Dependencies:** Phase 1, Phase 2.
*   **Estimated Complexity:** Medium (Score: 5/10).
*   **Risks:** State synchronization lags causing double clicks during active turn transitions.
    *   *Mitigation:* Set action-lock flags (`isResolving`) during transitions and disable token click events.
*   **Testing Requirements:**
    *   End-to-end (E2E) testing using Playwright simulating a complete offline 4-player match.
*   **Exact Tasks:**
    1.  Create Zustand store structure managing game status, players, activeColor, phase, and history.
    2.  Bind click events to tokens on SVG board based on the `availableMoves` list returned by the engine.
    3.  Implement dice roll click handler with animated rotational states.
    4.  Write store middleware that automatically writes game state changes to `localStorage` after each turn.
*   **File/Module Ownership:**
    *   `src/store/useGameStore.js` (Frontend Lead)
    *   `src/components/game/Dice.jsx` (Animation Engineer)
*   **Architecture Decisions:**
    *   *Zustand Slice Pattern:* Break the store down into separate slices for better code readability and easier integration with backend sockets later.
*   **Completion Checklist:**
    *   [ ] Users can complete a full 2 to 4 player local game from start to finish.
    *   [ ] Refreshing the browser page does not lose the active local game state.
    *   [ ] Interactive tokens display dynamic styling when they are eligible for a move.

---

### Phase 4: AI Gameplay
*   **Objectives:** Implement a heuristic-based AI player to enable single-player vs bot game modes.
*   **Features:**
    *   Interactive bot player mode configuration.
    *   Heuristic scoring utility algorithm evaluating all legal moves for a bot turn.
    *   Automated turn triggers for bot moves.
*   **Deliverables:**
    *   `src/engine/aiEngine.js` module.
    *   Bot setup option UI layout configuration.
*   **Dependencies:** Phase 3.
*   **Estimated Complexity:** Medium (Score: 6/10).
*   **Risks:** Blocking the UI thread during complex AI decision trees.
    *   *Mitigation:* Run decisions asynchronously using standard Promise patterns or Web Workers.
*   **Testing Requirements:**
    *   Automated bot-vs-bot simulation test runs to ensure there are no deadlocks.
*   **Exact Tasks:**
    1.  Implement utility-scoring function in `aiEngine.js` calculating weights for capturing, entering home, escape, and progress.
    2.  Write bot action orchestrator: triggers a delay (e.g. 800ms) for natural feel, simulates dice roll, and triggers token move.
    3.  Integrate the bot player configuration hook within the main Zustand state controller.
*   **File/Module Ownership:**
    *   `src/engine/aiEngine.js` (AI Specialist)
*   **Architecture Decisions:**
    *   *State Decoupling:* The AI module must remain isolated, consuming standard game states and returning action selections.
*   **Completion Checklist:**
    *   [ ] Bot moves occur without blocking the main UI thread.
    *   [ ] Heuristic AI behaves logically (e.g. captures vulnerable player tokens when possible).
    *   [ ] Game successfully advances turn controls to the next active player after bot actions complete.

---

### Phase 5: Backend Setup with Spring Boot
*   **Objectives:** Establish the Spring Boot framework architecture, JPA entity mappings, and PostgreSQL connection setups.
*   **Features:**
    *   Database connection pooling config.
    *   JPA Entity Schema definition.
    *   Flyway database migrations setup.
*   **Deliverables:**
    *   Configured Maven Spring Boot app.
    *   Flyway schema migrations.
    *   JPA Entities (`User.java`, `Match.java`, `MatchPlayer.java`).
*   **Dependencies:** Database design specifications.
*   **Estimated Complexity:** Medium (Score: 4/10).
*   **Risks:** Connection leaks and slow DB startup issues inside virtual environments.
    *   *Mitigation:* Set optimal connection pooling parameters via HikariCP (`maximum-pool-size: 20`).
*   **Testing Requirements:**
    *   Integration testing using Testcontainers to verify database schemas against local PostgreSQL containers.
*   **Exact Tasks:**
    1.  Initialize Java Maven project via Spring Initializr.
    2.  Configure `application.yml` with database credentials and Flyway setup properties.
    3.  Write database initialization scripts (`V1__init_schema.sql`).
    4.  Create core Entity classes and corresponding JPA Repositories.
*   **File/Module Ownership:**
    *   Backend Infrastructure Team.
*   **Architecture Decisions:**
    *   *UUIDs vs Auto-Increment:* Use UUIDs for user and match keys to enhance security and simplify decentralized synchronization.
*   **Completion Checklist:**
    *   [ ] Database tables migrate successfully via Flyway on startup.
    *   [ ] Spring Boot server starts up locally without database connection warnings.
    *   [ ] Testcontainers pass integration test runs.

---

### Phase 6: Authentication System
*   **Objectives:** Implement secure JWT token-pair authentication, password encryption, and client-side page guards.
*   **Features:**
    *   User Registration & Login.
    *   Spring Security filters verifying JWTs.
    *   Route authorization guards on the frontend.
*   **Deliverables:**
    *   `AuthController.java`, `JwtTokenProvider.java`.
    *   `src/routes/ProtectedRoute.jsx` UI layout.
*   **Dependencies:** Phase 5.
*   **Estimated Complexity:** Medium (Score: 5/10).
*   **Risks:** Storing tokens in accessible client storage makes them vulnerable to Cross-Site Scripting (XSS).
    *   *Mitigation:* Store Access Tokens in frontend memory/state and store Refresh Tokens in secure, HTTP-only SameSite=Strict cookies.
*   **Testing Requirements:**
    *   Integration testing of auth filters using MockMvc.
*   **Exact Tasks:**
    1.  Configure Spring Security Filter Chain with BCrypt encoder.
    2.  Write `JwtTokenProvider` generating access (15 min) and refresh (7 days) tokens.
    3.  Implement signup/login REST controllers with request body validations.
    4.  Implement React client routing guards and Axios interceptors handling token refreshes.
*   **File/Module Ownership:**
    *   Backend Security Lead / Frontend Dev.
*   **Architecture Decisions:**
    *   *Stateless Session:* Use stateless JWT authentication on the backend API layer to facilitate horizontal scaling.
*   **Completion Checklist:**
    *   [ ] Client receives validation errors when entering duplicate emails during signup.
    *   [ ] Unauthenticated users are redirected to the login page when trying to access `/dashboard`.
    *   [ ] Access token refresh works in the background when the current token expires.

---

### Phase 7: WebSocket Realtime Architecture
*   **Objectives:** Establish the WebSocket framework backend utilizing STOMP message formats.
*   **Features:**
    *   WebSocket upgrade handshakes with JWT authentication validations.
    *   Real-time event routing.
    *   Redis connection broker configuration.
*   **Deliverables:**
    *   `WebSocketConfig.java`, `GameActionHandler.java`.
    *   `src/hooks/useWebSocket.js` client adapter hook.
*   **Dependencies:** Phase 6.
*   **Estimated Complexity:** High (Score: 8/10).
*   **Risks:** Connection drops causing state mismatches across connected clients.
    *   *Mitigation:* Implement heartbeat signals and maintain incremental state sequence numbers to verify state alignment.
*   **Testing Requirements:**
    *   Socket connection validation using simulated program socket scripts.
*   **Exact Tasks:**
    1.  Configure Spring WebSocket STOMP endpoint `/ws` with authentication interceptors.
    2.  Implement `WebSocketEventListener` capturing user connection/disconnection events.
    3.  Implement Redis message broker configuration.
    4.  Create `@stomp/stompjs` connector instances in the React application.
*   **File/Module Ownership:**
    *   Realtime Architecture Architect.
*   **Architecture Decisions:**
    *   *STOMP Broker:* Select STOMP over plain raw WebSockets to simplify message routing with standard publish/subscribe structures.
*   **Completion Checklist:**
    *   [ ] Socket upgrade handshake validates JWT claims.
    *   [ ] Connection drops trigger user-offline events on the backend.
    *   [ ] Messages broadcast to room topics sync correctly to all active subscribers.

---

### Phase 8: Online Multiplayer Rooms & Invite Codes
*   **Objectives:** Build the room lifecycle logic, room creation, invite codes, and server-authoritative turn validations.
*   **Features:**
    *   Invite code generators.
    *   Lobby coordination rooms.
    *   Server-authoritative game validations.
    *   User reconnection logic.
*   **Deliverables:**
    *   `RoomController.java`, `RoomService.java`.
    *   Java Rules Engine implementation (`LudoEngine.java`).
*   **Dependencies:** Phase 2, Phase 7.
*   **Estimated Complexity:** Critical (Score: 9/10).
*   **Risks:** Race conditions occurring when two players send moves at the same time.
    *   *Mitigation:* Use concurrent queues or synchronize validation blocks using Redis room locks.
*   **Testing Requirements:**
    *   Integration testing simulating dual action events sent to identical rooms.
*   **Exact Tasks:**
    1.  Port the JavaScript game logic rules engine (Phase 2) to Java (`LudoEngine.java`).
    2.  Write room management endpoints: code generator, lobby player mapper.
    3.  Implement validation logic inside socket listeners checking current turn identity and moves validity.
    4.  Write 60-second grace timer in room scheduler to manage user reconnections.
*   **File/Module Ownership:**
    *   Backend Rules Engineer / Realtime Lead.
*   **Architecture Decisions:**
    *   *Redis Lobby Store:* Active room states are stored in Redis during play to minimize database load. State is written to PostgreSQL only when the match completes.
*   **Completion Checklist:**
    *   [ ] Creating a room generates a unique 6-character code.
    *   [ ] Entering invalid moves from a modified client triggers a socket error.
    *   [ ] Disconnects trigger grace timers; reconnecting restores the player state.

---

### Phase 9: Dashboard & Statistics
*   **Objectives:** Build the analytics layer displaying leaderboards and match histories on the frontend.
*   **Features:**
    *   ELO/MMR rating adjustments.
    *   Leaderboard displays.
    *   Match history panels.
*   **Deliverables:**
    *   `ProfileController.java`, `LeaderboardService.java`.
    *   `src/pages/Dashboard.jsx`.
*   **Dependencies:** Phase 5, Phase 8.
*   **Estimated Complexity:** Low (Score: 3/10).
*   **Risks:** Performance bottlenecks when fetching global leaderboards from large datasets.
    *   *Mitigation:* Implement caching on leaderboard queries and use pagination (page size: 10).
*   **Testing Requirements:**
    *   Database query profiling using Hibernate statistics tracking.
*   **Exact Tasks:**
    1.  Implement ELO rating update formula on match completion.
    2.  Write paginated leaderboard query endpoints.
    3.  Design dashboard layouts displaying win rates, total kills, and recent matches.
    4.  Add profile configuration screens.
*   **File/Module Ownership:**
    *   Fullstack Developer.
*   **Architecture Decisions:**
    *   *MMR Calculation:* Use standard ELO algorithms with a K-factor of 32 for MMR adjustments on match completion.
*   **Completion Checklist:**
    *   [ ] Completing a match correctly updates player MMR and writes to history.
    *   [ ] Leaderboard outputs paginated users ordered by rating.
    *   [ ] Profile statistics refresh correctly after match updates.

---

### Phase 10: Deployment & Production Optimization
*   **Objectives:** Build container images, set up CI/CD workflows, configure SSL certificate configurations, and optimize assets.
*   **Features:**
    *   CI/CD pipeline deployments.
    *   Auto-scaling containers.
    *   Web asset caching.
*   **Deliverables:**
    *   `Dockerfile`, `docker-compose.yml`.
    *   GitHub Actions configuration files.
*   **Dependencies:** Phase 8, Phase 9.
*   **Estimated Complexity:** Medium (Score: 6/10).
*   **Risks:** WebSocket handshake failures when routing through load balancers.
    *   *Mitigation:* Configure sticky sessions and enable WebSocket proxying on Nginx/Gateway configurations.
*   **Testing Requirements:**
    *   Load testing using Gatling simulating 5,000 active WebSocket connections.
*   **Exact Tasks:**
    1.  Write multi-stage Dockerfiles for React (Nginx alpine) and Spring Boot (OpenJDK alpine).
    2.  Configure GitHub Actions workflows to run tests and push images.
    3.  Set up hosting targets: Vercel (Frontend), AWS ECS/Fargate (Backend), Redis (Upstash/AWS ElastiCache).
    4.  Run load tests and tune JVM memory parameters.
*   **File/Module Ownership:**
    *   DevOps Architect.
*   **Architecture Decisions:**
    *   *Client Caching:* Enable gzip/brotli compression and cache-control headers on static assets.
*   **Completion Checklist:**
    *   [ ] Docker images build successfully with no warnings.
    *   [ ] Automated tests pass during CI runner executions.
    *   [ ] WebSocket load tests confirm stable connections under high concurrency.
