(()=>{var e={};e.id=733,e.ids=[733],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3873:e=>{"use strict";e.exports=require("path")},1871:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>u,routeModule:()=>d,serverHooks:()=>_,workAsyncStorage:()=>T,workUnitAsyncStorage:()=>l});var n={};r.r(n),r.d(n,{GET:()=>c,runtime:()=>E});var i=r(2706),o=r(8203),a=r(5994),s=r(9187),p=r(6448);let E="nodejs";async function c(e,{params:t}){let{id:r}=await t,n=(0,p.qT)(r);return n?s.NextResponse.json({strategy:n}):s.NextResponse.json({error:"not found"},{status:404})}let d=new i.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/strategies/[id]/route",pathname:"/api/strategies/[id]",filename:"route",bundlePath:"app/api/strategies/[id]/route"},resolvedPagePath:"/workspaces/Hackathon2026/app/api/strategies/[id]/route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:T,workUnitAsyncStorage:l,serverHooks:_}=d;function u(){return(0,a.patchFetch)({workAsyncStorage:T,workUnitAsyncStorage:l})}},6487:()=>{},8335:()=>{},6448:(e,t,r)=>{"use strict";r.d(t,{H8:()=>S,Gu:()=>N,WM:()=>y,yr:()=>m,H2:()=>R,SE:()=>x,iH:()=>u,qT:()=>U,fS:()=>j,u0:()=>O,SR:()=>_,iE:()=>g,EL:()=>D,Aw:()=>F,l0:()=>f,xs:()=>L});let n=require("better-sqlite3");var i=r.n(n),o=r(3873),a=r.n(o);let s=require("fs");var p=r.n(s);let E=a().join(process.cwd(),"data"),c=a().join(E,"projectmind.db");p().existsSync(E)||p().mkdirSync(E,{recursive:!0});let d=null;function T(){if(d)return d;let e=new(i())(c);return e.pragma("journal_mode = WAL"),e.pragma("foreign_keys = ON"),e.exec(`
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
  `),d=e,e}function l(){return crypto.randomUUID()}function _(){return T().prepare("SELECT * FROM people ORDER BY name ASC").all()}function u(e){return T().prepare("SELECT * FROM people WHERE id = ?").get(e)}function N(e){let t={id:l(),name:e.name,role:e.role??"",reliability:e.reliability??3,workload:e.workload??3,communication_style:e.communication_style??"",personality_notes:e.personality_notes??"",created_at:Date.now()};return T().prepare(`INSERT INTO people
       (id, name, role, reliability, workload, communication_style, personality_notes, created_at)
       VALUES (@id, @name, @role, @reliability, @workload, @communication_style, @personality_notes, @created_at)`).run(t),t}function L(e,t){let r=u(e);if(!r)return;let n={...r,...t,id:e};return T().prepare(`UPDATE people SET
         name = @name,
         role = @role,
         reliability = @reliability,
         workload = @workload,
         communication_style = @communication_style,
         personality_notes = @personality_notes
       WHERE id = @id`).run(n),n}function R(e){return T().prepare("DELETE FROM people WHERE id = ?").run(e).changes>0}function O(e=200){return T().prepare("SELECT * FROM interactions ORDER BY created_at DESC LIMIT ?").all(e)}function S(e){let t={id:l(),person_id:e.person_id??null,content:e.content,project_context:e.project_context??"",created_at:Date.now()};return T().prepare(`INSERT INTO interactions
       (id, person_id, content, project_context, created_at)
       VALUES (@id, @person_id, @content, @project_context, @created_at)`).run(t),t}function m(e){return T().prepare("DELETE FROM interactions WHERE id = ?").run(e).changes>0}function I(e,t){return e<t?[e,t]:[t,e]}function g(){return T().prepare("SELECT * FROM relationships").all()}function f(e,t,r){if(e===t)return null;let[n,i]=I(e,t),o={person_a_id:n,person_b_id:i,strength:r};return T().prepare(`INSERT INTO relationships (person_a_id, person_b_id, strength)
       VALUES (@person_a_id, @person_b_id, @strength)
       ON CONFLICT(person_a_id, person_b_id) DO UPDATE SET strength = excluded.strength`).run(o),o}function x(e,t){let[r,n]=I(e,t);return T().prepare("DELETE FROM relationships WHERE person_a_id = ? AND person_b_id = ?").run(r,n).changes>0}function A(e){return{id:e.id,project_description:e.project_description,options:JSON.parse(e.options_json),chosen_index:e.chosen_index,rating:e.rating,feedback:e.feedback,created_at:e.created_at,completed_at:e.completed_at}}function D(e=50){return T().prepare("SELECT * FROM strategies ORDER BY created_at DESC LIMIT ?").all(e).map(A)}function U(e){let t=T().prepare("SELECT * FROM strategies WHERE id = ?").get(e);return t?A(t):void 0}function y(e){let t={id:l(),project_description:e.project_description,options:e.options,chosen_index:null,rating:null,feedback:null,created_at:Date.now(),completed_at:null};return T().prepare(`INSERT INTO strategies
       (id, project_description, options_json, chosen_index, rating, feedback, created_at, completed_at)
       VALUES (@id, @project_description, @options_json, @chosen_index, @rating, @feedback, @created_at, @completed_at)`).run({id:t.id,project_description:t.project_description,options_json:JSON.stringify(t.options),chosen_index:t.chosen_index,rating:t.rating,feedback:t.feedback,created_at:t.created_at,completed_at:t.completed_at}),t}function F(e,t,r,n){if(U(e))return T().prepare(`UPDATE strategies
       SET chosen_index = ?, rating = ?, feedback = ?, completed_at = ?
       WHERE id = ?`).run(t,r,n,Date.now(),e),U(e)}function j(e=20){return T().prepare("SELECT * FROM strategies WHERE rating IS NOT NULL ORDER BY completed_at DESC LIMIT ?").all(e).map(A)}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[257,452],()=>r(1871));module.exports=n})();