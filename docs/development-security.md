# Development Security SOP | 开发安全规范

This checklist applies to local development, automated tests, dependency updates, and pull-request review. It does not change the product's legal content or runtime behavior.

本规范适用于本地开发、自动化测试、依赖升级和代码审查，不改变产品法律内容或线上功能。

## Local development servers | 本地开发服务

- Keep Vite, Vitest, Vitest UI, preview servers, and test APIs bound to `127.0.0.1` or `localhost` by default.
- Never expose a development or test server through a public IP, router port forwarding, a public tunnel, or an unauthenticated preview link.
- Do not use `--host 0.0.0.0`, `--host ::`, or equivalent settings in shared scripts or committed configuration.
- If remote debugging is unavoidable, use an authenticated private network or VPN, allow only the required team members, limit the session duration, and stop the server immediately afterward. Do not use real user data or production secrets in that session.

- Vite、Vitest、Vitest UI、预览服务和测试 API 默认只监听 `127.0.0.1` 或 `localhost`。
- 不得通过公网 IP、路由器端口转发、公共隧道或无认证预览链接暴露开发/测试服务。
- 共享脚本和仓库配置不得使用 `--host 0.0.0.0`、`--host ::` 或等效设置。
- 必须远程调试时，只能使用带身份认证的私有网络或 VPN，仅授权必要成员并限制开放时长；结束后立即停止服务。该会话不得使用真实用户数据或生产密钥。

## Test data and secrets | 测试数据与密钥

- Use synthetic or irreversibly anonymized test data. Never copy real evidence, survivor information, contact details, access tokens, or production database records into tests.
- Never commit passwords, API keys, tokens, private keys, recovery codes, `.env` contents, or provider credentials. Store local values in ignored environment files and production values in the deployment platform's secret store.
- Before pushing, review staged changes with `git diff --cached` and verify that no secret or sensitive test fixture is included.
- If a secret is committed, revoke or rotate it immediately; deleting it in a later commit is not sufficient.

- 只使用合成数据或不可逆匿名化的数据测试，禁止把真实证据、受害者信息、联系方式、访问令牌或生产数据库记录放进测试。
- 禁止提交密码、API key、token、私钥、恢复码、`.env` 内容或平台凭证。本地值放在已忽略的环境文件中，生产值放在部署平台的密钥管理中。
- 推送前使用 `git diff --cached` 检查暂存内容，确认不含密钥或敏感测试数据。
- 如果密钥已被提交，必须立即吊销或轮换；只在后续 commit 删除并不能消除泄露风险。

## Dependency review | 依赖安全检查

Review Dependabot at least once each week and before a trial, release, or public demo. For each security update:

1. Read the advisory and confirm the affected and patched version ranges.
2. Upgrade only the required direct dependency or override; do not use `npm audit fix --force`.
3. Regenerate and commit `package-lock.json` together with `package.json`.
4. Run the validation commands below.
5. Push through the normal review process and confirm that Dependabot closes the alert.

每周至少检查一次 Dependabot，并在内测、发布或公开演示前再检查一次。处理每条安全升级时：

1. 阅读公告，确认受影响版本范围和首个修复版本。
2. 只升级必要的直接依赖或 override；不得使用 `npm audit fix --force`。
3. `package.json` 与重新生成的 `package-lock.json` 必须一起提交。
4. 执行以下验证命令。
5. 按正常审查流程推送，并确认 Dependabot 已关闭告警。

```bash
npm ci
npm audit
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Pull-request checklist | 合并检查

- [ ] Development/test servers remain localhost-only.
- [ ] No real personal data, evidence, or secrets were added.
- [ ] New dependencies are necessary, maintained, and covered by the lockfile.
- [ ] Tests, type-checking, lint, build, and `npm audit` pass, or known non-blocking warnings are documented.
- [ ] Dependabot alerts affected by the change are closed after GitHub finishes scanning.

- [ ] 开发/测试服务仍只监听本机。
- [ ] 未加入真实个人数据、证据或密钥。
- [ ] 新依赖确有必要、仍在维护，并已写入 lockfile。
- [ ] 测试、类型检查、lint、构建和 `npm audit` 通过；如有已知非阻断警告，已记录。
- [ ] GitHub 扫描完成后，相关 Dependabot 告警已关闭。
