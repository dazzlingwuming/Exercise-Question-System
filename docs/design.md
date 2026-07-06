# 系统设计

## 整体架构

系统按“Markdown 题库 -> 解析器 -> SQLite -> FastAPI -> React 客户端”组织。当前默认题库路径为 `data/个人题库/agent基础题目.md`。后端负责解析、存储、判分和统计；前端负责导入确认、题库浏览、刷题交互、错题复习和数据展示。

## 数据模型

`questions` 保存题目主体、题型、难度、标签、选项、标准答案、解析、考察点和原始 Markdown。`attempts` 保存每次作答的原始答案、归一化答案、正确性、得分和自评状态。`import_batches` 记录导入批次摘要。

列表类字段使用 JSON 存储，包括 `options`、`tags`、`exam_points`、`standard_answer` 和 `parse_warnings`。服务层负责 schema 与 ORM 之间的显式转换。

## 解析流程

解析器先切分两类题块：

- `### Part x-y｜题型｜难度｜标签`
- Part 1 中的 `**题 N【难度】**`
- 个人题库中的 `--- question ---` YAML 风格题块

每个题块再解析题目、选项/材料、标准答案/参考答案、详细解析、考察点、常见错误、面试追问和评分标准。缺少解析会生成 warning；缺题干或标准答案会生成 error 并跳过导入。

个人题库格式通过 `question_id` 作为稳定题目 id，`module` 作为标签和方向，`type` 映射到系统内部题型，`knowledge_points` 写入考察点。客观题使用 `answer` 作为标准答案；主观题使用 `reference_answer` 作为标准答案，`answer_keywords` 和 `scoring_points` 合并为评分标准，`option_analysis`、`architecture_points`、`data_flow`、`evaluation_metrics`、`risk_points`、`pseudocode`、`complexity` 和 `test_cases` 会合并进详细解析。

导入页的“确认重置导入”调用 `/api/imports/reset-commit`。该接口会物理删除旧 `questions`、`attempts`、`question_revisions`、`practice_sessions` 和 `import_batches`，再导入当前默认题库。这个路径用于题库整体换源，不用于日常追加导入。

## 题型与判分扩展

题型使用内部枚举。单选、多选、判断、填空由独立 checker 自动判分；其他题型默认走 `SubjectiveChecker`，提交后返回参考答案和评分标准，等待用户自评。

新增题型时需要：

1. 在后端 `QuestionType` 和题型映射中新增类型。
2. 如果可自动判分，新增 checker 并注册到 `CHECKERS`。
3. 在前端新增题型组件，并在 `QuestionRenderer` 中分发。

## API

核心接口包括：

- `GET /api/health`
- `POST /api/imports/preview`
- `POST /api/imports/commit`
- `GET /api/questions`
- `GET /api/questions/{question_id}`
- `GET /api/practice/next`
- `POST /api/questions/{question_id}/submit`
- `POST /api/attempts/{attempt_id}/self-review`
- `GET /api/attempts`
- `GET /api/attempts/wrong`
- `GET /api/stats/summary`

## 前端页面

前端采用工作台式布局：左侧导航、顶部状态栏、主体工作区。页面包括 Dashboard、题库导入、题库管理、随机练习、错题复习和统计。视觉风格保持低噪声、清晰标签和明确反馈。

## 后续演进

登录和多用户可通过新增 `users` 表、在 `attempts` 增加 `user_id`、API 增加鉴权依赖实现。云端部署时可替换 SQLite 为 PostgreSQL，并把题库文件导入改为上传或对象存储读取。主观题 AI 批改可在 `SubjectiveChecker` 后增加异步批改服务。

## 题目编辑与版本设计

题目编辑通过 `PATCH /api/questions/{question_id}` 完成。接口支持局部更新，保存前由 `question_validation_service` 校验题干、选项、题型和标准答案是否匹配。校验通过后，`questions.version` 递增，`updated_at` 更新，后续刷题使用新的题目和标准答案。

所有修改都会写入 `question_revisions`。每条 revision 保存 `before_data`、`after_data`、`changed_fields`、`reason`、`source`、`version_before` 和 `version_after`。这保证题目修改不是无痕覆盖，也支持字段级对比。

恢复历史版本通过 `POST /api/questions/{question_id}/revisions/{revision_id}/restore` 完成。默认恢复到该 revision 的 `before_data`。恢复不会倒退版本号，而是以当前题目为 before、恢复后的题目为 after，再创建一条新的 revision。

## Attempt 快照设计

`attempts` 增加 `question_version` 和 `question_snapshot`。用户提交答案时，系统保存当时题目的版本和核心题目数据快照。题目后续被修改时，旧 attempt 不自动重算，因为旧记录反映的是用户在当时题目版本下的作答结果。新 attempt 会使用最新题目版本和最新标准答案判分。

## 题目软删除设计

题目删除采用软删除，不做默认物理删除。`questions` 增加 `is_deleted`、`deleted_at`、`delete_reason` 和 `deleted_source` 字段，旧库启动时通过轻量迁移补齐字段，已有题目默认 `is_deleted=false`。

不直接物理删除的原因是系统中已经存在 `attempts`、`question_revisions`、`practice_sessions`、错题聚合和统计。如果删除数据库记录，会导致历史答题找不到题目、修改历史断链、旧练习 session 残留无效 question_id，也不利于后续重复题审计和恢复。

删除和恢复都复用 `question_revisions` 留痕。软删除时 `source=manual_delete`，`changed_fields` 包含 `is_deleted`、`deleted_at` 和 `delete_reason`；恢复时 `source=restore_deleted_question`。revision 的 before/after 快照会记录删除状态，因此可以审计谁因为什么原因把题目移入或移出回收站。

回收站通过 `/questions/deleted` 展示已删除题目，支持分页、搜索、题型、难度、方向和考察点筛选。题目详情接口仍允许读取已删除题目，并返回删除时间和删除原因；编辑接口会拒绝已删除题，要求先恢复再编辑。

软删除不删除 `attempts`。历史答题记录继续保留，attempt 快照仍能反映用户当时作答的题目版本；但已删除题默认不再进入错题页、错题专项和普通统计。提交答案时如果题目已删除，接口返回明确错误。

练习查询默认排除已删除题。`practice_service` 在构建随机、顺序、错题、未答题、方向和考察点候选集时只读取 `is_deleted=false` 的题目。旧 `PracticeSession` 如果包含后来被删除的题目，读取当前组时会过滤已删除题，当前题已删除时会向后跳过；如果剩余题都不可用，前端提示重新创建练习。

统计接口默认排除已删除题，包括总题数、已答题数、正确率、错题数、题型/难度分布和高频错误考察点。历史 attempts 不删除，但统计 join `questions` 时只统计未删除题。

## 练习模式架构

第三阶段新增 `practice_service`，由服务层统一构建练习候选题集合，router 只负责接收参数和返回 schema。支持随机、导入顺序、错题、未答题、题型、难度、考察点和方向专项。这样避免把多模式查询堆在路由中，也便于后续扩展收藏题、每日计划等模式。

`questions.import_order` 保存题目在初始 Markdown 中的顺序。新导入时按解析顺序写入；旧库启动时会轻量迁移并 backfill：优先按 `part_id` 自然排序，无法解析时按 `created_at/id` 稳定排序。用户编辑题目不会改变 `import_order`。

`questions.directions` 保存用户维护的题目方向。SQLite 中使用 JSON 字段保存列表，服务层通过 `normalize_directions` 支持逗号、顿号、斜杠等输入并去重保序。初始导入或旧库 backfill 时从 `exam_points` 提取方向，不做强行归类；用户后续编辑的方向优先生效。

错题分页由 `wrong_question_service` 按题目聚合错误 attempt，返回最新错误记录、错误次数、最近错误时间和上次错误答案。错题列表支持题型、难度、考察点、方向、关键词筛选和多种排序。

不能只依赖随机练习，因为随机模式无法保证覆盖率，也无法支撑错题专项、未答题清理和按方向集中训练。练习候选题 API 将“选题集合”和“当前题渲染”分开，前端可以在同一练习页中支持上一题、下一题和从指定错题开始。

## PracticeSession 设计

第四阶段新增 `practice_sessions` 表，字段包括 `mode`、`filters_json`、`order`、`page_size`、`total`、`current_index`、`question_ids_json`、`created_at` 和 `updated_at`。前端点击“开始练习”时调用 `POST /api/practice/sessions`，后端根据练习模式、筛选条件和排序方式一次性生成题目 ID 快照，并只返回第一组题目。

“每组题数”表示每次加载数量，不是本次练习总题数。例如按导入顺序共有 740 题、每组 20 题时，第一组是 1-20，刷完后通过 `POST /api/practice/sessions/{session_id}/next-group` 继续 21-40，直到 740 题全部完成。当前进度由 `current_index / total` 表示，当前组范围由 `current_group_start/current_group_end` 表示。

随机模式也必须使用 session 快照。否则每次请求下一组时重新随机，会出现重复题、漏题，甚至刷新页面后顺序完全改变。现在随机只在创建 session 时打乱一次，后续上一题、下一题和继续下一组都读取 `question_ids_json`。

错题专项不能每次实时随机查询错题集合。用户练习过程中答对或答错会改变 attempts，如果每次实时重查，候选集合会漂移，导致下一题跳转不稳定。错题 session 在创建时锁定当时的错题集合，并支持 `start_question_id`：从错题页点击某道题重新练习时，该题会被旋转到当前 session 的第 1 题，后续继续按错题专项顺序刷。

方向专项、考察点专项、未答题练习和混合筛选都共用同一套 session 机制：先按模式和筛选条件生成完整候选题 ID，再按 `page_size` 分组加载。页面刷新时通过 URL 中的 `session_id` 调用 `GET /api/practice/sessions/{session_id}` 恢复当前题、当前组和总进度。

## AI 讲题助手设计

第五阶段新增题目感知型 AI 讲题助手。前端入口位于刷题页右侧“练习上下文”下方，标题为“AI 讲题助手（调用大模型）”。它围绕当前题目和当前 attempt 工作，因此不做独立导航页，避免脱离刷题上下文后无法判断是否已经提交答案。

数据库新增 `ai_tutor_threads` 和 `ai_tutor_messages`。`ai_tutor_threads` 以 `question_id + attempt_id` 维护连续对话状态，记录是否已经生成提示、讲解、工程例子和面试追问；`ai_tutor_messages` 保存同一 thread 下的用户消息和 AI 回复。刷新页面后，前端通过 `GET /api/ai/thread?question_id=&attempt_id=` 恢复历史对话。

后端暴露四个接口：`POST /api/ai/test-connection` 测试 DeepSeek 连接，`GET /api/ai/thread` 获取或创建 thread，`POST /api/ai/thread/action` 执行四阶段按钮动作，`POST /api/ai/thread/message` 处理自由追问。

权限状态机由后端执行。未提交答案时只允许提示和概念解释，prompt 上下文只包含题干、材料、选项、题型、难度、方向和考察点，不包含 `standard_answer`、`explanation`、`scoring_standard` 或用户历史答案；如果用户追问“直接告诉我答案”，后端直接返回防泄露提示，不调用模型。提交答案后才允许讲解与错因分析，完成讲解后再开放工程例子和面试追问。

DeepSeek Key 的默认来源是环境变量 `DEEPSEEK_API_KEY`，也可以由前端每次请求临时携带。前端只把用户填写的 Key 存在浏览器 `sessionStorage`，后端不保存 Key，不在 AI thread 或 message 表中落库。
