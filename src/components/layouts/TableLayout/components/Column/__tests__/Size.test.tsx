import { FileViewItem } from '$src/types'
import React from 'react'
import { render, screen } from 'rtl'

import { Size } from '../Size'

describe('Size', () => {
    const item = {
        size: '3 Bytes',
    } as FileViewItem

    const PROPS = {
        data: item,
    }

    it('should display component', () => {
        render(<Size {...PROPS} />)

        expect(screen.getByText(item.size)).toBeInTheDocument()
    })
})
