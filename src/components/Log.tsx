import * as React from 'react';
import { observer } from 'mobx-react';
import { observable, runInAction } from 'mobx';
import { debounce } from '../utils/debounce';
import { Intent, HotkeysTarget, Hotkeys, Hotkey, Classes, IHotkeysProps } from '@blueprintjs/core';
import { WithNamespaces, withNamespaces } from 'react-i18next';
import { shouldCatchEvent } from '../utils/dom';
import classnames from 'classnames';

require('../css/log.css');

export interface JSObject extends Object {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

type Printable = string | number | boolean | JSObject;

//
const CLASS_OVERLAY_EXIT = 'bp3-overlay-exit';

function objectPropsToString(el: Printable): string {
    if ((typeof el).match(/number|string|boolean/)) {
        return el.toString();
    } else {
        const obj = el as JSObject;
        return Object.keys(el)
            .map((prop) => obj[prop])
            .join(',');
    }
}

export const Logger = {
    logs: observable.array([]),
    log(...params: Printable[]): void {
        pushLog(params, 'none');
    },
    warn(...params: Printable[]): void {
        pushLog(params, 'warning');
    },
    success(...params: Printable[]): void {
        pushLog(params, 'success');
    },
    error(...params: Printable[]): void {
        pushLog(params, 'danger');
    },
};

function pushLog(lines: Printable[], intent: Intent): void {
    // since this method may be called from a render
    // function we wrap it into a setTimeout to
    // be sure the state is modified *outside*
    // of any render function
    setTimeout(() => {
        // console.log.apply(undefined, lines);
        runInAction(() => {
            Logger.logs.push({
                date: new Date(),
                line: lines.map((line: Printable) => objectPropsToString(line)).join(' '),
                intent: intent,
            });
        });
    });
}

interface LogUIState {
    visible: boolean;
}

const ESCAPE_KEY = 27;
const DEBOUNCE_DELAY = 500;

@HotkeysTarget
@observer
export class LogUIClass extends React.Component<WithNamespaces, LogUIState> {
    private consoleDiv: HTMLDivElement;
    private valid: boolean;
    private lastScrollTop = 0;
    private keepScrollPos = false;
    private checkScroll: (event: React.FormEvent<HTMLElement>) => void = debounce((): void => {
        const scrollTop = this.consoleDiv.scrollTop;
        if (!scrollTop || scrollTop !== this.consoleDiv.scrollHeight - this.consoleDiv.clientHeight) {
            this.keepScrollPos = true;
        } else {
            this.keepScrollPos = false;
        }

        // if state was visible, first keep scroll position
        this.lastScrollTop = scrollTop;
    }, DEBOUNCE_DELAY);

    constructor(props: WithNamespaces) {
        super(props);
        this.state = {
            visible: false,
        };
    }

    onKeyUp = (e: KeyboardEvent): void => {
        if (e.keyCode === ESCAPE_KEY && this.valid) {
            this.setState({ visible: !this.state.visible });
        }
    };

    onKeyDown = (e: KeyboardEvent): void => {
        if (e.keyCode === ESCAPE_KEY && shouldCatchEvent(e)) {
            this.valid = true;
        } else {
            this.valid = false;
        }
    };

    componentDidUpdate(): void {
        // console.timeEnd('Log Render');
        // here we keep previous scroll position in case scrolling was anywhere but at the end
        this.consoleDiv.scrollTop = this.keepScrollPos
            ? this.lastScrollTop
            : this.consoleDiv.scrollHeight - this.consoleDiv.clientHeight;
    }

    toggleConsole = (event: KeyboardEvent): void => {
        const element = event.target as HTMLElement;

        if (this.state.visible || !element.className.match(CLASS_OVERLAY_EXIT))
            this.setState({
                visible: !this.state.visible,
            });
    };

    renderHotkeys(): React.ReactElement<IHotkeysProps> {
        const { t } = this.props;

        return (
            <Hotkeys>
                <Hotkey
                    global={true}
                    combo="escape"
                    label={t('SHORTCUT.LOG.TOGGLE')}
                    onKeyDown={this.toggleConsole}
                ></Hotkey>
            </Hotkeys>
        ) as React.ReactElement<IHotkeysProps>;
    }

    // shouldComponentUpdate() {
    //     console.time('Log Render');
    //     return true;
    // }

    public render(): React.ReactElement {
        const classes = classnames('console', { visible: this.state.visible });

        return (
            <div
                ref={(el) => {
                    this.consoleDiv = el;
                }}
                onScroll={this.checkScroll}
                className={classes}
            >
                {Logger.logs.map((line, i) => {
                    const lineClass = classnames('consoleLine', line.intent);
                    return (
                        <div key={i} className={lineClass}>
                            {/* <span className="consoleDate">{line.date}</span> */}
                            {line.line}
                        </div>
                    );
                })}
            </div>
        );
    }
}

export function log(target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
        console.log(`${key} was called with:`, ...args);
        const result = originalMethod.apply(this, ...args);
        return result;
    };
    return descriptor;
}

const LogUI = withNamespaces()(LogUIClass);

export { LogUI };
