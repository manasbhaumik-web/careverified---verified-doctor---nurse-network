/**
 * Transactional email templates in English, Bahasa Malaysia and Chinese, and the shared layout.
 * Pure functions: no database, no network, so they are easy to test. Malay and Chinese wording is a developer draft:
 * a native speaker must review it before launch.
 *
 * Rules: service messages only (no marketing); never put a password, a full bank account number or a clinical detail in
 * an email; say what happened and where to go next; keep them short.
 */
export type MailLang = "en" | "ms" | "zh";
export const MAIL_LANGS: MailLang[] = ["en", "ms", "zh"];
export const pickMailLang = (v: unknown): MailLang => (v === "ms" || v === "zh" ? v : "en");

interface Body { subject: string; paragraphs: string[]; cta?: { label: string; path: string }; }
type Make = (v: any) => Record<MailLang, Body>;

const L = (en: Body, ms: Body, zh: Body) => ({ en, ms, zh });
const lines = (s: unknown) => String(s ?? "").trim();

export const TEMPLATES = {
  practitioner_welcome: (v: { name: string }) => L(
    { subject: "Welcome to MedCred", paragraphs: [`Hello ${v.name},`, "Your practitioner account is created. You are not listed yet.", "Next, sign in and send your licence details and certificates. A board reviewer checks your licence against the council register by hand and tells you the result by email."], cta: { label: "Sign in and continue", path: "/login?role=practitioner" } },
    { subject: "Selamat datang ke MedCred", paragraphs: [`Helo ${v.name},`, "Akaun pengamal anda telah dicipta. Anda belum disenaraikan.", "Seterusnya, log masuk dan hantar butiran lesen dan sijil anda. Penyemak lembaga menyemak lesen anda dengan daftar majlis secara manual dan memaklumkan keputusannya melalui e-mel."], cta: { label: "Log masuk dan teruskan", path: "/login?role=practitioner" } },
    { subject: "欢迎加入 MedCred", paragraphs: [`${v.name}，您好，`, "您的医疗人员账户已创建，但尚未列名。", "接下来请登录并提交您的执照资料和证书。委员会审核员会对照理事会名册人工核查您的执照，并通过电子邮件通知结果。"], cta: { label: "登录并继续", path: "/login?role=practitioner" } },
  ),
  verification_approved: (v: { until?: string }) => L(
    { subject: "You are verified on MedCred", paragraphs: ["The board has verified your licence. Your profile is now public.", v.until ? `Re-verification is due by ${v.until}. We will remind you before then.` : "We will remind you before re-verification is due."], cta: { label: "Open your portal", path: "/login?role=practitioner" } },
    { subject: "Anda telah disahkan di MedCred", paragraphs: ["Lembaga telah mengesahkan lesen anda. Profil anda kini awam.", v.until ? `Pengesahan semula perlu dibuat sebelum ${v.until}. Kami akan mengingatkan anda sebelum itu.` : "Kami akan mengingatkan anda sebelum pengesahan semula."], cta: { label: "Buka portal anda", path: "/login?role=practitioner" } },
    { subject: "您已在 MedCred 通过认证", paragraphs: ["委员会已核实您的执照，您的资料现已公开。", v.until ? `请在 ${v.until} 之前完成重新认证，我们会提前提醒您。` : "重新认证到期前我们会提醒您。"], cta: { label: "打开您的门户", path: "/login?role=practitioner" } },
  ),
  verification_info_needed: (v: { note?: string }) => L(
    { subject: "MedCred needs more information", paragraphs: ["The board reviewing your application needs more from you before it can continue.", lines(v.note), "Your profile stays hidden until this is sorted."].filter(Boolean), cta: { label: "Reply in your portal", path: "/login?role=practitioner" } },
    { subject: "MedCred memerlukan maklumat lanjut", paragraphs: ["Lembaga yang menyemak permohonan anda memerlukan maklumat lanjut sebelum boleh diteruskan.", lines(v.note), "Profil anda kekal tersembunyi sehingga perkara ini selesai."].filter(Boolean), cta: { label: "Balas dalam portal anda", path: "/login?role=practitioner" } },
    { subject: "MedCred 需要更多资料", paragraphs: ["审核您申请的委员会需要您补充资料才能继续。", lines(v.note), "在此问题解决之前，您的资料将保持隐藏。"].filter(Boolean), cta: { label: "在门户中回复", path: "/login?role=practitioner" } },
  ),
  verification_rejected: (v: { note?: string }) => L(
    { subject: "Your MedCred application was not approved", paragraphs: ["The board could not approve your application.", lines(v.note), "You can sign in to see the details and send new documents."].filter(Boolean), cta: { label: "Sign in", path: "/login?role=practitioner" } },
    { subject: "Permohonan MedCred anda tidak diluluskan", paragraphs: ["Lembaga tidak dapat meluluskan permohonan anda.", lines(v.note), "Anda boleh log masuk untuk melihat butiran dan menghantar dokumen baharu."].filter(Boolean), cta: { label: "Log masuk", path: "/login?role=practitioner" } },
    { subject: "您的 MedCred 申请未获批准", paragraphs: ["委员会未能批准您的申请。", lines(v.note), "您可以登录查看详情并提交新的文件。"].filter(Boolean), cta: { label: "登录", path: "/login?role=practitioner" } },
  ),
  profile_suspended: (v: { reason?: string }) => L(
    { subject: "Your MedCred profile is suspended", paragraphs: ["Your profile is hidden from the directory for now.", lines(v.reason), "Sign in and upload your renewed documents to be reinstated."].filter(Boolean), cta: { label: "Sign in", path: "/login?role=practitioner" } },
    { subject: "Profil MedCred anda digantung", paragraphs: ["Profil anda disembunyikan daripada direktori buat masa ini.", lines(v.reason), "Log masuk dan muat naik dokumen yang telah diperbaharui untuk dipulihkan."].filter(Boolean), cta: { label: "Log masuk", path: "/login?role=practitioner" } },
    { subject: "您的 MedCred 资料已被暂停", paragraphs: ["您的资料暂时从名录中隐藏。", lines(v.reason), "请登录并上传已续期的文件以恢复。"].filter(Boolean), cta: { label: "登录", path: "/login?role=practitioner" } },
  ),
  profile_reinstated: () => L(
    { subject: "Your MedCred profile is back", paragraphs: ["Your profile is visible in the directory again."] },
    { subject: "Profil MedCred anda dipulihkan", paragraphs: ["Profil anda kelihatan semula dalam direktori."] },
    { subject: "您的 MedCred 资料已恢复", paragraphs: ["您的资料已重新出现在名录中。"] },
  ),
  licence_expiry_soon: (v: { what?: string }) => L(
    { subject: "Action needed soon: licence renewal", paragraphs: [lines(v.what) || "A licence or certificate on your profile is about to expire.", "Please upload your renewed documents. If it lapses your profile is suspended automatically."], cta: { label: "Upload documents", path: "/login?role=practitioner" } },
    { subject: "Tindakan diperlukan: pembaharuan lesen", paragraphs: [lines(v.what) || "Lesen atau sijil pada profil anda hampir tamat tempoh.", "Sila muat naik dokumen yang telah diperbaharui. Jika ia luput, profil anda digantung secara automatik."], cta: { label: "Muat naik dokumen", path: "/login?role=practitioner" } },
    { subject: "请尽快处理：执照续期", paragraphs: [lines(v.what) || "您资料上的执照或证书即将到期。", "请上传已续期的文件。如果过期，您的资料会被自动暂停。"], cta: { label: "上传文件", path: "/login?role=practitioner" } },
  ),
  partner_enquiry_received: (v: { org: string; ref: string }) => L(
    { subject: `We have your enquiry (${v.ref})`, paragraphs: [`Thank you. We received the enquiry from ${v.org}.`, `Your reference is ${v.ref}.`, "A board member will contact you. We do not promise a reply time yet.", "If you did not send this, you can ignore this email."] },
    { subject: `Kami telah menerima pertanyaan anda (${v.ref})`, paragraphs: [`Terima kasih. Kami menerima pertanyaan daripada ${v.org}.`, `Rujukan anda ialah ${v.ref}.`, "Seorang ahli lembaga akan menghubungi anda. Kami belum menjanjikan tempoh balasan.", "Jika anda tidak menghantarnya, anda boleh mengabaikan e-mel ini."] },
    { subject: `我们已收到您的咨询（${v.ref}）`, paragraphs: [`谢谢，我们收到了来自 ${v.org} 的咨询。`, `您的参考编号是 ${v.ref}。`, "委员会成员会与您联系。我们暂时不承诺回复时限。", "如果这不是您发送的，请忽略此邮件。"] },
  ),
  partner_enquiry_admin: (v: { kind: string; org: string; city: string; ref: string }) => L(
    { subject: `New ${v.kind} enquiry: ${v.org}`, paragraphs: [`${v.org} (${v.city}) asked to join as a ${v.kind}.`, `Reference ${v.ref}.`], cta: { label: "Open Partner enquiries", path: "/" } },
    { subject: `Pertanyaan ${v.kind} baharu: ${v.org}`, paragraphs: [`${v.org} (${v.city}) memohon menyertai sebagai ${v.kind}.`, `Rujukan ${v.ref}.`], cta: { label: "Buka Pertanyaan rakan kongsi", path: "/" } },
    { subject: `新的${v.kind}咨询：${v.org}`, paragraphs: [`${v.org}（${v.city}）申请以${v.kind}身份加入。`, `参考编号 ${v.ref}。`], cta: { label: "打开合作伙伴咨询", path: "/" } },
  ),
  payout_paid: (v: { amount: string; bank: string; reference: string }) => L(
    { subject: "A payout was sent to you", paragraphs: [`RM ${v.amount} was sent to ${v.bank}.`, `Bank reference: ${v.reference}.`, "Your statement lists every visit in this payout. Banks can take a business day or two to show a transfer."], cta: { label: "See your payouts", path: "/login?role=practitioner" } },
    { subject: "Bayaran telah dihantar kepada anda", paragraphs: [`RM ${v.amount} telah dihantar ke ${v.bank}.`, `Rujukan bank: ${v.reference}.`, "Penyata anda menyenaraikan setiap lawatan dalam bayaran ini. Bank mungkin mengambil satu atau dua hari bekerja untuk memaparkan pindahan."], cta: { label: "Lihat bayaran anda", path: "/login?role=practitioner" } },
    { subject: "一笔款项已汇给您", paragraphs: [`RM ${v.amount} 已汇入 ${v.bank}。`, `银行参考编号：${v.reference}。`, "对账单列出了这笔付款包含的每次问诊。银行可能需要一两个工作日才会显示转账。"], cta: { label: "查看您的付款", path: "/login?role=practitioner" } },
  ),
  payout_failed: (v: { reason?: string }) => L(
    { subject: "A payout could not be completed", paragraphs: ["We could not send your payout.", lines(v.reason), "Your earnings are safe and will be in the next payout. Please check your bank details."].filter(Boolean), cta: { label: "Check bank details", path: "/login?role=practitioner" } },
    { subject: "Bayaran tidak dapat diselesaikan", paragraphs: ["Kami tidak dapat menghantar bayaran anda.", lines(v.reason), "Pendapatan anda selamat dan akan dimasukkan dalam bayaran seterusnya. Sila semak butiran bank anda."].filter(Boolean), cta: { label: "Semak butiran bank", path: "/login?role=practitioner" } },
    { subject: "付款未能完成", paragraphs: ["我们未能发送您的付款。", lines(v.reason), "您的收入是安全的，会计入下一次付款。请检查您的银行资料。"].filter(Boolean), cta: { label: "检查银行资料", path: "/login?role=practitioner" } },
  ),
  bank_verified: () => L(
    { subject: "Your bank account is verified", paragraphs: ["The board verified your bank account. You will be included in the next payout."] },
    { subject: "Akaun bank anda telah disahkan", paragraphs: ["Lembaga telah mengesahkan akaun bank anda. Anda akan dimasukkan dalam bayaran seterusnya."] },
    { subject: "您的银行账户已通过核实", paragraphs: ["委员会已核实您的银行账户，您将被列入下一次付款。"] },
  ),
  bank_rejected: (v: { note?: string }) => L(
    { subject: "Your bank details need attention", paragraphs: ["The board could not verify your bank account.", lines(v.note), "Please enter the details again in Earnings."].filter(Boolean), cta: { label: "Open Earnings", path: "/login?role=practitioner" } },
    { subject: "Butiran bank anda memerlukan perhatian", paragraphs: ["Lembaga tidak dapat mengesahkan akaun bank anda.", lines(v.note), "Sila masukkan semula butiran dalam Pendapatan."].filter(Boolean), cta: { label: "Buka Pendapatan", path: "/login?role=practitioner" } },
    { subject: "您的银行资料需要处理", paragraphs: ["委员会未能核实您的银行账户。", lines(v.note), "请在“收入”页面重新输入资料。"].filter(Boolean), cta: { label: "打开收入页面", path: "/login?role=practitioner" } },
  ),
  password_reset: (v: { minutes: number; url: string }) => L(
    { subject: "Reset your MedCred password", paragraphs: ["Someone asked to reset the password for your MedCred account. If it was you, use the button below.", `This link works once and expires in ${v.minutes} minutes.`, "If it was not you, ignore this email. Your password stays the same."], cta: { label: "Choose a new password", path: v.url } },
    { subject: "Tetapkan semula kata laluan MedCred anda", paragraphs: ["Seseorang meminta kata laluan akaun MedCred anda ditetapkan semula. Jika itu anda, gunakan butang di bawah.", `Pautan ini hanya boleh digunakan sekali dan tamat dalam ${v.minutes} minit.`, "Jika bukan anda, abaikan e-mel ini. Kata laluan anda tidak berubah."], cta: { label: "Pilih kata laluan baharu", path: v.url } },
    { subject: "重置您的 MedCred 密码", paragraphs: ["有人申请重置您 MedCred 账户的密码。如果是您本人，请使用下方按钮。", `此链接只能使用一次，${v.minutes} 分钟后失效。`, "如果不是您，请忽略此邮件，您的密码不会改变。"], cta: { label: "设置新密码", path: v.url } },
  ),
  password_changed: () => L(
    { subject: "Your MedCred password was changed", paragraphs: ["The password for your MedCred account was just changed, and you were signed out everywhere.", "If this was not you, reset your password again now and tell us through Help & support."], cta: { label: "Reset password", path: "/forgot-password" } },
    { subject: "Kata laluan MedCred anda telah ditukar", paragraphs: ["Kata laluan akaun MedCred anda baru sahaja ditukar, dan anda telah dilog keluar di semua tempat.", "Jika ini bukan anda, tetapkan semula kata laluan sekarang dan beritahu kami melalui Bantuan & sokongan."], cta: { label: "Tetapkan semula kata laluan", path: "/forgot-password" } },
    { subject: "您的 MedCred 密码已更改", paragraphs: ["您 MedCred 账户的密码刚刚被更改，并且您已在所有设备上退出登录。", "如果这不是您本人操作，请立即再次重置密码，并通过“帮助与支持”告诉我们。"], cta: { label: "重置密码", path: "/forgot-password" } },
  ),
  support_reply: (v: { subject?: string }) => L(
    { subject: "Support replied to your ticket", paragraphs: [`Our team replied to your ticket${v.subject ? ` "${lines(v.subject)}"` : ""}.`, "Sign in to read the reply."], cta: { label: "Read the reply", path: "/login" } },
    { subject: "Sokongan telah membalas tiket anda", paragraphs: [`Pasukan kami telah membalas tiket anda${v.subject ? ` "${lines(v.subject)}"` : ""}.`, "Log masuk untuk membaca balasan."], cta: { label: "Baca balasan", path: "/login" } },
    { subject: "客服已回复您的工单", paragraphs: [`我们的团队已回复您的工单${v.subject ? `“${lines(v.subject)}”` : ""}。`, "请登录阅读回复。"], cta: { label: "阅读回复", path: "/login" } },
  ),
  test_email: () => L(
    { subject: "MedCred test email", paragraphs: ["This is a test email from MedCred. If you can read it, email sending works."] },
    { subject: "E-mel ujian MedCred", paragraphs: ["Ini ialah e-mel ujian daripada MedCred. Jika anda boleh membacanya, penghantaran e-mel berfungsi."] },
    { subject: "MedCred 测试邮件", paragraphs: ["这是来自 MedCred 的测试邮件。如果您能看到它，说明邮件发送正常。"] },
  ),
} satisfies Record<string, Make>;
export type TemplateName = keyof typeof TEMPLATES;

const FOOT: Record<MailLang, { why: string; noreply: string; safety: string }> = {
  en: { why: "You are getting this service email because of your MedCred account or an enquiry you sent.", noreply: "Please do not reply to this email: the mailbox is not read.", safety: "MedCred never asks for your password or bank details by email." },
  ms: { why: "Anda menerima e-mel perkhidmatan ini kerana akaun MedCred anda atau pertanyaan yang anda hantar.", noreply: "Sila jangan balas e-mel ini: peti mel ini tidak dibaca.", safety: "MedCred tidak pernah meminta kata laluan atau butiran bank anda melalui e-mel." },
  zh: { why: "您收到这封服务邮件，是因为您的 MedCred 账户或您发送的咨询。", noreply: "请勿回复此邮件：该邮箱无人查看。", safety: "MedCred 绝不会通过电子邮件索要您的密码或银行资料。" },
};

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

/** Build the subject, plain text and HTML. `base` is the public address of the app, used to make links absolute. */
export function renderEmail(template: TemplateName, lang: MailLang, vars: Record<string, any>, base: string | null): { subject: string; text: string; html: string; link: string | null } {
  const body = (TEMPLATES[template] as Make)(vars)[lang];
  const abs = (p: string) => (/^https?:\/\//.test(p) ? p : base ? base.replace(/\/$/, "") + p : null);
  const link = body.cta ? abs(body.cta.path) : null;
  const foot = FOOT[lang];
  const text = [
    ...body.paragraphs,
    ...(body.cta && link ? [`${body.cta.label}: ${link}`] : []),
    "",
    foot.safety,
    foot.why,
    foot.noreply,
  ].join("\n\n").replace(/\n\n\n+/g, "\n\n");
  const p = (s: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1e293b">${escapeHtml(s).replace(/\n/g, "<br>")}</p>`;
  const button = body.cta && link
    ? `<p style="margin:22px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0270a9;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px">${escapeHtml(body.cta.label)}</a></p><p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#475569">${escapeHtml(link)}</p>`
    : "";
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(oneLine(body.subject))}</title></head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif"><div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-top:3px solid #0270a9;padding:24px">
<p style="margin:0 0 18px;font-size:20px;font-weight:800;color:#0f172a">MedCred<span style="color:#0270a9">.</span></p>
${body.paragraphs.map(p).join("")}${button}
</div>
<p style="margin:14px 0 4px;font-size:12px;line-height:1.5;color:#475569">${escapeHtml(foot.safety)}</p>
<p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:#475569">${escapeHtml(foot.why)} ${escapeHtml(foot.noreply)}</p>
</div></body></html>`;
  return { subject: oneLine(body.subject), text, html, link };
}
