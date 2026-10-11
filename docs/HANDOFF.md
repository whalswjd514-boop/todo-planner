# 인계 노트 (2026-10-11 기준)

내일 작업을 이어갈 때 가장 먼저 읽는 문서입니다. 현재 상태와 열린 문제, 다음 할 일만 적었습니다. 설치·실행 방법은 `README.md`를 보세요.

## 현재 상태

- 할 일 + 주간 계획 + 1년 목표 앱(Next.js 16 App Router, TypeScript, MongoDB/Mongoose, Tailwind, dnd-kit)이 동작합니다. 요구사항은 `docs/PRD.md`.
- GitHub OAuth 로그인(Auth.js v5 beta, JWT 세션)이 구현되어 있습니다. 모든 페이지는 로그인이 필요하고(`src/proxy.ts`), 모든 API는 401을 반환하며(`src/lib/api.ts`의 `handle()`), 데이터는 `github:<GitHub ID>`로 사용자별 분리됩니다.
- 검증: `npm test` 71개, `npm run lint`, `npm run build` 모두 통과. 보안 검토(리뷰어) 승인.
- 기존 `userId: "default"` 데이터는 DB에 남아 있지만 어느 계정에도 연결되지 않습니다(새로 시작하기로 결정).

## 열린 문제 (내일 가장 먼저)

**GitHub 로그인 버튼 → GitHub 오류 "The redirect_uri is not associated with this application"**

- 앱이 GitHub에 보내는 `redirect_uri`는 `http://localhost:3000/api/auth/callback/github`로 확인했습니다(`AUTH_URL=http://localhost:3000`으로 고정). 즉 코드 쪽은 맞고, GitHub OAuth App에 등록된 *Authorization callback URL*이 이 값과 다른 것으로 추정됩니다. 아직 해결되지 않았습니다.
- 사용 중인 앱의 Client ID: `Ov23lid8na47eIu4nGFM` (`.env.local`의 `AUTH_GITHUB_ID`).
- 확인할 것:
  1. GitHub 오류 화면의 **주소창 URL**에 `redirect_uri=...`가 들어 있습니다. 그 값을 그대로 복사해 앱 설정의 Callback URL과 글자 단위로 비교하세요(`http`/`https`, 끝의 `/`, 경로, 포트).
  2. Settings → Developer settings → OAuth Apps에서 **Client ID가 위 값인 앱**을 수정하고 있는지(앱이 여러 개일 수 있음).
  3. OAuth App은 콜백 URL을 **하나만** 등록할 수 있습니다.
  4. 브라우저에서 `http://localhost:3000`으로 접속하는지(`127.0.0.1`·IP 주소 아님).
- 로그인하지 않은 요청으로는 GitHub가 `redirect_uri`를 검증하지 않아 등록값을 서버에서 확인할 방법이 없었습니다.
- 설정이 비어 있으면 `/login`이 빠진 환경변수를 안내합니다(`src/lib/auth-config.ts`).

## 내일 할 일

1. 위 로그인 오류 수정 → 실제 로그인으로 `/`, 목표·주간 목표·할 일 생성/수정/삭제까지 눈으로 확인(지금까지 실제 로그인 후 동작은 한 번도 못 봤습니다. 로그인 후 흐름은 모의 세션 테스트로만 검증됨).
2. GitHub 푸시(이 문서를 올린 저장소에서 이어서).
3. **Vercel 배포**
   - Vercel에 저장소를 연결하고 환경변수 설정: `MONGODB_URI`(코드는 `MONGODB_URL`도 읽음), `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, 필요하면 `AUTH_URL=https://<배포 도메인>`.
   - **운영용 GitHub OAuth App을 따로 만드는 것을 권장**: OAuth App은 콜백 URL이 하나뿐이라, 로컬(`http://localhost:3000/...`)과 운영(`https://<도메인>/api/auth/callback/github`)을 한 앱으로 같이 쓸 수 없습니다. 운영용은 별도 Client ID/Secret 사용.
   - Auth.js가 Vercel에서 호스트를 자동 인식하는지(`AUTH_TRUST_HOST`)는 배포하면서 확인할 것(확인 전 가정).
4. **MongoDB Atlas 설정**
   - Network Access에 Vercel이 접속할 수 있게 허용(Vercel 서버 IP는 고정이 아니어서 보통 `0.0.0.0/0`을 쓰고, 대신 DB 사용자 비밀번호를 강하게).
   - 운영/개발 데이터베이스(이름)를 분리할지 결정. 현재 연결 문자열의 DB 이름은 `todoapp`.
5. 디자인 조정(현재: 검은 바탕 + 왼쪽 세로 사이드바, 활성 메뉴는 굵은 하늘색).

## 알아두면 좋은 것

- **이 Next.js(16.4)는 학습 데이터와 다릅니다.** `middleware`가 `proxy.ts`로 바뀌었고, `cacheComponents`가 켜져 있어서 라우트 핸들러에 `export const runtime`을 쓰면 빌드가 실패하고, `new Date()`/`usePathname()` 같은 요청 시점 값은 `<Suspense>` 안이나 `useEffect`에서만 써야 합니다. 코드 작성 전 `node_modules/next/dist/docs/`를 확인하세요(`AGENTS.md`).
- 로컬 `.env.local`(커밋되지 않음)에는 `MONGODB_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GITHUB_ID/SECRET`(그리고 쓰이지 않는 중복 `GITHUB_CLIENT_ID/SECRET`)이 있습니다. 형식은 `.env.example`.
- `docs/PLAN.md`, `docs/CLAUDE.md`, `docs/LOGIN.md`는 비어 있는 파일입니다.
- API 테스트는 `mongodb-memory-server`를 쓰므로 DB 없이 돌아갑니다. 모의 세션은 `vi.mock("@/lib/session")`.
- 주간 목표 5개 제한은 `WeeklyGoal`의 `{userId, weekStart, slot}` 유니크 인덱스로 보장합니다.
