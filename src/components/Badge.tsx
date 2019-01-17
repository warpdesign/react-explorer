import * as React from 'react';
import { Intent, Spinner } from '@blueprintjs/core';

interface IProps {
    intent?: Intent;
    text?: string;
    progress?: number;
}

export class Badge extends React.Component<IProps> {
    static defaultProps = {
        intent: Intent.NONE,
        text: '1',
        progress: 0
    }

    constructor(props:IProps) {
        super(props);
    }

    // shouldComponentUpdate() {
    //     console.time('Badge Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('Badge Render');
    // }

    render() {
        const { intent, text, progress } = this.props;

        if (text) {
            return (
                <div className={`bp3-badge bp3-intent-${intent}`}><span className="bp3-badge-content">{text}</span><Spinner size={20} value={progress}></Spinner></div>
            );
        } else {
            return null;
        }
    }
}
