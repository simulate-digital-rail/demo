from enum import Enum, auto
from math import atan, pi

from yaramo.base_element import BaseElement
from yaramo.edge import Edge as YaramoEdge
from yaramo.geo_node import GeoNode
from yaramo.node import Node as YaramoNode
from yaramo.signal import Signal as YaramoSignal, SignalKind, SignalDirection
from yaramo.track import TrackType

ANGLE_IN_UP = 90 - (atan(2.0) * 180 / pi)
ANGLE_IN_DOWN = 90 + (atan(2.0) * 180 / pi)
ANGLE_GEGEN_UP = 270 + (atan(2.0) * 180 / pi)
ANGLE_GEGEN_DOWN = 270 - (atan(2.0) * 180 / pi)

class NodeType(Enum):
    Point = auto()
    Endpoint = auto()
    Breakpoint = auto()
    Signal = auto()


class SchematicOverviewPoint(BaseElement):
    def __init__(self, yaramo_node: YaramoNode):
        super().__init__(yaramo_node.uuid.upper(), yaramo_node.name)
        self.x: float = yaramo_node.geo_node.x
        self.y: float = yaramo_node.geo_node.y
        self.type: str = str(NodeType.Point) if yaramo_node.is_point() else str(NodeType.Endpoint)


class SchematicOverviewBreakpoint(BaseElement):
    def __init__(self, yaramo_geo_node: GeoNode):
        super().__init__(yaramo_geo_node.uuid.upper(), "")
        self.x: float = yaramo_geo_node.x
        self.y: float = yaramo_geo_node.y
        self.type: str = str(NodeType.Breakpoint)


class SchematicOverviewEdge(BaseElement):
    def __init__(self, yaramo_edge: YaramoEdge):
        super().__init__(yaramo_edge.uuid.upper(), yaramo_edge.name)
        self.source: str = yaramo_edge.node_a.uuid.upper()
        self.target: str = yaramo_edge.node_b.uuid.upper()
        self.type: TrackType = None


class SchematicOverviewSignal(BaseElement):
    def __init__(self, yaramo_edge: YaramoEdge, yaramo_signal: YaramoSignal):
        super().__init__(yaramo_signal.uuid.upper(), yaramo_signal.name)
        self.x: float = self.init_x(yaramo_edge, yaramo_signal)
        self.y: float = self.init_y(yaramo_edge, yaramo_signal)
        self.direction: str = str(self.init_direction(yaramo_edge, yaramo_signal))
        self.angle: float = self.init_angle(yaramo_edge)
        self.special_signal: bool = yaramo_signal.kind == SignalKind.Sperrsignal
        self.type: str = str(NodeType.Signal)

    def get_left_node(self, yaramo_edge: YaramoEdge) -> YaramoNode:
        if (yaramo_edge.node_a.geo_node.x, yaramo_edge.node_a.geo_node.y) \
           < (yaramo_edge.node_b.geo_node.x, yaramo_edge.node_b.geo_node.y):
            return yaramo_edge.node_a
        if (yaramo_edge.node_a.geo_node.x, yaramo_edge.node_a.geo_node.y) \
           > (yaramo_edge.node_b.geo_node.x, yaramo_edge.node_b.geo_node.y):
            return yaramo_edge.node_b
        raise ValueError("Detected edge with length 0.")

    def get_right_node(self, yaramo_edge: YaramoEdge) -> YaramoNode:
        return yaramo_edge.get_opposite_node(self.get_left_node(yaramo_edge))

    def init_x(self, yaramo_edge: YaramoEdge, yaramo_signal: YaramoSignal) -> None:
        if self.get_left_node(yaramo_edge) == yaramo_edge.node_a:
            return yaramo_edge.node_a.geo_node.x + yaramo_signal.distance_edge
        if self.get_left_node(yaramo_edge) == yaramo_edge.node_b:
            return yaramo_edge.node_a.geo_node.x - yaramo_signal.distance_edge

    def init_y(self, yaramo_edge: YaramoEdge, yaramo_signal: YaramoSignal) -> None:
        if yaramo_edge.node_a.geo_node.y == yaramo_edge.node_b.geo_node.y:
            return yaramo_edge.node_a.geo_node.y
        if len(yaramo_edge.intermediate_geo_nodes) == 0:
            return yaramo_edge.node_a.geo_node.y + yaramo_signal.distance_edge
        if len(yaramo_edge.intermediate_geo_nodes) == 1:
            return yaramo_edge.intermediate_geo_nodes[0].y
        raise ValueError("Detected node with more than one intermediate_geo_node.")

    def init_direction(self, yaramo_edge: YaramoEdge, yaramo_signal: YaramoSignal):
        if self.get_left_node(yaramo_edge) == yaramo_edge.node_a:
            if yaramo_signal.direction == SignalDirection.IN:
                return SignalDirection.IN
            return SignalDirection.GEGEN
        if self.get_left_node(yaramo_edge) == yaramo_edge.node_b:
            if yaramo_signal.direction == SignalDirection.IN:
                return SignalDirection.GEGEN
            return SignalDirection.IN

    def init_angle(self, yaramo_edge: YaramoEdge):
        edge_is_horizontal = yaramo_edge.node_a.geo_node.y == yaramo_edge.node_b.geo_node.y
        if edge_is_horizontal or yaramo_edge.intermediate_geo_nodes:
            return 90 if self.direction == "in" else -90
        else:
            ax, bx = yaramo_edge.node_a.geo_node.x, yaramo_edge.node_b.geo_node.x
            ay, by = yaramo_edge.node_a.geo_node.y, yaramo_edge.node_b.geo_node.y
            if (ay - by) / (ax - bx) > 0:
                return ANGLE_IN_DOWN if self.direction == "in" else ANGLE_GEGEN_UP
            else:
                return ANGLE_IN_UP if self.direction == "in" else ANGLE_GEGEN_DOWN
