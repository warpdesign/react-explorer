import * as React from 'react'
import { Intent, Spinner } from '@blueprintjs/core'

interface Props {
    intent?: Intent
    text?: string
    progress?: number
}

export class Badge extends React.Component<Props> {
    static defaultProps = {
        intent: Intent.NONE,
        text: '1',
        progress: 0,
    }

    constructor(props: Props) {
        super(props)
    }

    render(): React.ReactNode {
        const { intent, text, progress } = this.props

        if (text) {
            return (
                <div className={`app-badge bp4-intent-${intent}`}>
                    <span className="app-badge-content">{text}</span>
                    <Spinner size={20} value={progress}></Spinner>
                </div>
            )
        } else {
            return null
        }
    }
}
