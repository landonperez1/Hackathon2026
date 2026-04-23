(()=>{var e={};e.id=147,e.ids=[147],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3873:e=>{"use strict";e.exports=require("path")},4548:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>R,routeModule:()=>T,serverHooks:()=>N,workAsyncStorage:()=>u,workUnitAsyncStorage:()=>_});var n={};r.r(n),r.d(n,{DELETE:()=>l,GET:()=>c,PATCH:()=>d,runtime:()=>E});var o=r(2706),i=r(8203),a=r(5994),s=r(9187),p=r(6448);let E="nodejs";async function c(e,{params:t}){let{id:r}=await t,n=(0,p.iH)(r);return n?s.NextResponse.json({person:n}):s.NextResponse.json({error:"not found"},{status:404})}async function d(e,{params:t}){let{id:r}=await t,n=await e.json(),o=(0,p.xs)(r,n);return o?s.NextResponse.json({person:o}):s.NextResponse.json({error:"not found"},{status:404})}async function l(e,{params:t}){let{id:r}=await t;return(0,p.H2)(r)?s.NextResponse.json({ok:!0}):s.NextResponse.json({error:"not found"},{status:404})}let T=new o.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/people/[id]/route",pathname:"/api/people/[id]",filename:"route",bundlePath:"app/api/people/[id]/route"},resolvedPagePath:"/workspaces/Hackathon2026/app/api/people/[id]/route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:u,workUnitAsyncStorage:_,serverHooks:N}=T;function R(){return(0,a.patchFetch)({workAsyncStorage:u,workUnitAsyncStorage:_})}},6487:()=>{},8335:()=>{},6448:(e,t,r)=>{"use strict";r.d(t,{H8:()=>S,Gu:()=>N,WM:()=>U,yr:()=>m,H2:()=>L,SE:()=>A,iH:()=>_,qT:()=>j,fS:()=>F,u0:()=>O,SR:()=>u,iE:()=>f,EL:()=>D,Aw:()=>y,l0:()=>x,xs:()=>R});let n=require("better-sqlite3");var o=r.n(n),i=r(3873),a=r.n(i);let s=require("fs");var p=r.n(s);let E=a().join(process.cwd(),"data"),c=a().join(E,"projectmind.db");p().existsSync(E)||p().mkdirSync(E,{recursive:!0});let d=null;function l(){if(d)return d;let e=new(o())(c);return e.pragma("journal_mode = WAL"),e.pragma("foreign_keys = ON"),e.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_interactions_person ON interactions(person_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_strategies_created ON strategies(created_at DESC);
  `),d=e,e}function T(){return crypto.randomUUID()}function u(){return l().prepare("SELECT * FROM people ORDER BY name ASC").all()}function _(e){return l().prepare("SELECT * FROM people WHERE id = ?").get(e)}function N(e){let t={id:T(),name:e.name,role:e.role??"",reliability:e.reliability??3,workload:e.workload??3,communication_style:e.communication_style??"",personality_notes:e.personality_notes??"",created_at:Date.now()};return l().prepare(`INSERT INTO people
       (id, name, role, reliability, workload, communication_style, personality_notes, created_at)
       VALUES (@id, @name, @role, @reliability, @workload, @communication_style, @personality_notes, @created_at)`).run(t),t}function R(e,t){let r=_(e);if(!r)return;let n={...r,...t,id:e};return l().prepare(`UPDATE people SET
         name = @name,
         role = @role,
         reliability = @reliability,
         workload = @workload,
         communication_style = @communication_style,
         personality_notes = @personality_notes
       WHERE id = @id`).run(n),n}function L(e){return l().prepare("DELETE FROM people WHERE id = ?").run(e).changes>0}function O(e=200){return l().prepare("SELECT * FROM interactions ORDER BY created_at DESC LIMIT ?").all(e)}function S(e){let t={id:T(),person_id:e.person_id??null,content:e.content,project_context:e.project_context??"",created_at:Date.now()};return l().prepare(`INSERT INTO interactions
       (id, person_id, content, project_context, created_at)
       VALUES (@id, @person_id, @content, @project_context, @created_at)`).run(t),t}function m(e){return l().prepare("DELETE FROM interactions WHERE id = ?").run(e).changes>0}function I(e,t){return e<t?[e,t]:[t,e]}function f(){return l().prepare("SELECT * FROM relationships").all()}function x(e,t,r){if(e===t)return null;let[n,o]=I(e,t),i={person_a_id:n,person_b_id:o,strength:r};return l().prepare(`INSERT INTO relationships (person_a_id, person_b_id, strength)
       VALUES (@person_a_id, @person_b_id, @strength)
       ON CONFLICT(person_a_id, person_b_id) DO UPDATE SET strength = excluded.strength`).run(i),i}function A(e,t){let[r,n]=I(e,t);return l().prepare("DELETE FROM relationships WHERE person_a_id = ? AND person_b_id = ?").run(r,n).changes>0}function g(e){return{id:e.id,project_description:e.project_description,options:JSON.parse(e.options_json),chosen_index:e.chosen_index,rating:e.rating,feedback:e.feedback,created_at:e.created_at,completed_at:e.completed_at}}function D(e=50){return l().prepare("SELECT * FROM strategies ORDER BY created_at DESC LIMIT ?").all(e).map(g)}function j(e){let t=l().prepare("SELECT * FROM strategies WHERE id = ?").get(e);return t?g(t):void 0}function U(e){let t={id:T(),project_description:e.project_description,options:e.options,chosen_index:null,rating:null,feedback:null,created_at:Date.now(),completed_at:null};return l().prepare(`INSERT INTO strategies
       (id, project_description, options_json, chosen_index, rating, feedback, created_at, completed_at)
       VALUES (@id, @project_description, @options_json, @chosen_index, @rating, @feedback, @created_at, @completed_at)`).run({id:t.id,project_description:t.project_description,options_json:JSON.stringify(t.options),chosen_index:t.chosen_index,rating:t.rating,feedback:t.feedback,created_at:t.created_at,completed_at:t.completed_at}),t}function y(e,t,r,n){if(j(e))return l().prepare(`UPDATE strategies
       SET chosen_index = ?, rating = ?, feedback = ?, completed_at = ?
       WHERE id = ?`).run(t,r,n,Date.now(),e),j(e)}function F(e=20){return l().prepare("SELECT * FROM strategies WHERE rating IS NOT NULL ORDER BY completed_at DESC LIMIT ?").all(e).map(g)}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[257,452],()=>r(4548));module.exports=n})();