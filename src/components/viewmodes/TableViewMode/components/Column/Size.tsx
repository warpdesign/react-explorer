import React from 'react'

import type { FileViewItem } from '$src/types'

export const Size = ({ data: { size } }: { data: FileViewItem }) => {
    return <div className="size">{size}</div>
}
