import * as React from 'react';
import { Intent } from '@blueprintjs/core';

interface IProps {
    intent?: Intent;
    text?: string;
}

export class Badge extends React.Component<IProps> {
    static defaultProps = {
        intent: Intent.NONE,
        text: ''
    }

    constructor(props:IProps) {
        super(props);
    }

    render() {
        const { intent, text } = this.props;

        return (
            <span className={`bp3-badge bp3-intent-${intent}`}>{text}</span>
        );
    }
}