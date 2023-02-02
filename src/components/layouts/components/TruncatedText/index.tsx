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
        console.log(text, clientRects.length)
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
                console.log('testing with', truncatedText, { rightPos, leftPos, truncLength: truncLength / 2 })
                clientRects = element.getClientRects()
                truncLength += 4
            }
            setDisplayText(truncatedText)
        } else {
            setDisplayText(text)
        }
        // setDisplayText(text)
    }, [text, lines])

    // useEffect(() => {
    //   const element = textRef.current
    //   if (!element)
    //     return

    //   const handleResize = () => {
    //     // first set textContent to current node's text
    //     // since we are re-using existing node cells, this
    //     // could contain the previous cell's text
    //     // if (text.match(/CocoaHeads/i))
    //     //     debugger
    //     const previousText = element.textContent
    //     console.log('====\navant', element.textContent, text, text === element.textContent)
    //     element.textContext = text
    //     console.log('====\napres', element.textContent, text, text === element.textContent)
    //     let clientRects = element.getClientRects()
    //     console.log('lines', clientRects.length)
    //     let truncatedText = text
    //     if (clientRects.length > lines) {
    //       let truncLength = ellipsis.length
    //       const middle = Math.floor(text.length / 2)
    //       while (clientRects.length > lines) {
    //         const leftPos = middle - Math.floor(truncLength / 2)
    //         const leftPart = text.slice(0, leftPos)
    //         const rightPos = middle + Math.floor(truncLength / 2)
    //         const rightPart = text.slice(-(text.length - rightPos))
    //         const croppedText = `${leftPart}${rightPart}`
    //         truncatedText = croppedText.substring(0, 4).trimRight() + '…' + croppedText.substring(5).trimLeft()
    //         element.textContent = truncatedText
    //         console.log('testing with', truncatedText, { rightPos, leftPos, truncLength: truncLength / 2 })
    //         clientRects = element.getClientRects()
    //         truncLength += 4
    //       }
    //       // fill
    //     //   let size = truncatedText.length + 1
    //     //   while(clientRects.length <= lines) {
    //     //     truncatedText = truncatedText.slice(0, size)
    //     //     element.textContent = truncatedText
    //     //     clientRects = element.getClientRects()
    //     //   }
    //       setDisplayText(truncatedText)
    //       element.textContent = truncatedText
    //     } else {
    //       setDisplayText(text)
    //       element.textContent = text
    //     }
    //   }
    //   // window.addEventListener('resize', handleResize)
    //   handleResize()
    // //   return () => {
    // //     window.removeEventListener('resize', handleResize)
    // //   }
    // }, [text, lines])

    // useEffect(() => {
    //     textRef.current.textContent = displayText
    // }, [])
    return (
        <span>
            <span ref={textRef}>{displayText}</span>
        </span>
    )
}
