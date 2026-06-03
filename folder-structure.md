# Project Folder Structure & Architecture Blueprint
**Document Version:** 1.0.0  
**Status:** DRAFT / REFERENCE  

---

## 1. Frontend Folder Structure (React + Vite + Zustand + Tailwind)

Below is the directory hierarchy for the React frontend, structured to separate visual components, state management slices, network service clients, and the core game logic engine.

```
ludo-frontend/
├── .env.development
├── .env.production
├── .eslintrc.json
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
├── public/
│   ├── favicon.ico
│   └── assets/
│       ├── audios/                 # Sound files (roll, capture, move, win)
│       └── images/                 # Avatars and UI vector graphics
└── src/
    ├── main.jsx                    # Application entry mounting point
    ├── index.css                   # Global styles & Tailwind layers
    ├── components/                 # Reusable UI component libraries
    │   ├── common/                 # Generic atomic design elements
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx
    │   │   ├── Modal.jsx
    │   │   └── Spinner.jsx
    │   ├── dashboard/              # Page components for player metrics
    │   │   ├── MatchHistoryTable.jsx
    │   │   ├── StatCard.jsx
    │   │   └── LeaderboardRow.jsx
    │   ├── game/                   # Ludo board gameplay UI components
    │   │   ├── Board.jsx           # SVG canvas board renderer
    │   │   ├── Cell.jsx            # Dynamic position coordinate cell
    │   │   ├── Dice.jsx            # Rotational CSS dice component
    │   │   ├── Token.jsx           # Animated game token
    │   │   └── ChatBox.jsx         # Live text messaging panel
    │   └── layout/                 # Structural shell wrapper elements
    │       ├── DashboardLayout.jsx
    │       └── AuthLayout.jsx
    ├── engine/                     # Decoupled frontend game logic engine
    │   ├── ludoEngine.js           # Implements immutable rule states
    │   ├── aiHeuristics.js         # Evaluation functions for offline bots
    │   └── constants.js            # Hardcoded index parameters
    ├── hooks/                      # Custom state abstractions
    │   ├── useAudio.js             # Trigger audio clip plays
    │   ├── useAuth.js              # Access credentials context
    │   └── useWebSocket.js         # Manage socket subscriptions
    ├── pages/                      # Page routing containers
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   ├── Dashboard.jsx
    │   ├── GameLobby.jsx           # Private invite waiting room
    │   └── GameRoom.jsx            # Active board screen
    ├── routes/                     # Router configurations
    │   ├── AppRoutes.jsx           # Route mapping registry
    │   └── ProtectedRoute.jsx      # Auth verification guard
    ├── services/                   # Network interface clients
    │   ├── api.js                  # Axios client wrapper config
    │   ├── authService.js          # REST client for user access
    │   └── roomService.js          # REST client for room management
    ├── store/                      # Zustand state store slices
    │   ├── useAuthStore.js         # Stores credentials and active tokens
    │   ├── useGameStore.js         # Stores active board positions
    │   └── useUIStore.js           # General layout theme controllers
    ├── utils/                      # Helper calculation libraries
    │   ├── coordinates.js          # Translates board cells to SVG pixels
    │   └── formatters.js           # Formats MMR ratings and timers
    └── tests/                      # Testing directory
        ├── engine/
        │   └── ludoEngine.test.js  # Rule validation tests
        ├── components/
        │   └── Board.test.jsx      # Rendering verification tests
        └── setups.js               # Mock configuration files
```

### Purpose of Frontend Folders
*   `public/assets/`: Contains global static visual files and sounds. Audio files are separated so that they can be pre-fetched asynchronously during match loading screens.
*   `src/components/common/`: Houses pure presentation components (buttons, input fields, modals). These components are stateless and rely entirely on props to promote code reusability.
*   `src/components/game/`: Groups board-specific rendering components. `Board.jsx` reads coordinates from the state store and coordinates token animations using coordinates mapping.
*   `src/engine/`: Isolates the core Ludo calculations from the React rendering engine. By keeping this folder decoupled, it is possible to test and deploy game rules offline without mounting components.
*   `src/hooks/`: Abstract hooks to keep React components concise. `useWebSocket.js` handles STOMP subscription cycles, connection drops, and automatic reconnections.
*   `src/pages/`: Container templates mapping directly to application routes. They orchestrate store slices and pass down reactive properties to child components.
*   `src/services/`: Exposes REST endpoints to components. If the API base URL changes, modifications are restricted to this folder.
*   `src/store/`: Divides the application state into three distinct slices. This layout limits unnecessary component re-renders when only local layout states change.
*   `src/utils/`: Handles coordinate translations. Translates logical coordinates (e.g. `Red Token 0 on cell 12`) to graphic pixels (`cx={240}, cy={480}`) for the SVG board.

---

## 2. Backend Folder Structure (Spring Boot + PostgreSQL + Redis)

Below is the directory hierarchy for the Spring Boot backend, structured to enforce separation of concerns between rest routing, security validation, WebSocket session synchronization, databases access, and the game rules validator.

```
ludo-backend/
├── pom.xml
├── Dockerfile
├── docker-compose.yml
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/
    │   │       └── ludo/
    │   │           └── game/
    │   │               ├── LudoApplication.java             # Entry configuration class
    │   │               ├── config/                         # Infrastructure configurations
    │   │               │   ├── SecurityConfig.java         # CORS and authentication filters
    │   │               │   ├── WebSocketConfig.java        # STOMP socket routing broker
    │   │               │   ├── RedisConfig.java            # Memory caching clients
    │   │               │   └── WebMvcConfig.java           # General MVC parameters
    │   │               ├── controller/                     # REST API resource handlers
    │   │               │   ├── AuthController.java         # Registration and token paths
    │   │               │   ├── ProfileController.java      # User history details
    │   │               │   └── RoomController.java         # Room setup and code queries
    │   │               ├── security/                       # Token authentication layer
    │   │               │   ├── JwtTokenProvider.java       # Token validation services
    │   │               │   ├── JwtAuthenticationFilter.java# Intercepts REST request headers
    │   │               │   ├── JwtChannelInterceptor.java  # Checks WebSocket handshakes
    │   │               │   └── CustomUserDetailsService.java
    │   │               ├── model/                          # Domain objects
    │   │               │   ├── dto/                        # Request and response structures
    │   │               │   │   ├── LoginRequest.java
    │   │               │   │   ├── RegisterRequest.java
    │   │               │   │   └── GameActionRequest.java  # Wraps incoming WS events
    │   │               │   ├── entity/                     # Hibernate database mappings
    │   │               │   │   ├── User.java
    │   │               │   │   ├── Match.java
    │   │               │   │   ├── MatchPlayer.java
    │   │               │   │   └── Room.java
    │   │               │   └── enums/                      # Static database values
    │   │               │       ├── Color.java              # RED, GREEN, YELLOW, BLUE
    │   │               │       ├── GameStatus.java         # LOBBY, ACTIVE, COMPLETED
    │   │               │       └── TurnPhase.java          # WAITING_FOR_ROLL, WAITING_FOR_MOVE
    │   │               ├── repository/                     # Database access interfaces
    │   │               │   ├── UserRepository.java
    │   │               │   ├── MatchRepository.java
    │   │               │   └── MatchPlayerRepository.java
    │   │               ├── service/                        # Business logic transactions
    │   │               │   ├── AuthService.java            # Account creation orchestrations
    │   │               │   ├── RoomService.java            # Lobby registry transactions
    │   │               │   ├── MatchService.java           # DB transaction orchestrations
    │   │               │   └── LeaderboardService.java     # ELO MMR ranking query engines
    │   │               ├── websocket/                      # Real-time message handlers
    │   │               │   ├── GameActionHandler.java      # Routes WS actions to engine
    │   │               │   └── WebSocketEventListener.java # Connect/Disconnect listeners
    │   │               └── engine/                         # Core Ludo calculations
    │   │                   ├── LudoEngine.java             # Processes game moves
    │   │                   ├── BoardState.java             # Active coordinate records
    │   │                   ├── TokenPosition.java          # State of single game token
    │   │                   ├── RuleEvaluator.java          # Validates rule executions
    │   │                   └── AIHeuristicsEvaluator.java  # Calculates bot moves
    │   └── resources/
    │       ├── application.yml                             # General parameters config
    │       ├── application-prod.yml                        # Production parameters config
    │       └── db/
    │           └── migration/                              # Flyway schema migrations
    │               └── V1__init_schema.sql
    └── test/
        └── java/
            └── com/
                └── ludo/
                    └── game/
                        ├── engine/
                        │   └── LudoEngineTest.java         # Rules validation test
                        ├── controller/
                        │   └── AuthControllerTest.java     # REST routing tests
                        └── integration/
                            └── MatchFlowIntegrationTest.java# Test database integrations
```

### Purpose of Backend Folders
*   `config/`: Infrastructure configuration. Houses setup classes for CORS configuration, custom JSON serialization rules, and core thread-pooling settings for WebSocket message handling.
*   `controller/`: Maps incoming HTTP calls to services. They handle validation checks on payload inputs before starting business transactions.
*   `security/`: Contains security configurations. The `JwtChannelInterceptor` parses JWT claims when a connection requests an upgrade from HTTP to WSS, preventing unauthorized socket access.
*   `model/`: Divided to ensure separation of concerns. `dto/` classes model API payloads, preventing internal Hibernate database entity structures from being exposed directly to clients.
*   `repository/`: Inherits Spring Data JPA interfaces. Provides database query access abstractions for user lookups and match records.
*   `service/`: Orchestrates transactional business rules. Coordinates interactions between repositories, authentication providers, and state engines.
*   `websocket/`: Adapts WS messages to the rules engine. Handlers read payloads, verify room keys, query current states, validate moves, and broadcast the results to the room channel.
*   `engine/`: Contains the core Ludo gameplay calculations. The rules engine remains isolated from Spring Boot framework components, allowing it to be compiled and validated independently.
