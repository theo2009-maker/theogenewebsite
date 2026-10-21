// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const auth=vi.hoisted(()=>({user:null as any}));
vi.mock('@netlify/identity',()=>({getUser:vi.fn(async()=>auth.user),handleAuthCallback:vi.fn(async()=>null),login:vi.fn(),signup:vi.fn(),logout:vi.fn(),requestPasswordRecovery:vi.fn(),updateUser:vi.fn(),acceptInvite:vi.fn()}));
beforeAll(async()=>{
 const html=readFileSync('index.html','utf8');
 document.documentElement.innerHTML=html;
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>[]})));
 await import('../market.js');
 await vi.waitFor(()=>expect(document.querySelectorAll('.product-card')).toHaveLength(8));
});
function click(selector:string){(document.querySelector(selector) as HTMLElement).click();}
describe('storefront browsing and safe examples',()=>{
 it('labels sample inventory clearly',()=>{expect(document.querySelector('#catalog-note')?.textContent).toContain('not for sale');expect(document.querySelectorAll('.sample-tag')).toHaveLength(8);});
 it('filters products by category',()=>{click('[data-category="Phones"]');expect(document.querySelectorAll('.product-card')).toHaveLength(1);expect(document.querySelector('#products')?.textContent).toContain('iPhone');click('[data-category="All"]');});
 it('shows an actionable empty state for no matches',()=>{const input=document.querySelector('#search') as HTMLInputElement;input.value='not-a-real-product';input.dispatchEvent(new Event('input'));expect(document.querySelector('#products')?.textContent).toContain('No devices found');click('#reset-filters');expect(document.querySelectorAll('.product-card')).toHaveLength(8);});
 it('sorts illustrative prices from low to high',()=>{const select=document.querySelector('#sort') as HTMLSelectElement;select.value='low';select.dispatchEvent(new Event('change'));expect(document.querySelector('.product-card h3')?.textContent).toContain('Portable wireless speaker');});
 it('never offers checkout for example products',()=>{click('[data-product="sample-0"]');expect(document.querySelector('#modal-body')?.textContent).toContain('not available to purchase');expect(document.querySelector('[data-reserve]')).toBeNull();click('#close-modal');});
 it('requires an account before selling',async()=>{click('[data-open="sell"]');await vi.waitFor(()=>expect(document.querySelector('#auth-form')).not.toBeNull());expect(document.querySelector('[name="email"]')).not.toBeNull();expect(document.querySelector('#modal-body')?.textContent).toContain('Create account');click('#close-modal');});
 it('explains manual payment verification honestly',()=>{click('#payment-help');expect(document.querySelector('#modal-body')?.textContent).toContain('does not collect money or automatically verify');expect(document.querySelector('#modal-body')?.textContent).toContain('*182#');expect(document.querySelector('#modal-body')?.textContent).toContain('*500#');});
 it('shows the exact business name and visible product entry',()=>{expect(document.title).toContain('TheogeneNiyonzima');expect(document.querySelector('.brand-name')?.textContent).toContain('TheogeneNiyonzima');expect(document.querySelector('nav [data-open="sell"]')?.textContent).toBe('Add product');});
 it('prompts visitors to sign in before owner access',async()=>{auth.user=null;click('[data-owner]');await vi.waitFor(()=>expect(document.querySelector('#modal-body')?.textContent).toContain('Owner sign in'));expect(document.querySelector('#auth-form')).not.toBeNull();});
 it('explains owner setup without granting customer administrator access',async()=>{auth.user={id:'customer',email:'customer@example.test',roles:[]};vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({items:[],purchases:[],admin:false,userId:'customer'})} as any);click('[data-owner]');await vi.waitFor(()=>expect(document.querySelector('#modal-body')?.textContent).toContain('Set up your owner access'));expect(document.querySelector('#modal-body')?.textContent).toContain('does not yet have administrator access');expect(document.querySelector('[data-moderate]')).toBeNull();});
 it('opens the owner panel and direct product publication form for administrators',async()=>{auth.user={id:'owner',name:'TheogeneNiyonzima',roles:['admin']};vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({items:[],purchases:[],admin:true,userId:'owner'})} as any);click('[data-owner]');await vi.waitFor(()=>expect(document.querySelector('#modal-body')?.textContent).toContain('Owner control panel'));expect(document.querySelector('.owner-stats')?.textContent).toContain('Customer orders');click('#modal-body [data-open="sell"]');await vi.waitFor(()=>expect(document.querySelector('#listing-form')).not.toBeNull());expect(document.querySelector('#listing-form [type="submit"]')?.textContent).toContain('Publish product');auth.user=null;});
});
