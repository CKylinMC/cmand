import chalk from 'chalk';
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


// append lib below to use it with vercel/pkg

// ref sindresorhus/is-unicode-supported
export function isUnicodeSupported() {
	if (process.platform !== 'win32') {
		return process.env.TERM !== 'linux'; // Linux console (kernel)
	}

	return Boolean(process.env.CI)
		|| Boolean(process.env.WT_SESSION) // Windows Terminal
		|| Boolean(process.env.TERMINUS_SUBLIME) // Terminus (<0.2.27)
		|| process.env.ConEmuTask === '{cmd::Cmder}' // ConEmu and cmder
		|| process.env.TERM_PROGRAM === 'Terminus-Sublime'
		|| process.env.TERM_PROGRAM === 'vscode'
		|| process.env.TERM === 'xterm-256color'
		|| process.env.TERM === 'alacritty'
		|| process.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm';
}

// ref sindresorhus/log-symbols
const main = {
	info: chalk.blue('ℹ'),
	success: chalk.green('✔'),
	warning: chalk.yellow('⚠'),
	error: chalk.red('✖'),
};

const fallback = {
	info: chalk.blue('i'),
	success: chalk.green('√'),
	warning: chalk.yellow('‼'),
	error: chalk.red('×'),
};

export function proxyedUrl(cfproxy, url) {
	if (cfproxy.length > 0) {
		if (cfproxy.endsWith('/')) {
			cfproxy = cfproxy.substr(0, cfproxy.length - 1);
		}
		if (url.startsWith("https://")) {
			url = url.replace("https://", "/");
		} else if (url.startsWith("http://")) {
			url = url.replace("http://", "/");
		}
		url = cfproxy + url;
	}
	return url;
}

export const logSymbols = isUnicodeSupported() ? main : fallback;
