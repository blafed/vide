interface Project {
    file: File[]
    res: Res[]
    asset: Asset[]
    track: Track[]
    item: Item[]
}

interface Asset {
    name: string
    res: Res
    thumb: ImageBitmap
    date: number
}

const enum ItemType {
    Video, Audio, Image
}


interface Item extends Sight {
    type: ItemType,
    res: Res
    track: Track | null,
}

interface VideoItem extends Item {
    type: ItemType.Video,
    res: VideoRes
    clip: Sight
}

interface ImgaeItem extends Item {
    type: ItemType.Image
    res: ImageRes | SvgRes
}

interface AudioItem extends Item {
    type: ItemType.Audio
    res: AudioRes
    clip: Sight
}



interface Track {
    type: ItemType
}

const project: Project = {
    file: [],
    res: [],
    asset: [],
    track: [],
    item: [],
}

function item_create_video(res: VideoRes): VideoItem {
    return { type: ItemType.Video, track: null, res, from: 0, to: res.duration, clip: { from: 0, to: res.duration } }
}

function item_create_audio(res: AudioRes): AudioItem {
    return { type: ItemType.Audio, track: null, res, from: 0, to: res.duration, clip: { from: 0, to: res.duration } }
}

function item_create_image(res: ImageRes | SvgRes): ImgaeItem {
    return { type: ItemType.Image, track: null, res, from: 0, to: 1 }
}

function item_can_added_to(item: Item, track: Track) {
    return track.type == item.type
}

function item_add(item: Item, track: Track): boolean {
    if (item.track == track) return false
    if (!item_can_added_to(item, track)) return false

    item.track = track
    project.item.push(item)
    return true
}

function track_create(type: ItemType) {
    let track: Track = { type }
    return track
}

function track_add(track: Track) {
    project.track.push(track)
}

function item_create(res: Res) {
    switch (res.type) {
        case ResType.Video: return item_create_video(res)
        case ResType.Audio: return item_create_audio(res)
        case ResType.Image:
        case ResType.Svg:
            return item_create_image(res)
    }
}


function item_draw(item: Item, ctx: HTMLCanvasElement, viewport: Rect) {

}

