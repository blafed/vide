interface Project {
    file: File[]
    res: Res[]
    asset: Asset[]
    track: Track[]
    item: Item[]
    fps: int
}


interface Asset {
    name: string
    res: Res
    thumb: ImageBitmap
    date: number
}

interface Track {
    type: ItemType
}


interface Item extends Sight {
    type: ItemType,
    res: Res
    track: Track,
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

const enum ItemType {
    Video, Audio, Image
}


function project_item_create(project: Project, res: Res, track: Track) {
    let item: Item
    switch (res.type) {
        case ResType.Video: item = <VideoItem>{ type: ItemType.Video, track, res, from: 0, to: res.duration, clip: { from: 0, to: res.duration } }; break
        case ResType.Audio: item = <AudioItem>{ type: ItemType.Audio, track, res, from: 0, to: res.duration, clip: { from: 0, to: res.duration } }; break
        case ResType.Image:
        case ResType.Svg: item = <ImgaeItem>{ type: ItemType.Image, track, res, from: 0, to: 1 }; break
    }
    project.item.push(item)
}

function project_file_exists(f: File) {
    for (let i = 0; i < project.file.length; i++) {
        if (file_fingerprint(project.file[i]) === file_fingerprint(f)) return true
    }
    return false
}

async function project_asset_create(project: Project, f: File) {
    let type = res_type(f)
    let res: Res
    switch (type) {
        case ResType.Audio: res = (await res_create_audio(f))!; break
        case ResType.Image: res = await res_create_image(f); break
        case ResType.Video: res = await res_create_video(f, 8); break
        case ResType.Svg: res = await res_svg_create(f, 64, 64); break
        default: return null
    }

    let ass = { name: f.name, res, thumb: await res_generate_thumb(res, 64, 64), date: Date.now() }
    project.file.push(f)
    project.res.push(res)
    project.asset.push(ass)
    return ass
}

function project_track_create(project: Project, type: ItemType) {
    let track: Track = { type }
    project.track.push(track)
    return track
}

function file_fingerprint(f: File) {
    return `${f.name}|${f.size}|${f.lastModified}`
}