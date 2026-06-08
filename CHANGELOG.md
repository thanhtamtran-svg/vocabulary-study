# Changelog

Mọi feature mới và thay đổi quan trọng được ghi lại ở đây.

Format: mới nhất lên trên. Mỗi entry có ngày và mô tả ngắn bằng ngôn
ngữ thân thiện (không phải commit message kỹ thuật).

**Quy tắc:** Claude phải cập nhật file này sau mỗi commit không-tầm-thường
(Tier 1 trong [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)).
Các thay đổi nhỏ kiểu typo, comment, format không cần ghi.

---

## 2026-06-08 — Security hardening + Definition of Done

- **Bảo mật:** Bật Row-Level Security trên tất cả 7 bảng database.
  Trước đây bất kỳ ai biết URL Supabase đều có thể đọc / ghi data
  của bạn. Giờ chỉ edge function (server) mới đụng được dữ liệu cá
  nhân; các bảng nội dung chia sẻ (hình ảnh, định nghĩa, IPA) vẫn
  cho phép đọc công khai.
- **Bảo mật:** `sync-progress` edge function bây giờ yêu cầu session
  token. Trước đây chỉ cần biết email là pull/push được data người
  khác.
- **Bảo mật:** Tách `SESSION_SECRET` khỏi `APP_PASSWORD`. Việc đổi
  password không còn invalidate token và ngược lại.
- **Process:** Thêm [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
  với 3 tier (mọi commit / UI / data-sync-security). Security checks
  là non-skippable.
- **Process:** Set up Vitest test framework + 11 regression test cho
  data-merge logic. Chạy bằng `npm test`.

## 2026-06-02 — A1.1 images skip-existing

- Script upload ảnh A1.1 mặc định bỏ qua những từ đã có ảnh trên
  Supabase. Lần upload tiếp theo chỉ làm phần mới Cowork đã generate,
  không re-upload toàn bộ. Pass `--force` nếu muốn refresh hết.

## 2026-06-01 — Color-coded gender (der/die/das)

- Trên flashcard, icon ở vị trí emoji được thay bằng chấm tròn màu:
  **der = xanh dương**, **die = đỏ**, **das = xanh lá**. Áp dụng tự
  động cho mọi danh từ có article (335 từ A1.1). Từ không có article
  (tên nước, ngôn ngữ) giữ emoji cũ.

## 2026-05-30 — A1.1 image pipeline

- Trio script mới để keep ảnh A1.1 đồng bộ với vocab:
  `audit-a11-images.mjs` (xem từ nào thiếu),
  `generate-a11-prompts.mjs` (tạo prompt cho Cowork),
  `upload-a11-images.mjs` (đẩy lên Supabase).
- Bạn nói "a11 images" → mình tự chạy upload script.
- Lần audit đầu: 522 từ A1.1 chưa có ảnh, đã chia thành 66 batch
  cho Cowork generate.

## 2026-05-29 — Sự cố streak sync (đã sửa)

- **Bug:** Streak trên phone hiển thị 0 dù PC vẫn đang học. Auto-sync
  bỏ sót field `studyDates` ở mọi push trừ initial sync, nên cloud
  thiếu các ngày học mới của bạn.
- **Bug:** Bộ đếm "batches completed" dừng ở batch không-hoàn-thành
  đầu tiên — một từ mới chưa học có thể "ẩn" 28 batch đã hoàn thành
  trước đó. Đó là lý do dashboard hiện "10 batches behind" sai.
- **Sửa:** Mọi sync push bây giờ gồm `studyDates`; bộ đếm tính tất cả
  batch hoàn thành chứ không chỉ contiguous; tolerance từ 3 missed
  weekdays nâng lên 6 (busy week không phá streak).
- **Khôi phục:** Đã restore 4 ngày học 25–28/05 vào cloud của bạn.

## 2026-05-29 — A1.1 vocabulary expansion

- Thêm 46 từ A1.1 mới qua 2 batch (19 + 27 từ) cho Lektion 2–7.
  Chủ đề: ẩm thực, thời tiết, công việc, gia đình, sở thích.

## 2026-05-23 — German typing UX

- Phím 1–4 trở thành shortcut nhanh cho 4 ký tự đặc biệt (ä ö ü ß)
  trong bài tập gõ.
- Bên cạnh nút umlaut có gợi ý cách viết bằng phím ASCII
  (ae / oe / ue / ss) cho ai không có bàn phím Đức.

## 2026-05-22 — Accept trailing punctuation

- Đáp án có hay không có dấu câu cuối câu (`.`, `?`, `!`) đều được
  chấp nhận. Trước đây bạn nhập "Wie geht's" sẽ bị chấm sai vì
  thiếu dấu chấm.

## 2026-05-20 — Bigger flashcard images

- Ảnh mặt sau flashcard hiển thị to hơn trên màn hình lớn,
  responsive layout side-by-side với text. IPA prompt được tinh
  chỉnh theo chuẩn Standard German.

## 2026-05-15 — Image upload tooling

- Hai script mới: `upload-english-images.mjs` (IELTS phrases),
  `upload-def-images.mjs` (German definition images). Trước đây
  phải dùng inline Node script.

## 2026-05-12 — Codified vocab routine

- Thêm `.claude/vocab-routine.md` mô tả workflow chuẩn để thêm từ
  A1.1. Bạn dán list từ → Claude tự extract, classify, dedupe, show
  preview, sau khi duyệt thì edit → build → commit → push.
- Strip ra các annotation kiểu `(formal)` trong prompt / TTS để
  không bị đọc nhầm.
- Thêm `COMMUNICATION.md` ghi lại style giao tiếp project.

## 2026-04-20 — Schritte Plus Neu A1.1 variant

- App giờ có 2 khoá tiếng Đức song song: 1500-word German và
  Schritte Plus Neu A1.1. Mỗi variant có vocab data riêng nhưng
  share streak / study dates qua cloud sync.
- A1.1 không cần password (mở công khai), 1500-word vẫn yêu cầu.
- Bài tập của A1.1 loại trừ Anweisungen im Kurs (lệnh giáo viên)
  cho đỡ phiền.
- Anweisungen im Kurs được rải đều vào các batch Lektion thay vì
  dồn vào đầu khoá.

## 2026-04-08 → 2026-04-09 — Cloud sync ổn định

- Một chuỗi commit sửa race condition khi sync giữa PC và phone.
  Pull-first thay vì push-before-pull; merge lock chống ghi đè
  trong lúc sync; `studyDates` được derive từ progress data thay
  vì sync rời.

## 2026-04-02 — Image generation cost cut

- Đổi image generation từ Gemini direct sang OpenRouter (rẻ hơn
  ~14×).
- Generate ảnh trở thành on-demand (bấm nút) thay vì auto. Tiết
  kiệm tiền API khi học bị skip nhiều từ.
- Thêm `upload-image` edge function cho batch upload từ máy local.

## 2026-04-02 — Streak grace period

- Cho phép miss 3 ngày liên tiếp trước khi streak break (thay vì 2).

## 2026-03-30 → 2026-03-31 — English (IELTS) flashcards

- Mặt sau flashcard tiếng Anh hiển thị nghĩa tiếng Việt + ảnh AI.
- Validator chấp nhận ký tự đặc biệt trong IELTS phrase (`+`, parens).
- Lời giải thích AI cho từ tiếng Đức được viết bằng tiếng Anh (phù
  hợp người học IELTS hơn là tiếng Việt).

## Trước 2026-03-30 — Foundation

- 1500-word German vocabulary với spaced repetition.
- Daily plan / streak / weekly calendar.
- Cloud sync giữa PC ↔ phone qua Supabase.
- Multiple choice + typing exercises với feedback chi tiết.
- AI explain (Claude API) cho từ khó, AI image cho mnemonic.
- IELTS Speaking phrases course (1340 cụm từ).
- Service worker / PWA install / push notification.
- Password-gated access (rate-limited).

---

*Generated 2026-06-08 từ git log. Các entry cũ hơn nén thành topic
groups để khỏi quá dài. Sửa thoải mái nếu thấy cần làm rõ.*
