import { useEventListener } from '$src/hooks/useEventListener'
import React, { CSSProperties, Reducer, useReducer, useRef, useLayoutEffect } from 'react'

export interface Props {
    children?: JSX.Element
    isDisabled?: boolean
    onSelect?: (e: MouseEvent, rect: Selection) => void
    onMouseUp?: (e: MouseEvent) => void
    onMouseDown?: (e: MouseEvent) => void
    style?: CSSProperties
    selectionAreaRef: React.MutableRefObject<HTMLDivElement>
}

export interface State {
    hold: boolean
    selectionBox: boolean
    selectionBoxOrigin: number[]
    selectionBoxTarget: number[]
}

export interface Selection {
    left: number
    top: number
    width: number
    height: number
    nearBottomEdge: boolean
}

const getTransformBox = (selectionBoxOrigin: number[], selectionBoxTarget: number[]): string | null => {
    if (selectionBoxOrigin[1] > selectionBoxTarget[1] && selectionBoxOrigin[0] > selectionBoxTarget[0])
        return 'scaleY(-1) scaleX(-1)'

    if (selectionBoxOrigin[1] > selectionBoxTarget[1]) return 'scaleY(-1)'
    if (selectionBoxOrigin[0] > selectionBoxTarget[0]) return 'scaleX(-1)'
    return null
}

const getConstrainCoords = (rect: DOMRect, origin: number[], target: number[], relative = false): Selection => {
    const x1 = Math.min(origin[0], target[0])
    const x2 = Math.max(origin[0], target[0])

    const y1 = Math.min(origin[1], target[1])
    const y2 = Math.max(origin[1], target[1])

    const cx1 = Math.max(rect.x, x1)
    const cy1 = Math.max(rect.y, y1)

    const cx2 = Math.min(rect.x + rect.width, x2)
    const cy2 = Math.min(rect.y + rect.height, y2)

    const width = cx2 - cx1
    const height = cy2 - cy1

    return {
        left: relative ? cx1 - rect.x : cx1,
        top: relative ? cy1 - rect.y : cy1,
        width,
        height,
        nearBottomEdge: rect.y + rect.height - cy2 <= 2,
    }
}

export const RectangleSelection = ({
    children,
    isDisabled,
    onMouseUp,
    onMouseDown,
    onSelect,
    style,
    selectionAreaRef,
}: Props) => {
    const [state, setState] = useReducer<Reducer<State, Partial<State>>>(
        (state: State, newState: Partial<State>) => ({
            ...state,
            ...newState,
        }),
        {
            hold: false,
            selectionBox: false,
            selectionBoxOrigin: [0, 0],
            selectionBoxTarget: [0, 0],
        },
    )
    const parentRect = useRef<DOMRect>({
        x: 0,
        y: 0,
    } as unknown as DOMRect)

    useLayoutEffect(() => {
        parentRect.current = selectionAreaRef.current?.getBoundingClientRect()
        !isDisabled && console.log('selectionAreaRef changed', parentRect.current)
    }, [selectionAreaRef.current])

    const isEventInsideSelectionArea = (evt: MouseEvent): boolean => {
        if (selectionAreaRef.current) {
            const rect = parentRect.current
            return (
                evt.pageX >= rect.left &&
                evt.pageX < rect.left + rect.width &&
                evt.pageY >= rect.top &&
                evt.pageY < rect.top + rect.height
            )
        }
        return false
    }

    useEventListener('mousemove', (evt: MouseEvent) => {
        if (isDisabled || (!state.hold && !isEventInsideSelectionArea(evt))) {
            return
        }

        if (state.hold && !state.selectionBox) {
            onMouseDown && onMouseDown(evt)
            setState({ selectionBox: true })
        }
        if (state.selectionBox) {
            const rect = parentRect.current
            setState({
                selectionBoxTarget: [evt.pageX, evt.pageY],
            })

            onSelect(
                evt,
                getConstrainCoords(parentRect.current, [evt.pageX, evt.pageY], state.selectionBoxOrigin, true),
            )
        }
    })

    const closeSelectionBox = (e: MouseEvent) => {
        !isDisabled && console.log('closeSelectionBox')
        onMouseUp && onMouseUp(e)
        setState({
            hold: false,
            selectionBox: false,
        })
    }

    useEventListener('mouseup', closeSelectionBox)

    useEventListener('mousedown', (e: MouseEvent) => {
        if (isDisabled || !isEventInsideSelectionArea(e)) {
            return
        }

        console.log('inside')

        let doubleClick = false
        setState({ selectionBox: false })

        if ((e.target as HTMLElement).id === 'react-rectangle-selection') {
            setState({ selectionBox: false })
            doubleClick = true
        }

        setState({
            hold: true,
            selectionBoxOrigin: [e.pageX, e.pageY],
            selectionBoxTarget: [e.pageX, e.pageY],
        })

        // console.log('hold', e.pageX - rect.left, e.pageY - rect.top, selectionAreaRef.current)
    })

    const { left, top, width, height } = getConstrainCoords(
        parentRect.current,
        state.selectionBoxOrigin,
        state.selectionBoxTarget,
    )

    const baseStyle = {
        position: 'fixed',
        zIndex: 10,
        // TODO: also Math.min(left, parentRect.current.width + parentRect.current.x),
        left,
        // TODO: Math.min(top, parentRect.current.height + parentRect.current.y),
        top,
        height,
        width,
        userSelect: 'none',
    }

    return (
        <
            // onMouseLeave={() => {
            //   this.closeSelectionBox();
            // }}
            // onMouseUp={closeSelectionBox}
            // onMouseMove={evt => {
            //   if (state.hold && !state.selectionBox) {
            //     onMouseDown && onMouseDown(evt)
            //     setState({ selectionBox: true });
            //   }
            //   if (state.selectionBox && !animationInProgress.current) {
            //     const currentTargetRect = evt.currentTarget.getBoundingClientRect()
            //     setState({
            //       selectionBoxTarget: [evt.nativeEvent.pageX - currentTargetRect.left, evt.nativeEvent.pageY - currentTargetRect.top]
            //     });
            //     onSelect(evt, {
            //       origin: state.selectionBoxOrigin,
            //       target: state.selectionBoxTarget
            //     });
            //   }
            // }}
        >
            {state.selectionBox && (
                <div
                    className="react-rectangle-selection"
                    id="react-rectangle-selection"
                    style={Object.assign(baseStyle, style)}
                />
            )}
            {children}
        </>
    )
}
