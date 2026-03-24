type XmpDom = Document
const XMP_HEADER = Buffer.from("http://ns.adobe.com/xap/1.0/\0", "ascii") //Change this to be utf-8
export const LANG_DEFAULT = "x-default"

export function parseXmp(xmpXml: string): XmpDom {
    const parser = new DOMParser()
    const dom = parser.parseFromString(xmpXml, "application/xml")

    const error = dom.querySelector("parsererror")
    if (error) throw new Error("Invalid XML: " + error.textContent)

    return dom
}

export function serializeXmp(dom: XmpDom): string {
    const serializer = new XMLSerializer()
    return serializer.serializeToString(dom)
}

export function findOrCreateDescription(dom: XmpDom): Element {
    const descriptions = Array.from(
        dom.getElementsByTagName("rdf:Description")
    )

    // Try to find description element with dc namespace
    let description = descriptions.find(d => d.getAttribute("xmlns:dc"))

    if (!description) {
        description = descriptions[0]
    }

    if (!description) {
        const rdf = dom.getElementsByTagName("rdf:RDF")[0]
        if (!rdf) throw new Error("Invalid XMP: missing rdf:RDF")
        
        description = dom.createElement("rdf:Description")
        rdf.appendChild(description)
    }

    // Ensure dc namespace exists
    if (!description.getAttribute("xmlns:dc")) {
        description.setAttribute("xmlns:dc", "http://purl.org/dc/elements/1.1/")
    }

    return description
}

export function getAltTextNode(desc: Element, tag: string, lang: string): string {
    let el = desc.getElementsByTagName(tag)[0]
    if (!el) return ""

    let alt = el.getElementsByTagName("rdf:Alt")[0]
    if (!alt) return ""

    let li = Array.from(alt.getElementsByTagName("rdf:li"))
        .find(n => n.getAttribute("xml:lang") === lang)
    if (!li) return ""

    return li.textContent
}

function setAltTextNode(
    dom: XmpDom,
    desc: Element,
    tag: string,
    value: string,
    lang: string
) {
    let el = desc.getElementsByTagName(tag)[0]
    if (!el) {
        el = dom.createElement(tag)
        desc.appendChild(el)
    }

    let alt = el.getElementsByTagName("rdf:Alt")[0]
    if (!alt) {
        alt = dom.createElement("rdf:Alt")
        el.appendChild(alt)
    }

    let li = Array.from(alt.getElementsByTagName("rdf:li"))
        .find(n => n.getAttribute("xml:lang") === lang)
    
    if (!li) {
        li = dom.createElement("rdf:li")
        li.setAttribute("xml:lang", lang)
        alt.appendChild(li)
    }

    li.textContent = value
}

function setSeqNode(
    dom: XmpDom,
    desc: Element,
    tag: string,
    values: string[]
) {
    let el = desc.getElementsByTagName(tag)[0]
    if (!el) {
        el = dom.createElement(tag)
        desc.appendChild(el)
    }

    let seq = el.getElementsByTagName("rdf:Seq")[0]
    if (!seq) {
        seq = dom.createElement("rdg:Seq")
        el.appendChild(seq)
    }

    while (seq.firstChild) seq.removeChild(seq.firstChild)

    for (const v of values) {
        const li = dom.createElement("rdf:li")
        li.textContent = v
        seq.appendChild(li)
    }
}

function setBagNode(
    dom: XmpDom,
    desc: Element,
    tag: string,
    values: string[]
) {
    let el = desc.getElementsByTagName(tag)[0]
    if (!el) {
        el = dom.createElement(tag)
        desc.appendChild(el)
    }

    let bag = el.getElementsByTagName("rdf:Bag")[0]
    if (!bag) {
        bag = dom.createElement("rdf:Bag")
        el.appendChild(bag)
    }

    while (bag.firstChild) bag.removeChild(bag.firstChild)

    for (const v of values) {
        const li = dom.createElement("rdf:li")
        li.textContent = v
        bag.appendChild(li)
    }
}

export function updateXmp(
    xmpXml: string,
    updates: {
        title?: string,
        description?: string,
        subjects?: string[]
    }   
): string {
    const dom = parseXmp(xmpXml)
    const desc = findOrCreateDescription(dom)

    if (updates.title) {
        setAltTextNode(dom, desc, "dc:title", updates.title, LANG_DEFAULT)
    }

    if (updates.description) {
        setAltTextNode(dom, desc, "dc:description", updates.description, LANG_DEFAULT)
    }

    if (updates.subjects) {
        setBagNode(dom, desc, "dc:subjects", updates.subjects)
    }

    return serializeXmp(dom)
}

function* iterateSegments(buffer: Buffer) {
    let offset = 2 // skip SOI

    while (offset < buffer.length) {
        if (buffer[offset] !== 0xFF) break

        const marker = buffer[offset + 1]

        if (marker === 0xDA) {
            yield {
                marker,
                start: offset,
                end: buffer.length
            }
            return
        }

        const length = buffer.readUint16BE(offset + 2)

        yield {
            marker,
            start: offset,
            end: offset + 2 + length
        }

        offset += 2 + length
    }
}

export function extractXMP(buffer: Buffer): string | null {
    for (const seg of iterateSegments(buffer)) {
        if (seg.marker === 0xE1) {
            const content = buffer.subarray(seg.start + 4, seg.end)

            if (content.subarray(0, XMP_HEADER.length).equals(XMP_HEADER)) {
                return content.subarray(XMP_HEADER.length).toString("utf8")
            }
        }
    }

    return null
}

function removeXmpSegments(buffer: Buffer): Buffer {
    const parts: Buffer[] = []

    // keep SOI
    parts.push(buffer.subarray(0, 2))

    for (const seg of iterateSegments(buffer)) {
        if (seg.marker === 0xE1) {
            const content = buffer.subarray(seg.start + 4, seg.end)

            if (content.subarray(0, XMP_HEADER.length).equals(XMP_HEADER)) {
                continue //skip XMP segment
            }
        }

        parts.push(buffer.subarray(seg.start, seg.end))
    }

    return Buffer.concat(parts)
}

function createXmpSegment(xmpXml: string): Buffer {
    const xmlBuf = Buffer.from(xmpXml, "utf8")
    const content = Buffer.concat([XMP_HEADER, xmlBuf])

    const length = content.length + 2

    const segment = Buffer.alloc(2 + 2)
    segment[0] = 0xFF
    segment[1] = 0xE1
    segment.writeUint16BE(length, 2)

    return Buffer.concat([segment, content])
}

function insertXmpSegment(buffer: Buffer, xmpSegment: Buffer): Buffer {
    const parts: Buffer[] = []

    // SOI
    parts.push(buffer.subarray(0, 2))

    let inserted = false
    
    for (const seg of iterateSegments(buffer)) {
        // insert after SOI + existing APP segments
        if (!inserted && seg.marker !== 0xE0 && seg.marker !== 0xE1) {
            parts.push(xmpSegment)
            inserted = true
        }

        parts.push(buffer.subarray(seg.start, seg.end))
    }

    if (!inserted) {
        parts.push(xmpSegment)
    }

    return Buffer.concat(parts)
}

export function updateJpegXmp(
    jpegBuffer: Buffer,
    updateFn: (xmp: string | null) => string   
): Buffer {

    const existingXmp = extractXMP(jpegBuffer)
    const newXmp = updateFn(existingXmp)
    const cleaned = removeXmpSegments(jpegBuffer)
    const newSegment = createXmpSegment(newXmp)

    return insertXmpSegment(cleaned, newSegment)
}
