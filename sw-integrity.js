'use strict';
async function releaseAll(jobs){const results=await Promise.allSettled(jobs);const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;}
async function releaseDigest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function releaseValid(req,r){
 if(!r||!r.ok)return false;
 const expected=self.AdrianRelease.assets[new URL(typeof req==='string'?req:req.url,self.registration.scope).pathname];
 return !expected||await releaseDigest(await r.clone().arrayBuffer())===expected;
}
async function releaseFetch(req,init){const r=await fetch(req,init);if(r.ok&&!await releaseValid(req,r))throw Error('Release fingerprint mismatch: '+(req.url||req));return r;}
async function releaseMatch(cache,req){const r=await cache.match(req);return await releaseValid(req,r)?r:undefined;}
