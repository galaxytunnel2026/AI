# Private Personal AI Agent Web App — Build Specification

## 1. Project Goal

Build a private, browser-based Personal AI Agent Web App for a single owner. The owner will use it from a phone browser to:

- Ask questions and have the agent research information.
- Search the web and read selected URLs.
- Create multi-step task plans.
- Execute approved tools such as Python, shell/build commands, file operations, and project generation.
- Upload documents and images for analysis.
- Create Markdown, JSON, CSV, PDF, ZIP, and source-code exports.
- Generate secure upload and download links.
- Save conversation history, task history, summaries, preferences, and project metadata.
- Run scheduled daily tasks such as research reports and recurring project maintenance.
- Preview generated web projects when possible.

This is a private personal tool, not a public multi-user SaaS product. Do not build public registration, public user profiles, public sharing, public API access, billing, or social features in the MVP.

## 2. Important Product Constraint

The application must not expose unrestricted terminal access in the main web server process. Generated or uploaded code must run inside an isolated external sandbox/executor. The main application only coordinates the task and stores the results.

The agent must not reveal or store hidden chain-of-thought. Instead, show a concise, user-visible execution plan and tool activity log, for example:

```json
{
  "step": 2,
  "title": "Read official documentation",
  "tool": "fetch_url",
  "status": "completed",
  "summary": "Read the relevant documentation and extracted the limits.",
  "createdAt": "..."
}
```

## 3. Recommended Architecture

```text
Mobile Browser
    |
    v
Cloudflare Pages — frontend web application
    |
    v
Cloudflare Pages Functions / Workers — backend API and orchestration
    |
    +--> Firebase Authentication — owner login
    +--> Cloud Firestore — memory, conversations, tasks, logs, metadata
    +--> Firebase Cloud Storage — uploads, generated files, project exports
    +--> LLM API — agent reasoning and tool selection
    +--> Search API — web search
    +--> E2B or Modal — isolated Python/shell/build sandbox
    +--> GitHub API — optional private repository export
```

Use Cloudflare Pages for the browser-facing application and API routes. Use Firebase for authentication, Firestore data, and file storage. Use E2B or Modal for Python, shell, npm, tests, and project builds. Keep these concerns separate.

## 4. Suggested Technology

### Frontend

- HTML/CSS/JavaScript or React.
- Responsive mobile-first layout.
- Use a clean dark/light theme with readable Burmese and English text.
- Do not require a desktop-only layout.
- Use streaming or polling for task progress when practical.

### Backend

- Cloudflare Pages Functions or Workers.
- TypeScript preferred.
- REST-style API routes.
- Validate every request and response.
- Never expose server-side API keys to the browser.

### Data and Storage

- Firebase Authentication.
- Cloud Firestore.
- Firebase Cloud Storage.
- Store file metadata in Firestore; store binary files in Cloud Storage.

### Execution

- E2B Sandbox or Modal Sandbox.
- Default execution timeout: 60 seconds.
- Maximum execution timeout configurable by environment variable.
- Maximum file size, output size, CPU, memory, and process count must be configurable.
- Destroy or clean up temporary sandboxes after task completion unless the user explicitly asks to keep a workspace.

## 5. Private Authentication

Implement owner-only access.

Preferred method:

1. Firebase Authentication with Google sign-in or email/password.
2. Store the allowed owner email or UID in a server-side environment variable.
3. Reject every authenticated user whose UID is not the configured owner UID.
4. Reject unauthenticated requests to all agent, file, task, and export APIs.
5. Never put the owner secret, API keys, Firebase Admin credentials, or executor credentials in frontend code.

The application must include:

- Login page.
- Logout action.
- Current-user indicator.
- Unauthorized page.
- Session expiration handling.
- Loading and error states.

## 6. Main User Interface

Create a responsive dashboard with these areas:

### A. Chat / Task Input

- Large text input.
- Submit button.
- Stop/cancel button for a running task.
- File upload button.
- Optional task type selector: Chat, Research, Build Project, Analyze File, Export.
- Optional model selector if multiple LLM providers are configured.

Example requests:

- "Search official Cloudflare documentation and create a Markdown report."
- "Build a simple personal portfolio website and export it as ZIP."
- "Read this PDF and extract the main decisions into a CSV file."
- "Every morning, collect AI tool news and create a report."

### B. Plan and Activity Panel

Show only concise operational information:

- Current task title.
- Overall status: queued, planning, running, waiting, completed, failed, cancelled.
- Current step number.
- Tool name.
- Start/end time.
- Short result summary.
- Error message when applicable.
- Retry action when safe.

Do not show hidden model chain-of-thought. Show a short plan and observable tool results instead.

### C. Conversation Panel

- User messages.
- Assistant answers.
- Source links.
- Attached files.
- Export links.
- Copy button.
- Download button.
- Clear conversation button with confirmation.

### D. Files and Exports Panel

Show:

- File name.
- File type.
- Size.
- Created date.
- Related task.
- Download button.
- Delete button.
- Expiration status if applicable.

### E. Scheduled Tasks Panel

Allow the owner to create, pause, resume, edit, and delete scheduled tasks.

Fields:

- Task name.
- Instruction.
- Schedule/timezone.
- Output type: Markdown, PDF, JSON, CSV, ZIP.
- Delivery destination: in-app file list initially.
- Enabled/disabled status.
- Last run.
- Next run.
- Last result.

## 7. Agent Workflow

Implement the following workflow:

```text
1. Authenticate the owner.
2. Receive the request and optional files.
3. Create a task record.
4. Load a compact memory context.
5. Ask the LLM to produce a structured plan.
6. Validate the plan against the allowed tool list.
7. Execute one tool step at a time.
8. Save every step and result to Firestore.
9. If a tool fails, record the error and retry only when safe.
10. After tools finish, ask the LLM to synthesize the result.
11. Create requested export files.
12. Upload exports to Firebase Storage.
13. Save file metadata and download references in Firestore.
14. Return the final answer with source links and file links.
```

The agent must have a maximum step count, for example 12 steps per task. If the limit is reached, stop safely and explain what remains.

## 8. Tool Interface

Implement tools with strict JSON schemas.

### web_search

Input:

```json
{
  "query": "string",
  "maxResults": 5,
  "recency": "optional string"
}
```

Output:

```json
{
  "results": [
    {
      "title": "string",
      "url": "string",
      "snippet": "string",
      "source": "string"
    }
  ]
}
```

### fetch_url

Input:

```json
{
  "url": "string",
  "query": "optional string"
}
```

Rules:

- Allow only http and https URLs.
- Block localhost, private IP ranges, internal metadata addresses, and unsupported protocols.
- Limit response size and timeout.
- Return extracted text and page metadata.

### file_read

Input:

```json
{
  "fileId": "string"
}
```

Only allow files owned by the authenticated owner.

### file_write

Input:

```json
{
  "workspaceId": "string",
  "path": "string",
  "content": "string"
}
```

Prevent path traversal such as `../` and absolute system paths.

### python_execute

Input:

```json
{
  "workspaceId": "string",
  "code": "string",
  "inputFiles": ["string"],
  "timeoutSeconds": 60
}
```

Run inside an isolated sandbox. Return stdout, stderr, exit code, generated file list, and execution duration.

### shell_execute

Input:

```json
{
  "workspaceId": "string",
  "command": "string",
  "timeoutSeconds": 60
}
```

Do not allow unrestricted arbitrary commands by default. Start with an allowlist such as `ls`, `pwd`, `cat`, `mkdir`, `python`, `pip`, `node`, `npm`, `pytest`, `zip`, `unzip`, and project-local commands. Block `sudo`, dangerous recursive deletion, host filesystem access, credential access, and unrestricted Docker access.

### create_export

Input:

```json
{
  "workspaceId": "string",
  "format": "zip|markdown|json|csv|pdf",
  "sourcePaths": ["string"],
  "outputName": "string"
}
```

Create the requested export in the sandbox, upload it to Firebase Storage, and create a Firestore file record.

### upload_file

Upload a file to a private Storage path:

```text
users/{ownerUid}/uploads/{taskId}/{safeFileName}
```

### create_download_reference

Return a protected file reference for an owner-owned file. Prefer authenticated SDK downloads or short-lived access. Do not make private project exports publicly readable by default.

### github_export

Optional MVP-plus feature. Push only to a user-authorized private GitHub repository. Never push secrets, `.env` files, access tokens, or Firebase service-account files. Require an explicit user action before the first push.

## 9. Firestore Data Model

Use a structure similar to:

```text
users/{ownerUid}
users/{ownerUid}/conversations/{conversationId}
users/{ownerUid}/conversations/{conversationId}/messages/{messageId}
users/{ownerUid}/tasks/{taskId}
users/{ownerUid}/tasks/{taskId}/steps/{stepId}
users/{ownerUid}/memories/{memoryId}
users/{ownerUid}/files/{fileId}
users/{ownerUid}/scheduledTasks/{scheduledTaskId}
users/{ownerUid}/settings/{settingsId}
```

Suggested task fields:

```json
{
  "title": "string",
  "instruction": "string",
  "status": "queued|planning|running|completed|failed|cancelled",
  "currentStep": 0,
  "maxSteps": 12,
  "conversationId": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "completedAt": "timestamp|null",
  "error": "string|null",
  "resultSummary": "string|null"
}
```

Suggested memory fields:

```json
{
  "type": "preference|project|knowledge|summary",
  "title": "string",
  "content": "string",
  "sourceTaskId": "string|null",
  "tags": ["string"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Do not store entire large files or unlimited conversation history in one document. Store messages and files separately. Create summaries for old conversations.

## 10. Firebase Storage Paths

Use private, owner-scoped paths:

```text
users/{ownerUid}/uploads/{taskId}/{safeFileName}
users/{ownerUid}/exports/{taskId}/{safeFileName}
users/{ownerUid}/workspaces/{workspaceId}/{relativePath}
```

Validate:

- File ownership.
- Safe filename.
- MIME type.
- Maximum upload size.
- Maximum total storage used.
- Allowed file extensions.

Never trust the client-provided MIME type or filename. Sanitize both.

## 11. Security Rules

Create strict Firestore and Storage security rules:

- Only authenticated owner UID can read/write.
- No public read access to private files.
- No public write access.
- Users cannot access another UID path.
- Validate task/file ownership.
- Limit writable fields where practical.
- Keep server-only operations behind backend credentials.

Add backend authorization checks even when Firebase Rules exist. Do not rely on frontend checks alone.

## 12. Environment Variables

Create `.env.example` only. Never commit real secrets.

```text
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_STORAGE_BUCKET=
OWNER_UID=
OWNER_EMAIL=
LLM_API_KEY=
LLM_API_BASE=
SEARCH_API_KEY=
E2B_API_KEY=
MODAL_TOKEN_ID=
MODAL_TOKEN_SECRET=
GITHUB_TOKEN=
GITHUB_OWNER=
MAX_TASK_STEPS=12
MAX_EXECUTION_SECONDS=60
MAX_UPLOAD_BYTES=26214400
```

Use the platform's secret/environment-variable manager. Never display secret values in logs or UI.

## 13. Error Handling

Implement clear errors for:

- Not authenticated.
- Not authorized.
- Invalid request.
- LLM unavailable.
- Search unavailable.
- URL blocked.
- Sandbox timeout.
- Sandbox failed.
- File too large.
- Unsupported file type.
- Storage quota exceeded.
- Export failed.
- Task cancelled.
- Rate limit exceeded.

Every error should include:

- A human-readable message.
- A stable error code.
- A task/step reference.
- A safe retry suggestion when appropriate.

Do not expose stack traces, access tokens, internal hostnames, or secret values to the frontend.

## 14. Scheduled Tasks

Implement scheduled execution outside the browser. Do not depend on a browser tab remaining open.

The scheduled runner should:

1. Load enabled scheduled tasks.
2. Create a new task execution record.
3. Run the same agent workflow as a manual task.
4. Store the result and export files.
5. Show the result in the dashboard.
6. Record success/failure and duration.

Start with one daily task capability. Make timezone configurable, defaulting to `Asia/Yangon` unless the owner changes it.

## 15. Export Requirements

For every generated project, include:

```text
project/
├── source files
├── README.md
├── .gitignore
└── optional tests
```

Do not include:

- API keys.
- `.env` files with secrets.
- Firebase service-account JSON.
- Sandbox credentials.
- Private conversation data unless explicitly requested.

When an export is complete, show:

- File name.
- File size.
- Created time.
- Download action.
- Related task.
- Optional preview URL.

## 16. MVP Scope

Implement first:

1. Owner login.
2. Mobile responsive dashboard.
3. Chat/task input.
4. Structured plan display.
5. Web search tool.
6. URL fetch tool.
7. Firestore conversation and task records.
8. File upload.
9. Python execution in external sandbox.
10. ZIP and Markdown export.
11. Private download link/reference.
12. Task cancellation and retry.
13. Basic daily scheduled task.

Do not implement in the first version:

- Public signup.
- Multiple users.
- Billing.
- Public file sharing.
- Autonomous unlimited loops.
- Unrestricted shell.
- Automatic public GitHub publishing.
- Voice, mobile native apps, or browser automation unless explicitly added later.

## 17. Acceptance Criteria

The build is complete only when all of the following work:

1. The owner can open the deployed Pages URL on a phone.
2. An unauthorized account cannot enter the application.
3. The owner can submit a task and see its status.
4. The agent can create a short plan and show tool activity.
5. A web search task returns source URLs.
6. A URL fetch task returns extracted text.
7. A Python task runs in the external sandbox, not inside the Pages Function process.
8. A generated file is uploaded to private Firebase Storage.
9. The file appears in the dashboard and can be downloaded by the owner.
10. A project can be exported as a ZIP containing a README.
11. Task history and file metadata persist after refresh.
12. Failed tasks show a useful error and do not silently disappear.
13. Secrets are absent from frontend bundles, Git history, logs, and export ZIPs.
14. The app works on a mobile viewport.
15. The app has a clear setup README with deployment and secret configuration steps.

## 18. Build Instructions for the AI Builder

First create the complete project structure and a working mobile UI with mock data. Then connect authentication, Firestore, Storage, LLM, search, and sandbox integrations one at a time.

Use adapters/interfaces for external services:

```text
LLMProvider
SearchProvider
SandboxProvider
StorageProvider
ExportProvider
```

If an API key is not available, provide a clear configuration screen or disabled-state message rather than hardcoding fake production behavior. Use mock providers only in local/demo mode.

After implementation:

1. Run linting.
2. Run type checking.
3. Run frontend build.
4. Run backend tests.
5. Test unauthorized access.
6. Test task creation and failure handling.
7. Test file upload and export.
8. Verify no secrets are included in client bundles.
9. Produce a deployment README.
10. Deploy the working web app to the selected Pages platform.

The final response from the builder must include:

- Live preview URL.
- Production URL.
- Repository URL if created.
- Required environment variables.
- Firebase setup instructions.
- Sandbox setup instructions.
- Known limitations.
- Test results.
- Next recommended features.
