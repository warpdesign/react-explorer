import React from 'react'
import { render } from 'rtl'
import { screen } from '@testing-library/react'

import { useStores } from '$src/hooks/useStores'

const Component = ({ storeName }: { storeName: string }) => {
    const { settingsState } = useStores(storeName)

    return <div>{settingsState.lang}</div>
}

describe('useStores', () => {
    it('should return mobx store', () => {
        render(<Component storeName="settingsState" />)
        expect(screen.getByText('en')).toBeInTheDocument()
    })

    it('should throw if store could not be found', () => {
        expect(() => render(<Component storeName="unknown" />)).toThrow("No MboXProvider for 'unknown'!")
    })
})
