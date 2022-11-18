/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen } from '@testing-library/react'
import { useStores } from '../useStores'
import { render } from 'rtl'
import { SettingsState } from 'state/settingsState'

const Component = ({ storeName }: { storeName: string }) => {
    const { settingsState } = useStores<SettingsState>(storeName)
    return <div>{settingsState.lang}</div>
}

describe('useStores', () => {
    it('should return mobx store', () => {
        render(<Component storeName="settingsState" />)
        expect(screen.getByText('fr')).toBeInTheDocument()
    })

    it('should throw if store could not be found', () => {
        expect(() => render(<Component storeName="unknown" />)).toThrow("No MboXProvider for 'unknown'!")
    })
})
