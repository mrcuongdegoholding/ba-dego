// Bộ tiêu chí đánh giá chất lượng yêu cầu - DX-BA Hub
// 13 nhóm tiêu chí từ "Bộ tiêu chí đánh giá yêu cầu nâng cao (Phần 2)"

export interface CriterionItem {
  key: string;
  label: string;
  hint?: string;
}

export interface CriterionGroup {
  group: string;
  title: string;
  badgeColor: string; // tailwind border+bg+text classes
  items: CriterionItem[];
}

// ─── KHẢO SÁT BƯỚC 1: Mô tả quy trình ────────────────────────────────────────
export const STEP1_CRITERIA: CriterionGroup[] = [
  {
    group: 'completeness',
    title: '1. Tính đầy đủ thông tin',
    badgeColor: 'border-blue-300 bg-blue-50 text-blue-700',
    items: [
      { key: 'process_name_specific', label: 'Tên quy trình cụ thể (không mơ hồ: "Lập bảng so sánh báo giá NCC", không phải "Mua hàng")' },
      { key: 'has_department', label: 'Đã xác định bộ phận/phòng ban thực hiện' },
      { key: 'has_role', label: 'Đã xác định đúng vai trò người thực hiện' },
      { key: 'has_frequency', label: 'Đã ghi rõ tần suất thực hiện (Hàng ngày/Tuần/Tháng/Theo phát sinh)' },
      { key: 'has_tools', label: 'Đã liệt kê ≥1 công cụ/phần mềm đang sử dụng' },
      { key: 'has_steps_3plus', label: 'Đã mô tả ≥3 bước quy trình có thứ tự rõ ràng' },
      { key: 'steps_have_duration', label: 'Các bước có ghi thời gian thực hiện ước tính' },
      { key: 'has_input_docs', label: 'Đã liệt kê đầy đủ tài liệu/dữ liệu đầu vào (Input)' },
      { key: 'has_output_docs', label: 'Đã liệt kê đầy đủ kết quả/tài liệu đầu ra (Output)' },
      { key: 'has_pain_points', label: 'Đã ghi ≥1 điểm đau (pain point) cụ thể' },
    ],
  },
  {
    group: 'data_validation',
    title: '8. Ràng buộc Dữ liệu & Nhập liệu',
    badgeColor: 'border-orange-300 bg-orange-50 text-orange-700',
    items: [
      { key: 'field_max_length', label: 'Đã quy định giới hạn độ dài (Max/Min length) cho trường Text (VD: Mã số thuế: 10-13 số)' },
      { key: 'default_values', label: 'Đã định nghĩa giá trị mặc định (Default) cho các trường chưa điền' },
      { key: 'date_currency_format', label: 'Đã có quy tắc định dạng Ngày (DD/MM/YYYY) và Tiền tệ (VND, phân cách hàng nghìn)' },
      { key: 'forbidden_chars', label: 'Đã liệt kê các ký tự đặc biệt bị cấm nhập vào hệ thống' },
      { key: 'dropdown_lov', label: 'Các Dropdown/Combo-box đã có danh sách giá trị (List of Values) cụ thể. Có Multi-select không?' },
    ],
  },
];

// ─── KHẢO SÁT BƯỚC 2: Phỏng vấn Q&A ──────────────────────────────────────────
export const STEP2_CRITERIA: CriterionGroup[] = [
  {
    group: 'qa_quality',
    title: '2. Chất lượng Phỏng vấn Q&A',
    badgeColor: 'border-green-300 bg-green-50 text-green-700',
    items: [
      { key: 'has_all_4_categories', label: 'Có câu hỏi thuộc đủ 4 loại: Normal, Edge Case, Exception, Approval Flow' },
      { key: 'has_pain_point_qa', label: 'Đã đánh dấu ≥1 câu hỏi là Pain Point trong phỏng vấn' },
      { key: 'has_edge_cases', label: 'Đã hỏi về các trường hợp ngoại lệ (VD: "Nếu chỉ có 1 NCC thì sao?")' },
      { key: 'has_approval_flow', label: 'Đã hỏi về quy trình phê duyệt/chữ ký (ai duyệt, điều kiện duyệt)' },
      { key: 'answers_specific', label: 'Câu trả lời cụ thể, không có câu "Không biết/Để xem lại" chưa resolved' },
      { key: 'has_follow_up', label: 'Các điểm quan trọng đã có ghi chú Follow-up để hỏi thêm' },
    ],
  },
  {
    group: 'ux_ui',
    title: '9. Trải nghiệm Người dùng & Giao diện (UI/UX)',
    badgeColor: 'border-purple-300 bg-purple-50 text-purple-700',
    items: [
      { key: 'enter_tab_behavior', label: 'Đã quy định hành vi phím Enter và Tab trên Form nhập liệu' },
      { key: 'confirmation_dialog', label: 'Có thông báo xác nhận (Confirmation) trước hành động nguy hiểm (Xóa, Hủy, Freeze)' },
      { key: 'loading_states', label: 'Trạng thái Loading/Progress đã được định nghĩa cho thao tác tốn thời gian' },
      { key: 'error_messages_clear', label: 'Thông báo lỗi rõ ràng, chỉ đích danh lỗi và hướng khắc phục (không chỉ "Lỗi hệ thống")' },
      { key: 'form_wizard', label: 'Form nhập liệu dài đã được chia Tabs hoặc Steps (Wizard)' },
    ],
  },
];

// ─── KHẢO SÁT BƯỚC 3: Quan sát thực tế ───────────────────────────────────────
export const STEP3_CRITERIA: CriterionGroup[] = [
  {
    group: 'observation_quality',
    title: '3. Chất lượng Quan sát Shadowing',
    badgeColor: 'border-teal-300 bg-teal-50 text-teal-700',
    items: [
      { key: 'has_time_measured', label: 'Đã đo thời gian thực tế từng thao tác (không phỏng đoán)' },
      { key: 'all_action_types_covered', label: 'Đã phân loại hành động: Dư thừa / Ẩn / Thủ công / Vòng vèo / Giao tiếp' },
      { key: 'has_hidden_requirements', label: 'Đã phát hiện ≥1 yêu cầu ẩn (hidden requirement) chưa được nói' },
      { key: 'automation_assessed', label: 'Đã đánh giá tiềm năng tự động hóa (Cao/Trung/Thấp) cho từng hành động' },
      { key: 'total_waste_calculated', label: 'Đã tính tổng thời gian lãng phí (phút/tuần) của quy trình' },
    ],
  },
  {
    group: 'edge_cases',
    title: '10. Ngoại lệ Hệ thống (Edge Cases)',
    badgeColor: 'border-red-300 bg-red-50 text-red-700',
    items: [
      { key: 'concurrency_control', label: '2 người cùng sửa 1 bản ghi cùng lúc → hệ thống xử lý thế nào? (Concurrency control)' },
      { key: 'offline_autosave', label: 'Rớt mạng khi đang điền Form → dữ liệu có được Auto-save nháp không?' },
      { key: 'double_click_spam', label: 'User click đúp liên tục nút "Gửi/Lưu" → có cơ chế chặn spam click không?' },
      { key: 'file_size_limit', label: 'Upload file Excel/Ảnh vượt dung lượng → hệ thống hiển thị thông báo gì?' },
      { key: 'large_export', label: 'Export báo cáo >100,000 dòng gây đơ máy chủ → giải pháp xử lý là gì?' },
    ],
  },
];

// ─── PHÂN TÍCH 5W1H ────────────────────────────────────────────────────────────
export const ANALYSIS_CRITERIA: CriterionGroup[] = [
  {
    group: 'analysis_quality',
    title: '4. Chất lượng Phân tích 5W1H',
    badgeColor: 'border-indigo-300 bg-indigo-50 text-indigo-700',
    items: [
      { key: 'all_5w1h_filled', label: 'Tất cả 6 trường 5W1H đã được điền đầy đủ (What/Who/Where/When/Why/How)' },
      { key: 'how_has_edge_cases', label: 'Trường How+EdgeCases mô tả ≥2 trường hợp ngoại lệ cụ thể' },
      { key: 'has_source_links', label: 'Đã link nguồn từ ≥1 bước khảo sát (Step1/Step2/Step3) để đảm bảo Traceability' },
      { key: 'business_flow_unique', label: 'Tên Business Flow rõ ràng, không trùng lặp với flow khác trong dự án' },
      { key: 'who_specific', label: 'Trường Who: ghi cụ thể vai trò (không chỉ "User" hay "Nhân viên" chung chung)' },
      { key: 'why_quantified', label: 'Trường Why: có số liệu định lượng (VD: "giảm 30 phút/tuần", "lỗi giảm 80%")' },
    ],
  },
  {
    group: 'security_audit',
    title: '11. Phân quyền & Bảo mật (Security & Audit)',
    badgeColor: 'border-amber-300 bg-amber-50 text-amber-700',
    items: [
      { key: 'permission_matrix', label: 'Đã định nghĩa Ma trận phân quyền CRUD (Create/Read/Update/Delete) chi tiết cho từng Role' },
      { key: 'audit_log', label: 'Đã yêu cầu ghi Audit Log (Ai sửa, khi nào, giá trị cũ/mới) cho chức năng nhạy cảm (VD: sửa Báo giá)' },
      { key: 'session_timeout', label: 'Đã có cơ chế Timeout (tự đăng xuất sau X phút không thao tác)' },
      { key: 'data_masking', label: 'Đã xác định dữ liệu nào cần ẩn/che (Masking) với người không có thẩm quyền' },
    ],
  },
];

// ─── PRODUCT BACKLOG (User Stories) ──────────────────────────────────────────
export const BACKLOG_CRITERIA: CriterionGroup[] = [
  {
    group: 'user_story_quality',
    title: '5. Chất lượng User Story',
    badgeColor: 'border-blue-300 bg-blue-50 text-blue-700',
    items: [
      { key: 'as_a_role_format', label: 'User Story đúng format: "Là [Vai trò], tôi muốn [Hành động], để [Lợi ích/Mục đích]"' },
      { key: 'ac_3plus', label: 'Có ≥3 tiêu chí chấp nhận (Acceptance Criteria) cụ thể' },
      { key: 'ac_testable', label: 'Tất cả AC có thể kiểm tra được (tránh mơ hồ: "nhanh hơn", "gọn hơn", "đẹp hơn")' },
      { key: 'linked_to_analysis', label: 'Đã link với ≥1 dòng Phân tích 5W1H tương ứng (Traceability)' },
      { key: 'priority_set', label: 'Đã gán mức độ ưu tiên (P0-Core / P1-High / P2-NiceToHave) rõ ràng' },
    ],
  },
  {
    group: 'data_validation',
    title: '8. Ràng buộc Dữ liệu & Nhập liệu',
    badgeColor: 'border-orange-300 bg-orange-50 text-orange-700',
    items: [
      { key: 'field_max_length', label: 'Đã quy định giới hạn độ dài (Max/Min length) cho trường Text (VD: MST 10-13 số)' },
      { key: 'default_values', label: 'Đã định nghĩa giá trị mặc định (Default) cho các trường chưa điền' },
      { key: 'date_currency_format', label: 'Đã có quy tắc định dạng Ngày (DD/MM/YYYY) và Tiền tệ (VND, phân cách hàng nghìn)' },
      { key: 'forbidden_chars', label: 'Đã liệt kê ký tự đặc biệt bị cấm nhập vào hệ thống' },
      { key: 'dropdown_lov', label: 'Các Dropdown/Combo-box đã có List of Values cụ thể. Ghi rõ có Multi-select không?' },
    ],
  },
  {
    group: 'ux_ui',
    title: '9. Trải nghiệm Người dùng & Giao diện (UI/UX)',
    badgeColor: 'border-purple-300 bg-purple-50 text-purple-700',
    items: [
      { key: 'enter_tab_behavior', label: 'Đã quy định hành vi phím Enter và Tab trên Form nhập liệu' },
      { key: 'confirmation_dialog', label: 'Có Confirmation box trước hành động nguy hiểm (Xóa, Hủy, Freeze)' },
      { key: 'loading_states', label: 'Trạng thái Loading/Processing đã được định nghĩa cho thao tác tốn thời gian' },
      { key: 'error_messages_clear', label: 'Thông báo lỗi rõ ràng, chỉ đích danh lỗi và cách khắc phục (không phải "Error 500")' },
      { key: 'form_wizard', label: 'Form dài đã được chia thành Tabs hoặc Steps (Wizard) dễ điền' },
    ],
  },
  {
    group: 'edge_cases',
    title: '10. Ngoại lệ Hệ thống (Edge Cases)',
    badgeColor: 'border-red-300 bg-red-50 text-red-700',
    items: [
      { key: 'concurrency_control', label: '2 người cùng sửa 1 bản ghi cùng lúc → hệ thống xử lý thế nào? (Concurrency)' },
      { key: 'offline_autosave', label: 'Rớt mạng khi đang điền Form → dữ liệu có được Auto-save nháp không?' },
      { key: 'double_click_spam', label: 'User click đúp nút "Gửi thanh toán" liên tục → có cơ chế chặn spam click không?' },
      { key: 'file_size_limit', label: 'Upload file Excel/Ảnh vượt dung lượng → hệ thống thông báo gì?' },
      { key: 'large_export', label: 'Export >100,000 dòng gây đơ server → giải pháp xử lý (pagination/background job)?' },
    ],
  },
  {
    group: 'security_audit',
    title: '11. Phân quyền & Bảo mật (Security & Audit)',
    badgeColor: 'border-amber-300 bg-amber-50 text-amber-700',
    items: [
      { key: 'permission_matrix', label: 'Đã định nghĩa Ma trận phân quyền CRUD chi tiết đến từng trường, từng Role' },
      { key: 'audit_log', label: 'Ghi Audit Log: Ai sửa, lúc nào, giá trị cũ/mới cho chức năng nhạy cảm (VD: sửa Báo giá)' },
      { key: 'session_timeout', label: 'Có cơ chế Timeout (tự đăng xuất sau X phút không thao tác)' },
      { key: 'data_masking', label: 'Đã xác định dữ liệu nào cần ẩn/che (Masking) với người không có thẩm quyền' },
    ],
  },
  {
    group: 'integration',
    title: '12. Tương tác bên ngoài & API (Integration)',
    badgeColor: 'border-cyan-300 bg-cyan-50 text-cyan-700',
    items: [
      { key: 'api_data_mapping', label: 'Đã mô tả rõ API đẩy những trường nào (Data Mapping) sang hệ thống khác (Odoo, MISA, v.v.)' },
      { key: 'api_failure_handling', label: 'Nếu API bên thứ 3 bị chết/timeout → hệ thống hiển thị gì cho người dùng?' },
      { key: 'sync_frequency', label: 'Tần suất đồng bộ đã xác định chưa: Real-time hay Batch hàng đêm?' },
    ],
  },
  {
    group: 'tool_discipline',
    title: '13. Quản trị Kỷ luật trên Tool',
    badgeColor: 'border-slate-300 bg-slate-50 text-slate-700',
    items: [
      { key: 'traceability_link', label: 'User Story đã được link trực tiếp với đoạn khảo sát thô (Raw Survey) tương ứng' },
      { key: 'wireframe_attached', label: 'Đã đính kèm ảnh chụp bản nháp giao diện (Wireframe/Figma) vào Task' },
      { key: 'priority_labeled', label: 'Đã gán nhãn Mức độ ưu tiên (P0/P1/P2) để Dev biết code trước cái nào' },
      { key: 'story_points', label: 'Đã ước lượng thời gian thực hiện (Story Points/Estimated Hours) cho tính năng' },
      { key: 'locked_before_dev', label: 'Yêu cầu đã được "Locked/Freeze" trước khi Dev kéo sang cột "Doing"' },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
export type EntityType = 'step1' | 'step2' | 'step3' | 'analysis' | 'backlog';

export function getCriteriaForEntity(entityType: EntityType): CriterionGroup[] {
  switch (entityType) {
    case 'step1':    return STEP1_CRITERIA;
    case 'step2':    return STEP2_CRITERIA;
    case 'step3':    return STEP3_CRITERIA;
    case 'analysis': return ANALYSIS_CRITERIA;
    case 'backlog':  return BACKLOG_CRITERIA;
  }
}

export function getTotalItems(groups: CriterionGroup[]): number {
  return groups.reduce((sum, g) => sum + g.items.length, 0);
}
