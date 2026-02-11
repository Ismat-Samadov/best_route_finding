import { NextRequest, NextResponse } from "next/server";
import { getGraph } from "@/lib/graph";
import { findRoutes } from "@/lib/routing";
import { OptimizationMode } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromStopId, toStopId, mode = "balanced" } = body;

    if (!fromStopId || !toStopId) {
      return NextResponse.json(
        { error: "fromStopId and toStopId are required" },
        { status: 400 }
      );
    }

    if (fromStopId === toStopId) {
      return NextResponse.json(
        { error: "Start and destination must be different stops" },
        { status: 400 }
      );
    }

    const validModes: OptimizationMode[] = ["shortest", "fastest", "balanced"];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${validModes.join(", ")}` },
        { status: 400 }
      );
    }

    const graph = await getGraph();

    const fromStop = graph.getStopInfo(fromStopId);
    const toStop = graph.getStopInfo(toStopId);

    if (!fromStop) {
      return NextResponse.json(
        { error: `Start stop ${fromStopId} not found` },
        { status: 404 }
      );
    }
    if (!toStop) {
      return NextResponse.json(
        { error: `Destination stop ${toStopId} not found` },
        { status: 404 }
      );
    }

    const routes = findRoutes(graph, fromStopId, toStopId, mode, 3);

    if (routes.length === 0) {
      return NextResponse.json(
        { error: "No route found between these stops" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      from: { id: fromStop.id, name: fromStop.name },
      to: { id: toStop.id, name: toStop.name },
      mode,
      routes,
    });
  } catch (error) {
    console.error("Route finding failed:", error);
    return NextResponse.json(
      { error: "Route computation failed" },
      { status: 500 }
    );
  }
}
