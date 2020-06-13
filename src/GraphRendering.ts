import {DescriptiveNode} from "./DescriptiveNode";
import {SimulationLinkDatum} from "d3-force";
import {CsvLink, CsvNode, Metadata} from "./CsvTypes";

type MetadataMap =  {[id: string]: Metadata};

export interface RenderingProps {
    nodes: CsvNode[],
    links: CsvLink[],
    metadata: MetadataMap,
    min: number,
    max: number,
    boundedMax: number,
    maxChildren: number,
    xOffset: (n: string) => number,
    yBound: (n: number) => number,
    describedNodes: DescriptiveNode[],
    describedLinks: SimulationLinkDatum<DescriptiveNode>[],
    width: number,
    height: number
}

export interface PrepareProps {
    nodes: CsvNode[],
    links: CsvLink[],
    metadata: MetadataMap,
    width: number,
    height: number
}

function parseMetadataDate(metadata: Metadata): number {
    const pd = (new Date(metadata.born)).getFullYear();

    if (isNaN(pd)) {
        const regexp = /\d+/;
        const firstMatch = (metadata.born.match(regexp) as RegExpMatchArray)[0];

        return +firstMatch;
    }

    return pd;
}

function getXOffsetF(min: number, boundedMax: number, metadata: MetadataMap, width: number): (nodeId: string) => number {
    return (nodeId: string) => {
        try {
            return (parseMetadataDate(metadata[nodeId]) - min) / boundedMax * (width - 100) + 50;
        } catch (e) {
            return 0;
        }
    };
}

function boundYF(bound: number): (n: number) => number {
    return (n: number) => {
        if (n > bound - 50) {
            return bound;
        } else if (n < 50) {
            return 50;
        } else {
            return n;
        }
    };
}

export function prepareRenderingProps(p: PrepareProps): RenderingProps {
    const dates = p.nodes.map(n => parseMetadataDate(p.metadata[n.id]));

    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const boundedMax = max - min;

    const maxChildren = Math.max(...p.nodes.map(n => n.children));

    const getXOffset: (nodeId: string) => number = getXOffsetF(min, boundedMax, p.metadata, p.width);
    const boundY: (n: number) => number = boundYF(p.height);

    const d3Nodes: DescriptiveNode[] = p.nodes.map((value, index) => {
        const x = value.id.substr(1);
        const asInt: number = +x;

        const asSimNode: DescriptiveNode = {
            id: value.id,
            x: asInt * 0.8 + 100 / 2,
            y: index * 2 + 2 + 100 / 2,
            children: value.children,
            composerName: value.name
        };

        return asSimNode;
    });

    const nodeLookup: Map<string, CsvNode> = new Map(p.nodes.map((n: CsvNode) => [n.id, n]));

    const d3Links: SimulationLinkDatum<DescriptiveNode>[] = p.links.flatMap((value) => {
        const source: CsvNode | undefined = nodeLookup.get(value.source);
        const sink: CsvNode | undefined = nodeLookup.get(value.sink);

        if (source && sink) {
            const o: SimulationLinkDatum<DescriptiveNode> = {
                source: source.id,
                target: sink.id
            };

            return Array.of<SimulationLinkDatum<DescriptiveNode>>(o);
        } else {
            return Array.of<SimulationLinkDatum<DescriptiveNode>>();
        }
    });

    return {
        boundedMax: boundedMax,
        describedLinks: d3Links,
        describedNodes: d3Nodes,
        height: p.height,
        links: p.links,
        max: max,
        maxChildren: maxChildren,
        metadata: p.metadata,
        min: min,
        nodes: p.nodes,
        width: p.width,
        xOffset: getXOffset,
        yBound: boundY
    };
};
