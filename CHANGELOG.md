# Changelog

Mọi feature mới và thay đổi quan trọng được ghi lại ở đây.

Format: mới nhất lên trên. Mỗi entry có ngày và mô tả ngắn bằng ngôn
ngữ thân thiện (không phải commit message kỹ thuật).

**Quy tắc:** Claude phải cập nhật file này sau mỗi commit không-tầm-thường
(Tier 1 trong [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)).
Các thay đổi nhỏ kiểu typo, comment, format không cần ghi.

---

## 2026-06-23 — Flashcard mặt sau: chữ chính to/đậm/dễ đọc hơn

- **Trước → Sau:** Trên mặt sau, từ "das Obst" trước đây nhỏ (15px) và
  màu xám nhạt — khó đọc, lại nằm dưới định nghĩa. Giờ **từ chính làm
  tiêu điểm**: to 24px, in đậm, màu đậm dễ đọc, đặt **lên trên**; phiên
  âm rõ hơn; định nghĩa lùi xuống làm phần phụ (chữ dịu, nhỏ hơn).
- Sửa đúng "thứ tự ưu tiên + tương phản" đã bàn. Chỉ là CSS/giao diện,
  không đụng dữ liệu.

## 2026-06-23 — Flashcard mặt sau: ảnh to hơn, không còn trống

- **Trước → Sau:** Mặt sau thẻ tiếng Đức trước đây chỉ hiện "def image"
  (ảnh minh hoạ câu định nghĩa) — loại gần như không có (chỉ ~128/3.100
  ảnh), nên hầu hết thẻ bị trống một mảng lớn. Giờ:
  - **Fallback ảnh:** ưu tiên def image, nếu không có thì **dùng word
    image** (gần như mọi từ đều có) → mặt sau gần như luôn có ảnh.
  - **Ảnh to hơn + lên trên ở điện thoại:** màn hình hẹp xếp ảnh lên
    trên cùng (to hơn, 168px), chữ ở dưới; màn hình rộng giữ ảnh bên
    cạnh chữ. Thẻ cao hơn (240→300px) để chứa.
  - **Từ chưa có ảnh nào:** hiện khung placeholder gọn gàng + nút
    **"Tạo ảnh"** (gọi Gemini sinh ảnh ngay tại thẻ, lưu cache).
- **Kỹ thuật:** ảnh gốc 716×716 nên phóng tới 440px vẫn nét.
- **Cần kiểm tra:** đây là thay đổi giao diện (Tier 2) — nên xem lại
  trên cả PC và điện thoại sau khi deploy.

## 2026-06-23 — Phiên âm: bỏ ký hiệu glottal stop (ʔ) cho dễ đọc

- **Trước → Sau:** Phiên âm trên flashcard hiện ký hiệu ʔ trước nguyên
  âm đầu từ (vd "das Obst" = /ˈʔoːpst/, "arbeiten" = /ˈʔaʁbaɪ̯tən/).
  Ký hiệu này đúng về ngữ âm (âm bật thanh hầu) nhưng trông giống dấu
  hỏi và gây rối cho người học A1. Giờ đã bỏ → /ˈoːpst/, /ˈaʁbaɪ̯tən/
  (giống từ điển Hueber/Langenscheidt).
- **Phạm vi:** 18/128 từ đang lưu có ký hiệu này. Sửa ở 2 lớp cho chắc:
  (1) quy tắc sinh phiên âm bỏ ʔ + hàm tự dọn cache khi từ được sinh
  lại; (2) app cũng tự bỏ ʔ ngay lúc hiển thị — nên cả những từ cũ đã
  lưu đầy đủ (IPA + định nghĩa, không gọi lại server) vẫn hiện sạch
  ngay. Không cần thao tác tay.
- **Verify live:** das Obst → /ˈoːpst/, arbeiten → /ˈaʁbaɪ̯tən/, cache
  đã ghi đè sạch ✅.
- **Kèm theo:** Lần deploy này cũng đẩy luôn bản sửa model ID
  (claude-sonnet-4-5) của `generate-ipa-def` còn treo từ 2026-06-17.
- **Trade-off:** Mất một chút độ chi tiết ngữ âm (ʔ là âm có thật),
  đổi lấy phiên âm gọn dễ đọc — không ảnh hưởng việc học phát âm A1.

## 2026-06-23 — AI Teacher: format giải thích tiếng Đức mới (ÖSD A1)

- **Trước → Sau:** Bấm "Explain this word" cho từ tiếng Đức trước đây
  hiện "Key Grammar Point / Word Family / Example Sentences". Giờ đổi
  sang bố cục mới, dễ đọc và sát kỳ thi ÖSD A1 hơn:
  - **Simple explanation** — giải thích ngắn gọn (tiếng Anh).
  - **At a glance** — Tone / Mode / Register / Nuance / Dialect (ký hiệu
    gọn N/F/S… + giải thích trong ngoặc).
  - **Plural form** kèm phiên âm — chỉ hiện với danh từ.
  - **Conjugation** Präsens + Perfekt — mỗi dạng 1 dòng có nút đọc 🔊
    riêng (chỉ hiện với động từ).
  - **ÖSD-style example**, **Similar words** (xếp từ ít → trang trọng),
    **Nuance differences**, **Usage tips**.
- **Tự nâng cấp từ cũ:** 300 từ tiếng Đức đang lưu cache theo format cũ
  sẽ tự sinh lại theo format mới ngay lần mở tiếp theo — không cần xoá
  tay (key ẩn danh không xoá được cache do RLS chặn). Tiếng Anh / Việt
  không bị ảnh hưởng.
- **Verify live:** der Tisch (danh từ) + duschen (động từ) ra đúng
  format mới; kochen (đang cache format cũ) tự nâng cấp và lưu lại đúng
  format mới ✅. Build + 15/15 test pass.
- **Trade-off:** Mỗi từ cũ tốn 1 lần gọi AI khi mở lại lần đầu (rất nhỏ,
  chỉ khi xem). Các dòng cache cũ còn sót vô hại, dọn sau (B-019).

## 2026-06-17 — Fix "Could not load explanation" (model ID hết hạn)

- **Bug:** Bấm "No idea" trong phiên luyện A1.1 → hiện "Could not load
  explanation. Try again." Nguyên nhân: Anthropic đã retire model
  `claude-sonnet-4-20250514` (beta cũ), API trả về 404.
- **Fix:** Cập nhật model ID sang `claude-sonnet-4-5` (stable hiện tại)
  trong 3 edge function: `explain-word`, `generate-ipa-def`,
  `generate-sentences`. Deploy + verify live: giải thích trả về thành
  công.
- **Note:** `generate-ipa-def` và `generate-sentences` đã update code
  nhưng chưa re-deploy do network block JSR registry ở thời điểm commit.
  Sẽ deploy lần sau.

## 2026-06-12 — B-017 phần 2: chặn ghi đè startDate ở SERVER

- **Phát hiện:** Fix client (pickEarlier) chưa đủ — browser còn cache
  bundle cũ qua service worker, tiếp tục push startDate=today và ghi
  đè cloud ngay sau khi restore. Vicious cycle.
- **Fix:** `sync-progress` edge function giờ tự giữ startDate sớm hơn
  giữa bản đang có và bản được push. Server không bị cache nên guard
  này miễn nhiễm với client cũ.
- **Verify:** Push giả lập startDate=2026-06-12 đè lên 2026-04-19 →
  cloud giữ nguyên 2026-04-19 ✅
- **Service worker bump v12→v13** để browser tự lấy bundle mới có
  client-side fix.

## 2026-06-12 — Bug fix: incognito Sync ghi đè startDate (B-017)

- **Bug:** User mở tab incognito, bấm Sync, sync chạy thành công nhưng
  dashboard hiển thị "Day 1 Week 1" + "34 batches ahead" sai. Nguyên
  nhân: `mergeFullState` ưu tiên `local.startDate` (= hôm nay trong
  incognito) hơn `remote.startDate` (= 2026-04-19 thực tế). Cloud A1.1
  bị ghi đè startDate về 2026-06-12.
- **Khôi phục:** Restore startDate trên cloud về 2026-04-19 (script
  `scripts/restore-startdate.mjs` để tham khảo nếu tái diễn trong
  tương lai).
- **Code fix:** `mergeFullState` giờ pick `earlier` của local/remote
  startDate. ISO date string so sánh đúng vì format `YYYY-MM-DD`.
- **Test:** Thêm 4 test trong `sync.test.ts` cover các edge case
  (local older / remote older / one missing). 15/15 tests pass.

## 2026-06-12 — Sync: email-only (rollback security check)

- **Quyết định:** User chọn UX đơn giản hơn bảo mật chặt. Sync giờ
  chỉ cần email, không cần token. Bất kỳ ai biết email đều có thể
  pull/push progress. Trade-off này được user xác nhận sau khi
  hiểu rủi ro. Magic Link (B-016) bị scrap.
- **Code:** Bỏ `validateAuthToken` check trong `sync-progress`. Thay
  vào đó: rate-limit 30 req/min theo IP + validate email format.
- **Config:** Phát hiện `sync-progress`, `push-subscription`,
  `migrate-images` chưa có trong `config.toml` → Supabase gateway
  block 401 cho incognito. Thêm `verify_jwt = false` cho 3 function
  này.
- **Verify:** Curl pull không token → HTTP 200 (sync OK).

## 2026-06-12 — English images batch 56-77 uploaded (172 ảnh)

- Upload thêm 172 ảnh English cho batch 56-77 (Cowork tạo trong tuần
  trước). Đợt đầu fail ở ảnh 148/166 do lỗi network ECONNRESET, đã
  retry và 25 ảnh còn lại upload thành công nhờ skip-existing logic
  tự nhận diện 147 ảnh đã xong từ đợt trước.
- Supabase giờ có 613 ảnh English (46% của 1340 phrase).

## 2026-06-08 — English image upload script: skip-existing default

- Script `upload-english-images.mjs` giờ mặc định bỏ qua những phrase
  đã có ảnh trên Supabase (giống script A1.1 tuần trước). Lệnh
  "english images" sẽ chỉ upload phần mới, không re-upload toàn bộ.
  Pass `--force` nếu cần refresh hết.
- Audit hôm nay: 440/440 phrase English đã có ảnh → không có gì để
  upload.

## 2026-06-08 — Edge function manual deploy + sync-progress secured (B-001 closed)

- **Bảo mật:** Phát hiện edge function trên Supabase không tự
  auto-deploy từ GitHub. Tất cả thay đổi edge function trong ~7 tuần
  qua chưa thực sự active. Deploy thủ công 10 functions qua Supabase
  CLI. Code `sync-progress` yêu cầu session token giờ mới thực sự
  chạy.
- **Verify:** Curl-probe `sync-progress` không có token → HTTP 401.
  Với token sai → HTTP 401. Lỗ hổng đã đóng hoàn toàn.
- **Process:** Từ giờ mỗi lần sửa edge function phải chạy
  `npx supabase functions deploy`. Sẽ tự động hoá bằng GitHub Actions
  trong sprint sau.

## 2026-06-08 — A1.1 images coverage 100%

- Upload nốt 161 ảnh A1.1 cuối cùng (Lektion 6 & 7). Toàn bộ 958 từ
  A1.1 giờ đều có ảnh trên Supabase. 0 failure trong batch cuối.

## 2026-06-08 — Scrum process documents

- Thêm 3 file ở repo root: PRODUCT_BACKLOG.md (việc cần làm),
  CHANGELOG.md (lịch sử thay đổi — chính là file này), RETROSPECTIVE.md
  (rút kinh nghiệm 2 tuần). DoD Tier 1 giờ yêu cầu cập nhật
  CHANGELOG + BACKLOG sau mỗi commit không-tầm-thường.

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
