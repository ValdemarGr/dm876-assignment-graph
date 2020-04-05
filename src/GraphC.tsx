import React from 'react';
import {CsvLink, CsvNode} from "./CsvTypes";
import csv from 'csv-parse';
import axios from 'axios';
import * as d3 from "d3";
import {LinesC} from "./TestGraph";

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

        interface NodeDraw {
            x: number,
            y: number
        }

        interface LineDraw {
            x1: number,
            y1: number,
            x2: number,
            y2: number
        }

        const d3Nodes = nodes.map((value, index) => {
          const x = value.id.substr(1);
          const asInt: number = +x;
          const asNd: NodeDraw = {
              x: asInt * 0.8 + 100 / 2,
              y: index * 2 + 2 + 100 / 2
          };

          const n = d3.select(this.ref)
              .append("circle")
              .attr("r", value.children * 0.5)
              .attr("fill", "blue")
              .data([asNd])
              .attr("cx", v => v.x)
              .attr("cy", v => v.y);

          n.append("title")
            .text(value.name);

          return n;
        });

        const d3Links = links.map((value) => {
            const source: CsvNode | undefined = nodes.find((node) => node.id == value.source);
            const sink: CsvNode | undefined = nodes.find((node) => node.id == value.sink);

            if (source && sink) {
                const sourceIndex: number = nodes.indexOf(source);
                const sinkIndex: number = nodes.indexOf(sink);

                const sourceY = sourceIndex * 2 + 2 + 100 / 2;
                const sinkY = sinkIndex * 2 + 2 + 100 / 2;

                const sourceX = +(source.id.substr(1)) * 0.8 + 100 / 2;
                const sinkX = +(sink.id.substr(1)) * 0.8 + 100 / 2;

                const asLine: string | null = d3.line()([
                    [sourceX, sourceY],
                    [sinkX, sinkY]
                ]) as string;

                const asLD: LineDraw = {
                  x1: sourceX,
                  y1: sourceY,
                  x2: sinkX,
                  y2: sinkY
                };

                return d3.select(this.ref)
                    .append("path")
                    .attr("stroke", "black")
                    .data([asLD])
                    .attr("d", d => d3.line()([[d.x1, d.y1], [d.x2, d.y2]]));
                    //.attr("d", asLine)
            }
        });


        const sim = d3.forceSimulation()
            .force("link", d3.forceLink());

        sim
            .force("charge_force", d3.forceManyBody())
            .force("center_force", d3.forceCenter(1800 / 2, 1800 / 2));


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