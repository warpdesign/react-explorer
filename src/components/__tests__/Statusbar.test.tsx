/**
 * @jest-environment jsdom
 */
import React, { PropsWithChildren } from 'react'
import { screen, render, LOCALE_EN, userEvent, t } from 'rtl'
import { Provider } from 'mobx-react'
import { Statusbar } from '../Statusbar'

describe('Statusbar', () => {
    const appState = {
        clipboard: {
            setClipboard: jest.fn(),
        },
    }

    const cache = {
        selected: [],
        getFS: (): undefined => undefined,
        files: [],
    } as { [x: string]: any }

    const viewState = {
        getVisibleCache: () => cache,
    }

    const Wrapper = () => (
        <Provider appState={appState} viewState={viewState}>
            <Statusbar />
        </Provider>
    )

    beforeEach(() => {
        cache.selected = []
        cache.files = []
        jest.resetAllMocks()
    })

    it('should display statusbar', () => {
        render(<Wrapper />)
        expect(screen.getByRole('textbox')).toHaveValue(
            `${t('STATUS.FILES', { count: 0 })}, ${t('STATUS.FOLDERS', {
                count: 0,
            })}`,
        )
    })

    it('should display the number of files & folders', () => {
        const files = 10,
            folders = 5

        cache.files = Array(files + folders)
            .fill({ isDir: false })
            .fill({ isDir: true }, files)
        render(<Wrapper />)
        expect(screen.getByRole('textbox')).toHaveValue(
            `${t('STATUS.FILES', { count: files })}, ${t('STATUS.FOLDERS', {
                count: folders,
            })}`,
        )
    })

    it('clipboard button should be disabled if selection is empty', () => {
        render(<Wrapper />)
        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('clicking on clipboard button should set clipboard', async () => {
        // add a fake file to the selcted files
        cache.selected = [undefined]
        render(<Wrapper />)
        await userEvent.click(screen.getByRole('button'))
        expect(appState.clipboard.setClipboard).toHaveBeenCalledWith(cache)
        expect(appState.clipboard.setClipboard).toHaveBeenCalledTimes(1)
    })
})
