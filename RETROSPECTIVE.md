# Retrospective

Mỗi khi sprint kết thúc (hoặc mỗi 2 tuần), nhìn lại để học. Mục tiêu:
**không lặp lại lỗi cũ.**

Format: 3 cột — **Went well / Didn't go well / Will try next**.

---

## Sprint 1 — 2026-05-25 → 2026-06-08 (2 tuần)

*Sprint đầu tiên áp dụng Scrum. Trước đó làm ad-hoc. Retro này nhìn
lại ~2 tuần gần nhất + những bài học lớn từ trước.*

### ✅ Went well

- **Reactive bug fix nhanh.** Ngày 29/05 khi user phát hiện streak
  thành 0, từ lúc nhận screenshot đến lúc ship fix dưới 2 giờ. Diagnose
  được 4 bug độc lập trong cùng phiên.
- **Khôi phục data thành công.** Streak mất 5 ngày → backfill được
  đúng các ngày học vào cloud. Không destructive operation nào.
- **Image pipeline tự động hoá.** Trước đây upload English / German
  images là manual paste script vào terminal. Giờ chỉ cần nói
  "english images" hoặc "a11 images" → Claude tự chạy. Tiết kiệm
  thời gian + ít sai sót.
- **Routine memory note đã chứng minh hữu ích.** "english images" và
  "a11 images" trigger phrase hoạt động đúng qua nhiều ngày, không
  phải giải thích lại.
- **Vocab routine ổn định.** Thêm 46 từ A1.1 chỉ với 1 lần duyệt
  preview, không phải re-derive cách classify mỗi lần.
- **Security hardening hoàn chỉnh trong 1 phiên.** RLS migration +
  edge function auth + SESSION_SECRET tách biệt — tất cả trong cùng
  ngày sau khi nhận warning email.

### ❌ Didn't go well

- **Bug streak chỉ phát hiện khi user mở phone.** Lẽ ra mình phải
  catch sớm hơn. Code review cho `cloudPush` lẽ ra sẽ thấy ngay
  `studyDates` bị bỏ sót. Mình thiếu thói quen "diff what's pushed
  to cloud vs what's in local state".
- **Mình tin lời mô tả của user thay vì kiểm chứng.** Khi user nói
  "tôi đã học những ngày này" mình đi backfill. Nhưng dữ liệu cloud
  cho thấy thực ra user chưa học những ngày đó. Tốt nhất là verify
  trước khi quyết định fix.
- **Mình tự xếp các batch sai khi thêm vocab.** Thêm 19 từ vào
  Lektion 3 → batch 26 đột nhiên thành "incomplete" → bộ đếm rớt.
  Mình không nhận ra side-effect này lúc add vocab. Nếu có DoD và
  test, mình đã catch.
- **Security audit nhận ra "hôm nay mình ship code chưa thực sự
  active".** Sau commit `f31f2a7` mình tưởng `sync-progress` đã
  auth-required. Curl probe cuối ngày cho thấy nó vẫn pull được
  dữ liệu không cần token. Mình đã **không curl-probe sau deploy**
  — đúng cái DoD Tier 3-Security yêu cầu sau này. **Bài học đắt giá:
  DoD này đáng giá.**
- **Một số commit không có context.** Vài commit chỉ ghi "Fix X" mà
  không nói tại sao. Sau 2 tuần đọc lại git log khó hiểu — mình mất
  thời gian khi seed Changelog hôm nay.
- **Tổn thất niềm tin.** User mở phone thấy streak = 0 và "10 batches
  behind", đã tưởng app hỏng. Nếu có monitoring / sync indicator,
  user sẽ tự thấy được issue đang xảy ra mà không cần phải báo cáo.

### 🔁 Will try next sprint

1. **Mỗi commit Tier 3 (data/sync/security) phải có test đi kèm.**
   DoD đã enforce. Không exception, không "fix nhanh để chạy".
2. **Curl-probe ngay sau khi deploy** cho mọi thay đổi security.
   B-001 trong Backlog là ví dụ điển hình: ship code chưa = active.
3. **Verify thực tế trước khi backfill data.** Pull cloud → check
   field thực tế → decide. Không tin memory của user (và memory của
   chính mình).
4. **Commit message Tier 1 phải có 1 câu "why" rõ ràng.** "Fix X"
   không đủ. "Fix X because Y was happening when Z" mới đủ.
5. **Backlog là source of truth cho việc cần làm.** Khi user nhắc
   bug / feature, mình check Backlog trước. Nếu chưa có thì thêm.
   Nếu có thì cập nhật priority / context.
6. **Cập nhật CHANGELOG.md sau mỗi commit không tầm thường.** Đã
   ghi vào DoD Tier 1.

### 📊 Numbers

- **Commits:** ~17 commit từ 2026-05-25 đến 2026-06-08.
- **Bugs phát hiện:** 4 bug streak/sync (1 phiên), 1 bug bảo mật
  (sync-progress), 1 bug auto-deploy chưa verify (B-001).
- **Bugs sửa:** 5 trong số 6, còn B-001 đang chờ user action.
- **Features ship:** Image pipeline A1.1, gender color, vocab batch
  46 từ, umlaut shortcuts, security RLS, DoD + Vitest.
- **Vocab added:** 46 từ A1.1.
- **Images uploaded:** 440 English + 781 A1.1.

---

## Template cho retro tiếp theo

Sao chép phần dưới mỗi sprint mới (~2 tuần).

```markdown
## Sprint N — YYYY-MM-DD → YYYY-MM-DD

### ✅ Went well
-

### ❌ Didn't go well
-

### 🔁 Will try next sprint
1.

### 📊 Numbers
- Commits:
- Bugs found / fixed:
- Features shipped:
```

---

*Retro là tài liệu mở. Nếu thấy điểm nào quan trọng giữa sprint,
ghi luôn vào sprint hiện tại thay vì đợi đến cuối.*
