import React from 'react';
import {CsvLink, CsvNode} from "./CsvTypes";
import csv from 'csv-parse';
import axios from 'axios';


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

    componentDidMount(): void {
        const source = 0;
        const sink = 1;

        const id = 0;
        const name = 1;
        const children = 2;

        axios
            .get("links.csv")
            .then((r) => {
                const parser = csv(r.data, { delimiter: ';' });

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

                this.setState({links: linkAccumulator})
            }).then(() => axios.get("nodes.csv")).then((r) => {
                const parser = csv(r.data, { delimiter: ';' });

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

                this.setState({nodes: nodeAccumulator})
            });


    }

    render() {
        return (
            <div/>
        )
    }
}