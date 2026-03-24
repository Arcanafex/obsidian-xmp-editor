import { TFile } from 'obsidian';
import { FileFormat, ImageMetadata } from './metadata'
import exifr from "exifr"
import { create } from "xmlbuilder2"
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';

export class JpgImage implements ImageMetadata {

    private readonly file: TFile
    private data: any
    private xmpXml: XMLBuilder

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
            xmp: { parse: false}
        })
       
        this.xmpXml = create(this.data?.xmp)

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
        const titleNode = this.xmpXml.find(n => n.node.nodeName === "dc:title", false, true)
        const rdfAlt = titleNode?.find(n => n.node.nodeName === "rdf:Alt")
        return rdfAlt?.first().node.textContent ?? this.file.name
    }

    public get description(): string {
        const descriptionNode = this.xmpXml.find(n => n.node.nodeName === "dc:description", false, true)
        const rdfAlt = descriptionNode?.find(n => n.node.nodeName === "rdf:Alt")

        return rdfAlt?.first().node.textContent ?? ""
    }

    public get tags(): string[] {
        const tagsNode = this.xmpXml.find(n => n.node.nodeName === "dc:subject", false, true)
        const rdfBag = tagsNode?.find(n => n.node.nodeName === "rdf:Bag")
        const tagList: string[] = []
        
        rdfBag?.map(n => n.node.textContent).forEach(tag => tagList.push(tag ?? ""))

        return tagList//['chicken', 'hubcap']
    }

}