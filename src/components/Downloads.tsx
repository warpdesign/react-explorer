import * as React from 'react';

interface IProps {
    hide: boolean;
}

export class Downloads extends React.Component<IProps> {
    constructor(props: IProps) {
        super(props);
    }

    render() {
        if (this.props.hide) {
            return null;
        } else {
            return (
                <div>
                    Downloads go here :)
                </div>
            );
        }

    }
}