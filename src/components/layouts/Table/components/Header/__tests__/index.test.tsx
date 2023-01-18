/**
 * @jest-environment jsdom
 */
import { Column } from '$src/hooks/useLayout'
import React from 'react'
import { render, screen, setup } from 'rtl'

import { Header, SortIndicator } from '../'

describe('SortIndicator', () => {
    it("should display empty element when sort is 'none'", () => {
        const { container } = render(<SortIndicator sort="none" />)

        expect(container.firstElementChild.tagName).toBe('SPAN')
    })

    it("should display empty element when sort is 'asc'", () => {
        const { container } = render(<SortIndicator sort="asc" />)

        expect(container.querySelector(`[icon="caret-up"]`)).toBeInTheDocument()
    })

    it("should display empty element when sort is 'desc'", () => {
        const { container } = render(<SortIndicator sort="desc" />)

        expect(container.querySelector(`[icon="caret-down"]`)).toBeInTheDocument()
    })
})

describe('Header', () => {
    const columns = [
        {
            label: 'col1',
            key: 'name',
            sort: 'none',
        },
        {
            label: 'col2',
            key: 'size',
            sort: 'asc',
        },
    ] as Column[]

    const PROPS = {
        height: 100,
        onClick: jest.fn(),
        columns,
    }

    beforeEach(() => jest.clearAllMocks())

    it('should display header columns', () => {
        render(<Header {...PROPS} />)

        expect(screen.getByText(columns[0].label)).toBeInTheDocument()
        expect(screen.getByText(columns[1].label)).toBeInTheDocument()
    })

    it('should have styles applied to it', () => {
        const { container } = render(<Header {...PROPS} />)

        expect(container.firstElementChild).toHaveStyle(`height: ${PROPS.height}px`)
        expect(container.firstElementChild.children[0]).toHaveStyle(`font-weight: normal`)
        expect(container.firstElementChild.children[1]).toHaveStyle(`font-weight: bold`)
    })

    it('should call onClick event when clicking on column', async () => {
        const { user } = setup(<Header {...PROPS} />)

        await user.click(screen.getByText(columns[0].label))

        expect(PROPS.onClick).toHaveBeenCalledWith(
            expect.objectContaining({
                data: columns[0].key,
            }),
        )
    })
})
