import * as React from "react";
import { InputGroup, Spinner, Icon, Label } from '@blueprintjs/core';
import { cpus } from "os";

interface PathInputState {
    pathValue: string;
    disabled: boolean;
    loading: boolean;
}

export class PathInput extends React.Component<{}, PathInputState> {
    constructor(props: {}) {
        super(props);

        this.state = {
            pathValue: 'dtc',
            disabled: false,
            loading: false
        };
    }

    onPathChange(event: React.FormEvent<HTMLElement>) {
        this.setState({ pathValue: (event.target as HTMLInputElement).value });
    }

    render() {

        const { pathValue, loading, disabled } = this.state;

        const loadingSpinner = loading ? <Spinner size={Icon.SIZE_STANDARD} /> : undefined;

        return (
            <Label

            >
            Path
            <InputGroup
                disabled={disabled}
                leftIcon="filter"
                onChange={this.onPathChange.bind(this)}
                placeholder="Enter Path to load"
                rightElement={loadingSpinner}
                value={pathValue}
                className="bp3-inline"
                />
                </Label>
        )
    }
}
