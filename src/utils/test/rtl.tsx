import React from 'react'
import { render } from '@testing-library/react'
import { makeAutoObservable } from 'mobx'
import { Provider } from 'mobx-react'

class State {
    lang = 'fr'
    darkMode = false

    constructor() {
        makeAutoObservable(this)
    }
}

const renderWithProvider = (jsx: React.ReactElement) => {
    const settingsState = new State()
    return render(<Provider settingsState={settingsState}>{jsx}</Provider>)
}

// TODO: provide all needed providers for react-explorer
// const AllTheProviders = ({children}) => {
//   return (
//     <ThemeProvider theme="light">
//       <TranslationProvider messages={defaultStrings}>
//         {children}
//       </TranslationProvider>
//     </ThemeProvider>
//   )
// }

// const customRender = (ui, options) =>
//   render(ui, {wrapper: AllTheProviders, ...options})

// re-export everything
export * from '@testing-library/react'

// override render method
export { renderWithProvider }
