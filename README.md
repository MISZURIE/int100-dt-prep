# INT100 Prep

เว็บแอปทบทวนวิชา **INT100 Design Thinking 1** (BSc IT, SIT KMUTT, 1/2026): บทเรียนครบ 5 stage, quiz ที่ตรวจคำตอบในฐานข้อมูล และหน้าติดตามความคืบหน้ารายคน

รองรับผู้ใช้ประมาณ 100 คน และ **ใช้บริการฟรีทั้งหมด** (เหตุผลการออกแบบอยู่ใน [docs/adr/0001-free-tier-full-stack.md](docs/adr/0001-free-tier-full-stack.md))

| ส่วน | เทคโนโลยี | ค่าใช้จ่าย |
| --- | --- | --- |
| Frontend | Vite + React 19 + TypeScript (SPA) | ฟรี |
| Backend / DB / Auth | Supabase (Postgres 17, Auth, Data API, RLS) | Free plan |
| Hosting | Vercel, Netlify หรือ Cloudflare Pages | Free plan |
| Keepalive | GitHub Actions | ฟรี |

## โครงสร้างโฟลเดอร์

```
.
├── docs/adr/                  # Architecture Decision Records
├── public/                    # ไฟล์ static (favicon, _redirects สำหรับ Netlify/Cloudflare)
├── src/
│   ├── api/                   # ฟังก์ชันคุยกับ Supabase (content, progress, quiz)
│   ├── auth/                  # AuthProvider + RequireAuth (route guard)
│   ├── components/            # Layout, StageChip, ProgressBar, QuestionCard, Status
│   ├── hooks/                 # useAsync
│   ├── lib/                   # supabase client, types ของตาราง
│   ├── pages/                 # Login, Dashboard, Stage, Lesson, Quiz, History, NotFound
│   ├── styles/                # tokens.css (design system), app.css
│   ├── App.tsx                # routes
│   └── main.tsx               # entry
├── supabase/
│   ├── config.toml            # ตั้งค่า local Supabase
│   ├── migrations/            # schema, RLS, triggers ตรวจคำตอบ
│   └── seed.sql               # เนื้อหา 5 stage + คำถามตัวอย่าง
├── .github/workflows/keepalive.yml
├── vercel.json                # SPA rewrite สำหรับ Vercel
└── .env.example
```

## การทำงานหลัก

- **สมัคร / เข้าสู่ระบบ** ด้วยอีเมล + รหัสผ่าน (Supabase Auth)
- **ภาพรวม**: ความคืบหน้าแต่ละ stage, คะแนน quiz ที่ดีที่สุด
- **บทเรียน**: อ่านเนื้อหา (Markdown) และกด "อ่านแล้ว"
- **Quiz** ราย stage หรือรวมทุก stage: multiple choice และ true/false ตรวจโดย database trigger, ข้อเขียนให้ผู้ใช้เทียบกับตัวอย่างคำตอบแล้วประเมินตัวเอง
- **ประวัติ** quiz ที่ทำเสร็จแล้ว

**ความปลอดภัย**: ทุกตารางเปิด RLS, ข้อมูลความคืบหน้าเห็นได้เฉพาะเจ้าของ, column `questions.answer` / `explanation` client อ่านไม่ได้ (จะเห็นเฉลยหลังส่งคำตอบแล้วเท่านั้น), คะแนนคำนวณใน database และแก้ไม่ได้หลังส่ง quiz

## รันบนเครื่อง (local)

ต้องมี Node.js 20+ และ Docker Desktop (เปิดไว้)

```bash
npm install
npx supabase start          # ครั้งแรกจะดาวน์โหลด Docker images หลาย GB
npx supabase db reset       # สร้าง schema + ใส่ข้อมูลตัวอย่าง
cp .env.example .env.local  # ใส่ API URL และ Publishable key ที่ `supabase start` แสดง
npm run dev                 # เปิด http://localhost:5173
```

ดูค่า URL / key อีกครั้งได้ด้วย `npx supabase status`

## Deploy ขึ้นโฮสต์ฟรี

### 1. Supabase (ฐานข้อมูล + auth)

1. สร้าง project ใหม่ที่ <https://supabase.com/dashboard> (Free plan, region Singapore ใกล้ไทยที่สุด)
2. ส่ง schema และเนื้อหาขึ้นไป:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --include-seed
   ```
3. **Authentication > Sign In / Providers > Email**: ปิด **Confirm email** (อีเมลจาก SMTP ฟรีถูกจำกัดไม่กี่ฉบับต่อชั่วโมง ถ้าเปิดไว้ นักศึกษาจะสมัครพร้อมกันไม่ได้)
4. **Authentication > URL Configuration**: ตั้ง Site URL เป็น URL ของเว็บที่ deploy แล้ว
5. **Project Settings > API Keys**: คัดลอก Project URL และ **Publishable key** (ห้ามใช้ secret key ในเว็บ)

### 2. เว็บ (เลือกอย่างใดอย่างหนึ่ง)

**Vercel**: Import repo จาก GitHub ใช้ค่าใน `vercel.json` ได้เลย แล้วตั้ง Environment Variables:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

**Netlify / Cloudflare Pages**: Build command `npm run build`, output directory `dist`, ตั้ง env vars สองตัวเดียวกัน (`public/_redirects` จัดการ SPA routing ให้แล้ว)

### 3. กันไม่ให้ Supabase ถูก pause

Supabase Free จะ pause project ที่ไม่มีการใช้งาน 7 วัน ใน GitHub repo ไปที่ **Settings > Secrets and variables > Actions** แล้วเพิ่ม `SUPABASE_URL` และ `SUPABASE_PUBLISHABLE_KEY` จากนั้น workflow `keepalive.yml` จะยิง request ทุก 3 วัน

## ข้อจำกัดของ Free plan (เกินพอสำหรับ 100 คน)

- Database 500 MB, 50,000 monthly active users
- Project ถูก pause หลังไม่มีการใช้งาน 7 วัน (แก้ด้วย keepalive ด้านบน)
- ไม่มี automatic backup แนะนำ `npx supabase db dump --data-only -f backup.sql` ก่อนสอบ

## เพิ่มเนื้อหา / คำถาม

ตอนนี้มีคำถามราว 155 ข้อ (stage ละ 31–32 ข้อ: เลือกตอบ ถูก/ผิด และข้อเขียน) ใน
`supabase/migrations/*_add_question_bank.sql` และ `supabase/seed.sql`
Quiz รายstage ใช้ทุกข้อ ส่วน Quiz รวมสุ่มมา 30 ข้อต่อรอบ (ปรับที่ `MIXED_QUIZ_SIZE` ใน `src/pages/QuizPage.tsx`)

**หลัง deploy แล้ว อย่าแก้ไฟล์ migration เดิมหรือรัน seed ซ้ำ** ให้สร้างไฟล์ใหม่แล้ว push:
```bash
npx supabase migration new add_more_questions   # แล้วเขียน insert / update ในไฟล์ที่ได้
npx supabase db push
```
รูปแบบ `answer`: multiple choice ใช้ลำดับตัวเลือกเริ่มที่ `0`, true/false ใช้ `true` / `false`, ข้อเขียนใส่ตัวอย่างคำตอบ
