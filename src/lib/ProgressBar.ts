import chalk from "chalk";

export class ProgressBar{
    static symbols = {
        prefix: ' ',
        postfix: ' ',
        filled: chalk.cyan('━'),
        empty: chalk.grey('━'),
        full: chalk.green('━'),
        error: chalk.red('━'),
        errorEmpty: chalk.redBright('━'),
    }
    value: number;
    max: number;
    min: number;
    width: number;
    useSymbols: any;

    static percentize(value, max, min) {
        return (value - min) / (max - min);
    }

    static render({
        max= 100,
        min= 0,
        value= 0,
        width = 20,
        isDone = false,
        isError = false,
        showText = false,
        customText = "$percent% $min/$max",
        symbols = ProgressBar.symbols
    } = {}) {
        symbols = Object.assign({}, ProgressBar.symbols, symbols);
        if (isDone) {
            return `${symbols.prefix}${symbols.full.repeat(width)}${symbols.postfix}`;
        }
        value = Math.min(value, max);
        value = Math.max(value, min);
        value = Math.round(value * 100) / 100;

        const percent = ProgressBar.percentize(value, max, min);
        const filledLen = Math.round(width * percent);
        const emptyLen = width - filledLen;
        const filled = symbols[isError?'error':'filled'].repeat(filledLen);
        const empty = symbols[isError?'errorEmpty':'empty'].repeat(emptyLen);
        const text = `${filled}${empty}`;
        let extraText = "";
        if (showText) {
            extraText = customText.replace(/\$percent/g, ""+(percent * 100))
                .replace(/\$value/g, ""+value)
                .replace(/\$min/g, ""+min)
                .replace(/\$max/g, ""+max);
        }

        return `${symbols.prefix}${text}${symbols.postfix}${extraText}`;
    }

    constructor({value=0, max=100, min=0, width=20, symbols=ProgressBar.symbols}={}) {
        this.value = value;
        this.max = max;
        this.min = min;
        this.width = width;
        this.useSymbols = symbols;
    }

    get bar() {
        return ProgressBar.render({
            max: this.max,
            min: this.min,
            value: this.value,
            width: this.width,
            symbols: this.useSymbols
        });
    }

    step(value = 1) {
        this.value += value;
        // this.value must be in [min, max]
        this.value = Math.min(this.value, this.max);
        this.value = Math.max(this.value, this.min);
        return this;
    }
}
