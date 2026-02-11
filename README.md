# Baku Bus Route Planner

A production-ready web application for finding optimal public bus routes across Baku, Azerbaijan. Built with Next.js, Leaflet maps, and a custom multi-objective routing engine.

## Features

- **Interactive Map** - Browse all 3,400+ bus stops on an OpenStreetMap-based map
- **Smart Route Finding** - Computes top 3 optimal routes between any two stops
- **Multiple Optimization Modes** - Shortest distance, fastest time, or balanced
- **Transfer Detection** - Automatically identifies where to change buses
- **Geolocation** - Detect your location and find the nearest bus stop
- **Mobile-Responsive** - Works on desktop, tablet, and phone
- **207 Bus Lines** - Full coverage of BakuBus network

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Map | Leaflet + react-leaflet |
| Routing Engine | Custom Dijkstra + Yen's K-shortest paths |
| Database | PostgreSQL (Neon Serverless) |
| Deployment | Vercel |

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Access to the Neon PostgreSQL database

### Installation

```bash
git clone https://github.com/Ismat-Samadov/best_route_finding.git
cd best_route_finding
npm install
```

### Environment Setup

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DATABASE_SCHEMA=AYNA
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main page with map and controls
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   └── api/
│       ├── stops/route.ts          # GET /api/stops
│       ├── stops/nearby/route.ts   # GET /api/stops/nearby
│       ├── buses/route.ts          # GET /api/buses
│       ├── routes/find/route.ts    # POST /api/routes/find
│       └── routes/geometry/route.ts # GET /api/routes/geometry
├── lib/
│   ├── db.ts                       # Database queries
│   ├── graph.ts                    # Transit graph construction
│   ├── routing.ts                  # Dijkstra + Yen's algorithms
│   ├── geo.ts                      # Haversine distance calculations
│   └── types.ts                    # TypeScript type definitions
└── components/
    ├── Map.tsx                     # Interactive Leaflet map
    ├── StopSearch.tsx              # Stop search autocomplete
    ├── RouteResults.tsx            # Route results container
    ├── RouteCard.tsx               # Individual route display card
    └── LocationButton.tsx          # Geolocation button
```

## API Reference

### GET /api/stops

Returns all bus stops with coordinates.

**Response:**
```json
{
  "stops": [
    {
      "id": 1439,
      "code": "1001200",
      "name": "Neftciler m/st",
      "latitude": 40.4115,
      "longitude": 49.9419,
      "is_transport_hub": false
    }
  ]
}
```

### GET /api/stops/nearby

Find stops near a location.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| lat | float | Yes | Latitude |
| lng | float | Yes | Longitude |
| radius | float | No | Search radius in km (default: 1.0) |
| limit | int | No | Max results (default: 20) |

### GET /api/buses

Returns all bus lines with metadata.

### POST /api/routes/find

Compute optimal routes between two stops.

**Request Body:**
```json
{
  "fromStopId": 1439,
  "toStopId": 631,
  "mode": "balanced"
}
```

**Modes:** `shortest`, `fastest`, `balanced`

**Response:**
```json
{
  "from": { "id": 1439, "name": "Neftciler m/st" },
  "to": { "id": 631, "name": "Qara Qarayev m/st" },
  "mode": "balanced",
  "routes": [
    {
      "segments": [
        {
          "busId": 1,
          "busNumber": "1",
          "stops": [...],
          "distance": 2.5,
          "time": 8.2
        }
      ],
      "totalDistance": 2.5,
      "totalTime": 8.2,
      "totalTransfers": 0,
      "totalStops": 5
    }
  ]
}
```

### GET /api/routes/geometry

Get GPS polyline coordinates for a route.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| busId | int | Yes | Bus line ID |
| direction | int | No | Direction (1=forward, 2=return, default: 1) |

## Routing Algorithm

The routing engine uses a **Modified Dijkstra's algorithm** combined with **Yen's K-Shortest Paths** to find the top 3 routes:

1. **Graph Model:** Bus stops are nodes, consecutive stops on bus routes are directed edges
2. **Multi-objective Cost:** Distance + time + transfer penalty (weighted by mode)
3. **Transfer Tracking:** State includes current bus ID to detect transfers
4. **K-Shortest Paths:** Yen's algorithm computes 3 diverse route alternatives

See [docs/routing-algorithm.md](docs/routing-algorithm.md) for detailed pseudocode and complexity analysis.

## Database Schema

The application connects to a PostgreSQL database (Neon) with the `ayna` schema containing:

- `buses` (207 rows) - Bus line definitions
- `bus_stops` (11,702 rows) - Ordered stop sequences per bus
- `stop_details` (3,444 rows) - Physical stop locations with GPS coordinates
- `routes` (396 rows) - Route variants (forward/return)
- `route_coordinates` (108,556 rows) - GPS polylines for route paths

See [docs/database/schema-analysis.md](docs/database/schema-analysis.md) for full documentation.

## Deployment

Deploy to Vercel in one click:

1. Connect GitHub repo to Vercel
2. Set environment variables (`DATABASE_URL`, `DATABASE_SCHEMA`)
3. Deploy

See [docs/deployment.md](docs/deployment.md) for full deployment guide.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System architecture and data flow |
| [docs/routing-algorithm.md](docs/routing-algorithm.md) | Algorithm design and pseudocode |
| [docs/database/schema-analysis.md](docs/database/schema-analysis.md) | Database schema analysis |
| [docs/database/data-dictionary.md](docs/database/data-dictionary.md) | Field semantics and domain model |
| [docs/deployment.md](docs/deployment.md) | Vercel deployment guide |

## License

ISC
