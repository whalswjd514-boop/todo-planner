# 할 일 + 계획 관리 앱

할 일 → 주간 계획 → 1년 목표를 하나의 구조로 연결해 관리하는 개인용 앱입니다. 요구사항은 [`docs/PRD.md`](docs/PRD.md), 구현 계획은 `.omc/plans/todo-planner-plan.md`를 참고하세요.

**스택:** Next.js (App Router, API Route Handlers) · TypeScript · MongoDB (Mongoose) · Auth.js (GitHub OAuth) · Tailwind · dnd-kit · Vitest

## 실행

```bash
npm install
cp .env.example .env.local   # MONGODB_URI 와 아래 GitHub 로그인 설정을 채웁니다
npm run dev                  # http://localhost:3000
```

MongoDB는 [Atlas](https://www.mongodb.com/atlas) 또는 로컬 `mongod`를 사용할 수 있습니다. 예: `MONGODB_URI=mongodb://127.0.0.1:27017/todo-planner`

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run lint` | ESLint |
| `npm test` | Vitest (API 통합 테스트는 `mongodb-memory-server`를 사용하므로 별도 DB 불필요, 첫 실행 시 mongod 바이너리를 내려받습니다) |

## GitHub 로그인 설정

모든 화면과 API는 로그인이 필요합니다. 한 번만 아래 설정을 하세요.

1. GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
2. 만든 앱의 **Client ID**와, **Generate a new client secret**으로 만든 시크릿을 `.env.local`에 넣습니다.
3. `AUTH_SECRET`을 만듭니다: `npx auth secret` (또는 `openssl rand -base64 33`).

```env
AUTH_URL=http://localhost:3000
AUTH_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
```

**`redirect_uri is not associated with this application` 오류**가 나면 GitHub OAuth App의 *Authorization callback URL*이 앱이 보내는 주소와 정확히 같지 않은 것입니다. `AUTH_URL`로 앱이 보내는 주소는 `${AUTH_URL}/api/auth/callback/github`로 고정됩니다. GitHub 앱의 콜백 URL을 정확히 그 값으로 맞추세요(`https`가 아닌 `http`, 끝에 `/` 없음, `/api/auth/callback/github` 전체 경로, 포트 일치). 브라우저에서도 `AUTH_URL`과 같은 주소(`localhost`)로 접속해야 합니다. 이 `.env.local`의 Client ID와 GitHub 앱의 Client ID가 같은 앱인지도 확인하세요.

환경변수를 바꾼 뒤에는 `npm run dev`를 다시 시작하세요. 포트를 3000이 아닌 값으로 쓰면 콜백 URL도 그 포트로 바꿔야 합니다. 배포할 때는 `AUTH_URL`(또는 `AUTH_TRUST_HOST=true`)을 설정하고 GitHub 앱의 콜백 URL을 배포 주소로 추가하세요.

## 화면

- `/` 대시보드: 이번 주 계획·진행률·할 일 보드. 목표가 없으면 시작 안내가 표시됩니다.
- `/week/YYYY-MM-DD` 주간 계획(월요일 날짜): 주간 목표(최대 5개, 1년 목표와 연결), 요일별 배치, 메모, 회고, 드래그앤드롭 보드.
- `/goals` 1년 목표: 설명, 목표별 진행률.

## API (`src/app/api`)

`/api/goals`, `/api/goals/:id`, `/api/weekly-goals`, `/api/weekly-goals/:id`, `/api/tasks`, `/api/tasks/:id`, `/api/weeks/:weekStart` (GET 주간 데이터·진행률, PUT 메모/회고). 로그인하지 않으면 모두 `401`을 반환하고, 로그인은 `/api/auth/*`(Auth.js)가 처리합니다.

## 규칙과 가정

- 사용자 ID는 GitHub 계정 ID(`github:<id>`)입니다. 모든 데이터(목표·주간 계획·할 일)는 이 ID로 분리되어, 다른 사용자의 데이터는 조회·수정·삭제·연결할 수 없습니다(없는 것으로 처리). 세션은 JWT 쿠키이며 별도 사용자 컬렉션은 없습니다. GitHub 계정이 있는 누구나 로그인할 수 있고 각자 자기 데이터만 봅니다.
- 로그인 도입 이전의 데이터는 `userId: "default"`로 DB에 남아 있지만, 어느 계정에도 연결되지 않아 로그인 후에는 보이지 않습니다(새로 시작). 필요하면 MongoDB에서 `db.goals.find({ userId: "default" })` 등으로 찾아 `userId`를 `github:<내 GitHub ID>`로 바꾸면 됩니다. 내 GitHub ID는 `https://api.github.com/users/<아이디>`의 `id` 값입니다.
- 주간 진행률 = 해당 주 할 일 중 완료 비율, 목표 진행률 = 해당 1년 목표에 연결된 모든 할 일 중 완료 비율.
- 1년 목표를 삭제하면 연결된 주간 목표의 연결만 해제되고, 주간 목표를 삭제하면 할 일의 연결만 해제됩니다(할 일은 보존).
- 주간 목표 5개 제한은 `WeeklyGoal`의 `slot` 유니크 인덱스로 보장합니다. `slot` 도입 이전에 만든 개발용 DB가 있다면 `weeklygoals` 컬렉션을 비우거나 `slot`을 채운 뒤 `WeeklyGoal.syncIndexes()`를 실행하세요.
- 주의 시작은 월요일이며 날짜는 브라우저 로컬 기준입니다.
