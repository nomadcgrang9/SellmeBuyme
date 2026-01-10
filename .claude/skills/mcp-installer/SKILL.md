---
name: mcp-installer
description: MCP (Model Context Protocol) 서버 설치 및 설정 스킬. MCP 설치, MCP 추가, MCP 설정, MCP 연결 관련 작업 시 사용. Keywords: mcp, install, setup, server, protocol, 설치, 설정, 연결
---

# MCP Installer Skill

Claude Code에서 MCP (Model Context Protocol) 서버를 안전하고 정확하게 설치하기 위한 스킬입니다.

## 공통 주의사항

1. **환경 확인 필수**: 현재 사용 환경을 확인할 것. 모르면 사용자에게 물어볼 것.
2. **OS 및 환경 파악**: Windows, Linux, macOS 및 환경(WSL, PowerShell, 명령프롬프트 등)을 파악해서 그에 맞게 세팅할 것.
3. **User 스코프 사용**: user 스코프로 설치 및 적용할 것
4. **공식 문서 확인**: 특정 MCP 설치 시, 바로 설치하지 말고 WebSearch 도구로 해당 MCP의 공식 사이트 확인 후 현재 OS 및 환경에 맞는 공식 설치법부터 확인할 것
5. **Context7 이중 확인**: 공식 사이트 확인 후 context7 MCP가 존재하는 경우, context7으로 다시 한번 확인할 것
6. **설치 후 검증 필수**: MCP 설치 후, `claude mcp list`로 확인하고 실제 작동 여부를 반드시 확인할 것
7. **API KEY 안내**: 설정 시 API KEY 환경 변수 설정이 필요한 경우, 가상의 API 키로 디폴트로 설치 및 설정 후, 올바른 API 키 정보를 입력해야 함을 사용자에게 알릴 것
8. **서버 의존 MCP**: MySQL MCP와 같이 특정 서버가 구동중 상태여야만 정상 작동하는 것은 에러가 나도 재설치하지 말고, 정상 구동을 위한 조건을 사용자에게 알릴 것
9. **요청된 MCP만 설치**: 설치 요청 받은 MCP만 설치. 이미 설치된 다른 MCP에 에러가 있어도 그냥 둘 것

## Windows 전용 주의사항

- 설정 파일 직접 세팅 시, Windows 경로 구분자는 백슬래시(`\`)이며, JSON 내에서는 반드시 이스케이프 처리(`\\`)해야 함
- User 설정 위치: `C:\Users\{사용자명}\.claude.json`
- Project 설정 위치: 프로젝트 루트`\.claude\`

## OS 공통 주의사항

- Node.js가 PATH에 등록되어 있는지, 버전이 최소 v18 이상인지 확인할 것
- `npx -y` 옵션을 추가하면 버전 호환성 문제를 줄일 수 있음

## 설치 워크플로우

### Step 1: 환경 확인

```bash
# Node.js 버전 확인
node --version

# npm 전역 설치 경로 확인
npm config get prefix

# 현재 설치된 MCP 목록 확인
claude mcp list
```

### Step 2: 공식 문서 확인

WebSearch 도구로 해당 MCP의 공식 GitHub/npm 페이지 확인:
- 설치 명령어
- 필요한 환경 변수
- 지원 OS

### Step 3: MCP 설치

#### 방법 1: claude mcp add 명령어 (권장)

```bash
# 기본 형식
claude mcp add --scope user <mcp-name> -- npx -y <package-name>

# 환경 변수가 필요한 경우
claude mcp add --scope user <mcp-name> \
  -e API_KEY=YOUR_API_KEY \
  -- npx -y <package-name>

# 인자가 필요한 경우
claude mcp add --scope user <mcp-name> -- npx -y <package-name> "arg1" "arg2"
```

#### 방법 2: JSON 설정 파일 직접 수정

**Windows 설정 파일 위치**: `C:\Users\{사용자명}\.claude.json`

```json
{
  "mcpServers": {
    "mcp-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

**Windows cmd.exe 래퍼 사용 시**:

```json
{
  "mcpServers": {
    "mcp-name": {
      "command": "cmd.exe",
      "args": ["/c", "npx", "-y", "package-name"],
      "type": "stdio"
    }
  }
}
```

### Step 4: 설치 검증

```bash
# 1. MCP 목록에서 확인
claude mcp list

# 2. 상태 확인 (Connected 표시 확인)
# ✓ Connected = 정상
# ✗ Error = 문제 있음
```

### Step 5: 문제 해결

#### npx 패키지를 찾을 수 없는 경우

```bash
# npm 전역 설치 경로 확인
npm config get prefix

# 직접 설치 후 node로 실행
npm install -g <package-name>
```

#### uvx 명령어를 찾을 수 없는 경우

```bash
# uv 설치 (Python 패키지 관리자)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## 자주 사용하는 MCP 설치 명령어

### Filesystem MCP
```bash
claude mcp add --scope user filesystem -- npx -y @modelcontextprotocol/server-filesystem "프로젝트경로"
```

### GitHub MCP
```bash
claude mcp add --scope user github -e GITHUB_PERSONAL_ACCESS_TOKEN=YOUR_TOKEN -- npx -y @modelcontextprotocol/server-github
```

### Supabase MCP
```bash
claude mcp add --scope user supabase -e SUPABASE_ACCESS_TOKEN=YOUR_TOKEN -- npx -y @supabase/mcp-server-supabase@latest
```

### Playwright MCP
```bash
claude mcp add --scope user playwright -- npx @playwright/mcp@latest
```

### Google Search MCP
```bash
claude mcp add --scope user google-search -e GOOGLE_API_KEY=YOUR_KEY -e GOOGLE_CSE_ID=YOUR_CSE_ID -- npx -y @anthropic/mcp-server-google-search
```

## JSON 설정 예시 (Windows)

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\PRODUCT\\SellmeBuyme"]
    },
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_TOKEN"
      }
    },
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

## args 배열 설계 체크리스트

- **토큰 단위 분리**: `"args": ["/c","npx","-y","pkg"]` 형태로 분리가 안전
- **경로 포함 시**: JSON에서는 `\\` 두 번. 예) `"C:\\tools\\mcp\\server.js"`
- **환경변수 전달**: `"env": { "KEY": "value" }` 사용
- **타임아웃 조정**: 느린 PC라면 `MCP_TIMEOUT` 환경변수로 부팅 최대 시간을 늘릴 수 있음 (예: 10000 = 10초)

## 참고 링크

- [MCP 공식 사이트](https://modelcontextprotocol.io/)
- [Anthropic MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
