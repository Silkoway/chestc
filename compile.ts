import { parse } from './parser';
import { err, warn } from '.';
import { errType } from './errType';
import { lex } from './lexer';
import * as p from './parser'
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

var imports: p.AnyNode[][] = []
var events: string[] = []
const builtinlib = [
    "std"
]
type compileOptions = {
    name: string
    namespace: string
}

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

const tryMakeDir = (path: string) => {
    if (!fs.existsSync(path)) fs.mkdirSync(path);
    else {
        fs.rmSync(path, { recursive: true });
        fs.mkdirSync(path)
    }
}

function compileOther(event: string, node: p.AnyNode, prefix: string[]) {
    switch (node.type) {
        case "Event":
            err("Event not in top level. This error should not occur normally.", errType.EventKeywordNotInTopLevel)
            break;
        case 'global':
        case 'local':
            if (node instanceof p.VarDefNode) {
                if (node.init instanceof p.UnaryNode) {
                    if (node.init.type === 'Number')
                        var initval = parseInt(node.init.value); 
                    else { err("Variable value can only be numbers.", errType.InvalidVariableType) }
                }
                //@ts-ignore
                return { event: event, out: `${prefix.join(" ")} scoreboard objectives add ${"chestvar-" + node.value} dummy${node.init ? `\n${prefix.join(" ")} scoreboard players set @a ${"chestvar-" + node.value} ${initval}` : ""}` }
            }

            break;
    }
}

function compileTopLevel(node: p.AnyNode) {
    switch (node.type) {
        case 'Event':
            if (node instanceof p.EventNode) {
                var compiles: any[] = []
                events.push(node.value)
                node.body.forEach(node2 => {
                    compiles.push(compileOther(node.value, node2, []));
                })
                return compiles
            } break;
        case 'import': if (node instanceof p.UnaryNode) {
            var _path = ""
            if (node.value.startsWith("\"") && node.value.endsWith("\"")) {
                _path = path.join(process.cwd(), node.value)
            } else {
                if (builtinlib.includes(node.value)) {
                    _path = path.join(__dirname, '../builtinlib', node.value)
                } else {
                    _path = path.join(process.cwd(), 'lib', node.value)
                }
            }
            var readfile: string;
            try {
                readfile = fs.readFileSync(_path + '.item', 'utf8')
            } catch {
                err(`Error reading file: ${_path + '.item'}, are you sure it exists?`, errType.FileReadError)
                readfile = ""
            }
            imports.push(parse(lex(readfile)))
            break;
        } break;
        default: {
            warn(`Node Type: ${node.type} hasn't been implemented yet.`, "Compiler")
        }
    }
}

export function compile(nodes: p.AnyNode[], options: compileOptions, exportDir: string | null) {
    exportDir = exportDir ?? process.cwd()
    imports = []
    events = []
    var dpname = (options.name === '' || options.name === undefined) ? 'Unnamed Datapack' : options.name
    var dpnamespace = (options.namespace === '' || options.namespace === undefined) ? 'unnamed' : options.namespace.replace(/ \\\//g, "")
    var exportpath = path.join(exportDir, dpname)
    tryMakeDir(path.join(process.cwd(), dpname))
    fs.writeFileSync(path.join(process.cwd(), dpname, 'pack.mcmeta'), '{"pack": {"pack_format": 10,"description": "mc pack"}}')
    tryMakeDir(path.join(process.cwd(), dpname, 'data'))
    tryMakeDir(path.join(process.cwd(), dpname, 'data', dpnamespace))
    tryMakeDir(path.join(process.cwd(), dpname, 'data', dpnamespace, 'functions'))
    tryMakeDir(path.join(process.cwd(), dpname, 'data/minecraft'))
    tryMakeDir(path.join(process.cwd(), dpname, 'data/minecraft/tags'))
    tryMakeDir(path.join(process.cwd(), dpname, 'data/minecraft/tags/functions'))
    var outs: any[] = []
    nodes.forEach(node => {
        outs.push(compileTopLevel(node))
    })
    events.forEach(e => {
        fs.writeFileSync(path.join(process.cwd(), dpname, 'data/minecraft/tags/functions', e + '.json'), `{"values": ["${dpnamespace}:${e}"]}`)
        fs.writeFileSync(path.join(process.cwd(), dpname, `data/${dpnamespace}/functions`, e + '.mcfunction'), ``)
    })

    compileForEach(outs, options)
    console.log(events)
    console.dir(outs, { depth: null })
}
function compileForEach(outs: any[], options: compileOptions) {
    var dpname = (options.name === '' || options.name === undefined) ? 'Unnamed Datapack' : options.name
    var dpnamespace = (options.namespace === '' || options.namespace === undefined) ? 'unnamed' : options.namespace.replace(/ \\\//g, "")
    outs.forEach(t => {
        if (Array.isArray(t)) {
            compileForEach(t, options)
            return;
        }
        if (t !== undefined) fs.writeFileSync(path.join(process.cwd(), dpname, `data/${dpnamespace}/functions`, t.event + '.mcfunction'), t.out ?? "# Compiler Error")
    })
}

