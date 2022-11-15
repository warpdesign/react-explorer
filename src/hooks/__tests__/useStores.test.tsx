/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { useStores } from '../useStores'
import { renderWithProvider } from 'rtl'

const Component = () => {
    const { settingsState } = useStores('settingsState')
    return <div>{settingsState.lang}</div>
}

describe('useStores', () => {
    it('should return mobx store', () => {
        renderWithProvider(<Component />)
        expect(screen.getByText('fr')).toBeInTheDocument()
    })

    it('should throw if store could not be found', () => {
        expect(() => render(<Component />)).toThrow("No MboXProvider for 'settingsState'!")
    })
})
