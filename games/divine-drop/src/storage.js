import {blankSave,normalizeSave} from './core.js?v=3d43dea3bde5';
export const SAVE_KEY='elementToyShelf.save.v2';
export function readSave(data,storage){
  try{
    storage??=globalThis.localStorage;
    const current=storage.getItem(SAVE_KEY);
    if(current)return {save:normalizeSave(JSON.parse(current),data),error:false};
    const legacy=storage.getItem('elementToyShelf.save.v1');
    if(legacy){
      const raw=JSON.parse(legacy);
      // The original planning document did not ship an ID table. Preserve known aliases.
      const aliases={magic_wand:'wand',automobile:'car',aircraft:'airplane',game_console:'console'};
      for(const field of ['craftedCountByItem','collectionFirstCreatedAt'])if(raw[field])raw[field]=Object.fromEntries(Object.entries(raw[field]).map(([id,v])=>[aliases[id]||id,v]));
      if(Array.isArray(raw.discoveredItemIds))raw.discoveredItemIds=raw.discoveredItemIds.map(id=>aliases[id]||id);
      const save=normalizeSave(raw,data);save.legacyHighScore=save.highScore;save.highScore=0;
      const ok=writeSave(save,storage);return {save,error:!ok};
    }
    return {save:blankSave(),error:false};
  }catch{return {save:blankSave(),error:true};}
}
export function writeSave(save,storage){try{storage??=globalThis.localStorage;storage.setItem(SAVE_KEY,JSON.stringify(save));return true;}catch{return false;}}
