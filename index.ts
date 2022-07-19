#!/usr/bin/env node
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import chalk from 'chalk'
import { lex } from './lexer'
import { errType } from './errType'
import { parse } from './parser'
import * as constants from './constants'
import { cwd } from 'process'
import path from 'path'
import {compile} from './compile'
const prompt = require('prompt-sync')()
const argv: any = yargs(hideBin(process.argv)).argv

const appdatadir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")

var package_ver: string = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../package.json'),
    'utf8'
)).version

var info = {
    latestVersion: package_ver,
};

if (fs.existsSync(path.join(appdatadir, "chestc/data"))) {
    var data = fs.readFileSync(path.join(appdatadir, "chestc/data"), 'utf-8')
    info = JSON.parse(data)
}


export const err = (msg: string, _errType: errType, line?: number, char?: number) => {
    console.error(chalk.red(`${msg}\n${(line || char) ? `At line ${line}, character ${char}\n` : ""}Error code: ${_errType}, ${errType[_errType]}`))
    process.exit(1)
}
export const warn = (msg: string, from: string) => {
    console.warn(`${chalk.yellow(`[WARN] [${from}]`)} ${msg}`)
}
export const debug = (type: string, msg: string) => {
    console.log(`${chalk.green('[DEBUG]')} ${chalk.red(`[${type}]`)} ${msg}`)
}

function showChangelog() {}

info.latestVersion.split('.').forEach((dot, index) => {
    if (parseInt(package_ver.split('.')[index]) > parseInt(dot)) {
        showChangelog()
    }
})

info.latestVersion = package_ver

if (!fs.existsSync(path.join(appdatadir, 'chestc')))fs.mkdirSync(path.join(appdatadir, 'chestc'))
fs.writeFileSync(path.join(appdatadir, "chestc/info"), JSON.stringify(info))

if (argv._[0] === 'build') {
    if (argv._[1] === undefined) err("No input path specified.", errType.NoInputSpecified)

    console.log(`Building ${argv._[1]}...`)
    var file = fs.readFileSync(argv._[1], 'utf8').replace(/\r/g, '')
    console.log(`Lexing...`)
    var lexed = lex(file)
    console.log(`Parsing...`)
    var parsed = parse(lexed)
    console.log(`Compiling...`)
    var compiled = compile(parsed, {name: argv._[1].replace(/\.item/g, ''), namespace: argv._[1].replace(/\.item/g, '')}, cwd())
    // console.log(parsed)
    console.log(`Finished!`)
    fs.writeFileSync('parsed.json', JSON.stringify(parsed, null, 2))
} else if (argv._[0] === 'init') {
    console.log('Chest project initialiser!')
    var projectname = prompt("Project name: ")
    var main_name = prompt("Main file name: ")
    main_name = main_name === '' ? "main.item" : main_name
    var authors: string[] = prompt("Authors (seperated by commas): ").split(',')
    var version = prompt("Initial Version: ")
    version = version === '' ? "0.0.0" : version

    console.log("Creating...")
    fs.mkdirSync(path.join(cwd(), projectname))
    console.log("[1/3]")
    fs.writeFileSync(path.join(cwd(), `${projectname}/proj.json`),
        `
{
    "name": "${projectname}",
    "version": "${version}",
    "authors": [${authors.map(e => `"${e}"`).join(', ')}],
    "main": "${main_name}",
    "dependencies": []
}
`

    )
    console.log("[2/3]")
    fs.writeFileSync(path.join(process.cwd(), `${projectname}/${main_name}`), 
    `
import std;

event main() {
    tellraw("Hello, world!");
}
    `)
    console.log("[3/3]")
    console.log("Finished!")
} else if (argv._.length === 0) {
    console.log(constants.main_message)
} else {
    err(`Unknown subcommand "${argv._[0]}"`, errType.UnknownSubcommand)
}
