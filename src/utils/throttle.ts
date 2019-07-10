export function throttle(func: any, delay: number): any {
  let timeout: any = 0;
  return function (...args: any[]) {
    if (!timeout) {
      timeout = setTimeout(() => {
        func.call(this, ...args)
        timeout = null
      }, delay)
    }
  }
}
