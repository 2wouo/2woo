# 제품 요구사항 정의서 (PRD) - 월간 고정비 관리자 (Monthly Expenses)

## 1. 프로젝트 개요

### 1.1 배경 및 목적
매달 반복되는 고정 지출(월세, 구독료)과 변동 지출(공과금)을 효율적으로 관리하기 위한 개인용 웹 서비스입니다. 복잡한 가계부 기능은 배제하고, "이번 달에 얼마가 나가야 하는가?"에 집중하여 직관적인 현황 파악을 돕습니다.

### 1.2 목표
- **단순함:** 불필요한 입력을 최소화하고, 고정비는 자동 반영합니다.
- **직관성:** 달력과 통계를 통해 지출 흐름을 한눈에 파악합니다.
- **개인화:** 로컬 환경에서 실행되는 가벼운 웹 앱으로, 데이터 주권을 사용자에게 둡니다.
- **심미성:** 블랙 & 블루 톤의 세련된 포트폴리오 스타일 UI를 제공합니다.

---

## 2. 핵심 기능 및 정책

### 2.1 고정비 항목 관리 (Rules)
지출의 '규칙'을 정의하는 기능입니다.

- **입력 정보:**
    - 항목명 (예: 넷플릭스)
    - 카테고리 (주거, 구독, 공과금, 금융, 기타)
    - 금액 유형 (고정/변동)
    - 기본 금액 (고정형 필수, 변동형 선택)
    - 결제일 (1~31일) *말일 처리 로직 포함 (예: 31일 설정 시, 2월은 28일로 자동 보정)*
    - 기간 설정 (시작 월 ~ 종료 월)
- **상태 관리:** 활성 / 비활성 (일시 정지)

### 2.2 지출 내역 생성 로직 (Instance Generation) **[핵심 로직]**
규칙(Rules)을 기반으로 실제 월별 지출 내역(Instance)을 생성합니다.

1.  **자동 생성:** 사용자가 해당 월의 페이지에 처음 접속할 때, 활성화된 규칙을 기반으로 내역을 자동 생성합니다.
2.  **스냅샷 분리:** 생성된 내역은 규칙과 연결이 끊어진 독립된 데이터로 취급합니다. (규칙을 수정해도 이미 생성된 과거 내역은 변하지 않음)

### 2.3 삭제 및 중단 정책 (Deletion Logic)
사용자가 항목 삭제 시, 의도를 명확히 구분하여 처리합니다.

| 삭제 옵션 | 동작 방식 | 기술적 처리 |
| :--- | :--- | :--- |
| **이번 달만 삭제** (This Month Only) | 해당 월의 내역(Instance)만 제거하고 규칙은 유지 | 해당 월 `Transaction` 레코드 삭제 |
| **이번 달부터 삭제** (From Now On) | 이번 달 내역 제거 + 규칙의 '종료 월'을 지난달로 설정 | 해당 월 `Transaction` 삭제 + `Rule.endMonth` 업데이트 |
| **완전 삭제** (Delete All) | 모든 기록에서 제거 (숨김 옵션) | `Rule` 및 연결된 모든 `Transaction` 삭제 |

> **안전 장치:** 삭제 직후 5초간 '실행 취소(Undo)' 토스트 팝업 제공

### 2.4 변동 금액 관리
- **상태값:** `미입력(Pending)` / `입력 완료(Done)`
- **UX:**
    - 월이 바뀌면 변동비 항목은 `미입력` 상태로 생성됩니다.
    - 대시보드 최상단에 `미입력` 항목을 우선 노출하여 입력을 유도합니다.
    - 금액 입력 시 '전월 금액 불러오기' 버튼을 제공합니다.

### 2.5 데이터 관리 (Local & Security)
- **저장소:** 브라우저 내장 DB인 **IndexedDB**를 사용합니다. (LocalStorage보다 용량 제한이 적고 쿼리가 용이함)
- **백업/복구:** 전체 데이터를 JSON 파일로 내보내거나 불러올 수 있는 기능을 설정 메뉴에서 제공합니다.

---

## 3. UI/UX 디자인 가이드

### 3.1 컬러 팔레트 (Color Palette)
- **Background:** `Done Black` (#000000) - 완전한 검정 또는 아주 깊은 회색
- **Surface:** `Dark Gray` (#121212) - 카드, 모달 배경
- **Primary:** `Electric Blue` (#2563EB or #3B82F6) - 강조, 버튼, 활성 상태
- **Text Primary:** `White` (#FFFFFF)
- **Text Secondary:** `Gray` (#9CA3AF) - 보조 설명, 비활성 아이콘
- **Warning/Error:** 최소화 사용, 필요 시 톤다운된 Red 사용

### 3.2 레이아웃 구조
1.  **헤더 (Header):** 현재 월 이동 (< 2026.01 >), 설정 버튼
2.  **요약 카드 (Summary):** 이번 달 예상 지출 총액 (가장 크게 표시)
3.  **메인 컨텐츠 (Main):**
    - **탭 1: 리스트 (List)** - 미입력 항목 상단 노출, 일자별 정렬 목록
    - **탭 2: 달력 (Calendar)** - 월 달력, 일별 지출 점(Dot) 또는 합계 표시
    - **탭 3: 통계 (Stats)** - 도넛 차트(카테고리), 막대 차트(전월 비교)
4.  **플로팅 버튼 (FAB):** (+) 고정비 항목 추가

---

## 4. 기술 스택 및 데이터 구조 (Technical Spec)

### 4.1 Tech Stack
- **Framework:** Next.js (React) - App Router 방식
- **Language:** TypeScript
- **Styling:** Tailwind CSS (다크모드 최적화)
- **State Management:** Zustand (가벼운 전역 상태 관리)
- **Local Database:** Dexie.js (IndexedDB Wrapper) - *필수: 복잡한 날짜 쿼리 처리를 위해 사용*
- **Charts:** Recharts (통계 시각화)
- **Icons:** Lucide React

### 4.2 데이터 스키마 (Schema Design)

#### A. ExpenseRule (지출 규칙)
*반복되는 지출의 정의*
```typescript
interface ExpenseRule {
  id: string;             // UUID
  title: string;          // 항목명
  category: 'HOUSING' | 'SUBSCRIPTION' | 'UTILITY' | 'FINANCE' | 'ETC';
  type: 'FIXED' | 'VARIABLE';
  amount: number;         // 기본 금액 (변동비일 경우 0 또는 예상금액)
  payDay: number;         // 1~31
  startDate: string;      // YYYY-MM
  endDate: string | null; // YYYY-MM (null이면 계속 반복)
  isActive: boolean;      // 일시 정지 여부
  createdAt: number;
}
```

#### B. Transaction (지출 내역)
*실제 월별로 생성된 지출 인스턴스 (스냅샷)*
```typescript
interface Transaction {
  id: string;             // UUID
  ruleId: string;         // 부모 규칙 ID (참조용)
  date: string;           // YYYY-MM-DD (실제 지출일)
  title: string;          // 스냅샷 된 제목
  category: string;       // 스냅샷 된 카테고리
  type: 'FIXED' | 'VARIABLE';
  amount: number;         // 실제 확정 금액
  status: 'PENDING' | 'DONE'; // 변동비 입력 여부 (고정비는 생성 즉시 DONE)
  memo?: string;          // 해당 월 메모
}
```

---

## 5. 개발 마일스톤

### Phase 1: MVP (핵심 기능)
- 프로젝트 세팅 (Next.js + Tailwind)
- DB 설계 및 Dexie.js 연동
- 규칙(Rule) 등록/수정/삭제 구현
- 월 진입 시 트랜잭션 자동 생성 로직 구현
- 메인 리스트 뷰 & 변동비 입력 기능

### Phase 2: 시각화 및 고도화
- 달력 뷰 (Calendar View) 구현
- 삭제 정책 (이번 달만/앞으로) 팝업 UI 구현
- 통계 대시보드 구현

### Phase 3: 데이터 관리 및 배포
- JSON 내보내기/가져오기
- 반응형 모바일 최적화
- 최종 버그 수정 및 배포 (Vercel 등)
