import exifr from "exifr"
import { JpgImage } from "jpgImage"
import { TFile } from "obsidian"
//import {create} from "xmlbuilder2"

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
    const doc = create(xmpXml)

    const description = doc.find(
        n => n.node.nodeName === "dc:title"
        //&& n.some(child => child.node.nodeName == "dc:title")
        , false, true)?.first()

    // description.forEach(element => {
    //     element.each(child => console.log(child.node.nodeName))
    // });

    if (!description) return "Garbage"

    const value = description.first().node.textContent

    return value ?? "empty????"

//   if (!description) {
//     throw new Error("rdf:Description not found in XMP")
//   }

//   // Find existing dc:title
//   let title = description.find(node => node.node.nodeName === "dc:title")

// if (!title) {
//     // create dc:title structure
//     title = description.ele("dc:title")
//       .ele("rdf:Alt")
//       .ele("rdf:li", { "xml:lang": "x-default" })
//       .txt(newTitle)
//   } else {

//     let alt = title.find(node => node.node.nodeName === "rdf:Alt")

//     if (!alt) {
//         alt = title.ele("rdf:Alt")
//     }

//     let li = alt.find(node =>
//       node.node.nodeName === "rdf:li"// &&
//       //node.att("xml:lang") === "x-default"
//     )

//     if (!li) {
//       li = alt.ele("rdf:li", { "xml:lang": "x-default" })
//     }

//     li.txt(newTitle)
//   }

//   return doc.end({ prettyPrint: true })
}