# Kế hoạch triển khai tính năng "Class Remark" (ghép nhận xét từ bảng tính)

## 1) Mục tiêu và phạm vi
- Xử lý hoàn toàn trên client (frontend) theo yêu cầu.
- Người dùng tải lên tệp CSV hoặc Excel (xlsx/xls) chứa cấu trúc như mô tả trong `class-remark-requirement.md`.
- Hệ thống đọc bảng, trích xuất cấu hình phần nhận xét, mẫu câu, biến động, dữ liệu học sinh và tiến hành merge thành câu nhận xét hoàn chỉnh theo thứ tự.
- Hỗ trợ xem trước (preview), hiển thị lỗi/validation rõ ràng, và cho phép xuất (export) cột "Nhận xét" ra CSV/XLSX hoặc copy clipboard.
- Tính năng sẽ nằm trong Dashboard, có một trang mới và một link mới ở Sidebar.

## 2) Thư viện dự kiến sử dụng (phù hợp với stack hiện tại)
- Đọc CSV và XLSX:
  - `papaparse` (đọc CSV nhanh, chạy trong browser).
  - `xlsx` (SheetJS) để đọc Excel (xlsx/xls) và cũng có thể xuất.
- Xuất dữ liệu:
  - Tận dụng `xlsx` để tạo file Excel; hoặc xuất CSV thủ công qua `Blob` (không cần thêm `file-saver`, có thể dùng `<a download>` với URL.createObjectURL).
- UI/UX:
  - Tailwind CSS (đã dùng) + các component sẵn trong `frontend/src/components/ui/` để giữ phong cách nhất quán.
- Routing:
  - `react-router-dom` (đã có v7) – thêm route con trong dashboard.

Lưu ý: Cần thêm `papaparse` và `xlsx` vào `frontend/package.json` trong bước triển khai mã.

## 3) Dữ liệu và mô hình xử lý
- Khái niệm chính:
  - "Phần nhận xét": lấy từ dòng 1 (headers), ví dụ: `Câu khen`, `Câu BTVN`, `Câu dạng bài làm tốt`, `Câu dạng bài chưa làm tốt`, `Câu kết`.
  - "Mẫu câu": dòng 2 – chứa các template, có thể có placeholder: `{Tên học sinh}`, `{Tên bài thi}`, `{Các dạng bài làm tốt}`, `{Các dạng bài làm chưa tốt}`.
  - "Biến/nhãn phụ": dòng 3 – chứa các biến như "Tốt", "Chưa tốt", các "Dạng bài"… Dải "Dạng bài làm tốt" bắt đầu từ 2 ô dưới header `Câu dạng bài làm tốt` và kéo dài tới cột trước header `Câu dạng bài chưa làm tốt`.
  - "Records học sinh": từ dòng dưới ô "Tên học sinh" (tìm theo nội dung cell cột A) là danh sách học sinh; cột A là tên học sinh, các cột còn lại là cờ `x` (không phân biệt hoa thường) hoặc để trống.

- Đầu ra mong muốn:
  - Với mỗi học sinh, tạo một chuỗi nhận xét theo thứ tự phần ở dòng 1. Mỗi phần kết thúc bằng dấu chấm, nhưng nếu mẫu câu đã có dấu chấm thì không tự thêm nữa.
  - Cột đầu ra là cột `Nhận xét` (cùng sheet, đặt vào cột có tiêu đề `Nhận xét` – nếu chưa có sẽ thêm mới ở cuối).

## 4) Thuật toán/Logic chi tiết
- Tìm vị trí các cột/ô chủ chốt:
  - Header hàng 1: map tên phần -> chỉ số cột.
  - Dò ô "Tên học sinh" ở cột A (không phân biệt hoa thường, sau đó records bắt đầu từ hàng dưới).
  - Vị trí dải "Dạng bài":
    - Cột bắt đầu = cột header `Câu dạng bài làm tốt`.
    - Dòng mục lục dạng bài = hàng ("dòng tên học sinh" - 1), theo requirement là cùng hàng với "Tốt/Chưa tốt" (ví dụ dòng 3).
    - Cột kết thúc = cột trước header `Câu dạng bài chưa làm tốt`.

- Xử lý từng học sinh (mỗi row record):
  - Lấy tên học sinh (trim, giữ nguyên hoa thường người dùng nhập, nhưng khi nhúng vào các danh sách dạng bài thì tên dạng bài để chữ thường như yêu cầu).
  - Với các phần thông thường (không phải dạng bài):
    - Nếu có cờ `x` ở một mục trong cùng phần (ví dụ giữa "Tốt" và "Chưa tốt") thì sử dụng template tương ứng tại hàng 2, thay placeholder.
    - Validation: nếu trong cùng một phần có >1 cờ `x` thì báo lỗi phần đó cho học sinh.
  - Với phần "dạng bài":
    - Tập Good = các mục dạng bài được đánh `x` trong dải.
    - Tập NotGood = tất cả mục trong dải trừ tập Good.
    - Chèn Good (danh sách, ngăn cách bằng dấu phẩy, không viết hoa chữ cái đầu) vào template phần `Câu dạng bài làm tốt`.
    - Chèn NotGood (danh sách như trên) vào template phần `Câu dạng bài chưa làm tốt`.
  - Thay placeholder `{Tên học sinh}`, `{Tên bài thi}` (từ ô A2 sau khi trim) vào các template tương ứng khi xuất hiện.
  - Ghép các phần theo thứ tự header hàng 1; mỗi phần có nội dung thì thêm vào, quản lý dấu chấm như yêu cầu.

- Quy tắc dấu chấm:
  - Nếu template đã có dấu chấm ở cuối – giữ nguyên.
  - Nếu không – thêm `.` vào cuối đoạn phần đó.

- Validation tổng hợp:
  - Thiếu header bắt buộc: `Tên học sinh`, `Câu khen` (và/hoặc các phần khác nếu cần) → báo lỗi cấu trúc.
  - Thiếu template hàng 2 cho một phần nhưng có dữ liệu chọn → cảnh báo.
  - Trong một phần 2-state (Tốt/Chưa tốt) có >1 `x` → báo lỗi chi tiết theo tên phần + học sinh.
  - Không tìm được ranh giới dải dạng bài → báo lỗi cấu trúc.

## 5) UI/UX và luồng người dùng
- Kịch bản trang `Class Remark`:
  - Khu vực Upload:
    - Nút chọn file (chấp nhận .csv, .xlsx, .xls). Hiển thị thông tin file.
  - Khu vực Preview/Phân tích:
    - Hiển thị các phần đã nhận diện (headers, templates, dải dạng bài, tên bài thi, vị trí tên học sinh) để người dùng kiểm tra nhanh.
    - Bảng preview 5–10 hàng đầu của học sinh với cột "Nhận xét (preview)".
    - Khu vực lỗi/validation rõ ràng, có thể lọc chỉ hiển thị hàng lỗi.
  - Hành động:
    - Nút "Tạo nhận xét" → sinh ra toàn bộ cột "Nhận xét".
    - Nút "Tải xuống Excel" (xlsx) và "Tải xuống CSV"; Nút "Copy tất cả nhận xét".

- Trải nghiệm:
  - Loading khi parse file lớn (sử dụng loading giống với khi vào màn StudentEdit).
  - Hiển thị số lượng học sinh, số lỗi.
  - Tooltip hướng dẫn ngắn dựa trên `class-remark-requirement.md`.

## 6) Tổ chức file và thay đổi cấu trúc dự kiến
- Frontend source (`frontend/src/`):
  - `routes/dashboard/ClassRemark.tsx` – Trang chính của tính năng (UI/logic trang).
  - `services/remarks/` – vùng xử lý business:
    - `CsvXlsxReader.ts` – Hàm/tiện ích đọc file: auto detect csv/xlsx, trả về ma trận ô (2D array) và/hoặc access theo ô.
    - `RemarkParser.ts` – Trích xuất cấu hình (headers, templates, dải dạng bài, vị trí records).
    - `RemarkMerger.ts` – Hàm merge tạo nhận xét theo rule.
    - `RemarkTypes.ts` – Kiểu dữ liệu: cấu trúc header, template, phạm vi dạng bài, lỗi validation, kết quả merge…
  - `components/remarks/` – các component UI nhỏ:
    - `UploadBox.tsx` – khu vực tải file, hiển thị thông tin file.
    - `PreviewPanel.tsx` – hiển thị phát hiện (headers/templates/range) và preview dữ liệu.
    - `ErrorsPanel.tsx` – hiện lỗi và filter.
    - `ActionsBar.tsx` – nút hành động export/copy.

- Dashboard Sidebar:
  - Thêm link tới `/dashboard/class-remark` trong `components/dashboard/DashboardSidebar.tsx`.

## 7) Routing
- Thêm route con trong `routes/dashboard/`:
  - Import `ClassRemark.tsx` và đăng ký trong file cấu hình routes (theo mẫu các file `Overview.tsx`, `Tuition.tsx`, v.v.).
  - Đường dẫn: `/dashboard/class-remark`.

## 8) Triển khai theo bước
- Bước 1: UI skeleton trang `ClassRemark.tsx` (upload + preview khung rỗng).
- Bước 2: Đọc file CSV/XLSX (thêm deps `papaparse`, `xlsx`), dựng `CsvXlsxReader.ts`.
- Bước 3: Dựng `RemarkTypes.ts` và `RemarkParser.ts` theo requirement (tìm header, templates, tên học sinh, dải dạng bài…).
- Bước 4: Viết `RemarkMerger.ts` (merge từng học sinh, rule dấu chấm, placeholder, validation).
- Bước 5: Nối vào UI: preview 5–10 hàng, bảng lỗi, thống kê.
- Bước 6: Thêm export XLSX/CSV, copy clipboard.
- Bước 7: Tích hợp route + thêm link Sidebar.
- Bước 8: Tinh chỉnh UX, chú thích code, dọn dẹp.

## 9) Kiểm thử và logging
- Unit tests (mức module) cho:
  - Phát hiện header, tìm dòng "Tên học sinh".
  - Xác định dải dạng bài và cột dừng trước `Câu dạng bài chưa làm tốt`.
  - Merge placeholders, quy tắc `x`, validation >1 `x`/phần.
  - Quy tắc dấu chấm.
- Logging nhẹ (console.debug) trong quá trình parse/merge (có thể ẩn sau cờ `NODE_ENV`).

## 10) Edge cases cần xử lý
- Khoảng trắng thừa trong header, tên bài thi, tên học sinh → `trim()` và chuẩn hóa.
- Không phân biệt hoa thường khi dò `x` và khi dò header/"Tên học sinh".
- File chỉ có CSV: xác định cột "Nhận xét"; nếu thiếu, thêm mới ở cuối.
- Nhiều mẫu câu (nhiều phần) làm dịch chuyển dòng 2–3: parser phải tìm theo nội dung, không hardcode index.
- Dạng bài không có cái nào được chọn → `Good = []`, `NotGood = all` (vẫn ghép bình thường).

## 11) Thay đổi file cụ thể
- Thêm mới:
  - `frontend/src/routes/dashboard/ClassRemark.tsx` (trang chính).
  - `frontend/src/services/remarks/CsvXlsxReader.ts`.
  - `frontend/src/services/remarks/RemarkParser.ts`.
  - `frontend/src/services/remarks/RemarkMerger.ts`.
  - `frontend/src/services/remarks/RemarkTypes.ts`.
  - `frontend/src/components/remarks/UploadBox.tsx`.
  - `frontend/src/components/remarks/PreviewPanel.tsx`.
  - `frontend/src/components/remarks/ErrorsPanel.tsx`.
  - `frontend/src/components/remarks/ActionsBar.tsx`.
- Chỉnh sửa:
  - `frontend/src/components/dashboard/DashboardSidebar.tsx` – thêm NavLink mới.
  - Đăng ký route trong `frontend/src/routes/Dashboard.tsx` hoặc nơi đang tập hợp các route con (mở file và bổ sung khi triển khai).
- Cập nhật dependencies:
  - `frontend/package.json` – thêm `papaparse`, `xlsx`.

## 12) Tiêu chí hoàn thành (DoD)
- Tải file CSV/XLSX và parse được cấu trúc theo requirement.
- Preview dữ liệu học sinh và cột "Nhận xét (preview)".
- Merge chính xác placeholders (`{Tên học sinh}`, `{Tên bài thi}`, `{Các dạng bài làm tốt/chưa tốt}`) theo quy tắc.
- Có cơ chế báo lỗi rõ ràng và nêu đúng hàng/học sinh/ phần vi phạm.
- Xuất được file kết quả (CSV và/xlsx) hoặc copy clipboard.
- Link mới ở sidebar trỏ đúng trang, layout nhất quán với dashboard hiện tại.
- Code có chú thích, tách module rõ ràng, dễ maintain.
