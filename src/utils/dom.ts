export function shouldCatchEvent(e:Event):boolean {
    const element = e.target as HTMLElement;
    const tagName = element && element.tagName.toLowerCase() || '';

    return (!tagName.match(/input|textarea/) &&
        (!element || !element.hasAttribute('contenteditable')) &&
        (!element || !element.classList.contains('bp3-menu-item')) &&
        !document.body.classList.contains('bp3-overlay-open'));
}

export function isEditable(element: Element): boolean {
    const tagName = element && element.tagName.toLowerCase() || '';

    return ((!!tagName.match(/input|textarea/) ||
        (element && element.hasAttribute('contenteditable'))));
}

export function getTargetTagName(e: Event): string {
    const element = e.target as HTMLElement;
    return element.tagName.toLowerCase();
}
