(()=>{var e={};e.id=859,e.ids=[859],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3873:e=>{"use strict";e.exports=require("path")},3052:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>R,routeModule:()=>T,serverHooks:()=>N,workAsyncStorage:()=>l,workUnitAsyncStorage:()=>u});var n={};r.r(n),r.d(n,{DELETE:()=>_,GET:()=>c,POST:()=>d,runtime:()=>p});var i=r(2706),o=r(8203),a=r(5994),s=r(9187),E=r(6448);let p="nodejs";async function c(){return s.NextResponse.json({relationships:(0,E.iE)()})}async function d(e){let t=await e.json();if(!t?.person_a_id||!t?.person_b_id)return s.NextResponse.json({error:"person_a_id and person_b_id are required"},{status:400});let r=(0,E.l0)(t.person_a_id,t.person_b_id,t.strength??1);return r?s.NextResponse.json({relationship:r},{status:201}):s.NextResponse.json({error:"cannot relate a person to themselves"},{status:400})}async function _(e){let t=await e.json();return t?.person_a_id&&t?.person_b_id?(0,E.SE)(t.person_a_id,t.person_b_id)?s.NextResponse.json({ok:!0}):s.NextResponse.json({error:"not found"},{status:404}):s.NextResponse.json({error:"person_a_id and person_b_id are required"},{status:400})}let T=new i.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/relationships/route",pathname:"/api/relationships",filename:"route",bundlePath:"app/api/relationships/route"},resolvedPagePath:"/workspaces/Hackathon2026/app/api/relationships/route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:l,workUnitAsyncStorage:u,serverHooks:N}=T;function R(){return(0,a.patchFetch)({workAsyncStorage:l,workUnitAsyncStorage:u})}},6487:()=>{},8335:()=>{},6448:(e,t,r)=>{"use strict";r.d(t,{H8:()=>m,Gu:()=>N,gA:()=>b,sn:()=>H,WM:()=>C,yr:()=>f,H2:()=>L,xx:()=>k,nB:()=>P,SE:()=>g,iH:()=>u,U1:()=>h,c2:()=>G,qT:()=>F,B3:()=>w,fS:()=>y,A$:()=>S,u0:()=>O,SR:()=>l,RQ:()=>Y,hF:()=>X,iE:()=>A,EL:()=>U,Aw:()=>x,l0:()=>j,xs:()=>R,vr:()=>M,fu:()=>v});let n=require("better-sqlite3");var i=r.n(n),o=r(3873),a=r.n(o);let s=require("fs");var E=r.n(s);let p=a().join(process.cwd(),"data"),c=a().join(p,"projectmind.db");E().existsSync(p)||E().mkdirSync(p,{recursive:!0});let d=null;function _(){if(d)return d;let e=new(i())(c);return e.pragma("journal_mode = WAL"),e.pragma("foreign_keys = ON"),e.exec(`
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
  `),d=e,e}function T(){return crypto.randomUUID()}function l(){return _().prepare("SELECT * FROM people ORDER BY name ASC").all()}function u(e){return _().prepare("SELECT * FROM people WHERE id = ?").get(e)}function N(e){let t={id:T(),name:e.name,role:e.role??"",reliability:e.reliability??3,workload:e.workload??3,communication_style:e.communication_style??"",personality_notes:e.personality_notes??"",created_at:Date.now()};return _().prepare(`INSERT INTO people
       (id, name, role, reliability, workload, communication_style, personality_notes, created_at)
       VALUES (@id, @name, @role, @reliability, @workload, @communication_style, @personality_notes, @created_at)`).run(t),t}function R(e,t){let r=u(e);if(!r)return;let n={...r,...t,id:e};return _().prepare(`UPDATE people SET
         name = @name,
         role = @role,
         reliability = @reliability,
         workload = @workload,
         communication_style = @communication_style,
         personality_notes = @personality_notes
       WHERE id = @id`).run(n),n}function L(e){return _().prepare("DELETE FROM people WHERE id = ?").run(e).changes>0}function O(e=200){return _().prepare("SELECT * FROM interactions ORDER BY created_at DESC LIMIT ?").all(e)}function m(e){let t={id:T(),person_id:e.person_id??null,content:e.content,project_context:e.project_context??"",created_at:Date.now()},r=_(),n=r.prepare(`INSERT INTO interactions
     (id, person_id, content, project_context, created_at)
     VALUES (@id, @person_id, @content, @project_context, @created_at)`),i=r.prepare(`INSERT OR IGNORE INTO interaction_mentions
     (interaction_id, mention_type, target_id)
     VALUES (?, ?, ?)`);return r.transaction(()=>{for(let r of(n.run(t),e.person_id&&i.run(t.id,"person",e.person_id),e.mentions??[]))i.run(t.id,r.type,r.id)})(),t}function S(){return _().prepare("SELECT * FROM interaction_mentions").all()}function f(e){return _().prepare("DELETE FROM interactions WHERE id = ?").run(e).changes>0}function I(e,t){return e<t?[e,t]:[t,e]}function A(){return _().prepare("SELECT * FROM relationships").all()}function j(e,t,r){if(e===t)return null;let[n,i]=I(e,t),o={person_a_id:n,person_b_id:i,strength:r};return _().prepare(`INSERT INTO relationships (person_a_id, person_b_id, strength)
       VALUES (@person_a_id, @person_b_id, @strength)
       ON CONFLICT(person_a_id, person_b_id) DO UPDATE SET strength = excluded.strength`).run(o),o}function g(e,t){let[r,n]=I(e,t);return _().prepare("DELETE FROM relationships WHERE person_a_id = ? AND person_b_id = ?").run(r,n).changes>0}function D(e){return{id:e.id,project_description:e.project_description,options:JSON.parse(e.options_json),chosen_index:e.chosen_index,rating:e.rating,feedback:e.feedback,created_at:e.created_at,completed_at:e.completed_at}}function U(e=50){return _().prepare("SELECT * FROM strategies ORDER BY created_at DESC LIMIT ?").all(e).map(D)}function F(e){let t=_().prepare("SELECT * FROM strategies WHERE id = ?").get(e);return t?D(t):void 0}function C(e){let t={id:T(),project_description:e.project_description,options:e.options,chosen_index:null,rating:null,feedback:null,created_at:Date.now(),completed_at:null};return _().prepare(`INSERT INTO strategies
       (id, project_description, options_json, chosen_index, rating, feedback, created_at, completed_at)
       VALUES (@id, @project_description, @options_json, @chosen_index, @rating, @feedback, @created_at, @completed_at)`).run({id:t.id,project_description:t.project_description,options_json:JSON.stringify(t.options),chosen_index:t.chosen_index,rating:t.rating,feedback:t.feedback,created_at:t.created_at,completed_at:t.completed_at}),t}function x(e,t,r,n){if(F(e))return _().prepare(`UPDATE strategies
       SET chosen_index = ?, rating = ?, feedback = ?, completed_at = ?
       WHERE id = ?`).run(t,r,n,Date.now(),e),F(e)}function y(e=20){return _().prepare("SELECT * FROM strategies WHERE rating IS NOT NULL ORDER BY completed_at DESC LIMIT ?").all(e).map(D)}function X(){return _().prepare("SELECT * FROM projects ORDER BY created_at DESC").all()}function h(e){return _().prepare("SELECT * FROM projects WHERE id = ?").get(e)}function b(e){let t={id:T(),name:e.name,description:e.description??"",created_at:Date.now()};return _().prepare(`INSERT INTO projects (id, name, description, created_at)
       VALUES (@id, @name, @description, @created_at)`).run(t),t}function M(e,t){let r=h(e);if(!r)return;let n={...r,...t,id:e};return _().prepare("UPDATE projects SET name = @name, description = @description WHERE id = @id").run(n),n}function k(e){return _().prepare("DELETE FROM projects WHERE id = ?").run(e).changes>0}function Y(e){return _().prepare("SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at DESC").all(e)}function w(){return _().prepare("SELECT * FROM project_files ORDER BY created_at DESC").all()}function G(e){return _().prepare("SELECT * FROM project_files WHERE id = ?").get(e)}function H(e){let t={id:T(),project_id:e.project_id,name:e.name,notes:e.notes??"",storage_path:e.storage_path??null,original_filename:e.original_filename??null,mime_type:e.mime_type??null,size_bytes:e.size_bytes??null,created_at:Date.now()};return _().prepare(`INSERT INTO project_files
       (id, project_id, name, notes, storage_path, original_filename, mime_type, size_bytes, created_at)
       VALUES (@id, @project_id, @name, @notes, @storage_path, @original_filename, @mime_type, @size_bytes, @created_at)`).run(t),t}function v(e,t){let r=G(e);if(!r)return;let n={...r,...t};return _().prepare("UPDATE project_files SET name = @name, notes = @notes WHERE id = @id").run(n),n}function P(e){let t=G(e);if(t)return _().prepare("DELETE FROM project_files WHERE id = ?").run(e),t}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[257,452],()=>r(3052));module.exports=n})();