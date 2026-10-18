# ADR-0001: สถาปัตยกรรม full stack แบบฟรีสำหรับ INT100 Prep

**Status:** Accepted
**Date:** 2026-10-19
**Deciders:** เจ้าของโปรเจกต์ (angelinaploy999)

## Context

INT100 Prep เป็นเว็บแอปช่วยทบทวนวิชา INT100 Design Thinking 1 (1/2026) มีบทเรียนตาม 5 stage, quiz และติดตามความคืบหน้ารายคน

ข้อจำกัด:
- **ผู้ใช้ไม่เกิน 100 คน** (นักศึกษาปี 1 สองกลุ่มเรียน) ใช้งานหนักช่วงก่อนสอบ week 12
- **ค่าใช้จ่าย 0 บาท** ทุกส่วน: database, auth, hosting
- ทีมเป็นนักศึกษา ดูแลระบบได้น้อย ไม่ควรมี server ให้ดูแลเอง
- มี schema ใน Supabase อยู่แล้ว (`supabase/migrations/`)

ความต้องการที่ไม่ใช่ฟังก์ชัน: ใช้บนมือถือได้, ข้อมูลความคืบหน้าแยกรายคนอย่างปลอดภัย, เฉลยต้องไม่หลุดก่อนตอบ

## Decision

**SPA (Vite + React + TypeScript) โฮสต์บน static hosting ฟรี + Supabase free tier เป็น backend ทั้งหมด** (Postgres, Auth, Data API) ไม่มี server ของเราเอง

```
Browser (React SPA)
   │  supabase-js (publishable key + user JWT)
   ▼
Supabase (free)
   ├─ Auth: email + password
   ├─ Data API (PostgREST) ── RLS ต่อผู้ใช้
   └─ Postgres 17
        ├─ public: stages, lessons, questions (อ่านอย่างเดียว)
        ├─ public: quiz_attempts, attempt_answers, lesson_progress (เจ้าของเท่านั้น)
        └─ private: grade_answer() / finalize_attempt() triggers
Static host (Vercel / Netlify / Cloudflare Pages — free)
```

Business logic ที่ต้องเชื่อถือได้ (ตรวจคำตอบ, คิดคะแนน) อยู่ใน database trigger ส่วนอย่างอื่นอยู่ฝั่ง client

## Options Considered

### Option A: SPA + Supabase (เลือก)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low: ไม่มี backend code ให้ deploy |
| Cost | ฟรี: Supabase free (500 MB DB, 50,000 MAU), static host ฟรี |
| Scalability | เกินพอสำหรับ 100 คน |
| Team familiarity | ใช้ schema ที่มีอยู่แล้ว, React เป็นที่รู้จัก |

**Pros:** ไม่มี server, auth + RLS ในตัว, deploy ด้วย `git push`
**Cons:** project ฟรีจะถูก pause หลังไม่มีการใช้งาน 7 วัน, อีเมลจาก SMTP ฟรีถูกจำกัดจำนวนต่อชั่วโมง

### Option B: Next.js (SSR) บน Vercel + Supabase
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium: server components, cookies auth (`@supabase/ssr`) |
| Cost | ฟรี (Vercel Hobby) |
| Scalability | เกินพอ |
| Team familiarity | ต้องเรียนรู้ SSR/auth cookies เพิ่ม |

**Pros:** SEO, ซ่อน logic ฝั่ง server ได้
**Cons:** ซับซ้อนกว่าที่ต้องการ (แอปต้อง login ก่อนอยู่แล้ว SEO ไม่สำคัญ), ผูกกับ Vercel

### Option C: Express API + SQLite บน free PaaS (Render ฯลฯ)
| Dimension | Assessment |
|-----------|------------|
| Complexity | High: เขียน auth, session, API เอง |
| Cost | ฟรีแต่ instance หลับเมื่อไม่ใช้ (cold start ~30 วินาที), disk ฟรีอาจหายเมื่อ redeploy |
| Scalability | พอ แต่ข้อมูลเสี่ยงหาย |
| Team familiarity | ปานกลาง |

**Pros:** ควบคุมได้ทั้งหมด
**Cons:** งานดูแลเยอะ, ความปลอดภัยของ auth ต้องทำเอง, ข้อมูลไม่ถาวร

## Trade-off Analysis

A กับ B ใช้ Supabase เหมือนกัน ต่างแค่ชั้นหน้าเว็บ แอปนี้ไม่ต้องการ SEO และทุกหน้าต้อง login ดังนั้น SSR ไม่ได้ให้ประโยชน์คุ้มกับความซับซ้อน ส่วนเรื่อง "ซ่อน logic" ทำได้ใน database แทน: ตรวจคำตอบด้วย trigger และเปิด column `questions.answer` ให้ client ไม่ได้ (column-level grant)

C ถูกตัดออกเพราะต้องเขียน auth เอง และ free PaaS ไม่รับประกันข้อมูลบน disk

## Consequences

- **ง่ายขึ้น:** deploy = build static files, ไม่มี server ให้ patch, สิทธิ์ทั้งหมดอยู่ใน RLS ที่เดียว
- **ยากขึ้น:** logic ฝั่ง server ต้องเขียนเป็น SQL/plpgsql, client ต้องระบุ column ของ `questions` เสมอ (ใช้ `select('*')` ไม่ได้ เพราะ `answer` ถูกซ่อน)
- **Free tier pause:** project ที่ไม่มี request 7 วันจะถูก pause มี GitHub Action (`.github/workflows/keepalive.yml`) ยิง request ทุก 3 วัน
- **SMTP ฟรีจำกัดอีเมล:** ปิด email confirmation ใน Supabase Auth เพื่อให้สมัครด้วย email + password ได้ทันที (แลกกับการไม่ยืนยันอีเมล ยอมรับได้สำหรับแอปทบทวน)
- **ต้องกลับมาดู:** ถ้าผู้ใช้เกินหลักพัน หรืออยากให้อาจารย์แก้เนื้อหาผ่านหน้าเว็บ ต้องเพิ่ม role admin (`app_metadata`) และ policy เขียนเนื้อหา

## Action Items
1. [x] Schema + RLS + grading triggers (`supabase/migrations/`)
2. [x] Seed เนื้อหา 5 stage (`supabase/seed.sql`)
3. [x] React SPA (`src/`) + design tokens จาก design system INT100 Prep
4. [ ] สร้าง Supabase project (free), `supabase db push`, ปิด email confirmation
5. [ ] Deploy static site, ตั้ง `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
6. [ ] ตั้ง GitHub secrets สำหรับ keepalive workflow
