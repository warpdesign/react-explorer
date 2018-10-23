import { Toaster, Position, Intent } from "@blueprintjs/core";
import { IconNames, IconName } from "@blueprintjs/icons";


const TOAST_TIMEOUT = 2000;

const MyToaster = Toaster.create({
    className: "recipe-toaster",
    position: Position.TOP,
});

interface IToasterOpts {
    message: string;
    icon: IconName;
    intent: Intent;
    timeout?: number
}

export const AppToaster = {
    show: (opts:IToasterOpts) => {
        MyToaster.show({timeout: TOAST_TIMEOUT, ...opts});
    }
}