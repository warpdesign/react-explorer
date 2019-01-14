export function shouldCatchEvent(e:Event):boolean {
    const element = e.target as HTMLElement;
    const tagName = element && element.tagName.toLowerCase() || '';

    return (!tagName.match(/input|textarea/) &&
        (!element || !element.classList.contains('bp3-menu-item')) &&
        !document.body.classList.contains('bp3-overlay-open'));
}

export function getTargetTagName(e: Event): string {
    const element = e.target as HTMLElement;
    return element.tagName.toLowerCase();
}