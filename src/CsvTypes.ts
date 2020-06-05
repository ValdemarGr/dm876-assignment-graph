
export interface CsvNode {
    id: string,
    name: string,
    children: number
}

export interface CsvLink {
    source: string,
    sink: string
}

export interface Metadata {
    id: string,
    born: string,
    died: string,
    name: string
}