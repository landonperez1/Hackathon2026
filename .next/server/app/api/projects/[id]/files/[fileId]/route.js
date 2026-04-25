(()=>{var e={};e.id=710,e.ids=[710],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},9748:e=>{"use strict";e.exports=require("fs/promises")},3873:e=>{"use strict";e.exports=require("path")},8558:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>S,routeModule:()=>L,serverHooks:()=>m,workAsyncStorage:()=>O,workUnitAsyncStorage:()=>f});var n={};r.r(n),r.d(n,{DELETE:()=>R,GET:()=>u,PATCH:()=>N,runtime:()=>_});var i=r(2706),o=r(8203),a=r(5994),s=r(9187),E=r(3873),p=r.n(E),c=r(9748),d=r.n(c),T=r(6448);let _="nodejs",l=p().join(process.cwd(),"data");async function u(e,{params:t}){let{fileId:r}=await t,n=(0,T.c2)(r);return n?s.NextResponse.json({file:n}):s.NextResponse.json({error:"not found"},{status:404})}async function N(e,{params:t}){let{fileId:r}=await t,n=await e.json(),i=(0,T.fu)(r,n);return i?s.NextResponse.json({file:i}):s.NextResponse.json({error:"not found"},{status:404})}async function R(e,{params:t}){let{fileId:r}=await t,n=(0,T.nB)(r);if(!n)return s.NextResponse.json({error:"not found"},{status:404});if(n.storage_path){let e=p().join(l,n.storage_path);await d().unlink(e).catch(()=>{})}return s.NextResponse.json({ok:!0})}let L=new i.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/projects/[id]/files/[fileId]/route",pathname:"/api/projects/[id]/files/[fileId]",filename:"route",bundlePath:"app/api/projects/[id]/files/[fileId]/route"},resolvedPagePath:"/workspaces/Hackathon2026/app/api/projects/[id]/files/[fileId]/route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:O,workUnitAsyncStorage:f,serverHooks:m}=L;function S(){return(0,a.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:f})}},6487:()=>{},8335:()=>{},6448:(e,t,r)=>{"use strict";r.d(t,{H8:()=>f,Gu:()=>N,gA:()=>b,sn:()=>G,WM:()=>C,yr:()=>S,H2:()=>L,xx:()=>k,nB:()=>v,SE:()=>g,iH:()=>u,U1:()=>h,c2:()=>H,qT:()=>F,B3:()=>Y,fS:()=>y,A$:()=>m,u0:()=>O,SR:()=>l,RQ:()=>w,hF:()=>X,iE:()=>j,EL:()=>U,Aw:()=>x,l0:()=>A,xs:()=>R,vr:()=>M,fu:()=>P});let n=require("better-sqlite3");var i=r.n(n),o=r(3873),a=r.n(o);let s=require("fs");var E=r.n(s);let p=a().join(process.cwd(),"data"),c=a().join(p,"projectmind.db");E().existsSync(p)||E().mkdirSync(p,{recursive:!0});let d=null;function T(){if(d)return d;let e=new(i())(c);return e.pragma("journal_mode = WAL"),e.pragma("foreign_keys = ON"),e.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      reliability INTEGER NOT NULL DEFAULT 3,
      workload INTEGER NOT NULL DEFAULT 3,
      communication_style TEXT NOT NULL DEFAULT '',
      personality_notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      person_id TEXT,
      content TEXT NOT NULL,
      project_context TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS relationships (
      person_a_id TEXT NOT NULL,
      person_b_id TEXT NOT NULL,
      strength INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (person_a_id, person_b_id),
      FOREIGN KEY (person_a_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (person_b_id) REFERENCES people(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      project_description TEXT NOT NULL,
      options_json TEXT NOT NULL,
      chosen_index INTEGER,
      rating INTEGER,
      feedback TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      storage_path TEXT,
      original_filename TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interaction_mentions (
      interaction_id TEXT NOT NULL,
      mention_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      PRIMARY KEY (interaction_id, mention_type, target_id),
      FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_interactions_person ON interactions(person_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_strategies_created ON strategies(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
    CREATE INDEX IF NOT EXISTS idx_mentions_target ON interaction_mentions(mention_type, target_id);
  `),d=e,e}function _(){return crypto.randomUUID()}function l(){return T().prepare("SELECT * FROM people ORDER BY name ASC").all()}function u(e){return T().prepare("SELECT * FROM people WHERE id = ?").get(e)}function N(e){let t={id:_(),name:e.name,role:e.role??"",reliability:e.reliability??3,workload:e.workload??3,communication_style:e.communication_style??"",personality_notes:e.personality_notes??"",created_at:Date.now()};return T().prepare(`INSERT INTO people
       (id, name, role, reliability, workload, communication_style, personality_notes, created_at)
       VALUES (@id, @name, @role, @reliability, @workload, @communication_style, @personality_notes, @created_at)`).run(t),t}function R(e,t){let r=u(e);if(!r)return;let n={...r,...t,id:e};return T().prepare(`UPDATE people SET
         name = @name,
         role = @role,
         reliability = @reliability,
         workload = @workload,
         communication_style = @communication_style,
         personality_notes = @personality_notes
       WHERE id = @id`).run(n),n}function L(e){return T().prepare("DELETE FROM people WHERE id = ?").run(e).changes>0}function O(e=200){return T().prepare("SELECT * FROM interactions ORDER BY created_at DESC LIMIT ?").all(e)}function f(e){let t={id:_(),person_id:e.person_id??null,content:e.content,project_context:e.project_context??"",created_at:Date.now()},r=T(),n=r.prepare(`INSERT INTO interactions
     (id, person_id, content, project_context, created_at)
     VALUES (@id, @person_id, @content, @project_context, @created_at)`),i=r.prepare(`INSERT OR IGNORE INTO interaction_mentions
     (interaction_id, mention_type, target_id)
     VALUES (?, ?, ?)`);return r.transaction(()=>{for(let r of(n.run(t),e.person_id&&i.run(t.id,"person",e.person_id),e.mentions??[]))i.run(t.id,r.type,r.id)})(),t}function m(){return T().prepare("SELECT * FROM interaction_mentions").all()}function S(e){return T().prepare("DELETE FROM interactions WHERE id = ?").run(e).changes>0}function I(e,t){return e<t?[e,t]:[t,e]}function j(){return T().prepare("SELECT * FROM relationships").all()}function A(e,t,r){if(e===t)return null;let[n,i]=I(e,t),o={person_a_id:n,person_b_id:i,strength:r};return T().prepare(`INSERT INTO relationships (person_a_id, person_b_id, strength)
       VALUES (@person_a_id, @person_b_id, @strength)
       ON CONFLICT(person_a_id, person_b_id) DO UPDATE SET strength = excluded.strength`).run(o),o}function g(e,t){let[r,n]=I(e,t);return T().prepare("DELETE FROM relationships WHERE person_a_id = ? AND person_b_id = ?").run(r,n).changes>0}function D(e){return{id:e.id,project_description:e.project_description,options:JSON.parse(e.options_json),chosen_index:e.chosen_index,rating:e.rating,feedback:e.feedback,created_at:e.created_at,completed_at:e.completed_at}}function U(e=50){return T().prepare("SELECT * FROM strategies ORDER BY created_at DESC LIMIT ?").all(e).map(D)}function F(e){let t=T().prepare("SELECT * FROM strategies WHERE id = ?").get(e);return t?D(t):void 0}function C(e){let t={id:_(),project_description:e.project_description,options:e.options,chosen_index:null,rating:null,feedback:null,created_at:Date.now(),completed_at:null};return T().prepare(`INSERT INTO strategies
       (id, project_description, options_json, chosen_index, rating, feedback, created_at, completed_at)
       VALUES (@id, @project_description, @options_json, @chosen_index, @rating, @feedback, @created_at, @completed_at)`).run({id:t.id,project_description:t.project_description,options_json:JSON.stringify(t.options),chosen_index:t.chosen_index,rating:t.rating,feedback:t.feedback,created_at:t.created_at,completed_at:t.completed_at}),t}function x(e,t,r,n){if(F(e))return T().prepare(`UPDATE strategies
       SET chosen_index = ?, rating = ?, feedback = ?, completed_at = ?
       WHERE id = ?`).run(t,r,n,Date.now(),e),F(e)}function y(e=20){return T().prepare("SELECT * FROM strategies WHERE rating IS NOT NULL ORDER BY completed_at DESC LIMIT ?").all(e).map(D)}function X(){return T().prepare("SELECT * FROM projects ORDER BY created_at DESC").all()}function h(e){return T().prepare("SELECT * FROM projects WHERE id = ?").get(e)}function b(e){let t={id:_(),name:e.name,description:e.description??"",created_at:Date.now()};return T().prepare(`INSERT INTO projects (id, name, description, created_at)
       VALUES (@id, @name, @description, @created_at)`).run(t),t}function M(e,t){let r=h(e);if(!r)return;let n={...r,...t,id:e};return T().prepare("UPDATE projects SET name = @name, description = @description WHERE id = @id").run(n),n}function k(e){return T().prepare("DELETE FROM projects WHERE id = ?").run(e).changes>0}function w(e){return T().prepare("SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at DESC").all(e)}function Y(){return T().prepare("SELECT * FROM project_files ORDER BY created_at DESC").all()}function H(e){return T().prepare("SELECT * FROM project_files WHERE id = ?").get(e)}function G(e){let t={id:_(),project_id:e.project_id,name:e.name,notes:e.notes??"",storage_path:e.storage_path??null,original_filename:e.original_filename??null,mime_type:e.mime_type??null,size_bytes:e.size_bytes??null,created_at:Date.now()};return T().prepare(`INSERT INTO project_files
       (id, project_id, name, notes, storage_path, original_filename, mime_type, size_bytes, created_at)
       VALUES (@id, @project_id, @name, @notes, @storage_path, @original_filename, @mime_type, @size_bytes, @created_at)`).run(t),t}function P(e,t){let r=H(e);if(!r)return;let n={...r,...t};return T().prepare("UPDATE project_files SET name = @name, notes = @notes WHERE id = @id").run(n),n}function v(e){let t=H(e);if(t)return T().prepare("DELETE FROM project_files WHERE id = ?").run(e),t}}};var t=require("../../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[257,452],()=>r(8558));module.exports=n})();