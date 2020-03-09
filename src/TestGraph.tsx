import * as React from 'react';
import * as d3 from 'd3';

export default class TestGraph extends React.Component {
    constructor(props: any) {
        super(props);
    }

    ref: SVGSVGElement = SVGSVGElement.prototype;

    width = 200;
    height = 200;

    componentDidMount(): void {
        d3.select(this.ref)
            .append("circle")
            .attr("r", 50)
            .attr("cx", this.width / 2)
            .attr("cy", this.height / 2)
            .attr("fill", "red");
    }

    render() {
        const lines: Line[] = [
            {
                source: {
                    x: 1,
                    y: 1
                },
                sink: {
                    x: 500,
                    y: 300
                }
            }
        ];

        return (
            <svg className="container" ref={(ref: SVGSVGElement) => this.ref = ref}
                 width={this.width} height={this.height}>
                <LinesC lines={lines} />
            </svg>
        );
    }
}

interface Point {
    x: number,
    y: number
}

interface Line {
    source: Point,
    sink: Point
}

export class LinesC extends React.Component<{lines: Line[]}, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const childLines: React.ReactNode[] = this.props.lines.map((line: Line, index: number) => {
            return <LineC line={line} key={index}/>;
        });

        return (
            <g className={"lines"}>
                {childLines}
            </g>
        );
    }
}

class LineC extends React.Component<{line: Line}, {}> {
    constructor(props: any) {
        super(props);
    }

    ref: SVGSVGElement = SVGSVGElement.prototype;

    componentDidMount() {
        const asLine: string | null = d3.line()([[this.props.line.source.x, this.props.line.source.y], [this.props.line.sink.x, this.props.line.sink.y]]) as string;

        d3.select(this.ref)
            .append("path")
            .attr("stroke", "black")
            .attr("d", asLine)
    }

    render() {
        return <svg width={200} height={200} className={"link"} ref={(ref: SVGSVGElement) => this.ref = ref}/>;
    }
}