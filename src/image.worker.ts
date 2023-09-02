self.addEventListener(
    'message',
    async (e: MessageEvent) => {
        const images: string[] = e.data.paths
        const fixedHeight = 256 //e.data.fixedHeight
        // Open the IndexedDB connection
        async function resizeImage(path: string, fixedHeight: number) {
            try {
                const response = await fetch(path)
                const blob = await response.blob()
                const img = await createImageBitmap(blob)

                const ratio = img.width / img.height
                const newWidth = fixedHeight * ratio
                const offscreenCanvas = new OffscreenCanvas(newWidth, fixedHeight)

                const ctx = offscreenCanvas.getContext('2d')
                if (ctx) {
                    ctx.drawImage(img, 0, 0, newWidth, fixedHeight)
                    const blob = await offscreenCanvas.convertToBlob()
                    function blobToBase64(blob: Blob) {
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader()
                            reader.onloadend = () => {
                                const base64data = reader.result as string
                                resolve(base64data)
                            }
                            reader.onerror = (error) => {
                                reject(error)
                            }
                            reader.readAsDataURL(blob)
                        })
                    }
                    return { path, value: await blobToBase64(blob) }
                } else {
                    console.log(new Error('Failed to get canvas context'))
                    return { path, value: null }
                }
            } catch (e) {
                console.log(e, path)
                return { path, value: null }
            }
        }

        const results: { path: string; value: any }[] = []
        for (const imageSrc of images) {
            results.push(await resizeImage(imageSrc, fixedHeight))
        }

        self.postMessage(results)
    },
    false,
)

export default {} as typeof Worker & (new () => Worker)
