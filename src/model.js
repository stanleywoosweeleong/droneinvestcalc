import {fields, defaults} from './fields.js';
export const MODEL_VERSION = '1.0.0';
const positive = new Set(['area','trees','sprays','drone_qty','drone_life','map_life','gen_life','battery_qty','battery_years','cycle_limit','cycles_load','tank','gen_tank','gen_runtime','workers','days','hours_day','flight','manual_water','drone_water','available_days']);
const whole = new Set(['trees','sprays','drone_qty','battery_qty','battery_buy','workers']);
const fraction = new Set(['delay','generator_share','cash_share','payroll','discount']);
export function validate(x) {
  const errors = {};
  for (const f of fields) {
    const v = x[f.key];
    if (v === null || v === undefined || v === '') {
      if (!f.optional) errors[f.key] = 'Enter a value.';
    } else if (f.type === 'select') {
      if (!f.options.includes(v)) errors[f.key] = 'Choose a listed option.';
    } else if (typeof v !== 'number' || !Number.isFinite(v)) errors[f.key] = 'Enter a finite number.';
    else if (v < 0 || (positive.has(f.key) && v === 0)) errors[f.key] = positive.has(f.key) ? 'Must be greater than zero.' : 'Cannot be negative.';
    else if (whole.has(f.key) && !Number.isInteger(v)) errors[f.key] = 'Use a whole number.';
    else if (fraction.has(f.key) && v > 1) errors[f.key] = 'Use a percentage from 0 to 100.';
    else if (positive.has(f.key) && v < 0.000001) errors[f.key] = 'Must be at least 0.000001.';
    else if (v > 1e8) errors[f.key] = 'Value is too large for this model.';
  }
  if (x.battery_buy > x.battery_qty) errors.battery_buy = 'Cannot exceed the active battery pool.';
  if (x.drone_price * x.drone_qty - (x.battery_qty-x.battery_buy)*x.battery_price <= 0) errors.drone_price = 'Drone price must exceed the allocated value of included batteries.';
  return errors;
}
export function calculate(x) {
  const errors = validate(x);
  if (Object.keys(errors).length) return {valid:false, errors};
  const n=k=>x[k]??0;
  const loads=Math.ceil(x.trees*x.drone_water/x.tank);
  const operating=loads*(x.flight+x.ground)/60*(1+n('delay'));
  const hours=operating+n('setup');
  const bookedDays=Math.ceil(hours/x.hours_day*2)/2;
  const wage=x.workers*bookedDays*x.salary/x.days*(1+n('payroll'));
  const dedicated=x.workers*x.salary*12*(1+n('payroll'));
  const cycleKnown=x.cycle_limit!=null && x.cycles_load!=null;
  const cyclesPerBattery=x.cycles_load==null?null:loads*x.sprays*x.cycles_load/x.battery_qty;
  const batteryLife=cycleKnown?Math.min(x.battery_years,x.cycle_limit/cyclesPerBattery):x.battery_years;
  const batteryPool=x.battery_qty*x.battery_price;
  const droneCapital=x.drone_price*x.drone_qty-(x.battery_qty-x.battery_buy)*x.battery_price;
  const capital=x.drone_price*x.drone_qty+x.genset+x.area*x.mapping+x.battery_buy*x.battery_price+n('training');
  const equipment=droneCapital/x.drone_life+batteryPool/batteryLife+x.genset/x.gen_life+x.area*x.mapping/x.map_life+n('training')/5;
  const overhead=n('maintenance')+n('insurance')+n('finance');
  const fuel=operating*x.generator_share*x.gen_tank/x.gen_runtime*x.petrol;
  const otherRound=fuel+x.drone_chem+n('transport')+x.trees*x.drone_water/1000*n('water_cost');
  const labour=x.labour_mode==='Dedicated'?dedicated:wage*x.sprays;
  const cashLabour=x.labour_mode==='Existing staff'?labour*x.cash_share:labour;
  const annual=equipment+overhead+otherRound*x.sprays+labour;
  const cash=overhead+otherRound*x.sprays+cashLabour;
  const manualRound=x.trees*x.manual_water/1000*x.manual_rate+(x.manual_incl==='Yes'?0:x.manual_chem)+n('manual_extra');
  const manual=manualRound*x.sprays;
  const outsource=x.out_rate==null?null:(x.out_rate*x.area+(x.out_incl==='Yes'?0:x.out_chem)+n('out_extra'))*x.sprays;
  const threshold=(annual/x.sprays-(x.out_incl==='Yes'?0:x.out_chem)-n('out_extra'))/x.area;
  let cumulative=-capital, npv=-capital, droneTotal=capital, payback=null;
  const flow=[{month:0,drone:capital,manual:0,saving:-capital,cumulative,resale:0,replacements:0,discounted:-capital}];
  // Exclude replacement exactly at the horizon: it serves future work.
  const count=(month,life)=>Math.max(0,Math.ceil(Number((month/12/life).toFixed(10)))-1);
  const assets=[[batteryLife,batteryPool],[x.drone_life,droneCapital],[x.gen_life,x.genset],[x.map_life,x.mapping*x.area]];
  for(let month=1;month<=60;month++) {
    const replacements=assets.reduce((sum,[life,cost])=>sum+(count(month,life)-count(month-1,life))*cost,0);
    const resale=month===60?n('resale'):0;
    const drone=cash/12+replacements-resale;
    const saving=manual/12-drone;
    cumulative+=saving-resale;
    if(payback===null && cumulative>=0) payback=month/12;
    const discounted=saving/(1+n('discount'))**(month/12);
    npv+=discounted;droneTotal+=drone;
    flow.push({month,drone,manual:manual/12,saving,cumulative,resale,replacements,discounted});
  }
  const outFive=outsource==null?null:outsource*5;
  return {valid:true,errors,loads,operating,hours,bookedDays,wage,labour,cashLabour,cyclesPerBattery,batteryLife,cycleKnown,capital,equipment,overhead,fuel,otherRound,annual,cash,manual,outsource,threshold,saving:manual-annual,outSaving:outsource==null?null:outsource-annual,perRound:annual/x.sprays,perAcre:annual/x.sprays/x.area,simplePayback:manual>cash?capital/(manual-cash):null,payback,flow,fiveDrone:droneTotal,fiveManual:manual*5,fiveSaving:manual*5-droneTotal,outFive,npv,annualDays:bookedDays*x.sprays,capacity:x.available_days==null?'unverified':bookedDays*x.sprays<=x.available_days?'within':'exceeds',breakdown:[{label:'Equipment & setup',value:equipment},{label:'Labour',value:labour},{label:'Fuel',value:fuel*x.sprays},{label:'Chemicals & other running',value:(otherRound-fuel)*x.sprays},{label:'Maintenance, cover & finance',value:overhead}]};
}
export function breakEven(x) {
  if(!calculate(x).valid) return null;
  let rounds=null, area=null;
  for(let v=1;v<=365;v++){const r=calculate({...x,sprays:v});if(r.saving>=0){rounds={value:v,capacity:r.capacity};break;}}
  // Match spreadsheet continuous density (fractional trees) while calculator inputs require whole trees.
  for(let step=1;step<=400;step++){
    const acres=step/4, scale=acres/x.area;
    // Avoid rounding density: use equivalent water and chemical volumes with original integer tree count.
    const r=calculate({...x,area:acres,manual_water:x.manual_water*scale,drone_water:x.drone_water*scale,drone_chem:x.drone_chem*scale,manual_chem:x.manual_chem*scale,out_chem:x.out_chem*scale});
    if(r.saving>=0){area={value:acres,capacity:r.capacity};break;}
  }
  return {rounds,area};
}
export const scenarioDefinitions=[
 {id:'conservative',label:'Conservative',description:'25% more operating delay, 20% higher fuel and annual maintenance, 25% shorter calendar battery life, and 20% lower manual rate.'},
 {id:'expected',label:'Your plan',description:'Your current inputs, without adjustments.'},
 {id:'optimistic',label:'Optimistic',description:'10% lower fuel, 25% longer calendar battery life and 10% higher manual rate.'}
];
export function scenarioInputs(x,id){
 if(id==='conservative')return {...x,delay:Math.min(1,(1+(x.delay??0))*1.25-1),petrol:x.petrol*1.2,maintenance:x.maintenance==null?null:x.maintenance*1.2,battery_years:x.battery_years*.75,manual_rate:x.manual_rate*.8};
 if(id==='optimistic')return {...x,petrol:x.petrol*.9,battery_years:x.battery_years*1.25,manual_rate:x.manual_rate*1.1};
 return {...x};
}
export function sensitivities(x){
 const base=calculate(x);if(!base.valid)return [];
 return ['manual_rate','sprays','drone_price','salary','battery_years','petrol','drone_water'].map(key=>{
  const a={...x,[key]:key==='sprays'?Math.max(1,Math.round(x[key]*.8)):x[key]*.8};
  const b={...x,[key]:key==='sprays'?Math.max(1,Math.round(x[key]*1.2)):x[key]*1.2};
  const lo=calculate(a),hi=calculate(b);
  return {key,label:fields.find(f=>f.key===key).label,lower:lo.valid?lo.saving:null,higher:hi.valid?hi.saving:null,base:base.saving,delta:Math.max(Math.abs((lo.saving??base.saving)-base.saving),Math.abs((hi.saving??base.saving)-base.saving))};
 }).sort((a,b)=>b.delta-a.delta);
}
export function evidence(x,verified={}){
 const missing=fields.filter(f=>f.optional&&x[f.key]==null);
 const unverified=fields.filter(f=>x[f.key]!=null&&!verified[f.key]);
 return {missing,unverified,confirmed:fields.filter(f=>x[f.key]!=null&&verified[f.key]).length,total:fields.length,ready:!missing.length&&!unverified.length&&x.coverage==='Yes'};
}
