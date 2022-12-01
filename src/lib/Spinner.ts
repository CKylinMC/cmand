import { logSymbols } from "./utils";

// ref: Ora
export class Spinner{
    frames = [
        '⠋',
        '⠙',
        '⠹',
        '⠸',
        '⠼',
        '⠴',
        '⠦',
        '⠧',
        '⠇',
        '⠏',
    ];
    interval: number;
    timer: NodeJS.Timer;
    tip: string;
    index: number;
    status = 0;
    stream = process.stderr;

    constructor(text = "Please wait...") {
        this.interval = 80;
        this.tip = text;
        this.index = 0;
    }

    start() {
        if (this.status != 0) return this;
        this.status = 1;
        this.stream.write('\u001B[?25l');
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.render(), this.interval);
        return this;
    }

    render() {
        if (this.status != 1) return this;
        this.clear();
        this.index = ++this.index % this.frames.length;
        this.stream.write(`${this.frames[this.index]} ${this.tip}`);
        return this;
    }

    stop() {
        if (this.status != 1) return this;
        this.status = 2;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.clear();
        this.stream.write('\u001B[?25h');
        return this;
    }

    success(text = null, icon = logSymbols.success+" ") {
        this.stop();
        let aftertext = text ? text : "success";
        this.stream.write(`${icon}${aftertext}\n`);
    }

    fail(text = null, icon = logSymbols.error+" ") {
        this.stop();
        let aftertext = text ? text : "failed";
        this.stream.write(`${icon}${aftertext}\n`);
    }

    text(str = null) {
        if (str != null)
            this.tip = str;
        return this;
    }

    clear() {
        this.stream.cursorTo(0);
        this.stream.clearLine(1);
        this.stream.cursorTo(0);
        return this;
    }
}