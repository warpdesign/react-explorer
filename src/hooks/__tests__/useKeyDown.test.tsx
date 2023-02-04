import React, { ReactElement } from 'react'
import { setup } from 'rtl'

import { useKeyDown } from '../useKeyDown'

interface PROPS {
    callback: (e: KeyboardEvent) => void
}

const Component = ({ callback }: PROPS): ReactElement => {
    useKeyDown(callback, ['ArrowDown', 'ArrowUp'])
    return <div />
}

const callback = jest.fn()

describe('useKeyDown', () => {
    beforeEach(() => jest.clearAllMocks())

    it('should call callback', async () => {
        const { user } = setup(<Component callback={callback} />)

        await user.keyboard('{ArrowDown}')

        expect(callback).toHaveBeenCalled()
    })

    it('should call callback for each key down', async () => {
        const { user } = setup(<Component callback={callback} />)

        await user.keyboard('{ArrowDown}{ArrowUp}')

        expect(callback).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                key: 'ArrowDown',
            }),
        )

        expect(callback).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                key: 'ArrowUp',
            }),
        )
    })

    it('should remove event listener after component has been unmounted', async () => {
        const { user, unmount } = setup(<Component callback={callback} />)
        unmount()

        await user.keyboard('{ArrowDown}')

        expect(callback).not.toHaveBeenCalled()
    })
})
