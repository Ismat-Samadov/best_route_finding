# Routing Algorithm Design

## Problem Formulation

### Graph Model

The Baku bus network is modeled as a **weighted directed multigraph** G = (V, E):

- **Vertices (V):** Each physical bus stop from `stop_details` (3,444 stops)
- **Edges (E):** Two types of directed edges:
  1. **Bus edges:** Consecutive stops on a bus route (same direction)
     - Multiple edges may exist between two stops (served by different bus lines) = multigraph
  2. **Walking edges:** Bidirectional connections between nearby stops (within 300m)
     - Only between stops served by different bus routes
     - busId = -1, busNumber = "walk"
     - Walk speed: 4.5 km/h
- **Edge Weights:** Multi-objective (distance, time, transfers)

### Graph Construction

```
// Step 1: Bus route edges
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

// Step 2: Walking transfer edges (O(n²) with spatial pre-filter)
For each pair of stops (A, B):
  if |A.lat - B.lat| > 0.004: skip  // quick filter (~400m)
  if |A.lng - B.lng| > 0.005: skip
  dist = haversine(A, B)
  if dist > 0.3 km: skip
  if A and B serve only the same bus routes: skip
  walkTime = (dist / 4.5) * 60  // minutes
  Add bidirectional edges: A <-> B
    with busId=-1, busNumber="walk", distance=dist, time=walkTime
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
We run Dijkstra's with a composite cost function (balanced mode):

```
cost(edge) = 0.3 * distance + 0.5 * time + 0.2 * transfer_penalty

Transfer penalty: 10 units applied when changing bus lines
Walking edges: treated as regular edges with their distance/time cost
  (walking between nearby stops avoids long bus detours)
```

### Secondary: Yen's K-Shortest Paths (available, currently k=1)

**Why Yen's:**
- Can compute diverse alternative routes if needed in future
- Built on top of Dijkstra's as a subroutine
- Currently runs with k=1 (single best route) for simplicity
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

  // Step 1: Build bus route edges
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

  // Step 2: Build walking transfer edges
  stopBuses = Map<stopId, Set<busId>>  // which buses serve each stop
  for each bs in busStops:
    stopBuses[bs.stop_id].add(bs.bus_id)

  for each pair (stopA, stopB) in stopDetails:
    if |stopA.lat - stopB.lat| > 0.004: continue  // quick filter
    if |stopA.lng - stopB.lng| > 0.005: continue
    dist = haversine(stopA, stopB)
    if dist > 0.3: continue  // 300m radius
    if stopBuses[A] == stopBuses[B]: continue  // same buses, no point
    walkTime = (dist / 4.5) * 60  // minutes at 4.5 km/h
    graph.addEdge(A, B, { busId: -1, busNumber: "walk", dist, walkTime })
    graph.addEdge(B, A, { busId: -1, busNumber: "walk", dist, walkTime })

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

  busSegments = segments.filter(s => s.busId != -1)
  return {
    segments: segments,  // includes both bus and walking segments
    totalDistance: sum(s.distance for s in segments),
    totalTime: sum(s.time for s in segments),
    totalTransfers: max(0, busSegments.length - 1),  // walking doesn't count
    stops: flatMap(s.stops for s in busSegments)
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
- E ≈ 11,702 bus edges + walking edges (from bus_stops sequences + nearby stop pairs within 300m)
- K = 1 (single best route)
- Single Dijkstra: ~50ms estimated

The graph is small enough that performance is not a concern for real-time queries. Walking edge construction is O(n²) but uses a quick lat/lng pre-filter to skip most pairs.

---

## Transfer Detection Strategy

Transfers happen in two ways:

1. **Same-stop transfer:** When Dijkstra reaches a stop served by multiple bus lines, it can continue on any outgoing edge. A transfer penalty is applied when the bus_id changes.

2. **Walking transfer:** When two stops from different bus routes are within 300m, a walking edge connects them. The user walks between stops to access a different bus line. Walking segments use `busId = -1` and are displayed as dashed lines on the map with a walking icon in the timeline.

Transfer counting: Only bus-to-bus changes count as transfers. Walking segments are displayed as intermediate steps but don't increment the transfer counter on their own — only the number of distinct bus segments minus one counts.

---

## Optimization Mode

The application uses a single **balanced** mode that optimizes for a combination of distance, time, and transfer convenience:

```
cost = 0.3 * distance + 0.5 * time + 0.2 * transfer_penalty
```

The API returns a single best route. The routing engine supports other modes internally (`shortest`, `fastest`) but only `balanced` is exposed to users for simplicity.
