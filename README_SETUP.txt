BUFFALO SUNSET GOLD V8 — REALTIME DEV DASHBOARD

BẢN NÀY CÓ:
- Game public: index.html
- Dashboard admin: admin.html
- Realtime players / thắng / spin: Firebase Firestore
- Mỗi phiên người chơi bắt buộc nhập tên trước khi vào game
- DEV Dashboard hiển thị tên người chơi thay cho ID kỹ thuật
- DEV chọn từng tên và cấp thêm xu ảo realtime
- DEV chỉnh Win chance / Jackpot chance / payout multiplier riêng trong QA TEST MODE
- Google login cho DEV
- Global odds/settings từ DEV dashboard
- Per-player QA TEST override (player luôn thấy banner DEV TEST MODE khi override được bật)
- Force next jackpot cho QA test
- Vàng/coin dày hơn ở Big Win và Jackpot
- Nếu Firebase chưa cấu hình, game vẫn chạy bình thường nhưng dashboard realtime không hoạt động.

SETUP FIREBASE:
1) Tạo project tại Firebase Console.
2) Authentication -> Sign-in method:
   - bật Anonymous (cho player)
   - bật Google (cho DEV)
3) Firestore Database -> Create database.
4) Project settings -> Your apps -> Web app -> copy Firebase config.
5) Mở firebase-config.js và thay toàn bộ PASTE_... bằng config của project.
6) Firestore -> Rules:
   - copy nội dung firestore.rules.template
   - thay PASTE_DEV_EMAIL_HERE bằng Gmail DEV bạn đã chọn
   - Publish rules.
7) Upload TOÀN BỘ file/thư mục V8 lên GitHub repo:
   index.html
   admin.html
   firebase-config.js
   telemetry.js
   assets/
8) GitHub Pages: main / (root).

LINK:
- Game: https://USERNAME.github.io/REPO/
- DEV dashboard: https://USERNAME.github.io/REPO/admin.html

LƯU Ý:
- Firebase Web config KHÔNG phải secret; quyền thật nằm ở Firestore Rules.
- Dashboard chỉ đọc được dữ liệu nếu Gmail đăng nhập khớp Firestore Rules.
- Per-player override trong bản này chỉ là QA/test minh bạch; khi bật, player thấy "DEV TEST MODE".
- Đây là demo dùng xu ảo, không có nạp/rút tiền thật.

V10 ADMIN CONTROLS:
- Chọn người chơi theo tên -> nhập "Cấp thêm xu ảo" -> CẤP XU CHO PLAYER.
- Player nhận tiền ngay, có hiệu ứng coin và thông báo.
- Win chance TEST (%) = tỷ lệ spin được ép thành kết quả có thưởng trong QA TEST MODE.
- Khi TEST MODE bật, player thấy banner DEV TEST MODE · ODDS OVERRIDE.

Firebase config đã được điền sẵn cho project buffalo-game-864b0.
DEV email đã được điền sẵn trong firestore.rules.template.


V11 FX + DEV PRO
- Gold Storm canvas: rain/fountain/side cannons.
- Big/Super/Mega/Grand Jackpot FX tiers.
- Jackpot: 3-wave buffalo stampede + dense coins + meter flash.
- Bonus mode + free game ticker + bonus total + collection milestone FX.
- DEV Console Pro: realtime KPIs, search, player control, grant credits, visible QA test odds, force jackpot QA, pause/resume, realtime message, global settings, activity feed.


V12 CINEMATIC BONUS FX
----------------------
- Free Games entry rebuilt as a ~6.2s cinematic sequence.
- Large Buffalo hero appears in the center with animated gold rings.
- Multi-wave fireworks + flash bursts + Gold Storm + coin fountain.
- Buffalo echo/stampede accents around the screen.
- Retrigger and Bonus Complete use dedicated cinematic variants.
- Small wins upgraded: winning symbols pulse, denser coins, mini fireworks and animated win badge.
- Mid wins get cannons, flash and stronger reel glow.
- Existing Firebase/DEV realtime controls remain unchanged.
