import {parse} from './parser';
import {err} from '.';
import {errType} from './errType';
import {lex} from './lexer';
import * as p from './parser'
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

var imports: p.AnyNode[][] = []
var events: string[] = []
var variables: {name: string, init: number}[] = []
const builtinlib = [
    "std"
]

function parseImportPath(filepath: string) {
    if (filepath.startsWith('"') && filepath.endsWith('"')) {
        return filepath + '.item';
    } else {
        if (builtinlib.includes(filepath)) {
            return path.join(__dirname, '..', "builtinlib", filepath + '.item')
        } else {
            return path.join(process.cwd(), "lib", filepath + '.item')
        }
    }
    return filepath
}

function compileNode(node: p.AnyNode, depth: number, event: string | null = null, prefixs: string[] = []) {
    console.log(node)
    switch (node.type) {
        case 'import': {
            if (depth !== 0) err("Import statement used in depth != 0", errType.ImportStatementNotInTopLevel);
            if (node instanceof p.UnaryNode) imports.push((parse(lex(fs.readFileSync(parseImportPath(node.value), 'utf8')))))
            break;
        }
        case 'event': if (node instanceof p.EventNode) 
            switch (node.value) {
                case 'tick':
                case 'load':
                    events.push(node.value)
                    addEvent(node.value)
                    node.body.forEach(node2 => {
                        compileNode(node2, depth + 1, node.value)
                    })
                default:
                    console.warn(`${chalk.yellow("[WARN]")} unknown event: ${node.value}`)
            }
         break;
        default:
            console.log(`Node type: ${node.type} hasn't been implemented yet.`)
        
        
    }
}

const tryMakeDir = (path: string) => {
    if (!fs.existsSync(path)) fs.mkdirSync(path); 
    else {
        fs.rmdirSync(path, { recursive: true });
        fs.mkdirSync(path)
    }
}

function addEvent(event: string) {

}

export function compile (nodes: p.AnyNode[], options: any, exportDir: string | null) {
    exportDir = exportDir ?? process.cwd()
    imports = []
    variables = []
    var dpname = (options.name === '' || options.name === undefined) ? 'Unnamed Datapack' : options.name
    var exportpath = path.join(exportDir, dpname)
    console.log(`exportpath: ${exportpath}`)
    tryMakeDir(exportpath)
    //console.dir(nodes, { depth: null });
    nodes.forEach(node => {
        compileNode(node, 0)
    })
    console.dir(imports, { depth: null })
}
