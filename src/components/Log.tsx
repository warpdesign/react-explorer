import * as React from 'react';
import { observer } from 'mobx-react';
import { observable, runInAction } from 'mobx';
import { debounce } from '../utils/debounce';

require('../css/log.css');

export const Logger = {
    logs: observable.array(new Array()),
    log(...lines: (string | number)[]) {
        // since this method may be called from a render
        // function we wrapp it into a setTimeout to
        // be sure the state is modified *outside*
        // of any render function
        setTimeout(() => {
            console.log.apply(undefined, lines);
            runInAction(() => {
                this.logs.push({
                    date: new Date(),
                    line: lines.join(' ')
                });
            });
        })
    }
};

interface LogUIState{
    visible: boolean;
}

const ESCAPE_KEY = 27;
const DEBOUNCE_DELAY = 500;

@observer
export class LogUI extends React.Component<any, LogUIState> {
    private consoleDiv: HTMLDivElement;
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
        if (e.keyCode === ESCAPE_KEY) {
            this.setState({ visible: !this.state.visible });
        }
    }

    componentWillMount() {
        document.addEventListener('keyup', this.onKeyUp);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.onKeyUp);
    }

    componentDidUpdate() {
        // here we keep previous scroll position in case scrolling was anywhere but at the end
        this.consoleDiv.scrollTop = this.keepScrollPos ? this.lastScrollTop : (this.consoleDiv.scrollHeight - this.consoleDiv.clientHeight);
    }

    public render() {
        const classes = 'console ' + (this.state.visible && 'visible');

        return (
            <div ref={(el) => { this.consoleDiv = el; }} onScroll={this.checkScroll} className={`${classes}`}>
            {
                Logger.logs.map((line, i) => {
                        return <div key={i} className="consoleLine">
                        {/* <span className="consoleDate">{line.date}</span> */}
                        {line.line}
                    </div>
                })
            }
            </div>
        )
    }
}
