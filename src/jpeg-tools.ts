const encoder = new TextEncoder()
const decoder = new TextDecoder("utf-8")

const XMP_HEADER_STR = "http://ns.adobe.com/xap/1.0/\0"
const XMP_HEADER = encoder.encode(XMP_HEADER_STR)

function readUint16BE(view: Uint8Array, offset: number): number {
    if (offset + 1 >= view.length) throw new Error("")

    return (view[offset] << 8) | view[offset + 1]
}

function concatArrays(arrays: Uint8Array[]): Uint8Array {
    const total = arrays.reduce((sum, a) => sum + a.length, 0)
    const result = new Uint8Array(total)

    let offset = 0
    for (const arr of arrays) {
        result.set(arr, offset)
        offset += arr.length
    }

    return result    
}

function startsWith(data: Uint8Array, prefix: Uint8Array): boolean {
    if (data.length < prefix.length) return false

    for (let i = 0; i < prefix.length; i++) {
        if (data[i] !== prefix[i]) return false
    }

    return true
}

function* iterateSegments(data: Uint8Array) {
    let offset = 2 //skip SOI

    while (offset < data.length) {
        if (data[offset] !== 0xFF) break
        
        const marker = data[offset + 1]

        if (marker === 0xDA) {
            yield { marker, start: offset, end: data.length }
            return
        }

        const length = readUint16BE(data, offset + 2)

        yield {
            marker,
            start: offset,
            end: offset + 2 + length
        }

        offset += 2 + length
    }
}

export function extractXmp(data: Uint8Array): string | null {
    for (const seg of iterateSegments(data)) {
        if (seg.marker === 0xE1) {
        const content = data.subarray(seg.start + 4, seg.end)

            if (startsWith(content, XMP_HEADER)) {
                const xmlBytes = content.subarray(XMP_HEADER.length)
                return decoder.decode(xmlBytes)
            }
        }
    }

    return null
}

function removeXmpSegments(data: Uint8Array): Uint8Array {
    const parts: Uint8Array[] = []

    //SOI
    parts.push(data.subarray(0, 2))

    for (const seg of iterateSegments(data)) {
        if (seg.marker === 0xE1) {
            const content = data.subarray(seg.start + 4, seg.end)

            if (startsWith(content, XMP_HEADER)) {
                continue // skip XMP
            }          
        }

        parts.push(data.subarray(seg.start, seg.end))
    }

    return concatArrays(parts)
}

function createXmpSegment(xmpXml: string): Uint8Array {
    const xmlBytes = encoder.encode(xmpXml)

    const content = new Uint8Array(XMP_HEADER.length + xmlBytes.length)
    content.set(XMP_HEADER, 0)
    content.set(xmlBytes, XMP_HEADER.length)

    const length = content.length + 2

    const segment = new Uint8Array(4)
    segment[0] = 0xFF
    segment[1] = 0xE1
    segment[2] = (length >> 8) & 0xFF
    segment[3] = length & 0xFF

    return concatArrays([segment, content])
}

function insertXmpSegment(data: Uint8Array, xmpSegment: Uint8Array): Uint8Array {
    const parts: Uint8Array[] = []

    //SOI
    parts.push(data.subarray(0, 2))

    let inserted = false

    for (const seg of iterateSegments(data)) {
        //insert before first non-APP segment
        if (!inserted && (seg.marker < 0xE0 || seg.marker > 0xEF)) {
            parts.push(xmpSegment)
            inserted = true
        }

        parts.push(data.subarray(seg.start, seg.end))
    }

    if (!inserted) {
        parts.push(xmpSegment)
    }

    return concatArrays(parts)
}

export function updateJpegXmp(
    jpegData: Uint8Array,
    updateFn: (xmp:string | null) => string
): Uint8Array {
    const existingXmp = extractXmp(jpegData)
    const newXmp = updateFn(existingXmp)
    const cleaned = removeXmpSegments(jpegData)
    const newSegment = createXmpSegment(newXmp)

    return insertXmpSegment(cleaned, newSegment)
}