# Product Backlog

Danh sách việc cần làm sắp tới. Sắp theo độ ưu tiên (cao → thấp).
Bạn (PM) quyết priority, mình (Claude) đề xuất estimate + trade-off.

**Quy ước:**
- 🔥 **Urgent** — bug đang ảnh hưởng production hoặc rủi ro bảo mật
- ⭐ **High** — value cao, người dùng (bạn) sẽ thấy ngay
- 💡 **Medium** — cải thiện trải nghiệm, không cấp bách
- 🌱 **Low** — ý tưởng, để dành khi rảnh

**Effort estimate** (rough):
- **XS** = dưới 15 phút
- **S** = 30 phút – 1 giờ
- **M** = 1 – 3 giờ
- **L** = nửa ngày trở lên

---

## 🔥 Urgent

*Không có item urgent hiện tại.*

---

## ⭐ High

### B-014: Retry trên lỗi network thay vì exit cả batch upload

**Effort:** S · **Tier:** 1

Hôm nay (2026-06-12) đang upload 166 ảnh English thì lỗi `ECONNRESET`
ở ảnh 148 → script exit luôn, mất công retry. Đã workaround bằng
skip-existing logic (chạy lại tự bỏ 147 ảnh xong) nhưng kém UX.

**Đề xuất:** Thêm retry-on-network-error trong `uploadOne()` cho cả
3 script (upload-a11, upload-english, upload-def). Hiện chỉ có retry
cho 429 rate-limit. Bao gồm `fetch failed`, `ECONNRESET`, `ETIMEDOUT`.
Retry 2 lần, mỗi lần sleep 10s.

**Trade-off:** Code mỗi script dài thêm ~15 dòng. Lợi: không phải re-run
khi mạng chập chờn.

### B-013: Tự động hoá deploy edge function

**Effort:** S · **Tier:** 2

Hôm nay phát hiện edge function không tự deploy từ GitHub — phải
chạy `npx supabase functions deploy` thủ công. Risk: lần sau sửa
code edge function rồi quên deploy → bug âm thầm, không ai biết.

**Đề xuất:** Tạo `.github/workflows/deploy-functions.yml` để mỗi
push to main tự động deploy edge functions. Cần `SUPABASE_ACCESS_TOKEN`
làm GitHub secret (bạn tạo + paste 1 lần).

**Trade-off:** Nhỏ chi phí setup, lợi lâu dài. Khi setup xong, mọi
sửa edge function lại "ship to push" như trước.



### B-002: Hoàn tất A1.1 images (161 từ thiếu)

**Effort:** S (chỉ là upload) + Cowork generation thì xa hơn · **Tier:** 1

Hiện trạng: 781/958 từ A1.1 đã có ảnh (81%). Còn thiếu:
- Lektion 6 (Freizeit): 91 từ
- Lektion 7 (Kinder und Schule): 70 từ

**Việc cần làm:**
- Bạn chạy Cowork tiếp với prompt batches 46–66.
- Mỗi lần Cowork xong vài batch, bạn nói "a11 images" → mình upload.

### B-003: Verify gender-color dot không gây lỗi UI ở Browse view + Exercise

**Effort:** S · **Tier:** 2

Hôm 2026-06-01 mình thêm chấm tròn đỏ/xanh/lá trên Flashcard component.
Nhưng cùng component có thể được dùng trong Browse view và Complete view
mà mình chưa verify live. Có thể có visual regression mình không thấy.

**Cách làm:** Sau khi bạn refresh, chụp screenshot Browse + Complete +
Session view trên cả PC và phone. Mình so sánh với ý định ban đầu.

### B-004: Backlog cho việc cần PM quyết — vocab cập nhật cho A1.2

**Effort:** L · **Tier:** 2

Hiện chỉ có A1.1. Schritte Plus Neu có A1.2 (Lektion 8–14). Nếu bạn
học tiếp đến A1.2 thì cần:
- Decision: 1 variant riêng (như A1.1) hay extend A1.1 thành A1?
- Vocab source (textbook A1.2 PDF / Quizlet / etc.)
- Image generation pipeline kế thừa được.

Đang ở backlog vì chưa đến thời điểm — bạn báo khi sắp xong A1.1.

---

## 💡 Medium

### B-005: Tách logic `dailyStreak` và `batchesCompleted` thành pure functions có test

**Effort:** M · **Tier:** 3

Hiện logic streak nằm trong `App.tsx` (file siêu lớn). Không test
được trực tiếp. Tuần trước nếu có test cho `dailyStreak`, mình đã
catch được bug "10 batches behind" sớm hơn.

**Việc cần làm:**
- Extract `dailyStreak` calculation thành `src/lib/streak.ts`.
- Tương tự cho `batchesCompleted`.
- Viết test cover các edge case: 0 ngày, 1 ngày, miss vài ngày,
  miss Sunday (rest day), miss >6 ngày (lost), bao gồm rest day
  hợp lệ.

**Tại sao Medium:** Việc này không sửa bug ngay, nhưng giảm khả năng
xuất hiện bug streak tương lai. Theo DoD, Tier 3 fix tiếp theo
trong khu vực này NÊN làm việc này luôn.

### B-006: Add "Sync now" button + visible error toast

**Effort:** M · **Tier:** 2

Hiện cloudPush nuốt mọi lỗi (catch return false, không UI). Nếu PC
hoặc phone bao giờ fail sync, bạn không biết. Tuần trước nếu có
toast "Sync failed — click to retry", bạn đã không tưởng mình mất
5 ngày học.

**Đề xuất:** Trong header / settings:
- Indicator nhỏ: "Last synced 2 min ago" hoặc đỏ "Sync failed"
- Nút "Sync now" manual để force-trigger pull-push.

### B-007: Đo "thực sự học bao nhiêu" so với "kế hoạch học"

**Effort:** M · **Tier:** 1

Hiện dashboard chỉ nói "X batches behind". Không biết:
- Bạn học trung bình mỗi ngày bao nhiêu phút?
- Hôm nào học nhiều nhất / ít nhất?
- Có pattern: cuối tuần học ít hơn?

Có thể thêm Progress view với weekly chart đơn giản. Sẽ giúp bạn
hiểu pace của mình hơn.

### B-008: Đổi tên branch nhánh chính / set git config

**Effort:** XS · **Tier:** 1

Hiện đang dùng `main`, OK. Nhưng git config có "LF will be replaced
by CRLF" warning ở mỗi commit. Set `core.autocrlf=true` global hoặc
thêm `.gitattributes` để khử warning.

---

## 🌱 Low

### B-009: Add A1.1 word + def images to existing flashcards

**Effort:** M · **Tier:** 2

Khi xong B-002, có thể bật flashcard back-side image cho A1.1 (giống
1500-word German đang có). Cần generate thêm "definition" prompts +
upload.

### B-010: Dark mode

**Effort:** M · **Tier:** 2

Học buổi tối, màn hình trắng chói. Thêm toggle dark/light trong
Settings. Áp dụng CSS variables cho 5–10 màu chính.

### B-011: Export progress to PDF / Anki

**Effort:** L · **Tier:** 1

Khi học xong khoá, có thể export ra Anki deck để duy trì spaced
repetition lâu dài. Hoặc PDF certificate "đã hoàn thành A1.1" cho
vui.

### B-012: Multi-user — vợ / con cùng học

**Effort:** XL · **Tier:** 3-Security

Hiện app chỉ giả định 1 user. Nếu vợ/con muốn dùng cùng tài khoản
Supabase, hệ thống không tách progress được. Cần proper user
auth (Supabase Auth) thay vì password chung.

---

## ✅ Completed (gần đây)

Đẩy xuống sau khi xong. Detail xem [CHANGELOG.md](CHANGELOG.md).

- 2026-06-12 — B-015 closed: sync hoạt động trên máy mới (email-only flow)
- 2026-06-12 — B-016 scrapped: user chọn UX > security, không làm Magic Link
- 2026-06-12 — English images batch 56-77 (172 ảnh)

- 2026-06-08 — B-001 closed: sync-progress yêu cầu session token, đã verify HTTP 401 không token
- 2026-06-08 — A1.1 image coverage 100% (161 ảnh cuối)
- 2026-06-08 — Backlog + Changelog + Retrospective + DoD update
- 2026-06-08 — Bảo mật RLS + Definition of Done + Vitest setup
- 2026-06-02 — A1.1 upload skip-existing
- 2026-06-01 — Gender color dot trên Flashcard
- 2026-05-30 — A1.1 image pipeline (audit + prompt + upload)
- 2026-05-29 — Streak sync + batchesCompleted bug fixes
- 2026-05-29 — A1.1 vocab batch (46 từ)
- 2026-05-23 — Umlaut typing shortcuts

---

*Backlog là tài liệu sống — bạn (PM) thêm / sắp xếp lại bất cứ lúc
nào. Khi mình bắt đầu task mới, mình đọc file này trước.*
