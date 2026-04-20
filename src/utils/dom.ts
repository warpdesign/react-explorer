import React from 'react'

import { getSelectionRange } from './fileUtils'

export function shouldCatchEvent(e: Event): boolean {
    const element = e.target as HTMLElement
    const tagName = (element && element.tagName.toLowerCase()) || ''
    const isOverlayOpen = document.querySelector('[data-mantine-portal]') !== null

    return !tagName.match(/input|textarea/) && (!element || !element.closest('[role="menuitem"]')) && !isOverlayOpen
}

export function isEditable(element: Element): boolean {
    const tagName = (element && element.tagName.toLowerCase()) || ''

    return !!tagName.match(/input|textarea/)
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

    if (textNode && selection) {
        range.setStart(textNode, selectionRange.start)
        range.setEnd(textNode, selectionRange.end)
        selection.empty()
        selection.addRange(range)
    }
}
