[🇺🇸 English](README.en.md)

# GlassExplorer

![version](https://img.shields.io/badge/version-0.4.6-blue)
![platform](https://img.shields.io/badge/platform-Windows-0078D4)
![tauri](https://img.shields.io/badge/Tauri-2-FFC131)
![react](https://img.shields.io/badge/React-19-61DAFB)
![license](https://img.shields.io/badge/license-MIT-green)

Windows용 **글래스모피즘 폴더 즐겨찾기 런처**.
반투명 Always-on-Top 위젯에서 자주 쓰는 폴더를 등록하고, 더블클릭으로 Explorer에서 바로 열 수 있습니다.

<!--
  TODO: 스크린샷 추가
  1. 앱 실행 상태에서 스크린샷 캡처
  2. 이미지 파일을 assets/ 폴더에 저장 (예: assets/screenshot.png)
  3. 아래 주석을 해제하고 경로 수정

  ![GlassExplorer 스크린샷](assets/screenshot.png)
-->

---

## 주요 기능

- **즐겨찾기 폴더 관리** — 추가 / 제거 / 이름 편집 / 드래그 정렬, JSON 자동 저장
- **폴더 열기** — 더블클릭 또는 우클릭 메뉴. **New Tab** (COM API) / **New Window** 모드 선택 가능
- **드래그 앤 드롭** — 탐색기에서 폴더를 위젯으로 끌어다 놓기
- **검색 / 필터** — `Ctrl+F`로 폴더 이름·경로 실시간 검색
- **경로 유효성 검사** — 삭제/이동된 폴더 자동 감지 및 시각적 경고
- **글래스모피즘 UI** — 네이티브 Win32 Acrylic Blur + CSS 반투명 다층 효과
- **Glass 실시간 조절** — Blur / Opacity / Refraction 슬라이더
- **Ghost 모드 (3상태 토글)** — `off → normal → invert → off`. normal은 배경 완전 제거, invert는 추가로 흑백 팔레트 오버라이드 (흰 벽지에서 가독성 확보)
- **항상 위 (Always-on-Top)** — Pin 버튼으로 토글
- **자동 시작** — Windows 시작 시 자동 실행 (레지스트리 등록/해제)
- **시스템 트레이** — Show / Hide / Quit, 더블클릭 복원
- **커스텀 타이틀바** — 프레임 없는 창, 드래그 이동 / 최소화 / 닫기

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19 + TypeScript 5.9 |
| Styling | Tailwind CSS 4.2 + Custom Glassmorphism CSS |
| Bundler | Vite 8 |
| Desktop | Tauri 2 |
| Backend | Rust (2021 edition) |
| Native Glass | window-vibrancy 0.6 |
| Win32 API | windows crate 0.58 |

---

## 요구 사항

- **Windows 10 1803+** (DWM Acrylic Blur 지원 필요)
- **Windows 11 22H2+** Explorer 탭 기능 사용 시 (미만 버전은 자동으로 새 창 열기로 폴백)
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 툴체인
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

---

## 시작하기

### 의존성 설치
```bash
npm install
```

### 개발 모드 실행
```bash
npm run tauri:dev
```

### 프로덕션 빌드
```bash
npm run tauri:build
```

빌드 결과물 경로: `src-tauri/target/release/bundle/`
- `msi/` — Windows Installer (.msi)
- `nsis/` — NSIS 설치 파일 (.exe)

---

## 다운로드

빌드된 설치 파일은 [Releases](../../releases) 페이지에서 받을 수 있습니다.

---

## 데이터 저장 경로

즐겨찾기 목록은 아래 경로에 JSON으로 저장됩니다:
```
%AppData%\glass-explorer\favorites.json
```

---

## 프로젝트 구조
```
├── src/                    # React 프론트엔드
│   ├── components/         # UI 컴포넌트
│   │   ├── ControlPanel    # Glass 슬라이더 + Pin/Ghost/Add 버튼
│   │   ├── DropZone        # 빈 상태 드롭존 + Browse 버튼
│   │   ├── FolderItem      # 폴더 행 (열기, 이름편집, 제거, 컨텍스트 메뉴)
│   │   ├── FolderList      # 폴더 목록 + 컨텍스트 메뉴 렌더링
│   │   ├── SearchBar       # 검색 입력 (150ms 디바운스, Ctrl+F)
│   │   └── TitleBar        # 커스텀 타이틀바 (드래그, 최소화, 닫기)
│   ├── lib/tauri.ts        # 타입 안전 IPC 래퍼
│   ├── App.tsx             # 루트 컴포넌트
│   └── types.ts            # TypeScript 타입 정의
├── src-tauri/              # Rust 백엔드
│   ├── src/
│   │   ├── autostart.rs    # Windows 레지스트리 자동 시작
│   │   ├── error.rs        # 에러 타입
│   │   ├── favorites.rs    # CRUD + JSON 영속화
│   │   ├── folder_open.rs  # COM 기반 Explorer 탭 / 새 창 열기
│   │   └── main.rs         # Tauri 커맨드, 트레이, Glass 효과
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

---

## 라이선스

MIT
