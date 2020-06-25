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
import {DescriptiveNode} from "./DescriptiveNode";
import {prepareRenderingProps} from "./GraphRendering";
import {SubGraphC, SubgraphProps} from "./SubGraphC";
import {CookieStorage} from "cookie-storage";

interface State {
    nodes: CsvNode[],
    links: CsvLink[],
    selectedComposer: string | null,
    composerObject: CsvNode | null,
    metadata: {[id: string]: Metadata},
    subgraphProps: SubgraphProps | null
}

export class GraphC extends React.Component<{}, State> {
    constructor(p: any) {
        super(p);
        this.state = {
            nodes: [],
            links: [],
            metadata: {},
            selectedComposer: null,
            composerObject: null,
            subgraphProps: null
        }
    }

    ref: SVGSVGElement = SVGSVGElement.prototype;

    gWidth = 1500;
    gHeight = 1000;

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

    async fetchWikipediaResults(composerName: string): Promise<string> {
        const result = await axios
            .get(`https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&list=search&utf8=1&srsearch=${composerName} composer&srprop&srqiprofile=classic&srlimit=1`, { method: "GET"});

        const pageId = result.data.query.search[0].pageid as number;

        const composerSummary = await axios
            .get(`https://en.wikipedia.org/w/api.php?origin=*&format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&pageids=${pageId}`);

        return composerSummary.data.query.pages[pageId.toString()].extract as string;
    }

    async getComposerSummary(composerName: string): Promise<string> {
        try {
            return await this.fetchWikipediaResults(composerName);
        } catch (e) {
            return "";
        }
    }

    initializeGraphState(nodes: CsvNode[], links: CsvLink[], metadata: {[id: string]: Metadata}): void {
        const rp = prepareRenderingProps({
            width: this.gWidth,
            nodes: nodes,
            metadata: metadata,
            links: links,
            height: this.gHeight
        });

        const redFromD = (d: DescriptiveNode) => (Math.log(d.children)) / Math.log(rp.maxChildren) * 255;

        const linkForce = d3.forceLink(rp.describedLinks)
            .id((n) => {
                return (n as {id : string}).id;
            }).distance(d => 200).strength(d => 0.5);

        const genRadius = (d: DescriptiveNode) => Math.log(d.children) * 3 + 4;

        const sim = d3.forceSimulation()
            .nodes(rp.describedNodes)
            //.force("charge_force", d3.forceManyBody())
            .force("center_force", d3.forceCenter(rp.width / 2, rp.height / 2))
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
            .data(rp.describedLinks)
            .enter().append("line")
            .attr("stroke-width", 2)
            .attr("stroke", "black")
            .attr("x1", d => rp.xOffset((d.source as any)["id"] as string))
            .attr("x2", d => rp.xOffset((d.target as any)["id"] as string));

        const ns = d3.select(this.ref)
            .append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(rp.describedNodes)
            .enter()
            .append("circle")
            .attr("r", c => genRadius(c))
            .attr("fill", d => `rgb(${redFromD(d)}, 0, ${255 - redFromD(d)})`)
            .attr("cx", d => rp.xOffset(d.id))
            .call(dragI)
            .on("click", (x) => {
                this.getComposerSummary(x.composerName).then((composerSummary) => {
                    this.setState({selectedComposer: composerSummary, composerObject: nodes.find(d => d.id == x.id) as CsvNode, metadata: metadata})
                });
            });

        ns.append("title")
            .text(x => x.composerName);

        sim.on("tick", () => {
            ns
                //.attr("cx", d => getXOffset(d.id))
                .attr("cy", d => rp.yBound(d.y as number));

            ls
                //.attr("x1", d => getXOffset((d.source as any)["id"] as string))
                .attr("y1", d => rp.yBound((d.source as SimulationNodeDatum).y as number))
                //.attr("x2", d => getXOffset((d.target as any)["id"] as string))
                .attr("y2", d => rp.yBound((d.target as SimulationNodeDatum).y as number));
        });

        this.setState({
            links: links,
            nodes: nodes,
            metadata: metadata
        });
    }

    async componentDidMount() {
        const nodes: CsvNode[] = await this.getNodes();
        const links: CsvLink[] = await this.getLinks();
        const metadata: {[id: string]: Metadata} = await this.getFiltered();

        this.initializeGraphState(nodes, links, metadata);
    }

    private async prepSubgraph(centerComposer: CsvNode, extraNodes: CsvNode[]) {
        const cs = new CookieStorage();
        cs.setItem("current_node_id", centerComposer.id);

        const nodeLookup: Map<string, CsvNode> = new Map(this.state.nodes.map((n: CsvNode) => [n.id, n]));

        // Find all immediate neighbours
        const neighbours = this.state.links.flatMap((n) => {
            if (n.source === centerComposer.id) {
                return Array.of<CsvNode>(nodeLookup.get(n.sink) as CsvNode);
            } else if (n.sink === centerComposer.id) {
                return Array.of<CsvNode>(nodeLookup.get(n.source) as CsvNode);
            } else {
                return Array.of<CsvNode>();
            }
        })
            .concat(extraNodes).concat(centerComposer)
            .filter((item, i, ar) => ar.indexOf(item) === i);

        const subgraphProps: SubgraphProps = {
            center: centerComposer,
            subgraphNodes: neighbours,
            links: this.state.links,
            metadata: this.state.metadata,
            rebuild: async (newCenter, extra) => await this.prepSubgraph(newCenter, extra),
            setComposer: async (d: DescriptiveNode) => {
                await this.getComposerSummary(d.composerName).then(async (composerSummary) => {
                    await this.setState({selectedComposer: composerSummary, composerObject: this.state.nodes.find(x => x.id == d.id) as CsvNode});
                });
            }
        };

        await this.setState({
            subgraphProps: null
        });
        await this.setState({
           subgraphProps: subgraphProps
        });
    };

    renderSelectedComposer() {
        if (this.state.composerObject === null) {
            return null;
        } else {
            const composer: CsvNode = this.state.composerObject;

            return (<div>
                <ComposerDisplay node={composer} composerSummary={this.state.selectedComposer} realName={this.state.composerObject.name} /><br/>
                <button type={"button"} onClick={async (e) => await this.prepSubgraph(composer, [])}>Open subgraph</button>
                <button type={"button"} onClick={async (e) => {
                    return await this.setState({composerObject: null, selectedComposer: null})
                }}>Close summary</button>
            </div>);
        }
    }

    private renderThis() {
        return (<svg className="container" ref={(ref: SVGSVGElement) => this.ref = ref}
                     width={this.gWidth} height={this.gHeight}>
        </svg>);
    }

    private renderSubgraph(p: SubgraphProps) {
        return (<SubGraphC
            center={p.center}
            subgraphNodes={p.subgraphNodes}
            setComposer={p.setComposer}
            rebuild={p.rebuild}
            links={p.links}
            metadata={p.metadata} />);
    }

    private conditionallyRender() {
        if (this.state.subgraphProps === null) {
            return this.renderThis();
        } else {
            return (<div>
                <button type={"button"} onClick={async (e) => {
                    const cs = new CookieStorage();
                    cs.removeItem("current_node_id");
                    await this.setState({subgraphProps: null});
                    await this.initializeGraphState(this.state.nodes, this.state.links, this.state.metadata);
                }}>Back</button><br/>
                {this.renderSubgraph(this.state.subgraphProps)}
            </div>);
        }
    }

    render() {
        return (
            <div>
                {this.renderSelectedComposer()}
                {this.conditionallyRender()}
            </div>
        )
    }
}