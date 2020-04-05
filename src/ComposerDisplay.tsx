import React from 'react';
import axios from 'axios';

interface ComposerDisplayProps {
    composerSummary: string
}

export default class ComposerDisplay extends React.Component<ComposerDisplayProps, {}> {
    constructor(props: any) {
        super(props);

        this.state = {
          composerSummary: null
        };
    }

    render() {
        return (
            <div>
                <h1>Summary</h1><br/>
                <p>{this.props.composerSummary}</p>
            </div>
        );
    }
}