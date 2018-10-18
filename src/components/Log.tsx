import * as React from 'react';
import { observer } from 'mobx-react';
import { observable } from 'mobx';

require('../css/log.css');

interface LogLine{
    line: string;
    date: Date
}

export const Logger = observable({
    logs: new Array(),
    log(line:string) {
        this.logs.push({
            date: new Date(),
            line
        });
    }
});

Logger.log('hey !!');

interface LogUIState{
    visible: boolean;
}

const ESCAPE_KEY = 27;

@observer
export class LogUI extends React.Component<any, LogUIState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            visible: false
        };
    }

    onKeyUp = (e: KeyboardEvent) => {
        console.log('log keyup');
        if (e.keyCode === ESCAPE_KEY) {
            this.setState({ visible: !this.state.visible });
        }
    }

    componentWillMount() {
        console.log('willMount');
        document.addEventListener('keyup', this.onKeyUp);
    }

    componentWillUnmount() {
        console.log('willUnmount');
        document.removeEventListener('keyup', this.onKeyUp);
    }

    public render() {
        const classes = 'console ' + (this.state.visible && 'visible');

        console.log('render log', Logger.logs[0].line);
        Logger.logs.map((line) => {
            console.log('//', line.line);
        });

        return (
            <div className={`${classes}`}>
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