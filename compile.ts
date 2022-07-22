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
var macros: {name: string, reqargs: string[], val: p.AnyNode[]}[] = []
const builtinlib = [
    "std"
]
type compileOptions = {
    name: string
    namespace: string
}
var exportDir: string = "";

function parseImportPath(filepath: string) {
    if (filepath.startsWith('"') && filepath.endsWith('"')) {
        return filepath + '.item';
    } else {
        if (builtinlib.includes(filepath)) {
            return path.join(__dirname, '..', "builtinlib", filepath + '.item')
        } else {
            return path.join(exportDir, "lib", filepath + '.item')
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

function compileOther(event: string, node: p.AnyNode, prefix: string[], args: p.AnyNode[] = []) {
    switch (node.type) {
        case "Event":
            err("Event not in top level. This error should not occur normally.", errType.EventKeywordNotInTopLevel)
            break;
        case 'macro': break;
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
        case 'macro_call': break;
        case 'function_call':
            if (node instanceof p.CallNode) {
                if (node.value === 'compile_to') {
                    return {event: event, out: parseCompileString(node.args[0])}
                }
            }
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
        case 'import': break;
        case 'macro': break;
        default: {
            warn(`Node Type: ${node.type} hasn't been implemented yet.`, "Compiler")
        }
    }
}

export function compile(nodes: p.AnyNode[], options: compileOptions, exportDir: string | null) {
    // Reseting "global" values just in case
    macros = []
    exportDir = exportDir ?? process.cwd()
    imports = []
    events = []
    
    // Same variables for qol
    var dpname = (options.name === '' || options.name === undefined) ? 'Unnamed Datapack' : options.name
    var dpnamespace = (options.namespace === '' || options.namespace === undefined) ? 'unnamed' : options.namespace.replace(/ \\\//g, "")
    var exportpath = path.join(exportDir, dpname)
    // Making directories
    tryMakeDir(path.join(exportDir, dpname))
    fs.writeFileSync(path.join(exportDir, dpname, 'pack.mcmeta'), '{"pack": {"pack_format": 10,"description": "mc pack"}}')
    tryMakeDir(path.join(exportDir, dpname, 'data'))
    tryMakeDir(path.join(exportDir, dpname, 'data', dpnamespace))
    tryMakeDir(path.join(exportDir, dpname, 'data', dpnamespace, 'functions'))
    tryMakeDir(path.join(exportDir, dpname, 'data/minecraft'))
    tryMakeDir(path.join(exportDir, dpname, 'data/minecraft/tags'))
    tryMakeDir(path.join(exportDir, dpname, 'data/minecraft/tags/functions'))
    
    // Doing Imports
    
    getImports(nodes).forEach(imp => {
        var macs = getMacros(imp.val)
        var newmacs: {name: string, reqargs: string[], val: p.AnyNode[]}[] = []
        macs.forEach(mac => {
            newmacs.push({name: imp.name + '.' + mac.name, reqargs: mac.reqargs, val: mac.val})
        })
        macros.push(...newmacs)
    })
    // Getting macros
    var outs: any[] = []
    macros.push(...getMacros(nodes))
    // Replacing Macros
    //console.dir(macros, { depth: null })
    nodes = replaceMacros(nodes)
    nodes.forEach(node => {
        outs.push(compileTopLevel(node))
    })
    events.forEach(e => {
        fs.writeFileSync(path.join(exportDir ?? process.cwd(), dpname, 'data/minecraft/tags/functions', e + '.json'), `{"values": ["${dpnamespace}:${e}"]}`)
        fs.writeFileSync(path.join(exportDir ?? process.cwd(), dpname, `data/${dpnamespace}/functions`, e + '.mcfunction'), ``)
    })
    console.log(exportDir)

    compileForEach(outs, options, exportDir)
    //console.log(events)
    //console.dir(outs, { depth: null })
}

function getMacros(nodes: p.AnyNode[]) {
    var macros: {name: string, reqargs: string[], val: p.AnyNode[]}[] = []
    nodes.forEach(node => {
        if (node.type === "macro" && node instanceof p.BlockNode) {
            var outs: p.AnyNode[] = []
            node.body.forEach(node2 => {
                outs.push(node2)
            })
            
            macros.push({name: node.value, reqargs: node.args.map(e => e instanceof p.UnaryNode ? e.value : ""), val: outs})
        } else if ("body" in node) {
            macros.push(...getMacros(node.body))
        }
    })
    return macros
}

function compileForEach(outs: any[], options: compileOptions, exportDir: string) {
    var dpname = (options.name === '' || options.name === undefined) ? 'Unnamed Datapack' : options.name
    var dpnamespace = (options.namespace === '' || options.namespace === undefined) ? 'unnamed' : options.namespace.replace(/ \\\//g, "")
    var e: {event: string, out: string[]}[] = []
    outs.forEach(t => {
        if (Array.isArray(t)) {
            compileForEach(t, options, exportDir)
            return;
        }
        if (t !== undefined) {
            if (e.find(e => e.event === t.event) === undefined) {
                e.push({event: t.event, out: []})
            }
            e.find(e => e.event === t.event)!.out.push(t.out)

        }
    })

    e.forEach(ev => { 
        fs.writeFileSync(path.join(exportDir, dpname, `data/${dpnamespace}/functions`, ev.event + '.mcfunction'), ev.out.join("\n") ?? "# Compiler Error")
        console.log(path.join(exportDir, dpname, `data/${dpnamespace}/functions`, ev.event + '.mcfunction'))
    })
}

function getImports(nodes: p.AnyNode[]) {
    var imports: {name: string, val: p.AnyNode[]}[] = []
    nodes.forEach(node => {
        if (node.type === 'import') {
            if (node instanceof p.UnaryNode) {
                var _path = ""
                if (node.value.startsWith("\"") && node.value.endsWith("\"")) {
                    _path = path.join(exportDir, node.value)
                } else {
                    if (builtinlib.includes(node.value)) {
                        _path = path.join(__dirname, '../builtinlib', node.value)
                    } else {
                        _path = path.join(exportDir, 'lib', node.value)
                    }
                }
                var readfile: string;
                try {
                    readfile = fs.readFileSync(_path + '.item', 'utf8')
                } catch {
                    err(`Error reading file: ${_path + '.item'}, are you sure it exists?`, errType.FileReadError)
                    readfile = ""
                }
                imports.push({name: node.value, val: parse(lex(readfile))})
            }
        }
    })
    return imports
}

function parseCompileString(cstring: p.AnyNode): string {
    var out = ""
    if (cstring instanceof p.UnaryNode) {
        cstring.value.forEach((part: p.UnaryNode) => {
            out += part.value
        })
    }
    return out;
}

function replaceMacros(nodes: p.AnyNode[]) {
    var outs: p.AnyNode[] = []
    nodes.forEach(node => {
        if (node.type === "macro_call" && node instanceof p.CallNode) {
            var mac = macros.find(m => m.name === node.value)
            if (mac === undefined) {
                // No Macro
                err(`Macro ${node.value} not found`, errType.MacroNotFound)
            } else {
                //console.log("MACRO USED!!!!")
                //  Macro call and macro exists
                function repNode(node2: p.AnyNode) {
                    //console.log(node2)
                    if (node2 instanceof p.UnaryNode) {
                        if (mac?.reqargs.includes(node2.value)) {
                            node2 = (node as p.CallNode).args[mac?.reqargs.indexOf(node2.value)]
                            
                        }
                    }
                    for (var thing in node2) {
                        //@ts-ignore
                        if (Array.isArray(node2[thing])) {
                            var newt: p.AnyNode[] = []
                            //@ts-ignore
                            node2[thing].forEach(node3 => {
                                var newnode = repNode(node3)
                                newt.push(newnode)
                            })
                            //@ts-ignore
                            node2[thing] = newt
                        }
                    }
                    return node2
                }
                mac.val.forEach(node2 => {
                    outs.push(repNode(node2))
                })
            }
        } else if ("body" in node) {
            // Body in node
            node.body = replaceMacros(node.body)
            outs.push(node)
        } else {
            outs.push(node)
        }
    })

    return outs
}