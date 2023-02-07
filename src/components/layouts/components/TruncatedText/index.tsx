import React, { useState, useEffect, useRef } from 'react'

interface TruncateProps {
    text: string
    lines: number
    ellipsis?: string
}

export const TruncatedText = ({ text, lines, ellipsis = '....' }: TruncateProps) => {
    const [displayText, setDisplayText] = useState(text)
    const textRef = useRef(null)

    useEffect(() => {
        const element = textRef.current
        element.textContent = text
        let clientRects = element.getClientRects()
        // console.log(text, clientRects.length)
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
        // setDisplayText(text)
    }, [text, lines])

    return (
        <span className="truncated" style={{ display: 'block' }}>
            <span title={text} ref={textRef}>
                {displayText}
            </span>
        </span>
    )
}
