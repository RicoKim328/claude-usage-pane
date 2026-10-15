# usage-pane

Claude Code 화면에 **토큰 사용량 · 사용 한도 남은 % · 모델/계산량(effort) 선택기**를 보여 주는 패널(mod)입니다.

## 무엇을 보여주나요

| 영역 | 내용 |
| --- | --- |
| 현재 세션 토큰 | 입력 / 출력 / 캐시 읽기 / 캐시 쓰기 / 합계, 누적 비용(USD), 컨텍스트 사용량 바 |
| 사용 한도 | 5시간 · 주간(7일) · 지출 한도의 사용 바, **남은 %**, 리셋까지 남은 시간. 주간 한도가 90% 이상 소진되면 경고 표시 |
| 모델 · 계산량 | 최근 응답 모델 표시, Model / Effort 선택기 (다음 요청부터 적용) |

색상은 사용률에 따라 바뀝니다: 70% 미만 초록, 70% 이상 노랑, 90% 이상 빨강.

## 설치

Claude Code 안에서:

```
/plugin install usage-pane --marketplace RicoKim328/claude-usage-pane
```

설치된 mod가 로드되면 대화형 세션 시작 시 패널이 자동으로 열립니다. 열리지 않으면 `/usage`를 실행하세요.

### 설치 없이 로컬에서 먼저 써 보기

```bash
git clone https://github.com/RicoKim328/claude-usage-pane.git
claude --plugin-dir ./claude-usage-pane
```

## 사용법

| 명령 | 동작 |
| --- | --- |
| `/usage` | 패널을 고정(pin)하고 엽니다. 다음 세션부터도 자동으로 열립니다. |
| `/usage off` | 고정을 해제하고 패널을 닫습니다. |

- 패널의 닫기 표시로 직접 닫아도 고정이 해제되어, 다음 세션에서도 닫힌 채로 시작합니다.
- 고정 상태는 세션이 바뀌어도 유지됩니다.

### 모델 / Effort 바꾸기

패널 하단의 **Model**, **Effort** 선택기에서 고르면 이후 메인 대화의 모든 요청에 적용됩니다.

- Model: `session default`, Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5
- Effort: `session default`, low, medium, high, xhigh, max
- `session default`를 고르면 이 mod는 아무것도 덮어쓰지 않고 세션 원래 설정을 그대로 씁니다.
- 서브에이전트의 요청에는 적용되지 않습니다.
- Effort는 해당 요청이 effort 설정을 가진 경우에만 덮어씁니다.

## 알아둘 점

- **패널 위치**: 오른쪽 도킹은 전체화면 레이아웃(`CLAUDE_CODE_NO_FLICKER=1`)에서만 됩니다. 그 외에는 프롬프트 위에 표시됩니다.
- **좁은 터미널**: 패널이 들어갈 자리가 없거나 고정을 해제했을 때는 상태 표시줄에 `주간 (7일) NN% 남음` 같은 요약이 대신 나옵니다.
- **사용 한도**는 구독 계정에서만 측정됩니다. API 키로 쓰면 "아직 측정값 없음"이 표시되고, 값은 첫 응답 이후부터 채워집니다.
- 토큰 합계는 **이 mod가 켜진 이후 메인 대화**의 누적값입니다. 서브에이전트 토큰은 포함되지 않습니다.
- 패널의 문구는 한국어입니다.

## 개발

```bash
claude plugin validate .    # 매니페스트와 훅 검사
claude plugin test .        # tests/usage.test.ts 실행
```

파일 구성:

```
.claude-plugin/plugin.json        mod 정보
.claude-plugin/marketplace.json   마켓플레이스 정보
hooks/hooks.json                  훅 모듈 경로
hooks/register.tsx                패널과 훅 구현
types/index.d.ts                  $.state 타입 계약
tests/usage.test.ts               테스트
```
