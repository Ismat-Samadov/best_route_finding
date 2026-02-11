import { GraphEdge, StopDetail, Bus, BusStop } from "./types";
import { haversine } from "./geo";
import { queryStopDetails, queryBuses, queryBusStops } from "./db";

export class TransitGraph {
  private adjacency: Map<number, GraphEdge[]> = new Map();
  private stopInfo: Map<number, StopDetail> = new Map();
  private busInfo: Map<number, Bus> = new Map();
  private built = false;

  isBuilt(): boolean {
    return this.built;
  }

  getStopInfo(stopId: number): StopDetail | undefined {
    return this.stopInfo.get(stopId);
  }

  getAllStops(): StopDetail[] {
    return Array.from(this.stopInfo.values());
  }

  getBusInfo(busId: number): Bus | undefined {
    return this.busInfo.get(busId);
  }

  getEdges(stopId: number): GraphEdge[] {
    return this.adjacency.get(stopId) || [];
  }

  getAllStopIds(): number[] {
    return Array.from(this.adjacency.keys());
  }

  async build(): Promise<void> {
    if (this.built) return;

    const [stopDetails, buses, busStops] = await Promise.all([
      queryStopDetails(),
      queryBuses(),
      queryBusStops(),
    ]);

    // Index stop details
    for (const stop of stopDetails) {
      this.stopInfo.set(stop.id, stop);
    }

    // Index buses
    for (const bus of buses) {
      this.busInfo.set(bus.id, bus);
    }

    // Group bus_stops by (bus_id, direction_type_id)
    const groupedStops = new Map<string, BusStop[]>();
    for (const bs of busStops) {
      const key = `${bs.bus_id}:${bs.direction_type_id}`;
      if (!groupedStops.has(key)) {
        groupedStops.set(key, []);
      }
      groupedStops.get(key)!.push(bs);
    }

    // Build edges from consecutive stops
    for (const [key, stops] of groupedStops.entries()) {
      const busId = parseInt(key.split(":")[0]);
      const bus = this.busInfo.get(busId);
      if (!bus) continue;

      // Sort by bus_stop_id (ordinal position)
      stops.sort((a, b) => a.bus_stop_id - b.bus_stop_id);

      // Estimate per-segment time
      const segmentCount = Math.max(stops.length - 1, 1);
      const segmentTime = (bus.duration_minuts || 30) / segmentCount;

      for (let i = 0; i < stops.length - 1; i++) {
        const fromStop = stops[i];
        const toStop = stops[i + 1];

        const fromCoords = this.stopInfo.get(fromStop.stop_id);
        const toCoords = this.stopInfo.get(toStop.stop_id);

        if (!fromCoords || !toCoords) continue;

        const distance = haversine(
          fromCoords.latitude,
          fromCoords.longitude,
          toCoords.latitude,
          toCoords.longitude
        );

        const edge: GraphEdge = {
          toStopId: toStop.stop_id,
          busId: bus.id,
          busNumber: bus.number,
          distance,
          time: segmentTime,
          fromStopName: fromStop.stop_name,
          toStopName: toStop.stop_name,
        };

        if (!this.adjacency.has(fromStop.stop_id)) {
          this.adjacency.set(fromStop.stop_id, []);
        }
        this.adjacency.get(fromStop.stop_id)!.push(edge);
      }
    }

    // Ensure all stops have an entry in the adjacency list
    for (const stop of stopDetails) {
      if (!this.adjacency.has(stop.id)) {
        this.adjacency.set(stop.id, []);
      }
    }

    this.built = true;
    console.log(
      `Graph built: ${this.adjacency.size} nodes, ${
        Array.from(this.adjacency.values()).reduce((sum, edges) => sum + edges.length, 0)
      } edges`
    );
  }
}

// Singleton instance cached at module level
let graphInstance: TransitGraph | null = null;

export async function getGraph(): Promise<TransitGraph> {
  if (!graphInstance) {
    graphInstance = new TransitGraph();
    await graphInstance.build();
  }
  return graphInstance;
}
