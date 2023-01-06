/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, render } from 'rtl'
import { Overlay } from '../Overlay'

describe('Overlay', () => {
    const options = {
        shouldShow: true,
    }

    it('should show overlay', () => {
        render(
            <Overlay {...options}>
                <a>hi</a>
            </Overlay>,
        )

        expect(screen.getByText('hi')).toBeInTheDocument()
    })

    it('should apply active className if shouldShow is true', () => {
        const { container } = render(
            <Overlay {...options}>
                <a>hi</a>
            </Overlay>,
        )

        expect(container.firstChild).toHaveClass('active')
    })

    it('should not apply active className if shouldShow is false', () => {
        const { container } = render(
            <Overlay shouldShow={false}>
                <a>hi</a>
            </Overlay>,
        )

        expect(container.firstChild).not.toHaveClass('active')
    })

    it('should remove active className if shouldShow prop is updated', () => {
        const { container, rerender } = render(
            <Overlay shouldShow={false}>
                <a>hi</a>
            </Overlay>,
        )
        expect(container.firstChild).not.toHaveClass('active')

        rerender(
            <Overlay shouldShow={true}>
                <a>hi</a>
            </Overlay>,
        )
        expect(container.firstChild).toHaveClass('active')
    })

    describe('delay', () => {
        beforeEach(() => jest.useFakeTimers())

        afterEach(() => jest.useRealTimers())

        const options = {
            shouldShow: true,
            delay: true,
        }

        it('should apply active class after delay is passed', () => {
            const { container, rerender } = render(
                <Overlay {...options}>
                    <a>hi</a>
                </Overlay>,
            )
            expect(container.firstChild).not.toHaveClass('active')

            jest.runOnlyPendingTimers()
            expect(container.firstChild).toHaveClass('active')

            // disable it
            rerender(
                <Overlay {...options} shouldShow={false}>
                    <a>hi</a>
                </Overlay>,
            )
            expect(container.firstChild).not.toHaveClass('active')

            rerender(
                <Overlay {...options}>
                    <a>hi</a>
                </Overlay>,
            )

            expect(container.firstChild).not.toHaveClass('active')
            jest.runOnlyPendingTimers()
            expect(container.firstChild).toHaveClass('active')
        })

        it('should clearTimeout if Overlay is unmounted before the delay has passed', () => {
            jest.spyOn(global, 'clearTimeout')

            const { unmount } = render(
                <Overlay {...options}>
                    <a>hi</a>
                </Overlay>,
            )
            unmount()

            expect(global.clearTimeout).toHaveBeenCalled()
        })
    })
})
