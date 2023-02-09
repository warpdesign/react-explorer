import { useRef } from 'react'

export const CLICK_DELAY = 500

export interface UseFileClickOptions {
    clickDelay?: number
    shouldSkipEvent?: (event: React.MouseEvent<HTMLElement>) => boolean
    clickHandler: (event: React.MouseEvent<HTMLElement>) => void
    doubleClickHandler: (event: React.MouseEvent<HTMLElement>) => void
    rightClickHandler: (event: React.MouseEvent<HTMLElement>) => void
}

export const useFileClick = ({
    clickDelay = CLICK_DELAY,
    clickHandler,
    doubleClickHandler,
    rightClickHandler,
    shouldSkipEvent,
}: UseFileClickOptions) => {
    const clickRef: React.MutableRefObject<number> = useRef(-clickDelay)
    return {
        onClick: (e: React.MouseEvent<HTMLElement>) => {
            if (shouldSkipEvent && shouldSkipEvent(e)) {
                return
            }

            e.stopPropagation()

            if (e.timeStamp - clickRef.current > clickDelay) {
                clickHandler(e)
            } else {
                doubleClickHandler(e)
            }
            clickRef.current = e.timeStamp
        },
        onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation()
            rightClickHandler(e)
        },
    }
}
