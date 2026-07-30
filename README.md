# The Unmuted | 非默

> Make truth harder to erase. Make seeking help easier to begin.  
> 让真相不被轻易抹去，让求助可以更早开始。

**The Unmuted** is a bilingual mobile personal safety tool designed for scenarios involving sexual harassment, stalking, sexual assault, coercion, domestic violence, and other gender-based harm.

Core features: trusted-contact SOS, end-to-end encrypted evidence storage with one-tap court-ready export, guided post-incident documentation, and verified mental-health and legal-aid directories.

**非默** 是一款面向性骚扰、跟踪、性侵、胁迫、家暴及其他性别伤害场景的双语移动端个人安全工具。

核心功能：可信联系人 SOS、端到端加密存证与一键导出举证包、事后记录指引，以及经过核实的心理援助和法律援助目录。

---

## Live | 在线访问

- Vercel (global): https://the-unmuted.vercel.app/
- Tencent CloudBase (mainland China mirror): https://theunmuted-v2-d2gyh0rux2a05de92-1434116173.tcloudbaseapp.com

---

## Security Model | 安全模型

**The server only ever stores ciphertext. Nobody — including our own team — can decrypt a user's evidence.**

- Every file is encrypted on the user's device with AES-256-GCM **before** any network request.
- File keys are wrapped by a master key, which is wrapped by a key derived from the user's password with **Argon2id** (memory-hard, GPU-cracking resistant). The master key exists only in memory while unlocked.
- A 12-character **paper recovery code**, shown exactly once at signup, is the independent second way in — losing the password doesn't mean losing the evidence.
- The vault **auto-locks** after inactivity or when the app stays in the background; viewing, exporting, or deleting a record each requires re-entering the password at that moment.
- Deleting evidence has a **72-hour cooling-off** with a hidden, password-gated recovery path (anti-coercion).
- A **quick-exit button** on every screen instantly replaces the page with a neutral weather search; a plain-language safe-use guide covers private browsing and history clearing.
- Emergency contacts and personal settings never leave the device (localStorage by design).

**服务器只存乱码。任何人——包括我们自己的团队——都无法解密用户的证据。**

- 每个文件都在用户设备上先用 AES-256-GCM 加密，然后才会有任何网络传输。
- 文件密钥由主密钥保护，主密钥由用户密码经 **Argon2id**（内存困难型算法，抗 GPU 破解）派生的密钥封装；主密钥只在解锁期间存在于内存中。
- 注册时一次性展示的 12 位**纸质恢复码**是独立的第二把钥匙——忘记密码不等于失去证据。
- 应用在闲置或长时间切到后台后**自动上锁**；查看、导出、删除每条记录都需要当场重新输入密码。
- 删除证据有 **72 小时冷静期**，并有隐藏的密码保护恢复通道（防胁迫设计）。
- 每个页面都有**快速离开按钮**，一键变成天气搜索页；并配有无痕浏览、清除历史的白话安全指南。
- 紧急联系人等个人信息永远只保存在用户设备本地（刻意设计，不上传服务器）。

---

## Current Product Scope | 当前版本范围

### 1. Personal SOS | 个人紧急求助

- Trusted emergency contacts, stored on-device only.
- Hold the SOS button 2 seconds → the phone's native SMS flow opens with a pre-filled emergency message including GPS coordinates and a Gaode Maps navigation link (GCJ-02 converted).
- SOS is reachable **from the lock screen** via a discreet entry — no unlock needed in an emergency.

- 可信紧急联系人，仅保存在设备本地。
- 长按 SOS 按钮 2 秒 → 打开系统短信，自动填入含 GPS 坐标和高德导航链接的求助内容（已做 GCJ-02 坐标转换）。
- 锁屏状态下也有隐蔽的 SOS 入口——紧急时刻无需先解锁。

### 2. Evidence Vault | 加密存证

- In-app camera / video / audio capture, plus import of existing files.
- SHA-256 hash computed at the instant of capture; device time, server time, GCJ-02 location, and device info are sealed client-side into encrypted metadata.
- Records are graded 一级现场取证 (captured in-app, fresh) vs 二级事后导入 (imported later) — honest about evidentiary weight.
- **One-tap court export (导出举证包)**: a plain ZIP with the decrypted original, metadata, hashes, and a self-contained bilingual verification page — verifiable with standard OS tools (certutil / shasum), no dependency on this app existing.
- Per-scenario legal guidance included: 人身安全保护令 / 离婚诉讼 / 报警立案, with 12338 / 12348 hotlines.
- Offline resilience: pending-upload queue with auto-retry; per-record sync status badges.
- Hash + dual-timestamp schema is designed for retroactive trusted-timestamp (RFC 3161 TSA) anchoring once our legal entity is registered.

- 应用内拍照 / 录像 / 录音取证，也支持导入已有文件。
- 取证瞬间即计算 SHA-256 哈希；设备时间、服务器时间、GCJ-02 位置、设备信息在本机封入加密元数据。
- 记录分级：一级现场取证（应用内即时采集）与二级事后导入——对证据效力保持诚实。
- **一键导出举证包**：标准 ZIP，含解密原件、元数据、哈希值和自包含的双语核验说明页——用系统自带工具（certutil / shasum）即可核验，不依赖本应用存续。
- 内置分场景举证指引：人身安全保护令 / 离婚诉讼 / 报警立案，附 12338 / 12348 热线。
- 离线可用：待上传队列自动重试，每条记录显示同步状态。
- 哈希 + 双时间戳的数据结构已为将来接入可信时间戳（RFC 3161 TSA）预留——公司实体注册后即可为新旧记录补锚定。

### 3. Guided Report Notes | 事后记录指引

- Different note prompts for situations such as memory gap, sexual assault, stalking, and unsafe dates.
- Notes are encrypted and saved locally, reducing panic and helping users record key details before memory fades.

- 针对记忆空白、性侵害、跟踪、约会风险等不同情况提供记录提示。
- 填写内容加密保存在本机，帮助用户在紧张状态下尽早留住关键细节。

### 4. Mental Health & Legal Aid Directory | 心理与法律援助目录

- Structured, city-filterable directory of verified hotlines and legal-aid resources (家暴/性侵/骚扰/婚姻家事/心理/综合维权).
- Every entry is human-verified before listing; the verification date is shown on each card.
- A weekly CI job re-checks each entry's official source page and flags dead numbers — a survivor in crisis must never dial a dead line.
- No GPS: city selection is manual by design — browsing aid resources must not request location.

- 结构化、可按城市筛选的援助目录，覆盖家暴/性侵/骚扰/婚姻家事/心理/综合维权。
- 每条资源在收录前均经人工核实，卡片上展示核实日期。
- 每周自动巡检各条目的官方来源页，发现失效号码即告警——绝不能让求助者拨到空号。
- 不使用 GPS：城市选择为手动设计——查看援助资源不应请求定位权限。

### 5. Bilingual Mobile UI | 双语移动端界面

- English and Chinese switched by a compact toggle; one language at a time.
- Soft, calm, privacy-oriented visual direction; designed for one-handed use under stress.

- 中英文一键切换，同一时间只展示一种语言。
- 柔和、安静、重视隐私感的视觉方向；为高压状态下的单手操作设计。

---

## Future Roadmap | 未来规划

- **Trusted-timestamp anchoring (TSA)** for all evidence hashes, new and retroactive — after entity registration. | 公司实体注册后接入可信时间戳，为全部新旧证据哈希锚定。
- **Biometric unlock** (Face ID / fingerprint via passkey) to replace daily password entry. | 生物识别解锁（人脸/指纹）替代每日输入密码。
- **Verified personal helpers**: vetted individual psychologists and lawyers in the aid section. | 接入经过认证的个人心理咨询师和律师。
- **Global directory**: country-level DV/sexual-violence hotlines and legal-aid entries for ~50–100 countries. | 全球目录：为约 50–100 个国家收录国家级热线与法律援助入口。
- **China formal launch track**: entity → ICP filing → app 备案 → phone OTP login. | 中国正式上线路径：实体 → ICP 备案 → app 备案 → 手机号登录。

---

## Business Model | 商业模式设想

Our goal is to keep core safety access affordable.

- A very low membership fee can cover encrypted evidence storage, trusted timestamping, and basic platform maintenance.
- Emergency contact setup, core SOS, and essential aid information remain easy to access.
- If a mental-health or legal-aid introduction becomes a real paid case outside the app, the platform may charge a small service or referral fee.
- Paid services stay transparent, consent-based, and separated from emergency access.

我们的目标是让核心安全能力保持低门槛。

- 通过极低会员费覆盖加密存证、可信时间戳和基础平台维护成本。
- 紧急联系人设置、核心 SOS 和基础援助信息保持易访问。
- 如果通过平台介绍形成现实中的心理咨询或法律服务付费案件，平台可收取少量服务费或转介费。
- 付费服务保持透明、基于用户同意，并与紧急求助入口清晰分离。

---

## Tech Stack | 技术栈

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, lucide-react |
| Accounts | Supabase Auth (email OTP) — enables cross-device recovery |
| Key hierarchy | Argon2id (libsodium) → KEK → master key → per-file AES-256-GCM keys; paper recovery code |
| Evidence encryption | Web Crypto API, AES-256-GCM, client-side only |
| Evidence storage | Supabase private bucket (per-user paths + RLS); ciphertext only |
| Personal data | Device localStorage only (contacts, settings) — never uploaded |
| Web hardening | CSP + security headers, auto-lock, quick exit |
| Deployment | Vercel + Tencent CloudBase static hosting (China mirror), GitHub Actions CI |

---

## Safety Notes | 安全说明

- The Unmuted is not a replacement for emergency services, medical care, police, or a lawyer.
- If a user is in immediate physical danger, they should contact local emergency services or a trusted person as soon as possible.
- Encryption protects content on the server, but users must keep their device, password, and paper recovery code safe.
- Phone numbers and contacts should be checked carefully before relying on SOS.

- 非默不能替代急救、医疗、警方或律师。
- 如果用户正处于人身危险中，应尽快联系当地紧急服务或可信任的人。
- 加密能保护服务器端的内容，但用户仍需妥善保管自己的设备、密码和纸质恢复码。
- 依赖 SOS 前，应仔细确认联系人电话是否正确。

---

## Documentation | 项目文档

| File | Content |
| --- | --- |
| `docs/architecture.md` | Module structure, data flow, provider tree |
| `docs/api.md` | External services + key internal APIs |
| `docs/decisions.md` | Technical decision log (D-001 …) |
| `docs/tasks.md` | Roadmap and task board |
| `docs/changelog.md` | Shipped changes |

---

## Team Members | 团队成员

- Gu Shi: https://github.com/hesta1218-collab
- Wendy Wu: https://github.com/DancinWendy
- Liz Wu: https://github.com/touhouzigei-crypto
- Katie Lin: https://github.com/katielin0207-dev
