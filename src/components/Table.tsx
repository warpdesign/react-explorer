import * as React from 'react';
import { Intent, Spinner, IconName, Icon, Button } from '@blueprintjs/core';
import { Column, Table, AutoSizer, Index } from 'react-virtualized';
require('react-virtualized/styles.css');
require('../css/table.css');

interface IProps {
    intent?: Intent;
    text?: string;
    progress?: number;
}

interface file{
    name: string;
    icon: IconName;
    size: number;
    selected: boolean;
}

interface IState{
    nodes: file[],
    lastSelected: number
};

export class FileTable extends React.Component<IProps, IState> {
    static defaultProps = {
        intent: Intent.NONE,
        text: '1',
        progress: 0
    }

    constructor(props: IProps) {
        super(props);
        this.state = {
            nodes: this.generateTable(7000),
            lastSelected: -1
        }
    }

    generateTable(size: number): file[] {
        const nodes = new Array<file>();

        for (let i = 0; i < size; ++i) {
            nodes.push({
                name: 'file-' + i,
                icon: 'document',
                size: 100,
                selected: i === 0 ? true : false
            });
        }

        return nodes;
    }

    _noRowsRenderer = () => {
        return (<div>Empty</div>);
    }

    getRow(index:number) {
        return this.state.nodes[index];
    }

    _sort = () => {
        console.log('need to sort table');
    }

    nameRenderer = (data: any) => {
        return (<div className="name"><Icon icon="document"></Icon><span>{data.cellData}</span></div>);
    }

    rowClassName = (data: any) => {
        const element = this.state.nodes[data.index];
        if (element && element.selected) {
            return 'tableRow selected';
        } else {
            return 'tableRow';
        }
    }

    onRowClick = (data: any) => {
        const { nodes } = this.state;
        const element = data.rowData;
        element.selected = !element.selected;
        this.setState({
            nodes: nodes,
            lastSelected: data.index
        });
    }

    render() {
        const { intent, text, progress } = this.props;
        const rowGetter = (index:Index) => this.getRow(index.index);
        const rowCount = this.state.nodes.length;
        const scrollToIndex = this.state.lastSelected;

        return (<div className="fileListSizerWrapper">
            <AutoSizer>
            {({ width, height }) => (
                    <Table
                        ref="Table"
                        disableHeader={true}
                        headerClassName="tableHeader"
                        headerHeight={30}
                        height={height}
                        onRowClick={this.onRowClick}
                        noRowsRenderer={this._noRowsRenderer}
                        // overscanRowCount={overscanRowCount}
                        rowClassName={this.rowClassName}
                        rowHeight={30}
                        rowGetter={rowGetter}
                        rowCount={rowCount}
                        scrollToIndex={scrollToIndex}
                        sort={this._sort}
                        // sortBy={sortBy}
                        // sortDirection={sortDirection}
                        width={width}>
                        {/* {!hideIndexRow && (
                        <Column
                            label="Index"
                            cellDataGetter={({ rowData }) => rowData.index}
                            dataKey="index"
                            disableSort={!this._isSortEnabled()}
                            width={60}
                        />
                    )} */}
                        <Column
                            dataKey="name"
                            label="Name"
                            // disableSort={!this._isSortEnabled()}
                            // headerRenderer={this._headerRenderer}
                            cellRenderer={this.nameRenderer}
                            width={10}
                            flexGrow={1}
                        />
                        <Column
                            className="size"
                            width={90}
                            disableSort
                            label="Size"
                            dataKey="size"
                            flexShrink={1}
                        // className={styles.exampleColumn}
                        // cellRenderer={({ cellData }) => cellData}
                        // flexGrow={1}
                        />
                    </Table>
                )
            }
        </AutoSizer></div>);
    }
}
