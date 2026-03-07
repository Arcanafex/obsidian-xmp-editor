import exifr from "exifr"

export interface ImageMetadata {
    title?: string
    description?: string
    tags: string[]
}

export async function readImageMetadata(buffer: ArrayBuffer, filename?: string): Promise<ImageMetadata>{
    
    const data = await exifr.parse(buffer, {xmp: true, iptc: true, exif: true})

    const title = data?.title?.value             //XMP
        || data?.ObjectName?.value               //IPTC
        || data?.XPTitle?.value                  //Windows EXIF
        || undefined

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
