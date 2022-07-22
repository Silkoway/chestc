import chalk from "chalk";

const specialChars: string[] = " (){}[];+-*/%=\n,><…".split("")
const isNum = (num: string) => {
    var dots = 0;
    var notnum = false;
    num.split("").forEach(letter => {
        if (letter === '.') {
            dots++;
        }
        if (letter.match(/[0-9]/g) !== null) {
            return;
        } else {
            notnum = true;
        }
    })
    //console.log(`${chalk.green('[DEBUG]')} ${num} ${!notnum && dots <= 1 && num !== ''}`)
    return !notnum && dots <= 1 && num !== '';
}

export class Token {
    value: string;
    type: string;
    line: number;
    char: number;
    constructor(value: string, type: string, line: number, char: number) {
        this.value = value;
        this.type = type;
        this.line = line;
        this.char = char;
    }
}

export const lex = (file: string) => {
    file += ' '
    var lets = file.replace(/\t/g, '').replace(/\.{3}/g, '…').split('')
    var words: Token[] = []
    var curword = ''
    var instring = false;
    var inCompString = false;
    var incomment = 0;
    var char = 1;
    var line = 1;
    for (let i = 0; i < lets.length; i++) {
        const curLet = lets[i];
        char++;
        if (incomment >= 2 && curLet !== '\n') continue;
        if (curLet === '"' && !instring && !inCompString) {
            instring = true;
        }
        else if (curLet === '"' && instring && !inCompString) {
            instring = false;
        }
        if (curLet === '`' && !inCompString && !instring) {
            inCompString = true;
        }
        else if (curLet === '`' && inCompString && !instring) {
            inCompString = false;
        }
        if (specialChars.includes(curLet) && !inCompString && !instring) {
            var wordType = ''
            switch (curword) {
                case 'use':
                    wordType = 'Use'
                    break;
                case 'imp':
                    wordType = 'Imp'
                    break;
                case 'global':
                    wordType = 'Global'
                    break;
                case 'local':
                    wordType = 'Local'
                    break;
                case 'macro':
                    wordType = 'Macro'
                    break;
                case 'func':
                    wordType = 'Func'
                    break;
                case 'event':
                    wordType = 'Event'
                    break;
                case 'return':
                    wordType = 'Return'
                    break;
                case 'import':
                    wordType = 'Import'
                    break;
                case 'if':
                    wordType = 'If'
                    break;
                case 'unless':
                    wordType = 'Unless'
                    break;
                default:
                    if ((curword.startsWith("\"") && curword.endsWith("\"")) || (curword.startsWith("'") && curword.endsWith("'"))) {
                        curword = curword.slice(1, -1)
                        wordType = "String"
                        break;
                    }
                    if (curword.startsWith('`') && curword.endsWith('`')) {
                        curword = curword.slice(1, -1)
                        wordType = "CompileString"
                        break;
                    }
                    if (isNum(curword)) {
                        wordType = "Number"
                        break;
                    }
                    wordType = "Object"
                    break;
            }
            if (!(curword === '' && wordType === 'Object')) words.push(new Token(curword, wordType, line, char))
            curword = ''
            switch (curLet) {
                case '(':
                    words.push(new Token('', 'LeftParen', line, char))
                    break;
                case ')':
                    words.push(new Token('', 'RightParen', line, char))
                    break;
                case '{':
                    words.push(new Token('', 'LeftCurly', line, char))
                    break;
                case '}':
                    words.push(new Token('', 'RightCurly', line, char))
                    break;
                case '[':
                    words.push(new Token('', 'LeftSquare', line, char))
                    break;
                case ']':
                    words.push(new Token('', 'RightSquare', line, char))
                    break;
                case ';':
                    words.push(new Token('', 'Semi', line, char))
                    break;
                case '+':
                    words.push(new Token('', 'Add', line, char))
                    break;
                case '-':
                    words.push(new Token('', 'Sub', line, char))
                    break;
                case '*':
                    words.push(new Token('', 'Mul', line, char))
                    break;
                case '/':
                    incomment++;
                    words.push(new Token('', 'Div', line, char))
                    
                    if (incomment >= 2) words = words.slice(0, -2)
                    break;
                case '%':
                    words.push(new Token('', 'Mod', line, char))
                    break;
                case '=':
                    words.push(new Token('', 'Assign', line, char))
                    break;
                case ',':
                    words.push(new Token('', 'Comma', line, char))
                    break;
                case '\n':
                    incomment = 0;
                    char = 1;
                    line++;
                    break;
                case '>':
                    words.push(new Token('', 'Greater', line, char))
                    break;
                case '<':
                    words.push(new Token('', 'Lesser', line, char))
                    break;
                case '…':
                    words.push(new Token('', 'Ellipses', line, char))
                    break;
            }
        } else {
            curword += curLet;
        }
    }

    var logicwords = [];

    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if ("Add Sub Mul Div Mod Greater Lesser Assign".split(" ").includes(w.type)) {
            if (words[i+1].type === 'Assign') {
                logicwords.push(new Token('', `${w.type}_Equal`, w.line, w.char))
                i++;
                continue;
            }
        }
        logicwords.push(w)
    }

    return logicwords
}

