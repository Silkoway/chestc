import path from "path";

export function genWorldPath(name: string) {
    if (process.platform === 'win32') {
        return path.join(`${process.env.APPDATA}/.minecraft/saves/${name}/datapacks`)
    }
    return ""
}