import React from 'react'
import { Classes } from '@blueprintjs/core'
import { string } from 'prop-types'
import { getSelectionRange } from './fileUtils'

export function shouldCatchEvent(e: Event): boolean {
    const element = e.target as HTMLElement
    const tagName = (element && element.tagName.toLowerCase()) || ''

    return (
        !tagName.match(/input|textarea/) &&
        (!element || !element.hasAttribute('contenteditable')) &&
        (!element || !element.classList.contains(Classes.MENU_ITEM)) &&
        !document.body.classList.contains(Classes.OVERLAY_OPEN)
    )
}

export function isEditable(element: Element): boolean {
    const tagName = (element && element.tagName.toLowerCase()) || ''

    return !!tagName.match(/input|textarea/) || (element && element.hasAttribute('contenteditable'))
}

export function getTargetTagName(e: Event): string {
    const element = e.target as HTMLElement
    return element.tagName.toLowerCase()
}

export function isInRow(e: React.MouseEvent<HTMLElement, MouseEvent>): boolean {
    const element = e.target as Element
    return !!element.closest('[role="row"]')
}

export function selectLeftPart(name: string, element: HTMLElement): void {
    const selectionRange = getSelectionRange(name)
    const selection = window.getSelection()
    const range = document.createRange()
    const textNode = element.firstChild

    range.setStart(textNode, selectionRange.start)
    range.setEnd(textNode, selectionRange.end)
    selection.empty()
    selection.addRange(range)
}
