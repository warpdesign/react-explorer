import * as React from 'react';
import { observer } from 'mobx-react';
import { observable, runInAction } from 'mobx';

require('../css/log.css');

interface LogLine{
    line: string;
    date: Date
}

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

Logger.log('dtc', 3);

const ESCAPE_KEY = 27;

@observer
export class LogUI extends React.Component<any, LogUIState> {
    private consoleDiv: HTMLDivElement;
    private lastScrollTop: number = 0;
    private keepBottom: boolean = false;

    constructor(props: {}) {
        super(props);
        this.state = {
            visible: false
        };
    }

    onKeyUp = (e: KeyboardEvent) => {
        if (e.keyCode === ESCAPE_KEY) {
            // if state was visible, first keep scroll position
            if (this.state.visible) {
                this.lastScrollTop = this.consoleDiv.scrollTop;
            }
            this.setState({ visible: !this.state.visible });
        }
    }

    componentWillMount() {
        document.addEventListener('keyup', this.onKeyUp);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.onKeyUp);
    }

    componentWillUpdate() {
        if (this.consoleDiv.scrollTop === this.consoleDiv.scrollHeight) {
            this.keepBottom = true;
        } else {
            this.keepBottom = false;
        }
    }

    componentDidUpdate() {
        this.consoleDiv.scrollTop = this.keepBottom && this.consoleDiv.scrollHeight || this.lastScrollTop;
    }

    public render() {
        const classes = 'console ' + (this.state.visible && 'visible');

        return (
            <div ref={(el) => { this.consoleDiv = el; }} className={`${classes}`}>
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
