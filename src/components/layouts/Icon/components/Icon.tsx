import React from 'react'

import { TruncatedText } from '../../components/TruncatedText'

export const Icon = () => {
    return (
        <div style={{ width: '120px', overflow: 'hidden', wordBreak: 'break-all', textAlign: 'center' }}>
            <TruncatedText text="abcdefghijklmnopqrstuvw" lines={1} />
        </div>
    )
}
