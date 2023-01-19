/**
 * @jest-environment jsdom
 */
import React from 'react'
import * as ReactVirtual from 'react-virtual'
import { render, screen, setup, t } from 'rtl'

import { Column } from '$src/hooks/useLayout'
import { TStatus } from '$src/state/fileState'
import { FileViewItem } from '$src/types'

import { TableLayout } from '..'

describe('TableLayout', () => {
    const items = [
        {
            name: 'filename',
            size: '3 bytes',
            icon: 'folder-close',
            isEditing: false,
            isSelected: false,
            title: 'filename',
            nodeData: {
                mode: 0,
            },
        },
        {
            name: 'filename2',
            size: '28 bytes',
            icon: 'folder-close',
            isEditing: false,
            isSelected: false,
            title: 'filename2',
            nodeData: {
                mode: 0,
            },
        },
    ] as FileViewItem[]

    const columns = [
        {
            label: 'name',
            key: 'name',
            sort: 'asc',
        },
        {
            label: 'size',
            key: 'size',
            sort: 'none',
        },
    ] as Column[]

    const PROPS = {
        onItemClick: jest.fn(),
        onBlankAreaClick: jest.fn(),
        onItemRightClick: jest.fn(),
        onItemDoubleClick: jest.fn(),
        onInlineEdit: jest.fn(),
        onHeaderClick: jest.fn(),
        getDragProps: jest.fn(() => ({
            fileState: null,
            dragFiles: new Array(2),
        })),
        getItem: jest.fn((index) => items[index]),
        itemCount: items.length,
        columns,
        error: false,
        status: 'ok' as TStatus,
        cursorIndex: -1,
        isDarkModeActive: false,
    }

    beforeEach(() => jest.clearAllMocks())

    it('should display table', () => {
        render(<TableLayout {...PROPS} />)

        // show elements
        items.forEach((item) => {
            expect(screen.getByText(item.name)).toBeInTheDocument()
            expect(screen.getByText(item.size)).toBeInTheDocument()
        })

        // header columns
        columns.forEach((col) => expect(screen.getByText(col.label)).toBeInTheDocument())
    })

    it('should display placeholder if there are no items', () => {
        const newProps = {
            ...PROPS,
            itemCount: 0,
        }

        render(<TableLayout {...newProps} />)

        expect(screen.getByText(t('COMMON.EMPTY_FOLDER'))).toBeInTheDocument()

        columns.forEach((col) => expect(screen.queryByText(col.label)).not.toBeInTheDocument())
    })

    it('should scroll to cursor index', () => {
        const fakeVirtual = {
            totalSize: 200,
            virtualItems: [
                {
                    index: 0,
                    start: 0,
                    size: 28,
                    key: 'item-0',
                    end: 0,
                    measureRef: null as React.MutableRefObject<HTMLElement>,
                },
            ],
            scrollToIndex: jest.fn(),
            scrollToOffset: jest.fn(),
            measure: jest.fn(),
        } as any

        jest.spyOn(ReactVirtual, 'useVirtual').mockImplementationOnce(() => fakeVirtual)

        render(<TableLayout {...PROPS} cursorIndex={0} />)

        expect(fakeVirtual.scrollToIndex).toHaveBeenCalledWith(0)
    })

    describe('interactions', () => {
        it('should call onItemClick', async () => {
            const firstItem = items[0]
            const { user } = setup(<TableLayout {...PROPS} />)

            await user.click(screen.getByText(firstItem.name))

            expect(PROPS.onItemClick).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: firstItem,
                    index: 0,
                }),
            )
        })

        it('should call onItemDoubleClick', async () => {
            const firstItem = items[0]
            const { user } = setup(<TableLayout {...PROPS} />)

            await user.dblClick(screen.getByText(firstItem.name))

            expect(PROPS.onItemDoubleClick).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: firstItem,
                    index: 0,
                }),
            )
        })

        it('should call onItemRightClick', async () => {
            const firstItem = items[0]
            const { user } = setup(<TableLayout {...PROPS} />)

            await user.pointer([
                {
                    target: screen.getByText(firstItem.name),
                    keys: '[MouseRight]',
                },
            ])

            expect(PROPS.onItemRightClick).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: firstItem,
                    index: 0,
                }),
            )
        })

        it('should call onHeaderClick', async () => {
            const { user } = setup(<TableLayout {...PROPS} />)

            await user.click(screen.getByText(columns[0].label))

            expect(PROPS.onHeaderClick).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: columns[0].key,
                }),
            )
        })

        it('should call onBlankAreaClick', async () => {
            const newProps = {
                ...PROPS,
                itemCount: 0,
            }

            const { user } = setup(<TableLayout {...newProps} />)

            await user.click(screen.getByText(t('COMMON.EMPTY_FOLDER')))

            expect(newProps.onBlankAreaClick).toHaveBeenCalled()
        })
    })
})
