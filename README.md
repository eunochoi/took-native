# took-native

일기, 습관, 절제 기록을 관리하는 took의 Android 앱입니다. Expo와 React Native로 만들었으며, 기록은 기기의 SQLite에 저장합니다.

## 아키텍처

- **화면·탐색**: React Native, Expo Router
- **스타일·테마**: NativeWind, 공통 디자인 토큰
- **데이터**: SQLite, TanStack Query
- **백업**: 로컬 데이터와 사진을 ZIP으로 내보내고 복원

## 폴더 구조

```text
app/             라우트와 화면 진입점
src/screens/     화면 구성
src/components/  공통 UI
src/domain/      기록 규칙과 계산
src/db/          SQLite 조회·저장·마이그레이션
src/queries/     데이터 조회와 캐시 관리
src/backup/      백업과 복원
src/media/       사진 파일 관리
src/settings/    앱 설정
src/theme/       디자인 토큰과 테마
```
