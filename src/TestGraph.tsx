import * as React from 'react';
import * as d3 from 'd3';
import getPrototypeOf = Reflect.getPrototypeOf;

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
        return (
            <svg className="container" ref={(ref: SVGSVGElement) => this.ref = ref}
                 width={this.width} height={this.height}>
            </svg>
        );
    }
}