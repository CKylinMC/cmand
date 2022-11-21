import crypto from 'crypto';
export async function except(fn, fallback = null) {
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

export function randstr(len = 8) {
    return Math.random().toString(36).substr(2, len);
}

export function md5(txt) {
    return crypto.createHash('md5').update(txt).digest('hex');
}
