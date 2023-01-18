/**
 * @jest-environment jsdom
 */
import { FileViewItem } from '$src/types'
import React from 'react'
import { render, screen, setup } from 'rtl'

import { Name } from '../Name'

describe('Name', () => {
    const item = {
        icon: 'add',
        isEditing: false,
        name: 'filename',
        title: 'title',
    } as FileViewItem

    const PROPS = {
        data: item,
        onInlineEdit: jest.fn(),
    }

    beforeEach(() => jest.clearAllMocks())

    it('should display component', () => {
        const { container } = render(<Name {...PROPS} />)

        expect(screen.getByText(item.name)).toBeInTheDocument()
        expect(screen.getByTitle(item.title)).toBeInTheDocument()

        // item.icon is used
        expect(container.querySelector(`[icon="${item.icon}"]`)).toBeInTheDocument()
    })

    describe('edit mode', () => {
        const editItem = {
            ...item,
            isEditing: true,
        }

        const PROPS = {
            data: editItem,
            onInlineEdit: jest.fn(),
        }

        it('should show edit input', () => {
            render(<Name {...PROPS} />)

            expect(screen.getByDisplayValue(editItem.name)).toBeInTheDocument()
        })

        it('should validate edit when blur event is received', () => {
            setup(<Name {...PROPS} />)

            screen.getByDisplayValue(editItem.name).blur()

            expect(PROPS.onInlineEdit).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'validate',
                    data: item.name,
                }),
            )
        })

        it('should validate edit when the user pressed Enter', async () => {
            const name = 'foo'
            const { user } = setup(<Name {...PROPS} />)

            const input = screen.getByDisplayValue(editItem.name)

            await user.clear(input)
            await user.type(input, `${name}{Enter}`)

            expect(PROPS.onInlineEdit).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'validate',
                    data: name,
                }),
            )
        })

        it('should cancel edit when the user pressed Escape', async () => {
            const { user } = setup(<Name {...PROPS} />)

            const input = screen.getByDisplayValue(editItem.name)

            await user.type(input, '{Escape}')

            expect(PROPS.onInlineEdit).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'cancel',
                }),
            )
        })
    })
})
