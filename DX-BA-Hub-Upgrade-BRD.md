# TÀI LIỆU YÊU CẦU NGHIỆP VỤ (BRD) - NÂNG CẤP DX-BA HUB PHASE 2

**Dự án:** DX-BA Hub (Hệ thống Quản lý Khảo sát & Phân tích Nghiệp vụ nội bộ)
**Tác giả (BA):** Giang
**Người phê duyệt (PM/CTO):** Phú
**Ngày lập:** 26/06/2026
**Trạng thái:** Đã chốt Scope & Chờ Dev (Ready for Development)

---

## 1. MỤC TIÊU NÂNG CẤP

Dựa trên kết quả phân tích Gap Analysis và đánh giá hiệu quả/nỗ lực (Effort vs. Impact) với ban giám đốc (CTO/PM), phiên bản Phase 2 của DX-BA Hub được nâng cấp nhằm đạt 3 mục tiêu cốt lõi:

1. **Trực quan hóa:** Giúp Stakeholders dễ dàng đọc hiểu luồng nghiệp vụ thông qua hình ảnh (Diagram) thay vì bảng biểu thuần chữ.
2. **Quản trị rủi ro (Scope Management):** Siết chặt việc thay đổi yêu cầu (Change Request - CR) thông qua cơ chế lưu vết lịch sử (Versioning).
3. **Tăng tốc độ làm việc (Productivity):** Hỗ trợ BA và Dev làm việc nhanh hơn với tính năng AI Draft và Export tài liệu ký duyệt tự động.

---

## 2. PHẠM VI DỰ ÁN (SCOPE)

Dự án nâng cấp sẽ được chia làm 2 Sprints chính, bao gồm các Epic sau:

- **Sprint 1:**
  - `Epic 1`: Trực quan hóa quy trình bằng Mermaid.js.
  - `Epic 2`: Quản lý Change Request (CR) và Versioning trong Product Backlog.
- **Sprint 2:**
  - `Epic 3`: Tính năng xuất báo cáo (Export to PDF).
  - `Epic 4`: AI-Assisted Auto-Drafting (Thử nghiệm).
- **Out of Scope (Đã loại khỏi Phase này):**
  - Quản lý Data Dictionary / Business Rules độc lập (Sẽ đánh giá lại ở Phase 3).

---

## 3. YÊU CẦU NGHIỆP VỤ CHI TIẾT (BUSINESS REQUIREMENTS)

### EPIC 1: Trực quan hóa quy trình (Mermaid Diagram)

*Tính năng này giúp tự động chuyển đổi các bước khảo sát bằng chữ thành sơ đồ khối (Flowchart).*

**[REQ-1.1] Chuyển đổi dữ liệu thành Flowchart**

- **Mô tả:** Tại `Step1Tab` và `AnalysisTab`, hệ thống bổ sung thêm một nút bật/tắt (Toggle) "View as Diagram".
- **Logic:** Khi bật, hệ thống tự động đọc mảng `process_steps` (bao gồm *Tên bước*, *Công cụ*) và sinh ra sơ đồ Mermaid (dạng biểu đồ quy trình từ trên xuống - Top-down).
- **Acceptance Criteria:**
  - Biểu đồ phải render mượt mà, không bị tràn viền (overflow).
  - Các bước thực hiện được thể hiện thành các node khối vuông/chữ nhật.
  - Có nhãn (label) trên các đường nối hoặc bên trong node để thể hiện "Công cụ" sử dụng.

### EPIC 2: Quản lý Change Request (CR) & Versioning

*Tính năng này giúp PM và BA track lại lịch sử thay đổi của một User Story sau khi đã chốt.*

**[REQ-2.1] Khóa (Lock) và Mở khóa (Unlock) User Story**

- **Mô tả:** Bổ sung cơ chế Version (Mặc định khi tạo mới là `v1.0`). Khi PM bấm nút "Chốt yêu cầu (Lock)", User Story sẽ chuyển sang trạng thái không thể sửa đổi trực tiếp.
- **Logic:** Để sửa đổi một User Story đã Lock, người dùng phải bấm "Unlock". Hệ thống sẽ hiển thị một Pop-up yêu cầu nhập thông tin CR.

**[REQ-2.2] Form lưu vết thay đổi (Change Request Modal)**

- **Mô tả:** Pop-up Unlock sẽ bắt buộc nhập các trường:
  1. Lý do thay đổi (CR Reason)?
  2. Mức độ ảnh hưởng (Impact Analysis)?
- **Logic:** Khi bấm "Xác nhận", hệ thống sẽ:
  - Sao chép toàn bộ nội dung của phiên bản cũ (User Story, Acceptance Criteria) lưu vào bảng `BacklogHistory`.
  - Tăng version của User Story hiện tại lên (vd: `v1.1`).
  - Mở khóa các field để BA/PM có thể edit.
- **Acceptance Criteria:**
  - Trong Backlog Tab, phải có một nút "Xem lịch sử thay đổi", bấm vào sẽ hiện ra danh sách các version cũ kèm lý do sửa.

### EPIC 3: Xuất báo cáo ký duyệt (Export to PDF)

*Tính năng phục vụ việc ký tá truyền thống với đối tác.*

**[REQ-3.1] In ấn toàn bộ dự án**

- **Mô tả:** Thêm nút "Xuất báo cáo PDF (BRD)" ở giao diện Dashboard hoặc chi tiết Dự án.
- **Logic:** Hệ thống sẽ gom các dữ liệu theo thứ tự:
  1. Thông tin chung Dự án.
  2. Danh sách quy trình As-Is (Bước 1).
  3. Bảng phân tích 5W1H.
  4. Danh sách Product Backlog.
- **Acceptance Criteria:**
  - Layout khi xuất ra PDF phải được căn chỉnh lề gọn gàng (A4), không bị cắt mất chữ.
  - Có header/footer, đánh số trang để đóng thành tập tài liệu trình ký.

### EPIC 4: Trợ lý AI hỗ trợ phân tích (Tính năng thử nghiệm)

*Tính năng dùng AI đọc dữ liệu thô và viết nháp requirements.*

**[REQ-4.1] Nút "AI Draft" tại tab 5W1H**

- **Mô tả:** Khi BA tạo một phân tích 5W1H mới và check chọn các dữ liệu nguồn (từ Bước 1, 2, 3), sẽ có nút "🪄 Nhờ AI viết nháp".
- **Logic:**
  - Hệ thống gửi mảng text đã chọn qua API OpenAI/Gemini cùng prompt định sẵn: *"Hãy đóng vai BA, phân tích các dữ liệu khảo sát sau và điền vào form What, Who, Where, When, Why, How/Edge Cases..."*
  - Kết quả trả về sẽ tự động điền vào các text box tương ứng trên màn hình.
- **Acceptance Criteria:**
  - Có loading state rõ ràng khi gọi API.
  - BA BẮT BUỘC phải tự edit và review lại chữ trên textbox, AI chỉ làm nhiệm vụ điền chữ (Auto-fill) thay cho thao tác gõ.

---

## 5. UI / UX CONCEPT & MOCKUP

*(Ghi chú cho Team UI/UX)*

- **Màu sắc Alert:** Sử dụng màu Vàng/Cam (Amber/Orange) để làm nổi bật các luồng "Khóa/Unlock" và "Lịch sử CR".
- **Biểu đồ Mermaid:** Sử dụng Theme mặc định hoặc Theme theo tông màu xám/xanh biển của Dashboard.
- **Nút AI:** Thiết kế dạng Gradient hoặc có icon lấp lánh (Sparkle) để phân biệt rõ đây là tính năng sinh tự động.

---
**TÀI LIỆU NÀY ĐÃ ĐƯỢC CHUYỂN QUA GIAI ĐOẠN DEV.**
*Các Developer (Cường, Bảo) vui lòng bám sát tài liệu này để triển khai (Sprint 1 bắt đầu bằng việc thiết kế cấu trúc Database cho Lịch sử Backlog).*
