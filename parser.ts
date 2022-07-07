import { boolean } from "yargs";
import { debug, err } from ".";
import { errType } from "./errType";
import { lex, Token } from "./lexer";

class BinaryNode {
    type: string;
    left: AnyNode;
    right: AnyNode;
    constructor(type: string, left: AnyNode, right: AnyNode) {
        this.type = type;
        this.left = left;
        this.right = right;
    }
}
class BlockNode {
    type: string;
    value: string;
    args: AnyNode[];
    body: AnyNode[];
    constructor(type: string, value: string, args: AnyNode[], body: AnyNode[]) {
        this.type = type;
        this.value = value;
        this.args = args;
        this.body = body;
    }
}
class EventNode {
    type: string;
    value: string;
    body: AnyNode[];
    constructor(value: string, body: AnyNode[]) {
        this.type = "Event";
        this.value = value;
        this.body = body;
    }
}
class UnaryNode {
    type: string;
    value: any | any[]
    constructor(type: string, value: any | any[]) { this.type = type; this.value = value }
}
class CallNode {
    type: string;
    value: string;
    args: AnyNode[];
    constructor(type: string, value: string, body: AnyNode[]) {
        this.type = type;
        this.value = value;
        this.args = body;
    }
}
class VarDefNode {
    type: string;
    value: string;
    init?: AnyNode;
    constructor(type: string, value: string, init?: AnyNode) {
        this.type = type;
        this.value = value;
        this.init = init;
    }
}

type AnyNode = BinaryNode | BlockNode | EventNode | UnaryNode | CallNode | VarDefNode;

function parseMath(tokens: Token[]) {
    var i = 0;
    const at = () => tokens[i];
    function parseExpression(): AnyNode {
        let lhs: AnyNode = parse_term();

        while (at()?.type === 'Add' || at()?.type === 'Sub') {
            var op = at().type
            i++
            let rhs = parseExpression();
            lhs = new BinaryNode(op, lhs, rhs)
        }

        return lhs
    }
    function parse_term(): AnyNode {
        let lhs: AnyNode = parse_factor();

        while (at()?.type === 'Div' || at()?.type === 'Mul' || at()?.type === 'Mod') {
            var op = at().type
            i++
            let rhs = parseExpression();
            lhs = new BinaryNode(op, lhs, rhs)
        }

        return lhs
    }

    function parse_factor(): AnyNode {
        if (!(["LeftParen", "RightParen"].includes(at()?.type))) {
            var temp = new UnaryNode("Number", at()?.value)
            i++;
            return temp
        }
        i++;

        let expr: AnyNode = new UnaryNode('Err', '');

        while (at()?.type !== "RightParen" && at() !== undefined) {
            expr = parseExpression()
        }
        i++;

        return expr
    }

    return parseExpression()
}

export function parse(tokens: Token[], depth: number = 0) {
    var parsed: AnyNode[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        switch (tok.type) {
            case 'Event':
                if (depth !== 0) {
                    err(`"event" keyword can only be used in the top level.`, errType.EventKeywordNotInTopLevel)
                }
                var blockbody: Token[] = [];
                var curlydepth = 0;
                var finalIndex = i;
                for (let j = i + 2; j < tokens.length; j++) {
                    const tok2 = tokens[j];
                    blockbody.push(tok2)
                    if (tok2.type === 'LeftCurly') {
                        curlydepth++;
                    }
                    if (tok2.type === 'RightCurly') {
                        curlydepth--;
                        finalIndex = j;
                        if (curlydepth === 0) break;
                    }
                }
                parsed.push(new EventNode(tokens[i + 1].value, parse(blockbody.slice(1, -1))))
                i = finalIndex
                break;
            case 'Macro':
            case 'Func':
                var argsbody: Token[] = [];
                var startBlockIndex = -1;
                {
                    var parendepth = 0;
                    var broke = false;
                    for (let j = i + 2; j < tokens.length; j++) {
                        const tok2 = tokens[j];
                        argsbody.push(tok2)
                        if (tok2.type === 'LeftParen') {
                            parendepth++;
                        }
                        if (tok2.type === 'RightParen') {
                            parendepth--;
                            if (parendepth === 0) {
                                startBlockIndex = j + 1;
                                broke = true;
                                break;
                            }
                        }
                    }
                    if (!broke) err(`Parentheses not ended in ${tok.type === 'Func' ? 'function' : 'macro'} definition.`, errType.ParenthesesNotEnded)
                }
                var blockbody: Token[] = [];
                var finalIndex = i;
                {
                    var curlydepth = 0;
                    var broke = false;
                    for (let j = startBlockIndex; j < tokens.length; j++) {
                        const tok2 = tokens[j];
                        blockbody.push(tok2)
                        if (tok2.type === 'LeftCurly') {
                            curlydepth++;
                        }
                        if (tok2.type === 'RightCurly') {
                            curlydepth--;
                            broke = true;
                            finalIndex = j;
                            if (curlydepth === 0) break;
                        }
                    }
                    if (!broke) err(`Curly brackets not ended in ${tok.type === 'Func' ? 'function' : 'macro'} definition.`, errType.CurlyBracketsNotEnded)
                }
                parsed.push(new BlockNode(`${tok.type === 'Func' ? 'function' : 'macro'}`, tokens[i + 1].value, parse(argsbody.slice(1, -1)), parse(blockbody.slice(1, -1))));
                i = finalIndex
                break;
            case 'Global':
            case 'Local':
                var varname = tokens[i + 1].value;
                if (tokens[i + 1].type !== 'Object') err('Invalid variable name type.', errType.InvalidVarNameType)
                if (tokens[i + 2].type !== 'Assign') err('Expected "=" after variable name during assignment.', errType.NoAssignmentDuringAssignment)
                var evaltoks: Token[] = []
                var seti = i + 3;
                for (let j = i + 3; j < tokens.length; j++) {
                    const tok2 = tokens[j];
                    if (tok2.type === 'Semi') {
                        seti = j - 1
                        break;
                    }
                    evaltoks.push(tok2)
                }
                parsed.push(new VarDefNode(tok.type === 'Global' ? 'global' : 'local', tokens[i + 1].value, parse(evaltoks)[0]))
                i = seti;
                break;
            case 'Import':
                if (!(["Object", "String"].includes(tokens[i + 1].type))) err(`Expected type "Object" or "String" after import statement, found "${tokens[i + 1].type}"`, errType.InvalidType)
                parsed.push(new UnaryNode('import', tokens[i + 1].value))
                i++;
                break;
            case 'Return':
                var evaltoks: Token[] = []
                var seti = i + 1;
                for (let j = i + 1; j < tokens.length; j++) {
                    const tok2 = tokens[j];
                    if (tok2.type === 'Semi') {
                        seti = j - 1
                        break;
                    }
                    evaltoks.push(tok2)
                }
                parsed.push(new UnaryNode('return', parse(evaltoks)[0]))
                i = seti;
                break;
            default:


                if (tok.type === 'Object') {
                    if (tokens[i + 1] !== undefined)
                        if (tokens[i + 1].type === 'LeftParen') {
                            var blockbody: Token[] = [];
                            var parendepth = 0;
                            var finalIndex = i;
                            for (let j = i + 1; j < tokens.length; j++) {
                                const tok2 = tokens[j];
                                blockbody.push(tok2)
                                if (tok2.type === 'LeftParen') {
                                    parendepth++;
                                }
                                if (tok2.type === 'RightParen') {
                                    parendepth--;
                                    finalIndex = j;
                                    if (parendepth === 0) break;
                                }
                            }
                            if (tok.value.endsWith('!')) {
                                parsed.push(new CallNode('macro_call', tok.value.slice(0, -1), parse(blockbody.slice(1, -1))))
                            } else parsed.push(new CallNode('function_call', tok.value, parse(blockbody.slice(1, -1))))
                            i = finalIndex
                            break;
                        }
                }
                if (tok.type === 'CompileString') {
                    debug('PARSER', 'CompileString')
                    var newval: AnyNode[] = []
                    var vallets = tok.value.split('')
                    var w = ""
                    var evalw = ""
                    var incurly = false;
                    for (let j = 0; j < vallets.length; j++) {
                        const l = vallets[j];
                        if (l === '#' && vallets[j + 1] === '{' && !incurly) {
                            incurly = true;
                            newval.push(new UnaryNode('String', w))
                            w = "";
                            j += 1;
                            continue;
                        }
                        if (l === '}' && incurly) {
                            incurly = false;
                            newval.push(...parse(lex(evalw)))
                            evalw = "";


                            continue;
                        }
                        if (!incurly) w += l;
                        else evalw += l;

                        debug('PARSER', j.toString())
                    }
                    parsed.push(new UnaryNode(tok.type, newval))
                    break;
                }
                parsed.push(new UnaryNode(tok.type, (tok.type === 'Number' ? parseFloat(tok.value) : (tok.type === 'Boolean' ? (tok.value === 'true' ? true : false) : tok.value))))

        }


        // * Parse Math
        if (["Add", "Sub", "Mul", "Div", "Mod"].includes(tokens[i + 1]?.type)) {
            var maths = []
            var endindex = i;
            var prev_op = true;
            for (let j = 0; j < tokens.slice(i).length; j++) {
                const tok2 = tokens.slice(i)[j];

                if (prev_op || tok2.type === 'Number') {
                    maths.push(tok2);
                    prev_op = false;
                }
                else {
                    if (["Add", "Sub", "Mul", "Div", "Mod"].includes(tok2?.type)) {
                        maths.push(tok2)
                        prev_op = true
                    } else if (tok2.type === 'LeftParen' || tok2.type === 'RightParen') {
                        maths.push(tok2)
                        prev_op = tok2.type === 'LeftParen';
                    } else {
                        endindex = i + j;
                        break;
                    }
                }
            }
            endindex = endindex === i ? i + tokens.slice(i).length : endindex;
            parsed.pop()
            parsed.push(parseMath(maths))
            //parsed = parsed.slice(0, -(maths.length))
            i = endindex;
            continue;
        }
    }
    return parsed;
}