import * as React from 'react';
import { observer } from 'mobx-react';
import { observable, runInAction } from 'mobx';
import { debounce } from '../utils/debounce';

require('../css/log.css');

export const Logger = {
    logs: observable.array(new Array()),
    log(...lines: (string | number | boolean)[]) {
        pushLog(lines, 'none');
    },
    warn(...lines: (string | number | boolean)[]) {
        pushLog(lines, 'warn');
    },
    error(...lines: (string | number | boolean)[]) {
        pushLog(lines, 'error');
    }
};

function pushLog(lines: (string|number|boolean)[], intent: 'none' | 'warn' | 'error') {
    // since this method may be called from a render
    // function we wrap it into a setTimeout to
    // be sure the state is modified *outside*
    // of any render function
    setTimeout(() => {
        console.log.apply(undefined, lines);
        runInAction(() => {
            Logger.logs.push({
                date: new Date(),
                line: lines.join(' '),
                intent: intent
            });
        });
    });
}

interface LogUIState{
    visible: boolean;
}

const ESCAPE_KEY = 27;
const DEBOUNCE_DELAY = 500;

@observer
export class LogUI extends React.Component<any, LogUIState> {
    private consoleDiv: HTMLDivElement;
    private valid: boolean;
    private lastScrollTop: number = 0;
    private keepScrollPos: boolean = false;
    private checkScroll: (event: React.FormEvent<HTMLElement>) => void = debounce(
        (event: React.FormEvent<HTMLElement>) => {
            const scrollTop = this.consoleDiv.scrollTop;
            if (!scrollTop || scrollTop !== (this.consoleDiv.scrollHeight - this.consoleDiv.clientHeight)) {
                this.keepScrollPos = true;
            } else {
                this.keepScrollPos = false;
            }

            // if state was visible, first keep scroll position
            this.lastScrollTop = scrollTop;
        }, DEBOUNCE_DELAY);

    constructor(props: {}) {
        super(props);
        this.state = {
            visible: false
        };
    }

    onKeyUp = (e: KeyboardEvent) => {
        if (e.keyCode === ESCAPE_KEY && this.valid) {
            this.setState({ visible: !this.state.visible });
        }
    }

    onKeyDown = (e: KeyboardEvent) => {
        const element = e.target as HTMLElement || null;
        const tagName = element.tagName.toLowerCase();
        if (e.keyCode === ESCAPE_KEY &&
            !tagName.match(/input|textarea/) &&
            (!element || !element.classList.contains('bp3-menu-item')) &&
            !document.body.classList.contains('bp3-overlay-open'))
        {
            this.valid = true;
        } else {
            this.valid = false;
        }
    }


    componentDidMount() {
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('keydown', this.onKeyUp);
    }

    componentDidUpdate() {
        // console.timeEnd('Log Render');
        // here we keep previous scroll position in case scrolling was anywhere but at the end
        this.consoleDiv.scrollTop = this.keepScrollPos ? this.lastScrollTop : (this.consoleDiv.scrollHeight - this.consoleDiv.clientHeight);
    }

    // shouldComponentUpdate() {
    //     console.time('Log Render');
    //     return true;
    // }

    public render() {
        const classes = 'console ' + (this.state.visible && 'visible');

        return (
            <div ref={(el) => { this.consoleDiv = el; }} onScroll={this.checkScroll} className={`${classes}`}>
            {
                Logger.logs.map((line, i) => {
                        return <div key={i} className={`consoleLine ${line.intent}`}>
                        {/* <span className="consoleDate">{line.date}</span> */}
                        {line.line}
                    </div>
                })
            }
            </div>
        )
    }
}
