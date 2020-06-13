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
import {prepareRenderingProps} from "./GraphRendering";
import {DescriptiveNode} from "./DescriptiveNode";

export interface SubgraphProps {
    center: CsvNode,
    subgraphNodes: CsvNode[],
    links: CsvLink[],
    metadata: {[id: string]: Metadata},
    rebuild: (newCenter: CsvNode, oldNodes: CsvNode[]) => void,
    setComposer: (n: DescriptiveNode) => void
}

export class SubGraphC extends React.Component<SubgraphProps, {}> {
    constructor(p: SubgraphProps) {
        super(p);
    }

    gWidth = 1500;
    gHeight = 1000;
    ref: SVGSVGElement = SVGSVGElement.prototype;

    initializeGraphState() {
        const rp = prepareRenderingProps({
            width: this.gWidth,
            nodes: this.props.subgraphNodes,
            metadata: this.props.metadata,
            links: this.props.links,
            height: this.gHeight
        });

        const redFromD = (d: DescriptiveNode) => (Math.log(d.children)) / Math.log(rp.maxChildren) * 255;

        const linkForce = d3.forceLink(rp.describedLinks)
            .id((n) => {
                return (n as {id : string}).id;
            }).distance(d => 400).strength(d => 0.5);

        const genRadius = (d: DescriptiveNode) => Math.log(d.children) * 5 + 10;

        const sim = d3.forceSimulation()
            .nodes(rp.describedNodes)
            //.force("charge_force", d3.forceManyBody())
            .force("center_force", d3.forceCenter(this.gWidth / 2, this.gHeight / 2))
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
            .attr("fill", d => {
                if (d.id === this.props.center.id) {
                    return `rgb(0, 255, 0)`;
                } else {
                    return `rgb(${redFromD(d)}, 0, ${255 - redFromD(d)})`;
                }
            })
            .attr("cx", d => rp.xOffset(d.id))
            .call(dragI)
            .on("click", async (x) => {
                const thisNode: CsvNode = this.props.subgraphNodes.find((n) => n.id === x.id) as any as CsvNode;
                this.ref.remove();
                this.ref = SVGSVGElement.prototype;

                await this.props.rebuild(thisNode, this.props.subgraphNodes);
                await this.props.setComposer(x);
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
    }

    componentDidMount() {
        this.initializeGraphState();
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        return (<svg className="container" ref={(ref: SVGSVGElement) => this.ref = ref}
                     width={this.gWidth} height={this.gHeight}>
        </svg>);
    }
}