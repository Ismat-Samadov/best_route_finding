# Routing Algorithm Design

## Problem Formulation

### Graph Model

The Baku bus network is modeled as a **weighted directed multigraph** G = (V, E):

- **Vertices (V):** Each physical bus stop from `stop_details` (3,444 stops)
- **Edges (E):** Directed connections between consecutive stops on a bus route
  - An edge exists from stop A to stop B if they are consecutive stops on any bus line in the same direction
  - Multiple edges may exist between two stops (served by different bus lines) = multigraph
- **Edge Weights:** Multi-objective (distance, time, transfers)

### Graph Construction

```
For each bus B in buses:
  For each direction D in [1, 2]:
    stops = SELECT * FROM bus_stops
            WHERE bus_id = B.id AND direction_type_id = D
            ORDER BY bus_stop_id ASC

    For i = 0 to len(stops) - 2:
      Add edge: stops[i].stop_id -> stops[i+1].stop_id
        with metadata:
          bus_id: B.id
          bus_number: B.number
          distance: haversine(stops[i], stops[i+1])
          segment_time: estimated from total duration
```

### Edge Weight Computation

**Distance (primary):**
- Calculated using the **Haversine formula** between consecutive stop coordinates
- Formula: `d = 2R * arcsin(sqrt(sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlng/2)))`
- R = 6,371 km (Earth's mean radius)

**Travel Time (estimated):**
- Each bus has `duration_minuts` (total one-way time) and number of stops
- Estimated per-segment time = `duration_minuts / (number_of_stops - 1)`
- This is an approximation; real-time data would improve accuracy

**Transfer Penalty:**
- A transfer occurs when the route requires switching from one bus line to another
- Transfer penalty: constant weight (e.g., 5 minutes equivalent) added when changing bus_id

---

## Algorithm Selection

### Primary: Modified Dijkstra's Algorithm

**Why Dijkstra's:**
- The graph has non-negative edge weights (distance, time)
- Guarantees optimal shortest path
- Well-suited for sparse graphs (bus networks are sparse)
- Time complexity: O((V + E) log V) with binary heap

**Modification for Multi-Objective Optimization:**
We run Dijkstra's with a composite cost function that can be parameterized:

```
cost(edge) = α * distance + β * time + γ * transfer_penalty

Where:
  - Mode "shortest": α=1, β=0, γ=0
  - Mode "fastest":  α=0, β=1, γ=0
  - Mode "fewest_transfers": α=0, β=0, γ=1
  - Mode "balanced": α=0.3, β=0.5, γ=0.2
```

### Secondary: Yen's K-Shortest Paths

**Why Yen's:**
- We need the top 3 optimal routes, not just one
- Yen's algorithm efficiently computes K-shortest loopless paths
- Built on top of Dijkstra's as a subroutine
- Time complexity: O(K * V * (V + E) log V)

**Algorithm Overview:**
1. Find the shortest path P1 using Dijkstra's
2. For k = 2 to K:
   - For each node in P(k-1), compute a spur path by temporarily removing edges
   - Add candidate paths to a priority queue
   - Select the next shortest path Pk
3. Return [P1, P2, ..., PK]

### Why Not A*?

A* requires an admissible heuristic. While Haversine distance provides a good heuristic, the multi-objective nature (transfers, time) makes it difficult to guarantee admissibility. Dijkstra's is simpler and the graph size (3,444 nodes) is small enough for excellent performance without heuristic optimization.

---

## Pseudocode

### Graph Construction

```
function buildGraph(busStops, stopDetails, buses):
  graph = new AdjacencyList()
  stopCoords = Map<stopId, {lat, lng}>

  // Index stop coordinates
  for each stop in stopDetails:
    stopCoords[stop.id] = {lat: float(stop.latitude), lng: float(stop.longitude)}

  // Build edges from bus stop sequences
  for each bus in buses:
    stopsForward = busStops.filter(bs => bs.bus_id == bus.id && bs.direction_type_id == 1)
                           .sortBy(bs => bs.bus_stop_id)

    segmentTime = bus.duration_minuts / max(stopsForward.length - 1, 1)

    for i = 0 to stopsForward.length - 2:
      fromStop = stopsForward[i].stop_id
      toStop = stopsForward[i+1].stop_id
      dist = haversine(stopCoords[fromStop], stopCoords[toStop])

      graph.addEdge(fromStop, toStop, {
        busId: bus.id,
        busNumber: bus.number,
        distance: dist,
        time: segmentTime,
        fromName: stopsForward[i].stop_name,
        toName: stopsForward[i+1].stop_name
      })

    // Repeat for direction 2 (return)
    stopsReturn = busStops.filter(bs => bs.bus_id == bus.id && bs.direction_type_id == 2)
                          .sortBy(bs => bs.bus_stop_id)
    // ... same edge construction ...

  return graph
```

### Dijkstra's with Transfer Tracking

```
function dijkstra(graph, source, target, mode):
  // State: (stopId, currentBusId) to track transfers
  dist = Map<string, number>  // key = "stopId:busId"
  prev = Map<string, {node, edge}>
  pq = MinPriorityQueue()

  // Initialize: source with no bus (null)
  startKey = source + ":null"
  dist[startKey] = 0
  pq.insert(startKey, 0)

  while pq is not empty:
    current = pq.extractMin()
    [currentStop, currentBus] = parse(current.key)

    if currentStop == target:
      return reconstructPath(prev, current.key, source)

    for each edge in graph.getEdges(currentStop):
      isTransfer = (currentBus != null && currentBus != edge.busId)
      transferCost = isTransfer ? TRANSFER_PENALTY : 0

      edgeCost = computeCost(edge, mode) + transferCost
      nextKey = edge.toStop + ":" + edge.busId
      newDist = dist[current.key] + edgeCost

      if newDist < dist.getOrDefault(nextKey, INFINITY):
        dist[nextKey] = newDist
        prev[nextKey] = {node: current.key, edge: edge}
        pq.insertOrUpdate(nextKey, newDist)

  return null  // No path found

function computeCost(edge, mode):
  switch mode:
    case "shortest":  return edge.distance
    case "fastest":   return edge.time
    case "balanced":  return 0.3 * edge.distance + 0.5 * edge.time + 0.2 * TRANSFER_PENALTY
```

### Yen's K-Shortest Paths

```
function yenKShortest(graph, source, target, K, mode):
  A = []  // K shortest paths
  B = PriorityQueue()  // Candidate paths

  // Step 1: Find shortest path
  A[0] = dijkstra(graph, source, target, mode)
  if A[0] is null: return []

  for k = 1 to K-1:
    for i = 0 to A[k-1].nodes.length - 2:
      spurNode = A[k-1].nodes[i]
      rootPath = A[k-1].nodes[0..i]

      // Remove edges that share the same root path
      removedEdges = []
      for each path p in A:
        if p.nodes[0..i] == rootPath:
          edge = (p.nodes[i], p.nodes[i+1])
          graph.removeEdge(edge)
          removedEdges.push(edge)

      // Remove root path nodes (except spur node)
      removedNodes = rootPath[0..i-1]

      spurPath = dijkstra(graph, spurNode, target, mode)

      if spurPath is not null:
        totalPath = rootPath + spurPath
        B.insert(totalPath, totalPath.cost)

      // Restore removed edges and nodes
      graph.restoreEdges(removedEdges)

    if B is empty: break
    A[k] = B.extractMin()

  return A
```

### Path Reconstruction

```
function reconstructPath(prev, targetKey, sourceId):
  path = []
  segments = []  // Grouped by bus line
  currentKey = targetKey
  currentSegment = null

  while currentKey exists in prev:
    {node: prevKey, edge} = prev[currentKey]
    [stopId, busId] = parse(currentKey)

    if currentSegment == null or currentSegment.busId != edge.busId:
      if currentSegment != null:
        segments.unshift(currentSegment)
      currentSegment = {
        busId: edge.busId,
        busNumber: edge.busNumber,
        stops: [edge.toName],
        distance: 0,
        time: 0
      }

    currentSegment.stops.unshift(edge.fromName)
    currentSegment.distance += edge.distance
    currentSegment.time += edge.time
    currentKey = prevKey

  if currentSegment != null:
    segments.unshift(currentSegment)

  return {
    segments: segments,
    totalDistance: sum(s.distance for s in segments),
    totalTime: sum(s.time for s in segments),
    totalTransfers: segments.length - 1,
    stops: flatMap(s.stops for s in segments)
  }
```

---

## Complexity Analysis

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| Graph Construction | O(S) where S = bus_stops count | O(V + E) |
| Single Dijkstra | O((V + E) log V) | O(V) |
| Yen's K=3 | O(K * V * (V + E) log V) | O(K * V) |

**With our data:**
- V = 3,444 stops
- E ≈ 11,702 edges (from bus_stops sequences)
- K = 3
- Single Dijkstra: ~50ms estimated
- K=3 Yen's: ~200ms estimated

The graph is small enough that performance is not a concern for real-time queries.

---

## Transfer Detection Strategy

Two stops are considered "transfer-capable" if:
1. They share the same `stop_id` in `stop_details` (same physical stop)
2. They are served by different bus lines (different `bus_id` in `bus_stops`)

The transfer is implicit in the graph: when Dijkstra reaches a stop node, it can continue on any outgoing edge, including edges from different bus lines. The transfer penalty is applied when the bus_id changes.

---

## Optimization Modes (User-Facing)

| Mode | Prioritizes | Use Case |
|------|------------|----------|
| Shortest Distance | Minimum km traveled | Fuel/environmental optimization |
| Fastest | Minimum estimated time | Commuter efficiency |
| Fewest Transfers | Minimum bus changes | Convenience, accessibility |

The API returns top 3 routes. Each route is computed with the selected optimization mode, returning diverse alternatives via Yen's K-shortest paths algorithm.
