(()=>{var e={};e.id=226,e.ids=[226],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},9748:e=>{"use strict";e.exports=require("fs/promises")},3873:e=>{"use strict";e.exports=require("path")},5985:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>S,routeModule:()=>m,serverHooks:()=>O,workAsyncStorage:()=>L,workUnitAsyncStorage:()=>f});var n={};r.r(n),r.d(n,{GET:()=>N,POST:()=>R,runtime:()=>l});var i=r(2706),o=r(8203),a=r(5994),s=r(9187),E=r(3873),p=r.n(E),c=r(9748),d=r.n(c),T=r(6448);let l="nodejs",_=p().join(process.cwd(),"data","files");async function u(){await d().mkdir(_,{recursive:!0})}async function N(e,{params:t}){let{id:r}=await t;return(0,T.U1)(r)?s.NextResponse.json({files:(0,T.RQ)(r)}):s.NextResponse.json({error:"not found"},{status:404})}async function R(e,{params:t}){let{id:r}=await t;if(!(0,T.U1)(r))return s.NextResponse.json({error:"project not found"},{status:404});if((e.headers.get("content-type")??"").includes("multipart/form-data")){let t=await e.formData(),n=t.get("name")??"",i=t.get("notes")??"",o=t.get("file");if(!n.trim()&&!o)return s.NextResponse.json({error:"name or file is required"},{status:400});let a=null,E=null,c=null,l=null;if(o){await u();let e=crypto.randomUUID(),t=p().extname(o.name),r=`${e}${t}`,n=p().join(_,r),i=Buffer.from(await o.arrayBuffer());await d().writeFile(n,i),a=`files/${r}`,E=o.name,c=o.type||null,l=i.length}let N=(0,T.sn)({project_id:r,name:n.trim()||E||"Untitled",notes:i,storage_path:a,original_filename:E,mime_type:c,size_bytes:l});return s.NextResponse.json({file:N},{status:201})}let n=await e.json().catch(()=>null);if(!n?.name||"string"!=typeof n.name)return s.NextResponse.json({error:"name is required"},{status:400});let i=(0,T.sn)({project_id:r,name:n.name,notes:n.notes??""});return s.NextResponse.json({file:i},{status:201})}let m=new i.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/projects/[id]/files/route",pathname:"/api/projects/[id]/files",filename:"route",bundlePath:"app/api/projects/[id]/files/route"},resolvedPagePath:"/workspaces/Hackathon2026/app/api/projects/[id]/files/route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:L,workUnitAsyncStorage:f,serverHooks:O}=m;function S(){return(0,a.patchFetch)({workAsyncStorage:L,workUnitAsyncStorage:f})}},6487:()=>{},8335:()=>{},6448:(e,t,r)=>{"use strict";r.d(t,{H8:()=>f,Gu:()=>N,gA:()=>b,sn:()=>H,WM:()=>F,yr:()=>S,H2:()=>m,xx:()=>M,nB:()=>B,SE:()=>A,iH:()=>u,U1:()=>h,c2:()=>G,qT:()=>y,B3:()=>Y,fS:()=>C,A$:()=>O,u0:()=>L,SR:()=>_,RQ:()=>k,hF:()=>X,iE:()=>j,EL:()=>U,Aw:()=>x,l0:()=>g,xs:()=>R,vr:()=>w,fu:()=>v});let n=require("better-sqlite3");var i=r.n(n),o=r(3873),a=r.n(o);let s=require("fs");var E=r.n(s);let p=a().join(process.cwd(),"data"),c=a().join(p,"projectmind.db");E().existsSync(p)||E().mkdirSync(p,{recursive:!0});let d=null;function T(){if(d)return d;let e=new(i())(c);return e.pragma("journal_mode = WAL"),e.pragma("foreign_keys = ON"),e.exec(`
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
  `),d=e,e}function l(){return crypto.randomUUID()}function _(){return T().prepare("SELECT * FROM people ORDER BY name ASC").all()}function u(e){return T().prepare("SELECT * FROM people WHERE id = ?").get(e)}function N(e){let t={id:l(),name:e.name,role:e.role??"",reliability:e.reliability??3,workload:e.workload??3,communication_style:e.communication_style??"",personality_notes:e.personality_notes??"",created_at:Date.now()};return T().prepare(`INSERT INTO people
       (id, name, role, reliability, workload, communication_style, personality_notes, created_at)
       VALUES (@id, @name, @role, @reliability, @workload, @communication_style, @personality_notes, @created_at)`).run(t),t}function R(e,t){let r=u(e);if(!r)return;let n={...r,...t,id:e};return T().prepare(`UPDATE people SET
         name = @name,
         role = @role,
         reliability = @reliability,
         workload = @workload,
         communication_style = @communication_style,
         personality_notes = @personality_notes
       WHERE id = @id`).run(n),n}function m(e){return T().prepare("DELETE FROM people WHERE id = ?").run(e).changes>0}function L(e=200){return T().prepare("SELECT * FROM interactions ORDER BY created_at DESC LIMIT ?").all(e)}function f(e){let t={id:l(),person_id:e.person_id??null,content:e.content,project_context:e.project_context??"",created_at:Date.now()},r=T(),n=r.prepare(`INSERT INTO interactions
     (id, person_id, content, project_context, created_at)
     VALUES (@id, @person_id, @content, @project_context, @created_at)`),i=r.prepare(`INSERT OR IGNORE INTO interaction_mentions
     (interaction_id, mention_type, target_id)
     VALUES (?, ?, ?)`);return r.transaction(()=>{for(let r of(n.run(t),e.person_id&&i.run(t.id,"person",e.person_id),e.mentions??[]))i.run(t.id,r.type,r.id)})(),t}function O(){return T().prepare("SELECT * FROM interaction_mentions").all()}function S(e){return T().prepare("DELETE FROM interactions WHERE id = ?").run(e).changes>0}function I(e,t){return e<t?[e,t]:[t,e]}function j(){return T().prepare("SELECT * FROM relationships").all()}function g(e,t,r){if(e===t)return null;let[n,i]=I(e,t),o={person_a_id:n,person_b_id:i,strength:r};return T().prepare(`INSERT INTO relationships (person_a_id, person_b_id, strength)
       VALUES (@person_a_id, @person_b_id, @strength)
       ON CONFLICT(person_a_id, person_b_id) DO UPDATE SET strength = excluded.strength`).run(o),o}function A(e,t){let[r,n]=I(e,t);return T().prepare("DELETE FROM relationships WHERE person_a_id = ? AND person_b_id = ?").run(r,n).changes>0}function D(e){return{id:e.id,project_description:e.project_description,options:JSON.parse(e.options_json),chosen_index:e.chosen_index,rating:e.rating,feedback:e.feedback,created_at:e.created_at,completed_at:e.completed_at}}function U(e=50){return T().prepare("SELECT * FROM strategies ORDER BY created_at DESC LIMIT ?").all(e).map(D)}function y(e){let t=T().prepare("SELECT * FROM strategies WHERE id = ?").get(e);return t?D(t):void 0}function F(e){let t={id:l(),project_description:e.project_description,options:e.options,chosen_index:null,rating:null,feedback:null,created_at:Date.now(),completed_at:null};return T().prepare(`INSERT INTO strategies
       (id, project_description, options_json, chosen_index, rating, feedback, created_at, completed_at)
       VALUES (@id, @project_description, @options_json, @chosen_index, @rating, @feedback, @created_at, @completed_at)`).run({id:t.id,project_description:t.project_description,options_json:JSON.stringify(t.options),chosen_index:t.chosen_index,rating:t.rating,feedback:t.feedback,created_at:t.created_at,completed_at:t.completed_at}),t}function x(e,t,r,n){if(y(e))return T().prepare(`UPDATE strategies
       SET chosen_index = ?, rating = ?, feedback = ?, completed_at = ?
       WHERE id = ?`).run(t,r,n,Date.now(),e),y(e)}function C(e=20){return T().prepare("SELECT * FROM strategies WHERE rating IS NOT NULL ORDER BY completed_at DESC LIMIT ?").all(e).map(D)}function X(){return T().prepare("SELECT * FROM projects ORDER BY created_at DESC").all()}function h(e){return T().prepare("SELECT * FROM projects WHERE id = ?").get(e)}function b(e){let t={id:l(),name:e.name,description:e.description??"",created_at:Date.now()};return T().prepare(`INSERT INTO projects (id, name, description, created_at)
       VALUES (@id, @name, @description, @created_at)`).run(t),t}function w(e,t){let r=h(e);if(!r)return;let n={...r,...t,id:e};return T().prepare("UPDATE projects SET name = @name, description = @description WHERE id = @id").run(n),n}function M(e){return T().prepare("DELETE FROM projects WHERE id = ?").run(e).changes>0}function k(e){return T().prepare("SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at DESC").all(e)}function Y(){return T().prepare("SELECT * FROM project_files ORDER BY created_at DESC").all()}function G(e){return T().prepare("SELECT * FROM project_files WHERE id = ?").get(e)}function H(e){let t={id:l(),project_id:e.project_id,name:e.name,notes:e.notes??"",storage_path:e.storage_path??null,original_filename:e.original_filename??null,mime_type:e.mime_type??null,size_bytes:e.size_bytes??null,created_at:Date.now()};return T().prepare(`INSERT INTO project_files
       (id, project_id, name, notes, storage_path, original_filename, mime_type, size_bytes, created_at)
       VALUES (@id, @project_id, @name, @notes, @storage_path, @original_filename, @mime_type, @size_bytes, @created_at)`).run(t),t}function v(e,t){let r=G(e);if(!r)return;let n={...r,...t};return T().prepare("UPDATE project_files SET name = @name, notes = @notes WHERE id = @id").run(n),n}function B(e){let t=G(e);if(t)return T().prepare("DELETE FROM project_files WHERE id = ?").run(e),t}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[257,452],()=>r(5985));module.exports=n})();