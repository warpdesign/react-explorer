/**
 * @jest-environment jsdom
 */
import { TStatus } from '$src/state/fileState'
import React from 'react'
import { render, screen, t } from 'rtl'

import { Placeholder } from '../'

describe('Placeholder', () => {
    const PROPS = {
        error: false,
        status: 'busy' as TStatus,
    }

    it('should display empty element if status is "busy"', () => {
        const { container } = render(<Placeholder {...PROPS} />)

        expect(container).toBeEmptyDOMElement()
    })

    it('should display empty placeholder', () => {
        const { container } = render(<Placeholder {...PROPS} status="ok" />)

        expect(screen.getByText(t('COMMON.EMPTY_FOLDER'))).toBeInTheDocument()
        expect(container.querySelector(`[icon="tick-circle"]`)).toBeInTheDocument()
    })

    it('should display error placeholder', () => {
        const { container } = render(<Placeholder {...PROPS} error={true} status="ok" />)

        expect(screen.getByText(t('COMMON.NO_SUCH_FOLDER'))).toBeInTheDocument()
        expect(container.querySelector(`[icon="warning-sign"]`)).toBeInTheDocument()
    })
})
