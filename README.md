# The Unmuted | 非默 · 内测版 (Beta)

> Make truth harder to erase. Make seeking help easier to begin.
> 让真相不被轻易抹去，让求助可以更早开始。

**The Unmuted** is a bilingual (EN/ZH) mobile safety tool for survivors of domestic violence, sexual assault, sexual harassment, stalking, and related gender-based harm in mainland China and beyond.

Core features: trusted-contact SOS, end-to-end encrypted evidence storage with one-tap court-ready export, guided post-incident documentation, verified aid directories, and a **scripted process simulator grounded in real Chinese court judgments** that walks users through the real legal steps — safely, before it's real. This branch is the **internal beta**: no signup, no server storage, hardcoded demo password `123456` — designed for team members and early testers to experience the full production flow risk-free.

**非默** 是一款面向性骚扰、跟踪、性侵、胁迫、家暴及其他性别伤害场景的双语移动端个人安全工具，面向中国大陆及海外用户。

核心功能：可信联系人 SOS、端到端加密存证与一键导出举证包、事后记录指引、经过核实的援助目录，以及**基于真实中国法院判决书的脚本式报案流程模拟器**——让用户在安全环境中提前演练真实法律流程。**本分支为内测版**：不需要注册、不上传服务器、硬编码密码 `123456`。

---

## Live | 在线访问

**Internal beta — no signup required.** **内测版本——无需注册。**

| Deployment | URL | Default Language | Best For |
|---|---|---|---|
| **Cloudflare Pages** (境内) | https://the-unmuted-beta.pages.dev/ | 中文 | 中国大陆用户 |
| **Vercel** (海外) | https://the-unmuted-demo.vercel.app/ | English | 海外访问、UNESCO 黑客松展示 |

Both deploy automatically from the `hackathon-demo` branch. Vault password on entry is `123456` (hardcoded for the beta).
两个部署都从 `hackathon-demo` 分支自动构建。保险柜密码 `123456`（内测版硬编码）。

---

## What's Different in Beta | 内测版与生产版的区别

| Aspect | Beta (this branch) | Production (v2) |
|---|---|---|
| Sign-up | ❌ None | ✅ Email + password + OTP + recovery code |
| Evidence storage | 🖥️ Browser IndexedDB only | ☁️ Encrypted cloud (Supabase Storage) |
| Vault password | 🔑 Hardcoded `123456` | 🔑 User-chosen, Argon2id-derived |
| Cross-device sync | ❌ None | ✅ Cloud sync |
| Data persistence | ⚠️ Clearing browser cache = data lost | ✅ Cloud-backed |
| Purpose | Feature preview & UNESCO demo | Real users |

⚠️ **Do NOT upload real evidence to the beta.** The beta is for feature preview only. All data lives in your browser only (`src/lib/demoVault.ts`) and is destroyed when you clear the browser cache or switch devices.
⚠️ **请勿在内测版上传真实证据。** 内测版仅用于功能预览。所有数据只保存在你的浏览器里，清除浏览器缓存或切换设备后即消失。

---

## Current Product Scope | 当前版本范围

### 1. Personal SOS | 个人紧急求助

- One trusted emergency contact, stored on-device only.
- Hold the SOS button 2 seconds → the phone's native SMS flow opens with a pre-filled emergency message including GPS coordinates and a Gaode Maps navigation link (GCJ-02 converted).
- SOS is reachable **from the lock screen** via a discreet entry — no unlock needed in an emergency.

- 1 位可信紧急联系人，仅保存在设备本地。
- 长按 SOS 按钮 2 秒 → 打开系统短信，自动填入含 GPS 坐标和高德导航链接的求助内容（已做 GCJ-02 坐标转换）。
- 锁屏状态下也有隐蔽的 SOS 入口——紧急时刻无需先解锁。

### 2. Evidence Vault | 加密存证

- In-app camera / video / audio capture, plus import of existing files.
- SHA-256 hash computed at the instant of capture; device time, GCJ-02 location, and device info sealed client-side into encrypted metadata.
- **Beta:** stored to browser IndexedDB with a hardcoded demo key. **Production:** encrypted client-side with AES-256-GCM before any upload; server never sees plaintext.
- Records are graded 一级现场取证 (captured in-app, fresh) vs 二级事后导入 (imported later).
- **One-tap court export (导出举证包)**: a plain ZIP with the decrypted original, metadata, hashes, and a self-contained bilingual verification page — verifiable with standard OS tools (certutil / shasum).

- 应用内拍照 / 录像 / 录音取证，也支持导入已有文件。
- 取证瞬间即计算 SHA-256 哈希；设备时间、GCJ-02 位置、设备信息在本机封入加密元数据。
- **内测版：** 保存在浏览器 IndexedDB，使用硬编码的演示密钥。**生产版：** 上传前先用 AES-256-GCM 在客户端加密，服务器只见密文。
- 记录分级：一级现场取证 vs 二级事后导入。
- **一键导出举证包**：标准 ZIP，含解密原件、元数据、哈希值和自包含的双语核验说明页——用系统自带工具（certutil / shasum）即可核验。

### 3. Aid Directory | 援助目录

- Single merged tab with a 心理援助 / 法律援助 segment toggle.
- Structured, city-filterable directory of verified hotlines and resources (家暴/性侵/骚扰/婚姻家事/心理/综合维权).
- Every entry is human-verified before listing; the verification date is shown on each card.
- A weekly CI job re-checks each entry's official source page and flags dead numbers.

- 心理援助 / 法律援助 合并为一个援助页，顶部分段切换。
- 结构化、可按城市筛选的援助目录，覆盖家暴/性侵/骚扰/婚姻家事/心理/综合维权。
- 每条资源在收录前均经人工核实，卡片上展示核实日期。
- 每周自动巡检各条目的官方来源页，发现失效号码即告警。

### 4. Process Simulator | 报案流程模拟器 ⭐

A scripted, chat-style simulator that walks users through the real legal process for three scenarios. **All three scenarios have been completely rewritten from real Chinese court judgments**, so the questions, defense arguments, timelines, and damage awards reflect what actually happens in Chinese courts — not idealized narratives.

一个脚本式、聊天气泡界面的模拟器。**三个情景全部基于真实中国法院判决书重写**——问答、辩方策略、时间线、赔偿金额都反映真实中国法院里发生的事，不是理想化的叙述。

#### 三个情景 | Three Scenarios

- **TA正在被家暴该怎么做** — Based on 3 real judgments (四川高院 2014, 新疆巴音郭楞 2026, 内蒙古锡林浩特 2026). Three parallel entries: emergency (happening now), ongoing (months/years), post-separation stalking. Teaches Warning Letter (家庭暴力告诫书), Personal Safety Protection Order (人身安全保护令), and the "all damages in one filing" rule under Civil Code §1091.
- **TA被性骚扰了该怎么做** — Based on 6 real judgments (上海徐汇 2026, 云南曲靖 2024, 北京大兴 2021, 安徽淮南 2023, 广东广州 2021, 广东梅州 2024). Four situation-specific paths: WeChat/SMS harassment, workplace, acquaintance, landlord. Real damages awarded (¥2,000-¥8,000 emotional damages typical) and the actual defense playbook.
- **TA被性侵了该怎么做** — Based on 2 real judgments (江西余干 2021, 山东临沂 2022). Aftermath-only (the assault is never rendered). Teaches the 72-hour window, paper-bag evidence preservation, hospital exam ≠ mandatory reporting, the Case Receipt (受案回执), and how to challenge a 不予立案 decision.

- **TA正在被家暴该怎么做** — 基于 3 份真实判决书（四川高院 2014、新疆巴音郭楞 2026、内蒙古锡林浩特 2026）。三条并行入口：紧急、长期、分手后跟踪。教学告诫书、人身安全保护令，以及依民法典 1091 条「所有赔偿在离婚案中一并主张」的关键规则。
- **TA被性骚扰了该怎么做** — 基于 6 份真实判决书（上海徐汇 2026、云南曲靖 2024、北京大兴 2021、安徽淮南 2023、广东广州 2021、广东梅州 2024）。四种情境分支：微信/短信骚扰、职场、熟人、房东入户。真实赔偿金额（精神抚慰金常规 2000-8000 元）和辩方真实套路。
- **TA被性侵了该怎么做** — 基于 2 份真实判决书（江西余干 2021、山东临沂 2022）。仅事后（侵害过程绝不呈现）。教学黄金 72 小时、纸袋封存衣物、医院取证≠必须报案、受案回执，以及如何对抗不予立案。

#### 完成流程后 | After Each Run

- **📊 Shareable result card** — A compact 1080×1020 image appears after every run with a scenario-specific knowledge score, optically centered logo, exact glowing progress ring, beta QR code, and one path-specific educational tip. Long-press to save.
- **📊 可分享的结果卡片** — 每次完成后直接显示固定尺寸的 1080×1020 图片，包含对应情景的知识储备得分、视觉居中的 Logo、精确发光进度环、内测二维码，以及一条随场景和答题路径选择的科普小 Tip。长按即可保存。
- **🎯 4-tier scoring** — 准备充分 (80+) / 基本准备 (60-79) / 部分准备 (40-59) / 需要加强 (0-39). Weighted by real-case impact.
- **📖 Collapsible detailed analysis** — Click "查看具体分析" to expand: what you did right, what went wrong, what risks you avoided, legal tips from your path, real process (10 steps), and 14-16 term glossary.
- **📖 折叠式详细分析** — 点击「查看具体分析」展开：你做对了什么、这次出问题的环节、这次你避开的风险、本次流程中的法律提示、真实流程（10 步）、名词解释（14-16 个）。全部可折叠。

#### 核心设计原则 | Core Design Principles

- **Zero leading language** in choices/feedback — options describe actions only, not evaluations. Verified by automated scan.
- **零引导性语言** — choice/feedback 只描述动作和事实，不评价。自动扫描验证。
- **Non-blaming debrief** — trauma responses (freeze, forced normalcy, delayed disclosure, endurance) are labeled as normal, not personal failure.
- **不指责受害人的复盘** — 创伤反应都被标注为正常反应，不是个人过失。
- **No AI, no free-text input, no persistence** — all scenario content is static JSON in `src/data/simulations/`. Nothing is saved or uploaded.
- **无 AI、无自由文本输入、无持久化** — 场景内容都是 `src/data/simulations/` 里的静态 JSON。
- **"待法律校对" badge** shown until formal lawyer review is complete.
- **「待法律校对」徽章** 直到正式律师复核完成才移除。

### 5. Bilingual Mobile UI | 双语移动端界面

- English and Chinese switched by a compact toggle; one language at a time.
- Cloudflare deploy defaults to Chinese; Vercel deploy defaults to English (via `VITE_DEFAULT_LANG` build-time flag).
- Soft, calm, privacy-oriented visual direction; designed for one-handed use under stress.

- 中英文一键切换，同一时间只展示一种语言。
- Cloudflare 部署默认中文；Vercel 部署默认英文（通过 `VITE_DEFAULT_LANG` 构建时环境变量）。
- 柔和、安静、重视隐私感的视觉方向；为高压状态下的单手操作设计。

---

## Security Model (Production) | 安全模型（生产版）

The beta version uses a hardcoded key for demonstration. The below describes how the **production version (v2)** protects real evidence.
内测版使用硬编码密钥用于演示。以下描述**生产版 (v2)** 如何保护真实证据。

- Every file is encrypted on the user's device with AES-256-GCM **before** any network request.
- File keys are wrapped by a master key, which is wrapped by a key derived from the user's password with **Argon2id** (memory-hard, GPU-cracking resistant).
- A 12-character **paper recovery code**, shown exactly once at signup, is the independent second way in.
- The vault **auto-locks** after inactivity or when the app stays in the background.
- Deleting evidence has a **72-hour cooling-off** with a hidden, password-gated recovery path (anti-coercion).
- A **quick-exit button** on every screen instantly replaces the page with a neutral weather search.
- Emergency contacts and personal settings never leave the device (localStorage by design).

---

## Future Roadmap | 未来规划

- **Formal lawyer review** of all simulator scenarios before removing 「待法律校对」badges. | 律师正式复核所有模拟情景后移除徽章。
- **Trusted-timestamp anchoring (TSA)** for all evidence hashes — after entity registration. | 公司实体注册后接入可信时间戳。
- **Verified personal helpers**: vetted individual psychologists and lawyers in the aid section. | 接入经过认证的个人心理咨询师和律师。
- **Global directory**: country-level DV/sexual-violence hotlines for ~50–100 countries. | 全球目录。
- **China formal launch track**: entity → ICP filing → app 备案 → phone OTP login. | 中国正式上线路径。

---

## Tech Stack | 技术栈

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, lucide-react |
| Vault backend (beta) | Browser IndexedDB via `src/lib/demoVault.ts` — hardcoded key, no network |
| Vault backend (production) | Supabase Auth + Storage; client-side AES-256-GCM; Argon2id-derived KEK |
| Evidence encryption | Web Crypto API, AES-256-GCM, client-side only |
| Simulator | Static JSON scenario trees (`src/data/simulations/`) — no AI, no network, no persistence |
| Result card image | Pure Canvas API + `qrcode` (no html2canvas) |
| Web hardening | CSP + security headers, auto-lock, quick-exit button |
| Deployment | Cloudflare Pages (mainland China, default zh) + Vercel (global, default en); auto-deploy from `hackathon-demo` on push |

---

## Safety Notes | 安全说明

- The Unmuted is not a replacement for emergency services, medical care, police, or a lawyer.
- The simulator content, though grounded in real judgments, has not been formally lawyer-reviewed — do not rely on it as legal advice.
- If a user is in immediate physical danger, they should contact local emergency services (110) or a trusted person as soon as possible.

- 非默不能替代急救、医疗、警方或律师。
- 模拟器内容虽基于真实判决书，但尚未经过正式律师复核，不可作为法律意见依赖。
- 如果用户正处于人身危险中，应尽快联系当地紧急服务（110）或可信任的人。

---

## Documentation | 项目文档

| File | Content |
| --- | --- |
| `docs/architecture.md` | Module structure, data flow, provider tree |
| `docs/decisions.md` | Technical decision log |
| `docs/tasks.md` | Roadmap and task board |
| `docs/changelog.md` | Shipped changes |
| `src/data/simulations/*.json` | The three scenario scripts — read these to understand the simulator |

---

## Team Members | 团队成员

- Gu Shi: https://github.com/hesta1218-collab
- Wendy Wu: https://github.com/DancinWendy
- Liz Wu: https://github.com/touhouzigei-crypto
- Katie Lin: https://github.com/katielin0207-dev
