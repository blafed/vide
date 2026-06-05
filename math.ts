function fit_rect(
    src_w: number,
    src_h: number,
    dst_w: number,
    dst_h: number
): Rect {

    let scale = Math.min(
        dst_w / src_w,
        dst_h / src_h
    )

    let w = src_w * scale
    let h = src_h * scale

    let x = (dst_w - w) / 2
    let y = (dst_h - h) / 2

    return [x, y, w, h]
}