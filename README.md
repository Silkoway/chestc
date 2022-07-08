# ChestC
**ChestC** is a compiler for the chest programming language that converts `.item` files into fully functioning datapacks!
Install this compiler with `npm install chestc -g`!
## Features
### if statements
```
event main {
    global var = 0;
    if (var >= 0) {
        $.print("Hello World!");
    }
}
```
### for loops (in progress)
### while loops (in progress)
### event functions 
```
import std; // Importing standard library

event main {
    std.tellraw("Hello World!");
}
```
### functions
```
import std;

func add_one(num) {
    return num + 1;
}

event main {
    std.tellraw(add_one(1));
}
```
### macros
```
import std; // Importing standard library

macro tr(msg) {
    std.tellraw(msg);
}

event main {
    tr("Hello World!");
}
```
### importing
```
import std;
```
### Variables
```
global var = 0;
local var = 10;

```