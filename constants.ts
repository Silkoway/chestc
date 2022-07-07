import chalk from "chalk"
import { stdout } from "process"

export const long_bar = (thick: boolean = false) => {
    var bar = ""
    for (var i = 0; i < stdout.columns; i++) {bar += thick ? '=' : '-'}
    return bar
}

export const main_message =
` .o88b. db   db d88888b .d8888. d888888b  .o88b. 
d8P  Y8 88   88 88'     88'  YP \`~~88~~' d8P  Y8 
8P      88ooo88 88ooooo \`8bo.      88    8P      
8b      88~~~88 88~~~~~   \`Y8b.    88    8b      
Y8b  d8 88   88 88.     db   8D    88    Y8b  d8 
 \`Y88P' YP   YP Y88888P \`8888Y'    YP     \`Y88P' 
${long_bar(true)}
"chestc" is the compiler for the Chest programming language!
Check subcommands and info below.
${long_bar()}
---Sub-commands---
+ build - builds a single file
+ compile - ${chalk.red('NOT YET IMPLEMENTED')} - compiles a project.
+ init - initiliases a chest project.
`

