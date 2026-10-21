import { getUser } from '@netlify/identity';
import { and, eq, or, desc } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { listings, orders } from '../../db/schema.js';
import type { Config } from '@netlify/functions';
function respond(data:unknown, init:ResponseInit={}) { return Response.json(data,{...init,headers:{'Cache-Control':'no-store',...init.headers}}); }
const categories = ['Phones','Computers','Audio','Gaming','Accessories','Home electronics'];
function fail(message:string,status=400):never { throw Object.assign(new Error(message),{status}); }
function str(value:unknown,min=1,max=200) { if(typeof value!=='string'||value.trim().length<min||value.length>max) fail('Please check the required fields.');return value.trim(); }
export default async (req:Request) => {
 try {
 if(req.method==='POST') {
 const origin=req.headers.get('origin'); if(origin&&origin!==new URL(req.url).origin) fail('Cross-origin request denied.',403);
 if(!req.headers.get('content-type')?.startsWith('application/json')) fail('JSON request required.',415);
 }
 const db=database(), url=new URL(req.url), action=url.searchParams.get('action')||'catalog';
 if(req.method==='GET' && action==='catalog') {
 const rows=await db.select({id:listings.id,title:listings.title,description:listings.description,category:listings.category,condition:listings.condition,price:listings.price,image:listings.image,location:listings.location,sellerName:listings.sellerName}).from(listings).where(eq(listings.status,'active')).orderBy(desc(listings.createdAt)).limit(200);
 return respond(rows);
 }
 const user=await getUser(); if(!user) fail('Please sign in to continue.',401);
 const admin=user.roles?.includes('admin');
 if(req.method==='GET'&&action==='dashboard') {
 const items=await db.select().from(listings).where(admin?undefined:eq(listings.sellerId,user.id)).orderBy(desc(listings.createdAt));
 const purchases=await db.select({order:orders,listing:listings}).from(orders).innerJoin(listings,eq(orders.listingId,listings.id)).where(admin?undefined:or(eq(orders.buyerId,user.id),eq(listings.sellerId,user.id))).orderBy(desc(orders.createdAt));
 return respond({items,purchases,admin,userId:user.id});
 }
 if(req.method!=='POST') fail('Method not allowed',405);
 const raw=await req.text(); if(raw.length>15000) fail('Request too large',413);
 let body;try{body=JSON.parse(raw);}catch{fail('Invalid request.');}
 if(action==='listing') {
 const title=str(body.title,3,100),description=str(body.description,20,2000),category=str(body.category),condition=str(body.condition),price=Number(body.price);
 if(!categories.includes(category)||!['New','Like new','Good','Fair'].includes(condition)||!Number.isInteger(price)||price<100||price>100000000) fail('Choose a valid category, condition, and price.');
 const image=str(body.image,8,2000);let imageUrl;try{imageUrl=new URL(image);}catch{fail('Enter a valid HTTPS image address.');}if(imageUrl.protocol!=='https:')fail('Image address must use HTTPS.');
 const phone=str(body.phone,10,16);if(!/^(\+250|0)7\d{8}$/.test(phone))fail('Enter a Rwandan mobile number: 07xxxxxxxx or +2507xxxxxxxx.');
 if(!['MTN MoMo','Airtel Money'].includes(body.network))fail('Choose a payment network.');
 const [row]=await db.insert(listings).values({sellerId:user.id,sellerName:user.name||'Seller',title,description,category,condition,price,image,location:str(body.location,2,100),phone,network:body.network,recipientName:str(body.recipientName,3,100),...(admin?{status:'active'}:{})}).returning();
 return respond({id:row.id,message:admin?'Product published. Customers can now find it in the shop.':'Listing submitted for review.'}, {status:201});
 }
 if(action==='moderate') {
 if(!admin)fail('Administrator access required.',403);
 if(!['active','rejected'].includes(body.status))fail('Invalid status.');
 const result=await db.update(listings).set({status:body.status}).where(and(eq(listings.id,str(body.id)),eq(listings.status,'pending'))).returning();
 if(!result.length)fail('Listing is no longer awaiting review.',409);return respond({ok:true});
 }
 if(action==='order') {
 const phone=str(body.phone,10,16);if(!/^(\+250|0)7\d{8}$/.test(phone))fail('Enter a valid Rwandan mobile number.');
 const result=await db.transaction(async tx=>{
 const [item]=await tx.update(listings).set({status:'reserved'}).where(and(eq(listings.id,str(body.id)),eq(listings.status,'active'))).returning();
 if(!item)fail('This device is no longer available.',409);if(item.sellerId===user.id)fail('You cannot buy your own listing.');
 const [order]=await tx.insert(orders).values({listingId:item.id,buyerId:user.id,buyerName:user.name||'Buyer',buyerPhone:phone,amount:item.price}).returning();return {order,listing:item};
 });return respond(result,{status:201});
 }
 if(action==='reference'||action==='confirm'||action==='cancel') {
 const [row]=await db.select({order:orders,listing:listings}).from(orders).innerJoin(listings,eq(orders.listingId,listings.id)).where(eq(orders.id,str(body.id)));
 if(!row)fail('Order not found.',404);
 const isBuyer=row.order.buyerId===user.id, isSeller=row.listing.sellerId===user.id;
 if(action==='reference') {
 if(!isBuyer)fail('Only the buyer can submit a reference.',403);
 const result=await db.update(orders).set({reference:str(body.reference,4,100),status:'payment_review'}).where(and(eq(orders.id,row.order.id),eq(orders.status,'awaiting_payment'))).returning();if(!result.length)fail('Order status has changed. Refresh your account.',409);
 } else if(action==='confirm') {
 if(!isSeller&&!admin)fail('Seller or administrator access required.',403);
 await db.transaction(async tx=>{const result=await tx.update(orders).set({status:'paid'}).where(and(eq(orders.id,row.order.id),eq(orders.status,'payment_review'))).returning();if(!result.length)fail('Only submitted payments can be confirmed.',409);await tx.update(listings).set({status:'sold'}).where(eq(listings.id,row.listing.id));});
 } else {
 if(!isBuyer&&!isSeller&&!admin)fail('Access denied.',403);
 await db.transaction(async tx=>{const result=await tx.update(orders).set({status:'cancelled'}).where(and(eq(orders.id,row.order.id),eq(orders.status,'awaiting_payment'))).returning();if(!result.length)fail('Only unpaid orders without a reference can be cancelled. Contact the seller for payment disputes.',409);await tx.update(listings).set({status:'active'}).where(eq(listings.id,row.listing.id));});
 }
 return respond({ok:true});
 }
 fail('Unknown action.',404);
 } catch(error:any) {return respond({error:error.status?error.message:'The marketplace is temporarily unavailable. Please try again.'},{status:error.status||503});}
};
export const config:Config={path:'/api/market'};
