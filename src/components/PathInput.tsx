import * as React from "react";
import { observer } from 'mobx-react';
import { InputGroup, Spinner, Icon, ControlGroup, Button } from '@blueprintjs/core';

@observer export class PathInput extends React.Component<any> {
    constructor(props: {}) {
        super(props);
    }

    onPathChange(event: React.FormEvent<HTMLElement>) {
        this.updateStore((event.target as HTMLInputElement).value);
    }

    updateStore(val:string) {
        console.log('state change, updating store', val);
        this.props.fileCache.path = val;
    }

    render() {
        const disabled = false;
        const loadingSpinner = false ? <Spinner size={Icon.SIZE_STANDARD} /> : undefined;

        console.log('render');

        return (
            <ControlGroup>
                <InputGroup
                        disabled={disabled}
                        leftIcon={this.props.leftIcon}
                        onChange={this.onPathChange.bind(this)}
                        placeholder="Enter Path to load"
                        rightElement={loadingSpinner}
                        value={this.props.fileCache.path}
                />
                <Button rightIcon="arrow-right" />
            </ControlGroup>
        )
    }
}
