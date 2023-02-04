import { Classes, Intent } from '@blueprintjs/core'
import React from 'react'
import { screen, render } from 'rtl'
import { Badge } from '../Badge'

describe('Badge', () => {
    const options = {
        text: '1',
        progress: 50,
    }

    it('should show badge', () => {
        render(<Badge {...options} />)

        expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should not render anything if text is empty', () => {
        const { container } = render(<Badge {...options} text="" />)

        expect(container).toBeEmptyDOMElement()
    })

    it('should use the specified intent', () => {
        const { container } = render(<Badge {...options} intent={Intent.PRIMARY} />)

        expect(container.firstElementChild.classList.contains(Classes.INTENT_PRIMARY)).toBe(true)
    })
})
