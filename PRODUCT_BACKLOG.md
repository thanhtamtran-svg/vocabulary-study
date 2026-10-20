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

### B-002: Hoàn tất ảnh cho khoá Schritte A1 — còn thiếu 247 từ

**Effort:** Cowork sinh ảnh (L) + upload (S) · **Tier:** 1

Rà soát 2026-07-20 (`scripts/audit-all-images.mjs`): German 1500 và
English đã phủ ảnh 100%. Chỉ khoá **Schritte A1 còn thiếu 247/1443 từ**
(ảnh mặt trước), gần hết nằm ở phần A1.2 mới nhập:
- L8 Beruf: 49 · L9 Ämter: 39 · L10 Gesundheit: 29 · L14 Feste: 29 ·
  L13 Kleider: 30 · L12 Kundenservice: 23 · L11 Stadt: 19 · L5 Tag: 16
- Lác đác: L1 (5), L4 (4), L2 (2), L6 (1), L7 (1)

**Việc cần làm:**
- Bạn chạy Cowork sinh ảnh cho các Lektion thiếu (ưu tiên L8-L14).
- Mỗi đợt xong nói "a11 images" → mình upload.
- Kiểm lại tiến độ bất cứ lúc nào: `node scripts/audit-a11-by-lektion.mjs`.

---

## 💡 Medium

### B-025: Thay dòng "Elaboration" trên mặt sau thẻ bằng thứ có giá trị thật

**Effort:** S–M tuỳ phương án · **Tier:** 2

PM nhận xét (2026-07-17): dòng "Elaboration: Create a personal
sentence..." tĩnh, không làm gì được, chung chung — không có giá trị.
Đã thảo luận 2 vòng, PM chưa chốt, để suy nghĩ thêm. Các phương án
trên bàn (không loại trừ nhau):

1. **Câu ví dụ thật** (đề xuất của Claude, ~2h): mặt sau hiện 1 câu
   tiếng Đức A1 dùng từ đó + nghĩa + nút đọc. Tận dụng kho câu AI có
   sẵn của phần bài tập (`vocab_sentences`); từ chưa có câu → nút sinh
   một lần rồi lưu vĩnh viễn.
2. **Ghi chú cá nhân trên thẻ** (~2–3h): ô "câu của bạn" gõ 1 lần khi
   học, tự hiện lại mọi lần ôn — elaboration làm thật. Cần sync note
   theo đường progress sẵn có.
3. **Điền khuyết mini** (~3h, xây trên phương án 1): câu ví dụ giấu
   từ đang học, chạm để hiện.
4. **Xoá trắng dòng đó** (5 phút): mặt sau vốn đã đủ thông tin.
5. Gợi ý xoay vòng theo loại từ (~30p) — PM đã nghe, chưa thuyết phục.

Lưu ý khi làm: dòng này nằm ở SessionView (cả German lẫn English
dùng chung); phương án 1–3 nên làm cho cả hai khoá.

---

## 🌱 Low

### B-033: Khoá mẫu câu — còn một kiểm tra trên web thật

- Đã xong 2026-10-20 sau deploy: probe (German/English/không-lang vẫn
  401; `german_patterns` + A1 mở; bộ lọc chặn chữ dài/ngoặc; ghi chú
  độc hại bị bỏ qua), AI tutor lưu `pat:` + tự hiện trên web, AI chấm
  câu đúng/sai hợp lý, giọng đọc thường + file `-slow` riêng.
- Còn lại: PM nhập email đồng bộ ở khoá mới trên PC và điện thoại, xác
  nhận tiến độ (kể cả câu chuyển từ Schritte A1) hiện giống nhau.

### B-027: Đồng bộ lựa chọn "Focus Lektion" giữa PC và điện thoại

**Effort:** M · **Tier:** 3 (đụng gói đồng bộ / merge)

B-026 (2026-09-21) cố ý lưu Lektion đang tập trung **theo từng máy**
để không đụng `mergeProgress` và edge function. Hệ quả: PM phải chọn
lại bài một lần trên mỗi thiết bị. Chỉ làm khi PM thấy phiền thật.
Nếu làm: thêm trường vào gói đồng bộ, merge theo "lần chọn mới nhất
thắng" (kèm timestamp), viết test regression, kiểm cloud state trước/
sau theo Tier 3.

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

- 2026-10-20 — B-034 closed: explain-word chỉ nhận `type` nằm trong danh sách loại từ cố định của khoá (`_shared/word-type.ts` + 3 test, 120/120); chữ lạ → bỏ. Đã deploy + probe thật: từ chưa có cache kèm `type` chứa lệnh độc → AI làm lơ; German/English vẫn 200.

- 2026-10-20 — B-032 closed: gỡ nhánh dịch tiếng Việt của explain-word (nhận `definition` chữ tự do rồi lưu dùng chung); `vi` và từ Đức mở đầu `vi:`/`en:`/`pat:` bị từ chối 400 (`_shared/explain-cache-key.ts` + test). Đã deploy + probe thật: vi kèm chữ độc → 400, 3 tiền tố → 400, dòng `vi:facilitate something` (2026-03-31) giữ nguyên, German/English/pattern vẫn 200. Còn B-034.

- 2026-10-20 — B-031 closed: khoá thứ 4 "Hören & Sprechen A1" (515 mẫu câu, 22 tình huống). Data `src/patterns-a1-data.ts` sinh bằng `scripts/build-patterns-data.mjs` từ docx + 344 dòng câu/cảm thán cắt khỏi Schritte A1 (cache `scripts/data/a11-moved-rows.json`); chuyển tiến độ A1 → patterns idempotent (`src/lib/patterns-migration.ts`, chạy khi mở khoá + khi kéo tiến độ A1 từ mây). App.tsx dùng bảng cấu hình `src/lib/course-config.ts` thay cho `isA11`. Thẻ `PatternCard` (nghe-trước-lật-sau, chậm, ×3), bài tập `pattern-exercise-engine.ts` (thêm dạng xếp từ), đổi chiều trong Settings. Server: sync-progress mở `german_patterns` (allow-list), explain-word prompt mẫu câu + cache `pat:` (chỉ nhận đúng câu mẫu đã lọc — không nhận chữ tự do, chống đầu độc cache), check-sentence prompt mẫu câu, tts `rate` chậm (file `-slow` riêng). 112/112 test.

- 2026-10-17 — B-030 closed: mặt sau thẻ German thay định nghĩa tiếng Đức (quá khó ở A1) bằng câu ví dụ A1 + nút Translate (EN) + từ đồng/trái nghĩa lọc theo danh sách từ của khoá (`src/lib/word-extras.ts` + 3 test, 63/63). Bảng cache mới `vocab_word_extras` (migration 20261017, đọc công khai, ghi qua edge function), mode `word-extras` trong generate-ipa-def (bucket 10/15 mỗi phút). Định nghĩa vẫn được tải ngầm vì nó quyết định ảnh minh hoạ. Đã db push + deploy, probe thật (gut ↔ schlecht, der Verkäufer ↔ der Käufer).
- 2026-10-16 — B-029 closed: thiết kế lại bài tập theo nghiên cứu ôn tập (PM duyệt): 10 từ/buổi, mỗi từ 1 câu theo độ khó (mới → chọn, khá → gõ, vững → điền câu); sai → hỏi lại sau 3–5 câu (tối đa 3 lần); yếu/mạnh theo 5 lần gần nhất (`recent`); lựa chọn sai bốc ngẫu nhiên cùng Lektion; bỏ dạng gõ nghĩa tiếng Anh (`fill_english`); thêm bài tự đặt câu cho 2 từ mới nhất, AI chấm + sửa (mode `check-sentence` trong generate-ipa-def, bucket riêng 6/15 mỗi phút); generate-sentences nhận tối đa 12 từ. Logic chung ở `src/lib/exercise-core.ts` + 11 test (60/60). Đã deploy 2 function, probe thật chấm câu đúng/sai. Còn lại: máy chủ gộp `recent` theo bản gửi lên chứ không theo ngày mới hơn (ảnh hưởng nhỏ).
- 2026-10-13 — B-028 closed: sync-progress gộp bản gửi vào bản trên máy chủ thay vì ghi đè (tab cũ đã xoá buổi học 12/10); `_shared/merge-progress.ts` thuần + 7 test (49/49); đã deploy, probe thật: gửi cũ-sau-mới giữ cả hai, auth German vẫn 401.
- 2026-09-21 — B-026 closed: chọn một Lektion để tập trung trên ô "New Words" (Schritte only); ghim tới khi xong rồi tự về thứ tự sách; nút Back to normal order; lưu theo máy (v1, sync → B-027); `lektionProgress()` thuần + 3 test (42/42); verify local desktop + mobile không tràn ngang; verify live trên GitHub Pages sau deploy (chọn L11 → pill + nhóm "Lektion 11 (1)" đúng, không lỗi console).
- 2026-07-17 — Voice upgrade closed: cửa tts mới (Google Neural2 + cache MP3 vĩnh viễn trong bucket tts-audio), client ưu tiên cloud + xếp hạng giọng fallback; verify der Tisch/reliable sinh-rồi-cache OK.
- 2026-07-17 — B-004 closed (phát hiện muộn): A1.2 Lektion 8-14 (~480 từ) đã nhập vào chung khoá từ 2026-07-16 (commit 74095b4) — hướng "extend thành A1" tự chốt qua vocab routine; đổi tên hiển thị thành "Schritte A1 • 14 Lektionen".
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
