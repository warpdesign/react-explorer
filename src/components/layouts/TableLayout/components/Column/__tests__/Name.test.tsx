import { FileViewItem } from '$src/types'
import React from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, setup } from 'rtl'

import { Name } from '../Name'

describe('Name', () => {
    const item = {
        icon: 'add',
        isEditing: false,
        isSelected: false,
        name: 'filename',
        title: 'title',
    } as FileViewItem

    const PROPS = {
        data: item,
        onInlineEdit: jest.fn(),
        selectedCount: 0,
    }

    beforeEach(() => jest.clearAllMocks())

    it('should display component', () => {
        const { container } = render(<Name {...PROPS} />)

        expect(screen.getByText(item.name)).toBeInTheDocument()
        expect(screen.getByTitle(item.title)).toBeInTheDocument()

        // item.icon is used
        expect(container.querySelector(`[icon="${item.icon}"]`)).toBeInTheDocument()
    })

    describe('start edit mode', () => {
        const editItem = {
            ...item,
            isSelected: true,
        }

        beforeEach(() => jest.useFakeTimers())
        afterEach(() => jest.useRealTimers())

        it('should start edit mode when clicking on name', async () => {
            const PROPS = {
                data: editItem,
                onInlineEdit: jest.fn(),
                selectedCount: 0,
            }

            const user = userEvent.setup({ advanceTimers: jest.runOnlyPendingTimers })

            render(<Name {...PROPS} />)

            await user.click(screen.getByText(item.name))

            expect(PROPS.onInlineEdit).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'start',
                }),
            )
        })

        it('should not start edit mode when clicking on name and several files are selected', async () => {
            const PROPS = {
                data: editItem,
                onInlineEdit: jest.fn(),
                selectedCount: 2,
            }

            const user = userEvent.setup({ advanceTimers: jest.runOnlyPendingTimers })

            render(<Name {...PROPS} />)

            await user.click(screen.getByText(item.name))

            expect(PROPS.onInlineEdit).not.toHaveBeenCalled()
        })
    })

    describe('edit mode', () => {
        const editItem = {
            ...item,
            isEditing: true,
        }

        const PROPS = {
            data: editItem,
            onInlineEdit: jest.fn(),
            selectedCount: 0,
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
