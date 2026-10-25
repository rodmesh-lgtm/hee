/** Small client-safe formatting helpers. Locale catalogues stay on the server. */
export type UiMessages = Readonly<Record<string, string>>;
export function translatedUiText(messages:UiMessages,text:string):string{
 return Object.prototype.hasOwnProperty.call(messages,text)?messages[text]:text;
}
export function formattedUiText(messages:UiMessages,text:string,values:Record<string,string|number|bigint>):string{
 return translatedUiText(messages,text).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g,(match,key:string)=>Object.prototype.hasOwnProperty.call(values,key)?String(values[key]):match);
}
export function translatedUiAttributes<T extends Record<string,unknown>>(messages:UiMessages,props:T):T{
 const translated:Record<string,unknown>={...props};
 for(const key of ["aria-label","placeholder","title","alt"])if(typeof props[key]==="string")translated[key]=translatedUiText(messages,props[key]);
 return translated as T;
}
