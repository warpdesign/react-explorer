/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, withMarkup } from 'rtl'
import { DeleteConfirmDialog } from '../deleteConfirm'

describe('DeleteConfirmDialog', () => {
    it('should show confirm dialog with passed count', () => {
        const count = 10
        const message = new RegExp(`Are you sure you want to delete ${count} file\\(s\\)`)
        render(<DeleteConfirmDialog count={count} />)
        expect(withMarkup(screen.getByText)(message)).toBeInTheDocument()
    })
})
