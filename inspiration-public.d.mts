import type { Buffer } from 'node:buffer';
export interface PublicArtwork {id:string;title:string;url:string;thumbUrl:string;source:string;sourceUrl:string;style:string;isSample:boolean;}
export function publicImageUrl(raw:string):string;
export function sameSiteUrl(raw:string,base:string):string;
export function plain(value:unknown):string;
export function attribute(tag:string,name:string):string;
export function fetchPublicPage(raw:string,options?:{fetcher?:typeof fetch;timeout?:number}):Promise<string>;
export function readPublicImage(raw:string,options?:{fetcher?:typeof fetch;timeout?:number;allowPreviewFormats?:boolean}):Promise<{mime:string;bytes:Buffer}>;
export function parseProgImages(html:string,page:string):PublicArtwork[];
export function homepageGallery(html:string,page:string,query:string):Array<{title:string;url:string;thumbUrl:string;sourceUrl:string}>;
export function discoverProg(query:string,options?:{fetcher?:typeof fetch}):Promise<{results:PublicArtwork[];discovered:number;duplicates:number;inaccessible:number;warning:string;blocked?:boolean}>;
