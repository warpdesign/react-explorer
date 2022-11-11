import * as React from 'react'
import { Spinner } from '@blueprintjs/core'

interface Props {
    active: boolean
}

export class Loader extends React.Component<Props> {
    constructor(props: Props) {
        super(props)

        this.state = {
            showSpinner: false,
        }
    }

    render(): JSX.Element {
        const active = (this.props.active && 'active') || ''

        return (
            <div className={`app-loader ${active}`}>
                <Spinner></Spinner>
            </div>
        )
    }
}
