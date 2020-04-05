import React from 'react';
import {CsvLink, CsvNode} from "./CsvTypes";
import csv from 'csv-parse';
import axios from 'axios';
import * as d3 from "d3";
import {LinesC} from "./TestGraph";
import {SimulationNodeDatum, SimulationLinkDatum} from "d3-force";

interface State {
    nodes: CsvNode[],
    links: CsvLink[]
}

export class GraphC extends React.Component<{}, State> {
    constructor(p: any) {
        super(p);
        this.state = {
            nodes: [],
            links: []
        }
    }

    ref: SVGSVGElement = SVGSVGElement.prototype;

    async getLinks(): Promise<CsvLink[]> {
        const source = 0;
        const sink = 1;

        const d = await axios.get("links.csv");

        const parser = csv(d.data, { delimiter: ';' });

        const linkAccumulator: CsvLink[] = [];

        parser
            .on('data', (chunk) => {
                const sourceData: string = chunk[source];
                const sinkData: string = chunk[sink];

                linkAccumulator.push({
                    sink: sinkData,
                    source: sourceData
                })
            });

        await (new Promise(resolve => setTimeout(resolve, 1000)));

        return linkAccumulator;
    };

    async getNodes(): Promise<CsvNode[]> {
        const id = 0;
        const name = 1;
        const children = 2;

        const d = await axios.get("nodes.csv");

        const parser = csv(d.data, { delimiter: ';' });

        const nodeAccumulator: CsvNode[] = [];

        parser
            .on('data', (chunk) => {
                const idData: string = chunk[id];
                const nameData: string = chunk[name];
                const childrenData: number = chunk[children];

                nodeAccumulator.push({
                    id: idData,
                    name: nameData,
                    children: childrenData
                })
            });

        await (new Promise(resolve => setTimeout(resolve, 1000)));

        return nodeAccumulator;
    };

    async initializeGraphState(): Promise<void> {
        const nodes: CsvNode[] = await this.getNodes();
        const links: CsvLink[] = await this.getLinks();

        interface DescriptiveNode extends SimulationNodeDatum {
            id: string
        }

        const d3Nodes: DescriptiveNode[] = nodes.map((value, index) => {
          const x = value.id.substr(1);
          const asInt: number = +x;

          const asSimNode: DescriptiveNode = {
              id: value.id,
              x: asInt * 0.8 + 100 / 2,
              y: index * 2 + 2 + 100 / 2
          };

          return asSimNode;
        });

        const d3Links: SimulationLinkDatum<DescriptiveNode>[] = links.flatMap((value) => {
            const source: CsvNode | undefined = nodes.find((node) => node.id == value.source);
            const sink: CsvNode | undefined = nodes.find((node) => node.id == value.sink);

            if (source && sink) {
                const sourceIndex: number = nodes.indexOf(source);
                const sinkIndex: number = nodes.indexOf(sink);

                const sourceY = sourceIndex * 2 + 2 + 100 / 2;
                const sinkY = sinkIndex * 2 + 2 + 100 / 2;

                const sourceX = +(source.id.substr(1)) * 0.8 + 100 / 2;
                const sinkX = +(sink.id.substr(1)) * 0.8 + 100 / 2;

                const sourceAsSimNode: DescriptiveNode = {
                    id: source.id,
                    x: sourceX,
                    y: sourceY
                };

                const sinkAsSimNode: DescriptiveNode = {
                    id: sink.id,
                    x: sinkX,
                    y: sinkY
                };

                const asSimTuple: SimulationLinkDatum<DescriptiveNode> = {
                    source: sourceAsSimNode,
                    target: sinkAsSimNode
                };

                const o: SimulationLinkDatum<DescriptiveNode> = {
                    source: source.id,
                    target: sink.id
                };

                return Array.of<SimulationLinkDatum<DescriptiveNode>>(o);
            } else {
                return Array.of<SimulationLinkDatum<DescriptiveNode>>();
            }
        });

        const ns = d3.select(this.ref)
            .append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(d3Nodes)
            .enter()
            .append("circle")
            .attr("r", 5)
            .attr("fill", "blue");

        const ls =  d3.select(this.ref)
            .append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(d3Links)
            .enter().append("line")
            .attr("stroke-width", 2)
            .attr("stroke", "black");

        const linkForce = d3.forceLink(d3Links)
            .id((n) => {
                return (n as {id : string}).id;
            });

        const sim = d3.forceSimulation()
            .nodes(d3Nodes)
            .force("charge_force", d3.forceManyBody())
            .force("center_force", d3.forceCenter(1800 / 2, 1800 / 2))
            .force("links", linkForce)
            .on("tick", () => {
                ns
                    .attr("cx", d => d.x as number)
                    .attr("cy", d => d.y as number);

                ls
                    .attr("x1", d => (d.source as SimulationNodeDatum).x as number)
                    .attr("y1", d => (d.source as SimulationNodeDatum).y as number)
                    .attr("x2", d => (d.target as SimulationNodeDatum).x as number)
                    .attr("y2", d => (d.target as SimulationNodeDatum).y as number);
            });



    }

    async componentDidMount() {
        await this.initializeGraphState();
    }

    render() {
        return (
            <svg className="container" ref={(ref: SVGSVGElement) => this.ref = ref}
                 width={1800} height={1800}>
            </svg>
        )
    }
}