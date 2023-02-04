import React from 'react'
import { setup, screen, LOCALE_EN } from 'rtl'

import { optionKey } from '$src/utils/platform'
import { checkDirectoryName } from '$src/services/plugins/FsLocal'
import { MakedirDialog } from '../MakedirDialog'

describe('MakedirDialog', () => {
    const PROPS = {
        isOpen: true,
        parentPath: '/',
        onClose: jest.fn(),
        onValidation: checkDirectoryName,
    }

    beforeEach(() => jest.clearAllMocks())

    it('should display dialog', () => {
        setup(<MakedirDialog {...PROPS} />)
        expect(screen.getByPlaceholderText(LOCALE_EN.DIALOG.MAKEDIR.NAME)).toBeInTheDocument()
        expect(screen.getByText(LOCALE_EN.DIALOG.MAKEDIR.TITLE)).toBeInTheDocument()
        expect(screen.getByText(LOCALE_EN.DIALOG.MAKEDIR.CREATE)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: LOCALE_EN.DIALOG.MAKEDIR.CREATE })).toBeDisabled()
    })

    it('should toggle create button label on option key press', async () => {
        const { user } = setup(<MakedirDialog {...PROPS} />)

        // press option key
        await user.keyboard(`{${optionKey}>}`)

        expect(screen.getByText(LOCALE_EN.DIALOG.MAKEDIR.CREATE_READ)).toBeInTheDocument()

        // release option key
        await user.keyboard(`{/${optionKey}>}`)

        expect(screen.getByText(LOCALE_EN.DIALOG.MAKEDIR.CREATE)).toBeInTheDocument()
    })

    it('should show error & disable create button when directory is not valid', async () => {
        const { user } = setup(<MakedirDialog {...PROPS} />)

        screen.getByPlaceholderText(LOCALE_EN.DIALOG.MAKEDIR.NAME).focus()
        await user.paste('/')

        expect(screen.getByRole('button', { name: LOCALE_EN.DIALOG.MAKEDIR.CREATE })).toBeDisabled()
        expect(screen.getByText(LOCALE_EN.DIALOG.MAKEDIR.NOT_VALID)).toBeInTheDocument()
    })

    it('should call onClose when closing dialog', async () => {
        const { user } = setup(<MakedirDialog {...PROPS} />)

        await user.click(screen.getByText(LOCALE_EN.COMMON.CANCEL))

        expect(PROPS.onClose).toHaveBeenCalledWith('', false)
    })

    it('should call onClose with path when clicking on create button', async () => {
        const folderName = 'foo'
        const { user } = setup(<MakedirDialog {...PROPS} />)

        screen.getByPlaceholderText(LOCALE_EN.DIALOG.MAKEDIR.NAME).focus()
        await user.paste(folderName)
        await user.click(screen.getByText(LOCALE_EN.DIALOG.MAKEDIR.CREATE))

        expect(PROPS.onClose).toHaveBeenCalledWith(folderName, false)
    })

    it('should call onClose with path when clicking on create button and option key is pressed', async () => {
        const folderName = 'foo'
        const { user } = setup(<MakedirDialog {...PROPS} />)

        screen.getByPlaceholderText(LOCALE_EN.DIALOG.MAKEDIR.NAME).focus()
        await user.paste(folderName)
        await user.keyboard(`{${optionKey}>}`)

        await user.click(screen.getByText(LOCALE_EN.DIALOG.MAKEDIR.CREATE_READ))

        expect(PROPS.onClose).toHaveBeenCalledWith(folderName, true)
    })

    it('should call onClose with path when pressing Enter and option key is pressed', async () => {
        const folderName = 'foo'
        const { user } = setup(<MakedirDialog {...PROPS} />)

        screen.getByPlaceholderText(LOCALE_EN.DIALOG.MAKEDIR.NAME).focus()
        await user.paste(folderName)
        await user.keyboard(`{${optionKey}>}`)
        await user.keyboard('{Enter>}')

        expect(PROPS.onClose).toHaveBeenCalledWith(folderName, true)
    })

    it('should call onClose with path when pressing Enter', async () => {
        const folderName = 'foo'
        const { user } = setup(<MakedirDialog {...PROPS} />)

        screen.getByPlaceholderText(LOCALE_EN.DIALOG.MAKEDIR.NAME).focus()
        await user.paste(folderName)
        await user.keyboard('{Enter>}')

        expect(PROPS.onClose).toHaveBeenCalledWith(folderName, false)
    })
})
