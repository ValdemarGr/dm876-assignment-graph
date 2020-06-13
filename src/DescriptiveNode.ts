import {SimulationNodeDatum} from "d3-force";


export interface DescriptiveNode extends SimulationNodeDatum {
    id: string,
    children: number,
    composerName: string
}

