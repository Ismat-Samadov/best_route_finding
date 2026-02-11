# System Architecture

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │  Map Layer   │  │  UI Controls │  │  State Management      ││
│  │  (Leaflet)   │  │  (React)     │  │  (React useState)      ││
│  │              │  │              │  │                          ││
│  │ - Stop pins  │  │ - Search     │  │ - Selected stops        ││
│  │ - Route lines│  │ - Stop list  │  │ - Route result          ││
│  │ - Walk paths │  │ - Journey    │  │ - User location         ││
│  └──────┬───────┘  └──────┬───────┘  └────────────┬───────────┘│
│         └──────────────────┴──────────────────────┘             │
│                            │ HTTP                               │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                     NEXT.JS SERVER                              │
│                            │                                    │
│  ┌─────────────────────────┴───────────────────────────────┐   │
│  │                   API Routes (/api)                      │   │
│  │                                                          │   │
│  │  GET /api/stops         - All stops with coordinates     │   │
│  │  GET /api/stops/nearby  - Stops near a location          │   │
│  │  GET /api/buses         - All bus lines                  │   │
│  │  POST /api/routes/find  - Compute optimal route           │   │
│  │  GET /api/routes/[id]   - Route coordinates for display  │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│  ┌─────────────────────────┴───────────────────────────────┐   │
│  │                   Service Layer                          │   │
│  │                                                          │   │
│  │  DatabaseService  - Query execution, connection pool     │   │
│  │  GraphService     - Graph construction and caching       │   │
│  │  RoutingService   - Dijkstra, Yen's K-shortest paths    │   │
│  │  GeoService       - Haversine, nearest stop lookup       │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│  ┌─────────────────────────┴───────────────────────────────┐   │
│  │                   Data Access Layer                      │   │
│  │                                                          │   │
│  │  Neon Serverless Driver (@neondatabase/serverless)       │   │
│  │  Connection: DATABASE_URL env var                        │   │
│  │  Schema: ayna                                            │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │ SSL/TLS                            │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│              NEON POSTGRESQL (Cloud)                             │
│                                                                 │
│  Schema: ayna                                                   │
│  Tables: buses, bus_stops, stop_details, routes,                │
│          route_coordinates, stops, regions,                      │
│          payment_types, working_zone_types                       │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
best_route_finding/
├── docs/
│   ├── database/
│   │   ├── schema-analysis.md      # Database schema documentation
│   │   └── data-dictionary.md      # Field semantics and domain model
│   ├── architecture.md             # This file
│   └── routing-algorithm.md        # Algorithm design and pseudocode
├── scripts/
│   ├── inspect-db.js               # Database schema inspection
│   └── inspect-data.js             # Data sampling script
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with metadata
│   │   ├── page.tsx                # Main map page
│   │   ├── globals.css             # Global styles
│   │   └── api/
│   │       ├── stops/
│   │       │   ├── route.ts        # GET all stops
│   │       │   └── nearby/
│   │       │       └── route.ts    # GET nearby stops
│   │       ├── buses/
│   │       │   └── route.ts        # GET all bus lines
│   │       └── routes/
│   │           ├── find/
│   │           │   └── route.ts    # POST route computation
│   │           └── [id]/
│   │               └── route.ts    # GET route geometry
│   ├── lib/
│   │   ├── db.ts                   # Database connection singleton
│   │   ├── graph.ts                # Graph data structure
│   │   ├── routing.ts              # Dijkstra + Yen's algorithms
│   │   ├── geo.ts                  # Geospatial utilities
│   │   └── types.ts                # TypeScript type definitions
│   └── components/
│       ├── Map.tsx                  # Map with route visualization
│       ├── StopSearch.tsx           # Stop search/selection
│       ├── JourneyCard.tsx          # Route timeline (bus + walk)
│       └── LocationButton.tsx       # Geolocation button
├── public/
│   └── marker-icon.png             # Custom map markers
├── .env                            # Environment variables (not committed)
├── .gitignore
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json
└── README.md
```

## Layer Responsibilities

### 1. Data Access Layer (`src/lib/db.ts`)
- Manages database connections via Neon serverless driver
- Provides typed query functions
- Handles connection pooling and error recovery
- Schema-aware queries (prefixed with `ayna.`)

### 2. Service Layer (`src/lib/`)

**GraphService (`graph.ts`):**
- Constructs the bus network graph from database records
- Builds walking transfer edges between nearby stops (within 300m)
- Maintains adjacency list representation
- Caches the graph in memory (rebuilt on server restart)
- Provides edge lookup and neighbor iteration

**RoutingService (`routing.ts`):**
- Implements modified Dijkstra's algorithm with transfer tracking
- Uses Yen's K-shortest paths (k=1 for single best route)
- Balanced optimization mode: 0.3*distance + 0.5*time + 0.2*transfer
- Handles walking segments (busId=-1) distinctly from bus segments
- Returns structured route results with segments, stops, and metrics

**GeoService (`geo.ts`):**
- Haversine distance calculation
- Nearest-stop lookup using spatial indexing
- Coordinate validation and normalization

### 3. API Layer (`src/app/api/`)
- RESTful endpoints using Next.js App Router
- Request validation and error handling
- Response serialization with proper HTTP status codes

### 4. Frontend Layer (`src/components/`)
- Interactive map using Leaflet (open-source, no API key needed)
- Color-coded route segments with dashed walking paths
- React components for user interaction
- Client-side state management with React hooks
- Tab-based mobile layout (Search / Map views)

## Data Flow: Route Finding Request

```
1. User selects start stop and destination stop on map/search
2. Frontend sends POST /api/routes/find { fromStopId, toStopId }
3. API route handler validates input
4. RoutingService checks if graph is built (lazy initialization)
5. If not built: GraphService queries DB, constructs graph + walking edges, caches it
6. RoutingService runs Dijkstra (balanced mode) to find optimal route
7. Route may include walking segments (busId=-1) between nearby stops
8. Return structured JSON with single route (segments, stops, metrics)
9. Frontend renders route on map (solid lines for bus, dashed for walking)
   and in JourneyCard timeline
```

## Deployment Architecture (Vercel)

```
┌─────────────────────────────────────┐
│           Vercel Platform           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Edge Network (CDN)        │   │
│  │   - Static assets           │   │
│  │   - HTML/CSS/JS bundles     │   │
│  └──────────┬──────────────────┘   │
│             │                       │
│  ┌──────────┴──────────────────┐   │
│  │   Serverless Functions      │   │
│  │   - API routes              │   │
│  │   - SSR pages               │   │
│  │   - Graph computation       │   │
│  └──────────┬──────────────────┘   │
│             │                       │
└─────────────┼───────────────────────┘
              │ HTTPS
              │
┌─────────────┴───────────────────────┐
│     Neon PostgreSQL (eu-central-1)  │
│     - Serverless driver             │
│     - Connection pooling            │
└─────────────────────────────────────┘
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `DATABASE_SCHEMA` | Schema name | `AYNA` |

## Performance Considerations

1. **Graph Caching:** The graph is built once per serverless function cold start and cached in module-level memory. For Vercel serverless, this means the graph persists across requests within the same function instance.

2. **Database Queries:** Using Neon serverless driver optimized for edge/serverless environments with HTTP-based queries.

3. **Route Coordinates:** Fetched on-demand only for the selected route, not pre-loaded.

4. **Stop Data:** All stops (3,444) are loaded on initial page load for map display. This is ~200KB of JSON, acceptable for modern connections.

## Security

- Database credentials stored in environment variables, never in code
- SSL/TLS for all database connections
- Input validation on all API endpoints
- No user authentication required (public transit info is public data)
- SQL injection prevention via parameterized queries (Neon tagged templates)
