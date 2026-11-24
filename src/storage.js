import {defaults,fields} from './fields.js';
import {MODEL_VERSION,validate} from './model.js';
export const STORAGE_KEY='droneinvest.plans.v1';
export function createPlan(name='My farm investment') {return {id:globalThis.crypto.randomUUID(),name,inputs:{...defaults},verified:{},notes:'',updatedAt:new Date().toISOString()};}
export function parsePlan(raw, {allowDraft = false} = {}) {
 if(!raw||typeof raw!=='object'||!raw.inputs)throw new Error('This file is not a DroneInvest plan.');
 const inputs=Object.fromEntries(fields.map(f=>[f.key,raw.inputs[f.key]===undefined?defaults[f.key]:raw.inputs[f.key]]));
 const errors=validate(inputs);if(!allowDraft && Object.keys(errors).length)throw new Error('Invalid plan: '+Object.entries(errors).map(([k,v])=>k+': '+v).slice(0,3).join(' '));
 return {id:globalThis.crypto.randomUUID(),name:typeof raw.name==='string'?raw.name.slice(0,100):'Imported plan',inputs,verified:Object.fromEntries(fields.map(f=>[f.key,raw.verified?.[f.key]===true])),notes:typeof raw.notes==='string'?raw.notes.slice(0,10000):'',updatedAt:new Date().toISOString()};
}
export function serializePlan(plan){return JSON.stringify({format:'droneinvest-plan',modelVersion:MODEL_VERSION,...plan},null,2);}
export function savePlans(storage,plans,currentId){storage.setItem(STORAGE_KEY,JSON.stringify({version:1,plans,currentId}));}
export function loadPlans(storage){
 const value=storage.getItem(STORAGE_KEY);if(!value)return null;
 const data=JSON.parse(value);if(!Array.isArray(data.plans)||!data.plans.length)throw new Error('Saved plans could not be read.');
 const plans=data.plans.map(p=>({...parsePlan(p,{allowDraft:true}),id:typeof p.id==='string'?p.id:globalThis.crypto.randomUUID()}));
 return {plans,currentId:plans.some(p=>p.id===data.currentId)?data.currentId:plans[0].id};
}
