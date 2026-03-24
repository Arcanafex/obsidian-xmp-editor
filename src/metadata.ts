import exifr from "exifr"
import { JpgImage } from "jpgImage"
import { TFile } from "obsidian"
import { getAltTextNode, parseXmp } from "xmp-tools"

export interface FileFormat
{
    get metadata(): ImageMetadata
    set metadata(m: ImageMetadata)
}

export interface ImageMetadata {
    title?: string
    description?: string
    tags: string[]
}

export async function getImageMetadata(file: TFile): Promise<ImageMetadata>
{
    const jpg = new JpgImage(file)

    await jpg.initialize()

    return jpg
}

export async function readImageMetadata(buffer: ArrayBuffer, filename?: string): Promise<ImageMetadata>{
    
    const data = await exifr.parse(buffer, {iptc: true, exif: true, xmp: { parse: false}})

    //const doc = create(data?.xmp)
    const title = updateDcTitle(data?.xmp, "Yupperz!") // ?? "Nopez"
    
/*     data?.title?.value             //XMP
        || data?.ObjectName?.value               //IPTC
        || data?.XPTitle?.value                  //Windows EXIF
        || undefined
        */
        const description = data?.description?.value //XMP
        || data?.CaptionAbstract?.value          //IPTC
        || data?.ImageDescription?.value         //EXIF
        || undefined
        
        const tags = data?.subject                  //XMP
        || data?.Keywords                       //IPTC
        || parseXPKeywords(data?.XPKeywords)    //Windows EXIF
        || []
        
        return {
        title: title ?? filename,
        description,
        tags
    }
}

function parseXPKeywords(value?: string | string[]){
    if (!value) return undefined

    if (Array.isArray(value)) return value

    return value.split(";").map(v => v.trim()).filter(Boolean)
}

function updateDcTitle(xmpXml: string, newTitle: string): string {
    const doc = parseXmp(xmpXml)

    const descriptions = Array.from(doc.getElementsByTagName("rdf:Description"))
    let el: Element = descriptions.find(d => d.getAttribute("xmlns:dc")) ?? new Element()

    const description = getAltTextNode(el, "dc:title", "x-default")
    if (!description) return "Garbage"

    const value = description

    return value ?? "empty????"
}