import * as React from 'react'
import { Intent, HotkeysTarget2, Classes, Colors } from '@blueprintjs/core'
import { observable, runInAction } from 'mobx'
import classNames from 'classnames'
import { WithTranslation, withTranslation } from 'react-i18next'

import { debounce } from '$src/utils/debounce'
import { shouldCatchEvent } from '$src/utils/dom'
import Keys from '$src/constants/keys'

import '$src/css/log.css'

export interface JSObject extends Object {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

type Printable = string | number | boolean | JSObject

// FIXME: is it still needed/working?
const CLASS_OVERLAY_EXIT = 'bp3-overlay-exit'

function objectPropsToString(el: Printable): string {
    if ((typeof el).match(/number|string|boolean/)) {
        return el.toString()
    } else {
        const obj = el as JSObject
        return Object.keys(el)
            .map((prop) => obj[prop])
            .join(',')
    }
}

export const Logger = {
    logs: observable.array([]),
    log(...params: Printable[]): void {
        pushLog(params, 'none')
    },
    warn(...params: Printable[]): void {
        pushLog(params, 'warning')
    },
    success(...params: Printable[]): void {
        pushLog(params, 'success')
    },
    error(...params: Printable[]): void {
        pushLog(params, 'danger')
    },
}

function pushLog(lines: Printable[], intent: Intent): void {
    // since this method may be called from a render
    // function we wrap it into a setTimeout to
    // be sure the state is modified *outside*
    // of any render function
    setTimeout(() => {
        runInAction(() => {
            Logger.logs.push({
                date: new Date(),
                line: lines.map((line: Printable) => objectPropsToString(line)).join(' '),
                intent: intent,
            })
        })
    })
}

interface LogUIState {
    visible: boolean
}

interface Props extends WithTranslation {
    isDarkModeActive: boolean
}

const ESCAPE_KEY = 27
const DEBOUNCE_DELAY = 500

export class LogUIClass extends React.Component<Props, LogUIState> {
    private consoleDiv: HTMLDivElement
    private valid: boolean
    private lastScrollTop = 0
    private keepScrollPos = false
    private checkScroll: (event: React.FormEvent<HTMLElement>) => void = debounce((): void => {
        const scrollTop = this.consoleDiv.scrollTop
        if (!scrollTop || scrollTop !== this.consoleDiv.scrollHeight - this.consoleDiv.clientHeight) {
            this.keepScrollPos = true
        } else {
            this.keepScrollPos = false
        }

        // if state was visible, first keep scroll position
        this.lastScrollTop = scrollTop
    }, DEBOUNCE_DELAY)

    constructor(props: Props) {
        super(props)
        this.state = {
            visible: false,
        }
    }

    onKeyUp = (e: KeyboardEvent): void => {
        if (e.key === Keys.ESCAPE && this.valid) {
            this.setState({ visible: !this.state.visible })
        }
    }

    onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === Keys.ESCAPE && shouldCatchEvent(e)) {
            this.valid = true
        } else {
            this.valid = false
        }
    }

    componentDidUpdate(): void {
        // console.timeEnd('Log Render');
        // here we keep previous scroll position in case scrolling was anywhere but at the end
        this.consoleDiv.scrollTop = this.keepScrollPos
            ? this.lastScrollTop
            : this.consoleDiv.scrollHeight - this.consoleDiv.clientHeight
    }

    toggleConsole = (event: KeyboardEvent): void => {
        const element = event.target as HTMLElement

        if (this.state.visible || !element.className.match(CLASS_OVERLAY_EXIT))
            this.setState({
                visible: !this.state.visible,
            })
    }

    private hotkeys = [
        {
            global: true,
            combo: 'escape',
            label: this.props.t('SHORTCUT.LOG.TOGGLE'),
            onKeyDown: this.toggleConsole,
        },
    ]

    public render(): React.ReactElement {
        const classes = classNames('console', { visible: this.state.visible })

        return (
            <HotkeysTarget2 hotkeys={this.hotkeys}>
                <div
                    style={{
                        backgroundColor: this.props.isDarkModeActive ? Colors.DARK_GRAY3 : Colors.LIGHT_GRAY5,
                        color: this.props.isDarkModeActive ? Colors.LIGHT_GRAY3 : Colors.DARK_GRAY3,
                    }}
                    ref={(el) => {
                        this.consoleDiv = el
                    }}
                    onScroll={this.checkScroll}
                    className={classes}
                >
                    {Logger.logs.map((line, i) => {
                        const lineClass = classNames('consoleLine', line.intent)
                        return (
                            <div key={i} className={lineClass}>
                                {/* <span className="consoleDate">{line.date}</span> */}
                                {line.line}
                            </div>
                        )
                    })}
                </div>
            </HotkeysTarget2>
        )
    }
}

export function log(target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value
    descriptor.value = function (...args: any[]) {
        console.log(`${key} was called with:`, ...args)
        const result = originalMethod.apply(this, ...args)
        return result
    }
    return descriptor
}

const LogUI = withTranslation()(LogUIClass)

export { LogUI }
