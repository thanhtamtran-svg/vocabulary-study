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

### B-002: Hoàn tất A1.1 images (161 từ thiếu)

**Effort:** S (chỉ là upload) + Cowork generation thì xa hơn · **Tier:** 1

Hiện trạng: 781/958 từ A1.1 đã có ảnh (81%). Còn thiếu:
- Lektion 6 (Freizeit): 91 từ
- Lektion 7 (Kinder und Schule): 70 từ

**Việc cần làm:**
- Bạn chạy Cowork tiếp với prompt batches 46–66.
- Mỗi lần Cowork xong vài batch, bạn nói "a11 images" → mình upload.

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

*Trống — các item Medium đã xong 2026-07-16.*

---

## 🌱 Low

### B-009: Add A1.1 word + def images to existing flashcards

**Effort:** M · **Tier:** 2

Khi xong B-002, có thể bật flashcard back-side image cho A1.1 (giống
1500-word German đang có). Cần generate thêm "definition" prompts +
upload.

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

---

## ✅ Completed (gần đây)

Đẩy xuống sau khi xong. Detail xem [CHANGELOG.md](CHANGELOG.md).

- 2026-07-17 — Dark mode v2 closed: bảng màu token hoá theo Material, 20/20 cặp đạt WCAG AA, PM duyệt "ổn rồi"; gỡ hẳn bản v1 đảo màu.
- 2026-07-16 — B-003 closed: verify live chấm màu giống trên Browse→Flashcard (đúng màu/kích thước, không tràn ngang); mặt sau thẻ + Complete view chưa verify tận mắt (cần lật thẻ tay) — rủi ro thấp.
- 2026-07-16 — Batch 7 việc closed: B-013 (auto-deploy functions, chờ secret), B-005 (streak.ts + 10 test), B-006 (sync bar đỏ khi lỗi + tap-to-sync), B-007 (biểu đồ tuần), B-008 (.gitattributes), B-010 (dark mode v1), B-019 (X xoá cache thật + dọn 267 dòng cũ + vé đăng nhập đúng bậc khi gọi AI).
- 2026-07-14 — B-024 closed: cả 8 edge function còn lại chuyển sang bộ đếm bền dùng chung (_shared/rate-limit.ts); verify AI chặn 6, sinh câu chặn 2.
- 2026-07-14 — B-022 closed: verify-password đếm lượt bền trong DB, chặn cứng 12 lần/phút tính chung (đã verify 429). Phát sinh B-024.
- 2026-07-14 — B-023 closed: màn thiết lập hiện đúng tên/số tuần/số từ theo từng khoá; bỏ số "2357 Reviews" bịa cứng.
- 2026-07-14 — B-021 closed: emoji hiện đúng từng từ (trước luôn 📚 do lỗi scope), nới AI unauth 2→6/phút, watchdog 30s cho nút Enable Reminder.
- 2026-07-14 — B-020 closed: mergeProgress không còn mất lastReview khi một máy thiếu ngày; +4 regression test.
- 2026-07-10 — Review toàn dự án: khoá auth cho sync-progress (trừ A1.1 công khai) + upload-image; sửa 2 bug tiếng Anh (giờ nhắc không lưu, Enter nhảy câu). Phát sinh B-020, B-021.
- 2026-06-23 — AI Teacher: format giải thích tiếng Đức mới (ÖSD A1) + auto nâng-cấp cache cũ. Phát sinh B-019.
- 2026-06-17 — B-018 closed: fix "Could not load explanation" — Anthropic model ID deprecated, updated to claude-sonnet-4-5
- 2026-06-12 — B-017 closed: fix mergeFullState ghi đè startDate trong incognito + 4 regression test
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
