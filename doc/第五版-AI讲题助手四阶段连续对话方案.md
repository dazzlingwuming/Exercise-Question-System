# AI 讲题助手四阶段连续对话方案

> 适用项目：Agent 应用层岗位题库刷题系统  
> 当前技术栈：FastAPI + SQLite + 前端页面  
> 目标模型：DeepSeek API  
> 改造原则：增量开发，不重构现有题库、刷题、错题、统计逻辑。

---

## 一、改造目标

当前题库系统已经具备刷题、答题、错题、统计、题目编辑等基础能力。下一步希望接入 DeepSeek 大模型，作为“AI 讲题助手”，帮助用户理解题目背后的原理、工程场景和面试追问。

本次改造的核心不是增加一个普通 AI 聊天框，而是实现一个**题目感知型、阶段受控、上下文连续的 AI 讲题助手**。

最终效果：

1. 用户在每道题下方或侧边栏看到一个 AI 讲题助手。
2. AI 讲题助手围绕当前题目工作，不脱离题目上下文。
3. 同一道题的所有 AI 交互在同一个对话 thread 里，不因为点击不同功能按钮而丢失上下文。
4. 用户提交答案前，AI 只能给提示，不能直接泄露答案。
5. 用户提交答案后，AI 可以进行讲解、错因分析、工程例子、面试追问。
6. 用户可以自由追问，但回答权限由当前题目状态控制。
7. 所有 AI 输出仅作为辅助讲解，题库标准答案仍然是最终依据。

---

## 二、设计原则

### 2.1 一个题目一个连续 AI 对话

不要把“提示”“讲解”“工程例子”“面试追问”做成四个互不相关的独立请求结果区。

正确设计是：

```text
同一道题 + 当前 attempt -> 一个 ai_thread
所有按钮点击和自由追问 -> 追加到同一个 ai_thread
AI 每次回复 -> 保留在 ai_messages 中
```

原因：DeepSeek 的 chat completions API 是 stateless，多轮对话需要应用侧自己保存并重新传入历史消息。因此系统必须保存 AI 对话历史，不能依赖模型服务端自动记忆上下文。

---

### 2.2 四个阶段，不是四个聊天窗口

AI 讲题助手分为四个核心阶段：

```text
阶段 1：AI 提示
阶段 2：AI 讲解 + 错因分析
阶段 3：工程例子
阶段 4：面试追问
```

这四个阶段通过按钮触发，但它们都在同一个 AI 对话中连续发生。

按钮只是明确用户当前想做什么，不是重新创建一个新的聊天会话。

---

### 2.3 流程判断优先靠系统状态，不靠大模型猜

不要让大模型自己判断“现在是否可以讲答案”。

必须由系统状态控制：

```text
当前题是否已提交？
当前 AI thread 是否已经生成过讲解？
当前 AI thread 是否已经生成过工程例子？
当前 AI thread 是否已经生成过面试追问？
```

大模型只负责生成内容，不负责越权决策。

---

### 2.4 提交前后传给模型的上下文不同

这是防止泄露答案的核心。

用户提交前：

```text
可以传：题干、题型、选项、难度、考察点、模块、用户尚未提交状态
不能传：标准答案、参考答案、选项解析、评分点、正确选项、完整解析
```

用户提交后：

```text
可以传：题干、题型、选项、标准答案、参考答案、选项解析、评分点、用户答案、本次是否正确、历史状态
```

不要只靠 prompt 禁止模型泄露答案。提交前后要从数据源头控制上下文。

---

## 三、用户侧交互规划

### 3.1 页面区域

建议在刷题页增加一个 AI 面板：

```text
AI 讲题助手
状态：答题中 / 已提交 / 已讲解

按钮区：
[给我提示]
[讲解与错因分析]
[工程例子]
[面试追问]

对话区：
显示同一道题的完整 AI 对话历史。

输入区：
用户可以自由追问当前题。
```

建议位置：

1. 如果页面右侧已有“练习上下文”，可以在其下方增加 AI 面板。
2. 如果右侧空间不足，可以放在题目卡片下方，答案输入区域上方或下方。
3. 移动端或窄屏可以折叠为抽屉面板。

---

### 3.2 四个按钮

按钮名称固定为：

```text
给我提示
讲解与错因分析
工程例子
面试追问
```

不要使用太泛的名称，例如“AI 帮助”“智能分析”。按钮需要让用户明确知道当前动作。

---

### 3.3 自由输入框

自由输入框一直存在，但不同阶段权限不同。

输入框 placeholder 示例：

提交前：

```text
可以问概念、思路、题干含义，但 AI 不会直接告诉你答案。
```

提交后：

```text
可以继续追问这道题的原理、错因、工程场景或面试回答。
```

---

## 四、四阶段详细定义

## 阶段 1：AI 提示

### 4.1 触发条件

```text
当前题目尚未提交答案
```

### 4.2 允许入口

```text
点击按钮：给我提示
自由输入：用户问“提示一下”“这题怎么想”“这个概念是什么意思”等
```

### 4.3 允许 AI 输出

```text
1. 解释题目考察的核心概念
2. 提供解题切入点
3. 提醒容易混淆的地方
4. 解释题干术语
5. 给不超过 2 条启发式提示
```

### 4.4 禁止 AI 输出

```text
1. 正确答案
2. 正确选项字母
3. 标准答案全文
4. 选项逐项解析
5. 直接替用户完成主观题答案
6. 明确告诉用户“应该选 A/B/C/D”
```

### 4.5 Prompt 模板

```text
你是一个面向 Agent 应用层岗位题库的 AI 讲题助手。

当前用户还没有提交本题答案。
你只能给解题提示，不能泄露正确答案，不能直接说应该选择哪个选项，不能输出标准答案或完整解析。

请基于当前题目输出：
1. 本题考察的核心概念
2. 解题切入点
3. 一个容易踩坑的点
4. 最多两个提示

输出要求：
- 使用中文
- 简洁清晰
- 不超过 200 字
- 不要出现“正确答案是”
- 不要出现具体选项字母
- 不要输出标准答案全文
```

---

## 阶段 2：AI 讲解 + 错因分析

### 4.6 触发条件

```text
当前题目已经提交答案
```

建议在用户提交答案后，将这个按钮高亮，作为推荐下一步。

### 4.7 为什么讲解和错因分析要合并

讲解和错因分析不应该分开，因为用户真正需要知道的是：

```text
1. 标准答案为什么成立
2. 自己的答案哪里对
3. 自己的答案哪里错
4. 自己少答了哪些关键点
5. 面试时应该怎么组织回答
```

单纯讲标准答案会变成被动看解析，错因分析才能让用户形成改进反馈。

### 4.8 输出结构

AI 应该输出：

```text
1. 这题考什么
2. 标准答案的核心逻辑
3. 你的答案中正确的部分
4. 你的答案中缺失或不准确的部分
5. 背后的原理
6. 推荐补充表达
7. 一句话记忆
```

如果用户没有填写答案，例如直接提交空答案，则跳过“你的答案中正确的部分”，改为说明“你本题未填写答案，下面直接讲标准思路”。

### 4.9 Prompt 模板

```text
你是一个 Agent 应用层岗位题库的 AI 讲题助手。

当前用户已经提交本题答案。请结合题目、标准答案、解析、评分点和用户答案进行讲解与错因分析。

请严格按照以下结构输出：

## 这题考什么
说明本题的核心考察点。

## 标准思路
拆解标准答案的关键逻辑，不要只是照抄标准答案。

## 你的答案分析
指出用户答案中正确的部分、缺失的部分、不准确的部分。
如果用户答案为空，说明用户未作答，并直接进入标准思路讲解。

## 背后的原理
解释这道题背后的工程或理论原理。

## 推荐补充表达
给出用户下次答题时可以补充的表达。

## 一句话记忆
用一句话帮助用户记住这道题。

要求：
- 使用中文
- 不要重新改写题目
- 不要编造题库中没有的信息
- 不要过度扩展到无关内容
- 以题库标准答案为主要依据
```

---

## 阶段 3：工程例子

### 4.10 触发条件

建议条件：

```text
当前题目已经提交答案
并且已经完成“讲解与错因分析”
```

不建议在提交前开放工程例子，因为工程例子往往会间接暴露答案。

### 4.11 输出目标

工程例子的作用是把抽象知识转成项目理解，尤其适合 Agent、RAG、多智能体、工具调用、状态管理、上下文工程、结构化输出等题目。

AI 应该输出：

```text
1. 一个具体工程场景
2. 这个场景为什么对应当前题目
3. 如果使用题目中的方案 A，系统怎么设计
4. 如果使用题目中的方案 B，系统怎么设计
5. 两种方案各自的优缺点
6. 面试时如何把这个例子讲出来
```

### 4.12 Prompt 模板

```text
你是一个 Agent 工程面试辅导助手。

请基于当前题目、标准答案、用户答案以及前面的讲解，给出一个具体工程例子，帮助用户理解这道题在真实项目中的落地方式。

输出结构：

## 工程场景
描述一个具体项目场景。

## 为什么这个场景对应本题
说明题目知识点和工程场景之间的对应关系。

## 方案落地
结合题目中的核心概念，说明在该项目中应该如何设计。

## 可能的问题
说明这个设计在真实工程里会遇到的问题。

## 面试表达
给出一段适合面试中使用的表达。

要求：
- 必须结合当前题目
- 不要泛泛而谈
- 不要自动进入面试追问阶段
- 不要输出过长内容
```

---

## 阶段 4：面试追问

### 4.13 触发条件

建议条件：

```text
当前题目已经提交答案
并且已经完成“讲解与错因分析”
```

工程例子不是面试追问的强前置条件。也就是说，用户可以在讲解后直接点“面试追问”。

### 4.14 输出目标

面试追问用于帮助用户从“会做题”提升到“能被面试官继续追问”。

AI 应该输出：

```text
1. 3 到 5 个面试官可能追问的问题
2. 每个问题背后的考察点
3. 简短回答要点
4. 更高质量回答方向
```

### 4.15 Prompt 模板

```text
你是一个 Agent 应用层岗位面试官。

请基于当前题目、标准答案、用户答案和前面的讲解，生成本题可能的面试追问。

输出结构：

## 追问 1
问题：
考察点：
回答要点：

## 追问 2
问题：
考察点：
回答要点：

## 追问 3
问题：
考察点：
回答要点：

可选输出第 4、5 个追问，但不要超过 5 个。

要求：
- 追问必须贴合当前题目
- 不要生成和本题无关的泛泛问题
- 回答要点要适合面试现场表达
- 不要输出标准答案原文的简单重复
```

---

## 五、按钮权限状态机

## 5.1 状态定义

建议维护以下状态：

```text
answering                  # 用户正在答题，尚未提交
submitted_not_explained     # 用户已提交，但还没有 AI 讲解
explained                   # 已完成 AI 讲解与错因分析
example_done                # 已生成工程例子
interview_done              # 已生成面试追问
```

注意：状态不是严格单向流程。用户在 `explained` 之后可以多次追问，也可以重复生成工程例子或面试追问。

---

## 5.2 状态转换

```text
answering
  用户提交答案
    -> submitted_not_explained

submitted_not_explained
  用户点击“讲解与错因分析”
    -> explained

explained
  用户点击“工程例子”
    -> example_done

explained 或 example_done
  用户点击“面试追问”
    -> interview_done
```

---

## 5.3 按钮权限表

| 当前状态 | 给我提示 | 讲解与错因分析 | 工程例子 | 面试追问 | 自由讨论 |
|---|---|---|---|---|---|
| answering | 可用 | 禁用 | 禁用 | 禁用 | 只允许提示和概念解释，不能泄露答案 |
| submitted_not_explained | 可用 | 可用，推荐高亮 | 禁用 | 禁用 | 可讨论，但应引导先讲解 |
| explained | 可用 | 可用 | 可用 | 可用 | 完全开放本题相关讨论 |
| example_done | 可用 | 可用 | 可用 | 可用 | 完全开放本题相关讨论 |
| interview_done | 可用 | 可用 | 可用 | 可用 | 完全开放本题相关讨论 |

---

## 5.4 禁用按钮提示文案

提交前禁用讲解按钮：

```text
提交本题后可查看讲解与错因分析
```

提交前禁用工程例子：

```text
提交并查看讲解后可生成工程例子
```

提交前禁用面试追问：

```text
提交并查看讲解后可生成面试追问
```

已提交但尚未讲解时禁用工程例子：

```text
请先完成讲解与错因分析
```

已提交但尚未讲解时禁用面试追问：

```text
请先完成讲解与错因分析
```

---

## 六、自由讨论与意图识别

## 6.1 自由讨论必须保留

用户不能只能点击按钮。每个阶段都应该允许自由输入。

但是自由输入要经过系统状态控制：

```text
提交前：只能提示、解释概念、解释题干，不允许答案泄露
提交后：允许完整讲解、错因分析、工程例子、面试追问、概念扩展
```

---

## 6.2 第一版意图识别采用规则优先

第一版不需要上复杂的模型分类器。建议用规则做轻量 intent router。

意图类型：

```text
hint_request
answer_leak_request
explanation_request
diagnosis_request
engineering_example_request
interview_followup_request
concept_clarification
off_topic
```

规则示例：

```text
包含“答案是什么”“选什么”“标准答案”“直接告诉我”“完整答案”
=> answer_leak_request

包含“提示”“思路”“怎么想”“切入点”
=> hint_request

包含“讲解”“解析”“为什么”
=> explanation_request

包含“我哪里错”“错因”“差距”“少了什么”
=> diagnosis_request

包含“工程”“项目”“实际场景”“例子”
=> engineering_example_request

包含“面试”“追问”“面试官”
=> interview_followup_request
```

---

## 6.3 提交前的自由输入拦截

如果用户提交前问：

```text
这题选什么？
标准答案是什么？
帮我写一版完整答案。
```

系统不要调用完整讲解 prompt。应该调用防泄露提示 prompt，回复类似：

```text
你还没有提交答案。我不能直接给出标准答案，但可以给你一个解题方向：这题可以从概念定义、适用场景、优缺点和工程约束几个角度思考。
```

关键要求：

```text
提交前不要把标准答案传给模型。
提交前不要让模型看到 reference_answer / answer / option_analysis / scoring_points。
```

---

## 6.4 提交后的自由输入

提交后用户可以问：

```text
为什么我这个答案不完整？
这个概念怎么用在项目里？
面试官可能怎么继续问？
这个和 LangGraph 的状态有什么关系？
```

此时可以把题目、标准答案、用户答案、前文讲解一起传给模型。

---

## 七、数据表设计

## 7.1 ai_threads

新增表：`ai_threads`

字段建议：

```text
id INTEGER PRIMARY KEY
user_id TEXT NOT NULL DEFAULT 'local'
question_id INTEGER NOT NULL
attempt_id INTEGER
current_stage TEXT NOT NULL DEFAULT 'answering'
has_hint INTEGER NOT NULL DEFAULT 0
has_explanation INTEGER NOT NULL DEFAULT 0
has_engineering_example INTEGER NOT NULL DEFAULT 0
has_interview_followup INTEGER NOT NULL DEFAULT 0
created_at DATETIME NOT NULL
updated_at DATETIME NOT NULL
is_active INTEGER NOT NULL DEFAULT 1
```

说明：

```text
question_id：当前题目
attempt_id：当前答题记录。如果用户未提交，可以为空；提交后绑定 attempt_id。
current_stage：用于控制按钮权限
has_xxx：用于判断某阶段是否已生成过
```

---

## 7.2 ai_messages

新增表：`ai_messages`

字段建议：

```text
id INTEGER PRIMARY KEY
thread_id INTEGER NOT NULL
role TEXT NOT NULL          # user / assistant / system_event
stage TEXT NOT NULL         # hint / explanation / engineering_example / interview_followup / free_chat / guardrail
content TEXT NOT NULL
metadata_json TEXT
created_at DATETIME NOT NULL
```

说明：

```text
role=user：用户自由输入或按钮触发后生成的用户意图消息
role=assistant：模型回复
role=system_event：系统状态变化，例如“用户已提交答案”
stage：消息所属阶段，方便前端展示和后续统计
metadata_json：可记录 model、token usage、latency、finish_reason、error_code 等
```

---

## 7.3 AI 对话和 attempt 的关系

建议：

```text
同一道题当前练习 attempt 对应一个 ai_thread。
如果用户重新开始同一道题的新 attempt，可以创建新的 ai_thread。
历史 ai_thread 不删除，复盘时可以查看。
```

不要把不同 attempt 的 AI 对话混在一起，否则用户会混淆“上次答题”和“本次答题”。

---

## 八、后端模块设计

建议新增模块：

```text
backend/services/llm/
  deepseek_client.py
  prompt_builder.py
  ai_tutor_service.py
  intent_router.py
  output_guard.py
```

### 8.1 deepseek_client.py

职责：

```text
1. 封装 DeepSeek API 调用
2. 支持 stream / non-stream
3. 支持模型参数
4. 统一处理错误
5. 禁止日志输出 api_key
```

示例：

```python
from openai import OpenAI

class DeepSeekClient:
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com"):
        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def chat(self, *, messages, model: str, stream: bool = False, response_format=None, max_tokens: int = 1200):
        return self.client.chat.completions.create(
            model=model,
            messages=messages,
            stream=stream,
            response_format=response_format,
            max_tokens=max_tokens,
        )
```

---

### 8.2 prompt_builder.py

职责：

```text
1. 根据当前阶段构造系统 prompt
2. 根据 submitted 状态决定是否包含标准答案
3. 组装当前题目上下文
4. 组装最近 N 轮 AI 对话历史
```

必须保证：

```text
submitted=false 时，不得把标准答案、参考答案、选项解析、评分点加入 prompt。
submitted=true 后，才允许加入完整答案上下文。
```

---

### 8.3 ai_tutor_service.py

职责：

```text
1. 创建或获取 ai_thread
2. 根据按钮 action 或自由输入判断目标阶段
3. 校验当前阶段是否允许该 action
4. 调用 prompt_builder 构造 messages
5. 调用 deepseek_client
6. 保存 user message 和 assistant message
7. 更新 ai_thread 状态
```

---

### 8.4 intent_router.py

职责：

```text
1. 对自由输入做轻量规则分类
2. 返回 intent
3. 在提交前拦截 answer_leak_request
4. 对 off_topic 做温和限制，引导回当前题目
```

第一版规则即可，不需要模型分类。

---

### 8.5 output_guard.py

职责：

```text
1. 提交前检查 AI 输出是否疑似包含答案
2. 过滤或拒绝 raw HTML
3. 对 Markdown 输出做安全处理
4. 统一追加“AI 讲解仅供辅助，最终以题库标准答案为准”
```

注意：输出 guard 只能作为补充，不能替代“提交前不传标准答案”。

---

## 九、API 设计

## 9.1 AI 配置测试

```http
POST /api/ai/test-connection
```

请求：

```json
{
  "provider": "deepseek",
  "base_url": "https://api.deepseek.com",
  "api_key": "sk-xxxx",
  "model": "deepseek-v4-flash"
}
```

响应：

```json
{
  "ok": true,
  "message": "DeepSeek 连接成功"
}
```

要求：

```text
1. 不保存 api_key
2. 不在日志中打印 api_key
3. 错误时返回友好提示，不返回完整异常堆栈给前端
```

---

## 9.2 获取当前题目的 AI thread

```http
GET /api/ai/thread?question_id=123&attempt_id=456
```

响应：

```json
{
  "thread_id": 1,
  "current_stage": "explained",
  "has_hint": true,
  "has_explanation": true,
  "has_engineering_example": false,
  "has_interview_followup": false,
  "messages": [
    {
      "role": "user",
      "stage": "hint",
      "content": "给我提示",
      "created_at": "..."
    },
    {
      "role": "assistant",
      "stage": "hint",
      "content": "这题主要考察...",
      "created_at": "..."
    }
  ]
}
```

---

## 9.3 发送按钮动作

```http
POST /api/ai/thread/action
```

请求：

```json
{
  "question_id": 123,
  "attempt_id": 456,
  "action": "explanation",
  "provider": "deepseek",
  "base_url": "https://api.deepseek.com",
  "api_key": "sk-xxxx",
  "model": "deepseek-v4-flash",
  "stream": true
}
```

`action` 可选：

```text
hint
explanation
engineering_example
interview_followup
```

要求：

```text
1. 后端根据 question_id / attempt_id 自己查题目和用户答案。
2. 前端不要传完整题干、标准答案、用户答案，避免篡改。
3. 后端校验当前题目提交状态，决定 action 是否允许。
4. 不允许的 action 返回 403 或业务错误码。
```

---

## 9.4 自由追问

```http
POST /api/ai/thread/message
```

请求：

```json
{
  "question_id": 123,
  "attempt_id": 456,
  "content": "为什么 Mesh 架构通信复杂度更高？",
  "provider": "deepseek",
  "base_url": "https://api.deepseek.com",
  "api_key": "sk-xxxx",
  "model": "deepseek-v4-flash",
  "stream": true
}
```

后端流程：

```text
1. 获取或创建 ai_thread
2. 读取当前题目提交状态
3. intent_router 判断用户意图
4. 如果提交前请求答案泄露，走 guardrail prompt，不传标准答案
5. 如果提交后，按正常自由讨论处理
6. 保存用户消息
7. 调用 DeepSeek
8. 保存 AI 回复
```

---

## 十、DeepSeek 配置

## 10.1 前端配置项

建议在页面顶部或设置弹窗中增加：

```text
AI Provider: DeepSeek
Base URL: https://api.deepseek.com
API Key: sk-xxxx
Model: deepseek-v4-flash / deepseek-v4-pro
流式输出：开启 / 关闭
```

## 10.2 API Key 存储策略

本地单用户版本优先采用：

```text
sessionStorage 保存 API Key
每次调用 AI 接口时临时传给后端
后端只用于本次调用，不入库
```

后续多用户版本再考虑：

```text
API Key 加密入库
后端使用服务端密钥解密
前端只显示脱敏值
```

## 10.3 API Key 安全要求

```text
1. 不要写死在前端源码中
2. 不要提交到 Git
3. 不要记录到后端日志
4. 报错时不要返回完整 key
5. 前端显示时只显示 sk-****abcd
6. 后端日志过滤 Authorization / Bearer / api_key 字段
```

---

## 十一、上下文组装策略

## 11.1 提交前上下文

提交前只允许以下字段进入 prompt：

```json
{
  "question_id": "evaluation_MA016",
  "type": "subjective",
  "difficulty": 4,
  "module": "Agent 应用层岗位题库",
  "knowledge_points": ["多智能体架构", "Hub-and-Spoke", "Mesh"],
  "stem": "比较集中式（Hub-and-Spoke）和对等式（Mesh/点对点）多智能体系统架构的主要差异和各自适用场景。",
  "options": null,
  "submitted": false
}
```

禁止字段：

```text
answer
reference_answer
option_analysis
scoring_points
standard_answer
correct_options
```

---

## 11.2 提交后上下文

提交后允许完整上下文：

```json
{
  "question_id": "evaluation_MA016",
  "type": "subjective",
  "difficulty": 4,
  "module": "Agent 应用层岗位题库",
  "knowledge_points": ["多智能体架构", "Hub-and-Spoke", "Mesh"],
  "stem": "比较集中式（Hub-and-Spoke）和对等式（Mesh/点对点）多智能体系统架构的主要差异和各自适用场景。",
  "options": null,
  "reference_answer": "...",
  "scoring_points": ["..."],
  "user_answer": "...",
  "submitted": true,
  "is_correct": null
}
```

---

## 11.3 历史消息窗口

每次调用模型时，不必传完整历史。建议传最近 N 轮：

```text
最近 8 到 12 条 ai_messages
```

如果后续对话很长，可以做摘要：

```text
ai_thread.summary
```

第一版可以先不做摘要，只截断最近消息。

---

## 十二、流式输出

建议支持流式输出，提升讲题体验。

前端表现：

```text
用户点击按钮
按钮进入 loading
AI 回复逐字/逐段出现
完成后保存完整 assistant message
```

错误处理：

```text
1. API Key 错误：提示“DeepSeek API Key 无效或权限不足”
2. 网络错误：提示“连接 DeepSeek 失败，请检查网络或 Base URL”
3. 模型不存在：提示“当前模型不可用，请更换模型”
4. 返回内容为空：提示“模型没有返回有效内容，请重试”
```

---

## 十三、安全边界

LLM 应用需要考虑 prompt injection、insecure output handling、敏感信息泄露、资源滥用等风险。

本系统至少要做以下限制：

```text
1. 题目内容和用户输入都视为不可信输入。
2. 题目内容不能覆盖系统指令。
3. 提交前不传标准答案，从源头防泄露。
4. AI 输出按 Markdown 安全渲染，禁止直接插入 raw HTML。
5. 不允许模型输出的 HTML/JS 直接执行。
6. 后端日志过滤 api_key、Authorization、Bearer token。
7. 单次请求设置 max_tokens，避免成本失控。
8. 前端按钮 loading 期间禁止重复点击，避免并发刷接口。
9. AI 输出下方显示免责声明：AI 讲解仅供辅助，最终以题库标准答案为准。
```

---

## 十四、前端实现细节

## 14.1 AI 设置面板

建议提供一个设置入口：

```text
AI 设置
- DeepSeek API Key
- Base URL
- 模型
- 流式输出
- 测试连接
```

保存策略：

```text
sessionStorage
```

脱敏显示：

```text
sk-****abcd
```

---

## 14.2 AI 面板组件

建议组件拆分：

```text
AiTutorPanel
  AiTutorToolbar
  AiThreadMessages
  AiMessageInput
  AiConfigWarning
```

### AiTutorPanel

负责：

```text
1. 接收 question_id / attempt_id / submitted 状态
2. 加载 thread
3. 控制按钮权限
4. 调用 action/message 接口
```

### AiTutorToolbar

负责四个按钮：

```text
给我提示
讲解与错因分析
工程例子
面试追问
```

### AiThreadMessages

负责显示连续对话历史。

### AiMessageInput

负责自由追问。

### AiConfigWarning

如果未配置 API Key，显示：

```text
请先配置 DeepSeek API Key 后使用 AI 讲题助手。
```

---

## 14.3 前端状态计算

前端不要自己判断答案是否正确，但可以根据后端返回状态控制 UI。

后端返回：

```json
{
  "submitted": true,
  "ai_stage": "explained",
  "allowed_actions": {
    "hint": true,
    "explanation": true,
    "engineering_example": true,
    "interview_followup": true
  }
}
```

前端按 `allowed_actions` 渲染按钮，不重复写复杂权限逻辑。

---

## 十五、后端权限校验规则

后端必须校验 action 权限。不能只依赖前端禁用按钮。

规则：

```text
if action == hint:
    allow

if action == explanation:
    require submitted == true

if action == engineering_example:
    require submitted == true and has_explanation == true

if action == interview_followup:
    require submitted == true and has_explanation == true
```

如果不满足：

```json
{
  "ok": false,
  "error_code": "ACTION_NOT_ALLOWED",
  "message": "请先提交答案并查看讲解与错因分析。"
}
```

---

## 十六、错误处理

统一错误码：

```text
AI_CONFIG_MISSING         未配置 API Key
AI_AUTH_FAILED            API Key 无效或权限不足
AI_MODEL_NOT_FOUND        模型不可用
AI_NETWORK_ERROR          网络错误
AI_RATE_LIMITED           请求过于频繁
ACTION_NOT_ALLOWED        当前阶段不允许该操作
QUESTION_NOT_FOUND        题目不存在
ATTEMPT_NOT_FOUND         答题记录不存在
AI_EMPTY_RESPONSE         模型返回为空
AI_OUTPUT_PARSE_FAILED    输出解析失败
```

前端显示友好文案，不显示完整堆栈。

---

## 十七、测试用例

## 17.1 后端测试

必须覆盖：

```text
1. 未配置 API Key 时不能调用 AI。
2. API Key 错误时返回友好错误。
3. 提交前可以调用 hint。
4. 提交前不能调用 explanation。
5. 提交前不能调用 engineering_example。
6. 提交前不能调用 interview_followup。
7. 提交前 prompt 中不包含 standard answer / reference_answer / answer / option_analysis。
8. 提交后可以调用 explanation。
9. 未完成 explanation 时不能调用 engineering_example。
10. 未完成 explanation 时不能调用 interview_followup。
11. 完成 explanation 后可以调用 engineering_example。
12. 完成 explanation 后可以调用 interview_followup。
13. 自由输入在提交前请求答案时会被拦截。
14. AI 调用不会修改 questions。
15. AI 调用不会修改 attempts 的答案字段。
16. AI 调用不会修改 user_question_states。
17. api_key 不会写入数据库。
18. api_key 不会出现在日志中。
19. 同一 question_id + attempt_id 能复用同一个 ai_thread。
20. 新 attempt 会创建新的 ai_thread。
```

---

## 17.2 前端测试

必须覆盖：

```text
1. 未配置 API Key 时显示配置提示。
2. 配置 API Key 后可以测试连接。
3. 未提交时只有“给我提示”按钮可用。
4. 未提交时其他按钮禁用并显示原因。
5. 提交后“讲解与错因分析”按钮可用。
6. 讲解前“工程例子”和“面试追问”禁用。
7. 讲解后“工程例子”和“面试追问”可用。
8. 点击按钮后消息追加到同一个对话区。
9. 自由追问不会新开对话。
10. 刷新页面后 AI 对话历史仍然存在。
11. 流式输出期间按钮处于 loading。
12. DeepSeek 报错时显示友好提示。
```

---

## 十八、验收标准

本功能完成后，应满足以下标准：

```text
1. 刷题页出现 AI 讲题助手面板。
2. 用户可以配置 DeepSeek API Key、Base URL、模型和流式输出。
3. 同一道题同一次 attempt 的 AI 交互保存在同一个 thread。
4. 点击“给我提示”“讲解与错因分析”“工程例子”“面试追问”不会创建互相割裂的结果区。
5. 用户可以在同一个对话里自由追问。
6. 提交前 AI 不会看到标准答案。
7. 提交前 AI 不会直接泄露答案。
8. 提交后 AI 可以结合用户答案做讲解和错因分析。
9. 工程例子和面试追问必须在讲解后开放。
10. 前端禁用按钮，后端也必须做权限校验。
11. AI 输出不会修改题库、attempt、错题状态。
12. API Key 不入库、不进日志、不写死。
13. 刷新页面后 AI 对话历史仍能恢复。
14. 后端测试和前端 build 通过。
```

---

## 十九、建议交给 Codex 的执行提示词

```text
请在当前 FastAPI + SQLite + 前端题库系统中，增量实现“AI 讲题助手”功能。不要重构现有题库、刷题、错题、统计、导入和编辑逻辑。

实现目标：
1. 每道题、每次 attempt 对应一个连续的 ai_thread。
2. AI 讲题助手包含四个阶段按钮：给我提示、讲解与错因分析、工程例子、面试追问。
3. 四个按钮不是四个独立会话，而是向同一个 ai_thread 追加阶段消息。
4. 用户可以在同一个 AI 对话中自由追问。
5. 系统用状态机控制按钮权限和自由追问权限。
6. 提交前只允许提示和概念解释，不能泄露答案。
7. 提交前后传给模型的上下文必须不同：提交前不能传标准答案、参考答案、正确选项、选项解析、评分点。
8. 提交后才允许讲解、错因分析、工程例子和面试追问。
9. 工程例子和面试追问需要在讲解与错因分析完成后开放。
10. 使用 DeepSeek API，默认 base_url 为 https://api.deepseek.com。
11. API Key 由用户在前端配置，本地单用户版本先存 sessionStorage，后端每次临时使用，不入库。
12. API Key 不允许写死、不允许提交到仓库、不允许写入日志。
13. 后端新增 ai_threads 和 ai_messages 表。
14. 后端新增 services/llm/deepseek_client.py、prompt_builder.py、ai_tutor_service.py、intent_router.py、output_guard.py。
15. 后端新增 /api/ai/test-connection、/api/ai/thread、/api/ai/thread/action、/api/ai/thread/message 接口。
16. 前端新增 AiTutorPanel、AiTutorToolbar、AiThreadMessages、AiMessageInput、AiConfigWarning 组件。
17. 前端按钮状态以后端 allowed_actions 为准。
18. 后端必须校验 action 权限，不能只依赖前端禁用按钮。
19. AI 输出按安全 Markdown 渲染，禁止 raw HTML 执行。
20. 添加后端测试和前端测试，确保提交前不泄露答案、同一个 thread 连续对话、API Key 不入库不进日志。
```

---

## 二十、参考资料

1. DeepSeek API 文档：DeepSeek API 使用 OpenAI/Anthropic 兼容格式。  
   https://api-docs.deepseek.com/

2. DeepSeek 多轮对话文档：chat completions API 是 stateless，多轮对话需要应用侧拼接历史消息。  
   https://api-docs.deepseek.com/guides/multi_round_chat

3. DeepSeek JSON Output 文档：`response_format: {"type": "json_object"}`，prompt 中需要包含 json 说明和示例。  
   https://api-docs.deepseek.com/guides/json_mode

4. DeepSeek Chat Completion API 文档：messages 表示当前对话消息列表。  
   https://api-docs.deepseek.com/api/create-chat-completion

5. OWASP Top 10 for LLM Applications：LLM 应用需要关注 Prompt Injection、Insecure Output Handling、Sensitive Information Disclosure 等风险。  
   https://owasp.org/www-project-top-10-for-large-language-model-applications/
