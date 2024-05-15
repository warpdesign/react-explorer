import '@testing-library/jest-dom'
import '@testing-library/jest-dom/extend-expect'

global.console.error = jest.fn()

interface KeyboardIterator extends Iterator<[string, string]> {
    length: number
    [key: number]: [string, string]
}

interface KeyboardMap {
    entries: () => KeyboardIterator
}

// some tests are not executed with dom so won't have navigator property defined
if (global.navigator)
    global.navigator.keyboard = {
        getLayoutMap: () =>
            Promise.resolve(<KeyboardMap>({
                entries: () => [] as unknown as [string, string],
            } as unknown as KeyboardMap)),
    }
