import * as React from "react";

import { Classes, Icon, ITreeNode, Tooltip, Tree } from "@blueprintjs/core";

export interface ITreeExampleState {
    nodes: ITreeNode[];
};

const INITIAL_STATE: ITreeNode[] = [
    {
        id: 0,
        hasCaret: true,
        icon: "folder-close",
        label: "Folder 0",
    },
    {
        id: 1,
        icon: "folder-close",
        isExpanded: true,
        label: <Tooltip content="I'm a folder <3">Folder 1</Tooltip>,
        childNodes: [
            {
                id: 2,
                icon: "document",
                label: "Item 0",
                secondaryLabel: (
                    <Tooltip content="An eye!">
                        <Icon icon="eye-open" />
                    </Tooltip>
                ),
            },
            {
                id: 3,
                icon: "tag",
                label: "Organic meditation gluten-free, sriracha VHS drinking vinegar beard man.",
            },
            {
                id: 4,
                hasCaret: true,
                icon: "folder-close",
                label: <Tooltip content="foo">Folder 2</Tooltip>,
                childNodes: [
                    { id: 5, label: "No-Icon Item" },
                    { id: 6, icon: "tag", label: "Item 1" },
                    {
                        id: 7,
                        hasCaret: true,
                        icon: "folder-close",
                        label: "Folder 3",
                        childNodes: [
                            { id: 8, icon: "document", label: "Item 0" },
                            { id: 9, icon: "tag", label: "Item 1" },
                        ],
                    },
                ],
            },
        ],
    },
];

export class FileList extends React.Component<{}, ITreeExampleState> {
    public state: ITreeExampleState = { nodes: INITIAL_STATE };

    public render() {
        return <Tree
            contents={this.state.nodes}
            className={Classes.ELEVATION_0}
        />;
    }
}