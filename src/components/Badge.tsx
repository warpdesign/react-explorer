import * as React from 'react'
import { Intent, Spinner } from '@blueprintjs/core'

interface Props {
    intent?: Intent
    text?: string
    progress?: number
}

export const Badge = ({ intent = Intent.NONE, text = '', progress = 0 }: Props) => {
    if (text) {
        return (
            <div className={`app-badge bp5-intent-${intent}`}>
                <span className="app-badge-content">{text}</span>
                <Spinner size={20} value={progress}></Spinner>
            </div>
        )
    } else {
        return null
    }
}
