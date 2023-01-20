/**
 * @jest-environment jsdom
 */
import React from 'react'

import { render, t, setup, screen } from 'rtl'

import { FileContextMenu } from '../FileContextMenu'
import { FileDescriptor } from '$src/services/Fs'
import { AppState } from '$src/state/appState'

describe('FileContextMenu', () => {
    const PROPS = {
        fileUnderMouse: {
            isDir: true,
        } as FileDescriptor,
    }

    const options = {
        providerProps: {
            appState: null as AppState,
        },
    }

    beforeEach(async () => {
        options.providerProps.appState = new AppState()
        await options.providerProps.appState.loadSettingsAndPrepareViews()
        jest.clearAllMocks()
    })

    it('should render context menu', () => {
        render(<FileContextMenu {...PROPS} />, options)

        expect(screen.getByText(t('APP_MENUS.COPY'))).toBeInTheDocument()
        expect(screen.getByText(t('APP_MENUS.PASTE'))).toBeInTheDocument()
        expect(screen.getByText(t('APP_MENUS.DELETE'))).toBeInTheDocument()
    })

    it.todo('should disable menu items')

    describe('interactions', () => {
        it('should copy to clipboard when clicking on copy menu item', async () => {
            const { clipboard, winStates } = options.providerProps.appState
            const cache = winStates[0].getActiveView().getVisibleCache()
            const { user } = setup(<FileContextMenu {...PROPS} />, options)

            jest.spyOn(clipboard, 'setClipboard')

            await user.click(screen.getByText(t('APP_MENUS.COPY')))

            expect(clipboard.setClipboard).toHaveBeenCalledWith(cache, [PROPS.fileUnderMouse])
        })

        it('should paste from clipboard when clicking on paste menu item', async () => {
            const appState = options.providerProps.appState
            const cache = appState.winStates[0].getActiveView().getVisibleCache()
            appState.clipboard.files.push(cache.files[0])

            const { user } = setup(<FileContextMenu {...PROPS} />, options)

            jest.spyOn(appState, 'paste')

            await user.click(screen.getByText(t('APP_MENUS.PASTE')))

            expect(appState.paste).toHaveBeenCalledWith(cache)
        })

        it('should delete items when clicking on delete menu item', async () => {
            const appState = options.providerProps.appState

            const { user } = setup(<FileContextMenu {...PROPS} />, options)

            jest.spyOn(appState, 'delete')

            await user.click(screen.getByText(t('APP_MENUS.DELETE')))

            expect(appState.delete).toHaveBeenCalledWith([PROPS.fileUnderMouse])
        })
    })
})
