# 3D Mini Games

React, Three.js, Electron 기반의 데스크톱 3D 미니게임 모음입니다. 홈 화면에서 게임을 선택하고 조작법을 확인한 뒤 플레이할 수 있으며, 각 게임의 로컬 기록과 사운드 설정은 앱 안에서 관리됩니다.

## 프로젝트 소개

이 프로젝트는 웹 기술로 제작한 3D 미니게임을 Electron 데스크톱 앱으로 패키징하는 것을 목표로 합니다. Vite 기반 React 앱을 렌더러로 사용하고, Electron 메인 프로세스에서 창 생성, 앱 메뉴 제거, 로컬 기록 저장 IPC를 처리합니다.

현재 포함된 게임은 다음과 같습니다.

- `장애물 달리기`: 좌우 이동으로 3D 장애물을 피하며 오래 버티는 러닝 게임입니다. 장애물 모양에 맞춘 충돌 판정을 사용합니다.
- `종이비행기 협곡`: 마우스로 종이비행기를 조종하며 랜덤하게 형성되는 협곡을 통과하는 비행 게임입니다. 속도 아이템과 보호막 아이템이 존재합니다.

## 주요 기능

- 홈 화면에서 미니게임 선택
- 게임 시작 전 조작법 모달 제공
- 조작법 모달 하루 동안 보지 않기 기능
- 게임 시작 전 `3, 2, 1, Start!` 카운트다운
- 게임 중 톱니바퀴 메뉴를 통한 재시작 및 홈 이동
- 사운드 토글과 설정 유지
- Web Audio API 기반 배경음악 및 효과음
- Electron Store 기반 로컬 TOP 5 기록 저장
- 게임 오버 모달과 홈 화면에서 로컬 기록 표시
- Windows 설치 파일 및 macOS 패키지 빌드
- Windows 설치본 실행파일 아이콘 적용

## 사용 기술

- `React`: 홈 화면, 게임 UI, 모달, 기록 표시 등 렌더러 UI 구성
- `TypeScript`: 게임 상태, Electron IPC, 점수 기록 타입 관리
- `Vite`: 빠른 개발 서버와 프론트엔드 번들링
- `Three.js`: 3D 캐릭터, 장애물, 협곡, 종이비행기 렌더링
- `Electron`: 데스크톱 앱 실행 환경, 창 제어, preload IPC 브릿지
- `Electron Store`: 로컬 최고 기록 및 랭킹 데이터 저장
- `Electron Builder`: Windows `.exe` 설치파일과 macOS `.dmg`, `.zip` 패키징
- `Web Audio API`: 배경음악, 아이템 획득음, 충돌음, 보호막 파괴음 생성
- `ESLint`: 코드 품질 검사

## 프로젝트 구조

```text
electron/
  main.js          Electron 메인 프로세스
  preload.js       렌더러에 안전하게 노출되는 Electron API

src/
  assets/          게임 캡처 이미지와 앱 아이콘
  hooks/           카운트다운, 사운드, 기록 관리 훅
  pages/
    HomePage.tsx   게임 선택 홈 화면
    basic-run/     장애물 달리기 게임
    airplane/      종이비행기 협곡 게임
  types/           Electron API 및 에셋 타입 선언

scripts/
  patch-win-icon.mjs Windows 실행파일 아이콘 리소스 패치
```

## 실행 방법

의존성 설치:

```bash
npm install
```

웹 개발 서버 실행:

```bash
npm run dev
```

Electron 개발 실행:

```bash
npm run dev:electron
```

프로덕션 빌드:

```bash
npm run build
```

빌드 결과를 Electron으로 실행:

```bash
npm run start:electron
```

## 패키징

Windows 설치파일 생성:

```bash
npm run build:exe
```

빌드 결과는 `release/` 폴더에 생성됩니다. Windows 빌드는 `win-unpacked` 실행파일에 아이콘을 직접 패치한 뒤 NSIS 설치파일을 생성합니다.

macOS 패키지 생성:

```bash
npm run build:mac
```

macOS 빌드는 `.dmg`와 `.zip` 형식으로 생성됩니다.

## GitHub 배포

이 저장소는 GitHub Actions를 통해 Windows 설치파일을 Release asset으로 배포할 수 있습니다.

- `.github/workflows/release.yml`: Windows 설치파일을 빌드하고 GitHub Release에 `3D-Mini-Games-Setup.exe`로 업로드합니다.
- `.github/workflows/pages.yml`: `docs/` 폴더를 `gh-pages` 브랜치로 배포합니다.
- `docs/index.html`: 최신 Release의 Windows 설치파일을 다운로드하는 랜딩 페이지입니다.

Release 워크플로는 Git tag가 `v*` 형식으로 푸시될 때 자동 실행됩니다.

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 화면에서 `Build Windows Installer Release` 워크플로를 수동 실행할 수도 있습니다. 수동 실행 시에는 `build-<run number>` 형식의 Release가 생성되고 최신 Release로 표시됩니다.

GitHub Pages는 저장소 설정에서 한 번만 활성화하면 됩니다.

1. GitHub 저장소의 `Settings > Pages`로 이동합니다.
2. `Build and deployment`의 Source를 `Deploy from a branch`로 선택합니다.
3. Branch를 `gh-pages`, 폴더를 `/ (root)`로 선택합니다.
4. 저장하면 `docs/index.html`이 다운로드 페이지로 배포됩니다.

GitHub Pages 주소에서는 다음 최신 Release asset을 다운로드합니다.

```text
https://github.com/<owner>/<repo>/releases/latest/download/3D-Mini-Games-Setup.exe
```

## 로컬 데이터

각 게임의 기록은 Electron 환경에서는 `electron-store`에 저장됩니다. 브라우저 환경이나 Electron API를 사용할 수 없는 경우에는 `localStorage`를 fallback 저장소로 사용합니다.

Windows 설치 설정에는 `deleteAppDataOnUninstall`이 적용되어 있어 앱 제거 시 로컬 앱 데이터도 삭제되도록 구성되어 있습니다.

## 아이콘

앱 아이콘 원본은 `src/assets/icon/icon.png`입니다. Windows 실행파일 아이콘에는 `src/assets/icon/icon.ico`를 사용하며, `scripts/patch-win-icon.mjs`가 빌드된 실행파일에 아이콘 리소스를 직접 주입합니다.
