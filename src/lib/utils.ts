export async function except(fn, fallback=null) {
    try {
        return await fn();
    } catch { }
    return fallback;
}

export function exceptSync(fn, fallback=null) {
    try {
        return fn();
    } catch { }
    return fallback;
}