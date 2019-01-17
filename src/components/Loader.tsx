import * as React from 'react';
import { Spinner } from '@blueprintjs/core';

interface IProps {
    active: boolean;
}

export class Loader extends React.Component<IProps> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            showSpinner: false
        }
    }

    render() {
        const active = this.props.active && 'active' || '';

        return (
            <div className={`bp3-loader ${active}`}>
                <Spinner></Spinner>
            </div>
        )
    }
}
