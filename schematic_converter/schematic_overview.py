from copy import copy

from schematicconverter import convert
from yaramo.model import Topology as PlanProTopology

from .schematic_overview_elements import SchematicOverviewBreakpoint
from .schematic_overview_elements import SchematicOverviewEdge
from .schematic_overview_elements import SchematicOverviewPoint
from .schematic_overview_elements import SchematicOverviewSignal


class SchematicOverview:
    def __init__(self, topology: PlanProTopology, remove_non_ks_signals: bool = False):
        self.topology = convert(topology, remove_non_ks_signals=remove_non_ks_signals)
        self.breakpoints: list[SchematicOverviewBreakpoint] = []
        self.edges: list[SchematicOverviewEdge] = [
            SchematicOverviewEdge(edge)
            for edge in self.topology.edges.values()
        ]
        self.points: list[SchematicOverviewPoint] = [
            SchematicOverviewPoint(node)
            for node in self.topology.nodes.values()
        ]
        self.signals: list[SchematicOverviewSignal] = [
            SchematicOverviewSignal(edge, signal)
            for edge in self.topology.edges.values()
            for signal in edge.signals
        ]
        self.compute_track_types()
        self.compute_breakpoints()

    def get_point_by_uuid(self, uuid: str) -> SchematicOverviewPoint | None:
        for point in self.points:
            if point.uuid == uuid:
                return point
        return None

    def get_edge_by_node_uuids(self, uuid_a: str, uuid_b: str) -> SchematicOverviewEdge | None:
        for edge in self.edges:
            if {edge.source, edge.target} == {uuid_a, uuid_b}:
                return edge
        return None

    def compute_track_types(self) -> None:
        edge_dict: dict[str, SchematicOverviewEdge] = {edge.uuid: edge for edge in self.edges}
        for yaramo_track in self.topology.tracks.values():
            for yaramo_edge in yaramo_track.edges:
                if edge_dict[yaramo_edge.uuid].type is None or \
                   yaramo_track.track_type < edge_dict[yaramo_edge.uuid].type:
                    edge_dict[yaramo_edge.uuid].type = yaramo_track.track_type

    def compute_breakpoints(self) -> None:
        for yaramo_edge in self.topology.edges.values():
            if yaramo_edge.intermediate_geo_nodes:
                if len(yaramo_edge.intermediate_geo_nodes) != 1:
                    raise ValueError(f"Detected more than one intermediate node on edge {yaramo_edge.name}.")

                breakpoint = SchematicOverviewBreakpoint(yaramo_edge.intermediate_geo_nodes[0])
                first_edge = self.get_edge_by_node_uuids(yaramo_edge.node_a.uuid.upper(), yaramo_edge.node_b.uuid.upper())

                second_edge = copy(first_edge)
                first_edge.source = breakpoint.uuid
                second_edge.target = breakpoint.uuid

                if self.get_point_by_uuid(first_edge.target).y != breakpoint.y:
                    first_edge.uuid = ""
                if self.get_point_by_uuid(second_edge.source).y != breakpoint.y:
                    second_edge.uuid = ""

                self.edges.append(second_edge)
                self.breakpoints.append(breakpoint)


    @property
    def d3_graph(self) -> dict[str, list]:
        properties = {
            "max_x": max([node.x for node in self.points]),
            "max_y": max([node.y for node in self.points])
        }
        breakpoints = [breakpoint.__dict__ for breakpoint in self.breakpoints]
        edges = [edge.__dict__ for edge in self.edges]
        points = [node.__dict__ for node in self.points]
        signals = [signal.__dict__ for signal in self.signals]
        return {"properties": properties, "nodes": points + signals + breakpoints, "edges": edges}
