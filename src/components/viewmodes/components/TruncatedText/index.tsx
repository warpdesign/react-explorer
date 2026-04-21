import React, { useState, useEffect, useRef } from 'react'
import { FileViewItem } from '$src/types'
import { InlineRenameProps, withInlineRename } from '$src/components/hoc/WithInlineRename'

interface TruncateProps extends InlineRenameProps {
    item: FileViewItem
    lines: number
    ellipsis?: string
    isViewActive?: boolean
}

export const TruncatedText = withInlineRename(
    ({ lines, ellipsis = '....', item, onClick, isViewActive = true }: TruncateProps) => {
        const { isSelected, name: text } = item
        const [displayText, setDisplayText] = useState(text)
        const textRef = useRef(null)

        useEffect(() => {
            const element = textRef.current
            element.textContent = text
            let clientRects = element.getClientRects()
            let truncatedText = ''
            if (clientRects.length > lines) {
                let truncLength = ellipsis.length
                const middle = Math.floor(text.length / 2)
                while (clientRects.length > lines) {
                    const leftPos = middle - Math.floor(truncLength / 2)
                    const leftPart = text.slice(0, leftPos)
                    const rightPos = middle + Math.floor(truncLength / 2)
                    const rightPart = text.slice(-(text.length - rightPos))
                    const croppedText = `${leftPart}${rightPart}`
                    truncatedText = croppedText.substring(0, 4).trimRight() + '…' + croppedText.substring(5).trimLeft()
                    element.textContent = truncatedText
                    // console.log('testing with', truncatedText, { rightPos, leftPos, truncLength: truncLength / 2 })
                    clientRects = element.getClientRects()
                    truncLength += 4
                }
                setDisplayText(truncatedText)
            } else {
                setDisplayText(text)
            }
        }, [text, lines])

        return (
            <span
                style={{
                    display: 'block',
                    padding: '4px',
                    borderRadius: '4px',
                    ...(isSelected
                        ? {
                              color: isViewActive ? 'var(--mantine-color-white)' : 'inherit',
                              backgroundColor: isViewActive
                                  ? 'var(--mantine-color-blue-6)'
                                  : 'var(--mantine-color-gray-light)',
                          }
                        : {}),
                }}
                onClick={onClick}
            >
                <span title={text} ref={textRef}>
                    {displayText}
                </span>
            </span>
        )
    },
    { type: 'textarea' },
)
