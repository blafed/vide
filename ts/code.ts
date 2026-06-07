type int = number
type float = number
type ID = number

interface Project {
    file: File[]
    res: Res[]
    asset: Asset[]
}

interface Asset {
    name: string
    res: Res
    thumb: ImageBitmap
    date: number
}



const project: Project = {
    file: [],
    res: [],
    asset: []
}

function main() {
    ui_init()
}
