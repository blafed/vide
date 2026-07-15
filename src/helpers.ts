
function trim_edges(s: string, c: string) {
    let start = 0;
    let end = s.length;

    while (start < end && s[start] == c)
        start++;

    return s.slice(start, end);
}