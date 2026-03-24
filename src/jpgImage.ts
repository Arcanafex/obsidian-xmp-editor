import { TFile } from 'obsidian';
import { FileFormat, ImageMetadata } from './metadata'
import exifr from 'exifr'
import { parseXmp, findOrCreateDescription, getAltTextNode, LANG_DEFAULT } from 'xmp-tools';

export class JpgImage implements ImageMetadata {

    private readonly file: TFile
    private data: any
    private xmpXml: Document
    private rdfDesc: Element

    constructor(file: TFile) {
        this.file = file;
    }

    // public get metadata(): ImageMetadata {
    //     return this._metadata
    // }
    // public set metadata(m: ImageMetadata)
    // {
    //     this._metadata.title = m.title
    //     this._metadata.description = m.description
    //     this._metadata.tags = m.tags
    // }

    public async initialize(){
        const buffer = await this.file.vault.readBinary(this.file)

        this.data = await exifr.parse(buffer, {
            iptc: true, 
            exif: true, 
            xmp: { parse: false }
        })
       
        // Create template XMP if none found

        this.xmpXml = parseXmp(this.data?.xmp)
        this.rdfDesc = findOrCreateDescription(this.xmpXml)

        // update title
        // update description
        // update tags

    }

    // public addTag(tag: string){
    //     if (!this._metadata.tags.contains(tag)){
    //         this._metadata.tags.push(tag);
    //     }
    // }

    public get title(): string {
        return getAltTextNode(this.rdfDesc, "dc:title", LANG_DEFAULT)
    }

    public get description(): string {
        return getAltTextNode(this.rdfDesc, "dc:description", LANG_DEFAULT)
    }

    public get tags(): string[] {
        const tagList: string[] = []

        return tagList//['chicken', 'hubcap']
    }

}