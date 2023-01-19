/**
 * @jest-environment jsdom
 */
import { FileViewItem } from '$src/types'
import React from 'react'
import { render, screen, setup, userEvent, wait } from 'rtl'

import { Row, CLICK_DELAY } from '..'

describe('Row', () => {
    const item = {
        name: 'filename',
        size: '3 bytes',
        icon: 'folder-close',
        isEditing: false,
        isSelected: false,
        title: 'filename',
    }

    const PROPS = {
        rowData: item as FileViewItem,
        onRowClick: jest.fn(),
        onRowDoubleClick: jest.fn(),
        onRowRightClick: jest.fn(),
        onInlineEdit: jest.fn(),
        getDragProps: jest.fn(() => ({
            fileState: null,
            dragFiles: new Array(2),
        })),
        isDarkModeActive: false,
        index: 0,
    }

    beforeEach(() => jest.clearAllMocks())

    it('should display row', () => {
        render(<Row {...PROPS} />)

        // two columns
        expect(screen.getByText(item.name)).toBeInTheDocument()
        expect(screen.getByText(item.size)).toBeInTheDocument()
    })

    describe('interactions', () => {
        it('should call right click handler when the user right clicks on the row', async () => {
            const { user } = setup(<Row {...PROPS} />)

            await user.pointer({
                target: screen.getByText(item.name),
                keys: '[MouseRight]',
            })

            expect(PROPS.onRowRightClick).toHaveBeenCalled()
        })

        it('should call left click handler when the user left clicks on the row', async () => {
            const { user } = setup(<Row {...PROPS} />)

            await user.click(screen.getByText(item.name))

            expect(PROPS.onRowClick).toHaveBeenCalled()
        })

        it('should call double click handler when the user double-clicks on the row', async () => {
            const { user } = setup(<Row {...PROPS} />)

            await user.dblClick(screen.getByText(item.name))

            expect(PROPS.onRowDoubleClick).toHaveBeenCalled()
        })

        it('should not double click handler if the delay between the two clicks is too high', async () => {
            const { user } = setup(<Row {...PROPS} />)

            await user.click(screen.getByText(item.name))
            await wait(CLICK_DELAY * 2)
            await user.click(screen.getByText(item.name))

            expect(PROPS.onRowClick).toHaveBeenCalledTimes(2)
            expect(PROPS.onRowDoubleClick).not.toHaveBeenCalled()
        })

        it('should not call click handler if file is already selected and the user clicks on the size column', async () => {
            item.isSelected = true

            const { user } = setup(<Row {...PROPS} />)
            await user.click(screen.getByText(item.size))

            expect(PROPS.onRowClick).not.toHaveBeenCalled()
        })

        // it.only('should show drag overlay when user drags the row', async () => {
        //     const { user } = setup(<Row {...PROPS} />)

        //     await user.pointer([
        //         {
        //             target: screen.getByText(item.name),
        //             keys: '[MouseLeft>]'
        //         },
        //         {
        //             target: screen.getByText(item.size),
        //         },
        //     ])
        // })
    })
})
