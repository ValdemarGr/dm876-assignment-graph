import React from 'react';
import {CsvLink, CsvNode, Metadata} from "./CsvTypes";
import csv from 'csv-parse';
import axios from 'axios';
import * as d3 from "d3";
import {SimulationLinkDatum, SimulationNodeDatum} from "d3-force";
import {DragBehavior} from 'd3-drag';
import {Simulate} from "react-dom/test-utils";
import ComposerDisplay from "./ComposerDisplay";
import drag = Simulate.drag;

interface State {
    nodes: CsvNode[],
    links: CsvLink[],
    selectedComposer: string | null,
    composerObject: CsvNode | null,
    metadata: {[id: string]: Metadata}
}

export class GraphC extends React.Component<{}, State> {
    constructor(p: any) {
        super(p);
        this.state = {
            nodes: [],
            links: [],
            metadata: {},
            selectedComposer: null,
            composerObject: null
        }
    }

    ref: SVGSVGElement = SVGSVGElement.prototype;

    async getFiltered(): Promise<{[id: string]: Metadata}> {
        const d = await axios.get("filtered.json");

        return d.data;
    }

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

    async getComposerSummary(composerName: string): Promise<string> {
        const result = await axios
            .get(`https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&list=search&utf8=1&srsearch=${composerName} composer&srprop&srqiprofile=classic&srlimit=1`, { method: "GET"});

        const pageId = result.data.query.search[0].pageid as number;

        const composerSummary = await axios
            .get(`https://en.wikipedia.org/w/api.php?origin=*&format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&pageids=${pageId}`);

        return composerSummary.data.query.pages[pageId.toString()].extract as string;
    }

    const parseMetadataDate = (metadata: Metadata) => {
        const pd = (new Date(metadata.born)).getFullYear();

        if (isNaN(pd)) {
            const regexp = /\d+/;
            const firstMatch = (metadata.born.match(regexp) as RegExpMatchArray)[0];

            return +firstMatch;
        }

        return pd;
    };

    async initializeGraphState(): Promise<void> {
        const nodes: CsvNode[] = await this.getNodes();
        const links: CsvLink[] = await this.getLinks();
        const metadata: {[id: string]: Metadata} = await this.getFiltered();

        const dates = nodes.map(n => this.parseMetadataDate(metadata[n.id]));

        const min = Math.min(...dates);
        const max = Math.max(...dates);
        const boundedMax = max - min;

        const maxChildren = Math.max(...nodes.map(n => n.children));

        //const sigmoid = (x: number) => Math.pow(Math.E, x) / (Math.pow(Math.E, x) + 1);

        const redFromD = (d: DescriptiveNode) => {
            //const normalized = d.children - (maxChildren / 2);

            //return sigmoid(normalized) * 255;

            return (Math.log(d.children)) / Math.log(maxChildren) * 255;
        };

        const getXOffset = (nodeId: string) => {
            try {
                return (this.parseMetadataDate(metadata[nodeId]) - min) / boundedMax * 1800;
            } catch (e) {
                return 0;
            }
        };

        const boundY = (n: number) => {
            if (n > 1750) {
                return 1750;
            } else if (n < 50) {
                return 50;
            } else {
                return n;
            }
        };

        interface DescriptiveNode extends SimulationNodeDatum {
            id: string,
            children: number,
            composerName: string
        }

        const d3Nodes: DescriptiveNode[] = nodes.map((value, index) => {
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

        const d3Links: SimulationLinkDatum<DescriptiveNode>[] = links.flatMap((value) => {
            const source: CsvNode | undefined = nodes.find((node) => node.id == value.source);
            const sink: CsvNode | undefined = nodes.find((node) => node.id == value.sink);

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


        const linkForce = d3.forceLink(d3Links)
            .id((n) => {
                return (n as {id : string}).id;
            }).distance(d => 400).strength(d => 0.5);

        const genRadius = (d: DescriptiveNode) => Math.log(d.children) * 5 + 4;

        const sim = d3.forceSimulation()
            .nodes(d3Nodes)
            //.force("charge_force", d3.forceManyBody())
            .force("center_force", d3.forceCenter(1800 / 2, 1800 / 2))
            .force("links", linkForce);

        const dragEE = (d: unknown) => {
            if (!d3.event.active) {
                sim.alphaTarget(0);
            }
            const asN = d as {fx : number, fy: number, x: number, y: number};
            asN.fx = asN.x;
            asN.fy = asN.y;
        };

        const dragSE = (d: unknown) => {
            if (!d3.event.active) {
                sim.alphaTarget(0.3).restart();
            }
            const asN = d as {fx : number, fy: number, x: number, y: number};
            asN.fx = asN.x;
            asN.fy = asN.y;
        };

        const dragDE = (d: unknown) => {
            const asN = d as {fx : number, fy: number};
            asN.fx = d3.event.x;
            asN.fy = d3.event.y;
        };

        const dragU = d3.drag()
            .on("start", dragSE)
            .on("drag", dragDE)
            .on("end", dragEE);

        const dragI = dragU as any as DragBehavior<SVGCircleElement, DescriptiveNode, unknown>;

        const ls =  d3.select(this.ref)
            .append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(d3Links)
            .enter().append("line")
            .attr("stroke-width", 2)
            .attr("stroke", "black")
            .attr("x1", d => getXOffset((d.source as any)["id"] as string))
            .attr("x2", d => getXOffset((d.target as any)["id"] as string));

        const ns = d3.select(this.ref)
            .append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(d3Nodes)
            .enter()
            .append("circle")
            .attr("r", c => genRadius(c))
            .attr("fill", d => `rgb(${redFromD(d)}, 0, ${255 - redFromD(d)})`)
            .attr("cx", d => getXOffset(d.id))
            .call(dragI)
            .on("click", (x) => {
                this.getComposerSummary(x.composerName).then((composerSummary) => {
                    this.setState({selectedComposer: composerSummary, composerObject: nodes.find(d => d.id == x.id) as CsvNode, metadata: metadata})
                })
            });

        ns.append("title")
            .text(x => x.composerName);

        sim.on("tick", () => {
            ns
                //.attr("cx", d => getXOffset(d.id))
                .attr("cy", d => boundY(d.y as number));

            ls
                //.attr("x1", d => getXOffset((d.source as any)["id"] as string))
                .attr("y1", d => boundY((d.source as SimulationNodeDatum).y as number))
                //.attr("x2", d => getXOffset((d.target as any)["id"] as string))
                .attr("y2", d => boundY((d.target as SimulationNodeDatum).y as number));
        });
    }

    private showSubGraph(co: CsvNode) {
        // Get all related edges
        const asSource = this.state.links.filter(l => l.source == co.id).map(l => l.sink);
        const asSink = this.state.links.filter(l => l.sink == co.id).map(l => l.source);

        const allDates: number[] = asSource.concat(asSink).concat(co.id).map(l => this.parseMetadataDate(this.state.metadata[l]));

        const min = Math.min(...allDates);
        const max = Math.min(...allDates);
        const boundedMax = max - min;



        return undefined;
    }

    async componentDidMount() {
        await this.initializeGraphState();
    }

    renderSelectedComposer() {
        if (this.state.composerObject === null) {
            return null;
        } else {
            return (<div>
                <ComposerDisplay composerSummary={this.state.selectedComposer} realName={this.state.composerObject.name} /><br/>
                <button type={"button"} onClick={this.showSubGraph(this.state.composerObject)}>Click me</button>
            </div>);
        }
    }

    render() {
        return (
            <div>
                {this.renderSelectedComposer()}
                <svg className="container" ref={(ref: SVGSVGElement) => this.ref = ref}
                     width={1800} height={1800}>
                </svg>
            </div>
        )
    }
}