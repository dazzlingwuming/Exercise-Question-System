# AI 题目生成功能设计文档

## 1. 功能背景

当前答题系统已经支持题库导入、答题、AI 讲解、AI 评分、AI 追问、学习摘要、错题记录和手动新增题目。

现在需要新增一个功能：

```text
AI 题目生成
```

该功能的目标不是让 AI 随机批量生成题目，而是基于用户当前正在回答的题目，以及该题目下产生的 AI 对话、AI 提示、AI 追问、用户答案、评分缺失点等上下文，生成新的候选题。

最终由用户判断候选题是否合适，并决定是否加入正式题库。

---

## 2. 功能定位

### 2.1 核心定义

```text
AI 题目生成 = 基于当前题目的完整作答上下文，生成 1-5 道新的候选题。
```

这里的“当前题目完整作答上下文”包括：

- 当前题目内容
- 当前题目的标准答案 / 参考答案
- 当前题目的解析、常见错误、面试追问
- 用户本次答案
- AI 提示
- AI 讲解
- AI 追问
- 用户与 AI 的问答记录
- AI 主观题评分结果
- AI 评分中的缺失点、扣分点、改进建议

该功能重点服务于：

```text
用户刷题过程中暴露出的薄弱点 → 生成新的补弱题 → 用户确认入库 → 后续继续练习
```

---

## 3. 功能边界

### 3.1 必须做

- 在 AI 对话消息旁边提供“生成题目”按钮。
- 用户点击后弹出生成设置面板。
- 用户可以选择题型。
- 用户可以选择生成数量，最多 5 道。
- 用户可以选择难度策略：保持原难度、降低难度、提高难度。
- 用户可以输入生成方向。
- 如果用户没有输入生成方向，则系统默认根据当前题目的缺失点、AI 评分扣分点、AI 追问和综合上下文生成。
- AI 生成后进入候选题确认页。
- 候选题不能直接写入正式题库。
- 用户可以决定是否加入题库。
- 对生成题目进行结构校验。
- 对生成题目进行答案一致性和质量评分。
- 对生成题目进行重复度检测。
- 重复度检测只比较题干和已有题目题干的文本相似度。
- 每道候选题展示相似度最高的 3 道已有题。

### 3.2 不做

- 不新增“题库管理页”的 AI 生成入口。
- 不做“选择历史作答记录生成题目”。
- 不做基于知识点覆盖缺口的自动生成。
- 不做基于外部 Markdown 的生成。
- 不做 embedding 语义相似度检测。
- 不比较选项相似度。
- 不比较答案相似度。
- 不比较知识点相似度。
- 不让 AI 生成题目后自动入库。
- 不做批量无审核入库。

---

## 4. 前端入口设计

### 4.1 入口位置

入口只放在答题页面右侧 AI 对话区域中。

每条 AI 消息旁边增加按钮：

```text
生成题目
```

示例：

```text
AI：你这里没有讲清楚 checkpoint 如何保存中断前状态，也没有说明 resume 后上下文如何恢复。

[生成题目]
```

用户点击该按钮后，打开“AI 题目生成设置面板”。

---

## 5. 生成设置面板

### 5.1 面板字段

生成设置面板包含以下字段：

```text
题型
生成数量
难度
生成方向
```

---

### 5.2 题型选择

题型由用户选择。

可选题型应复用当前系统已有题型，例如：

- 单选题
- 多选题
- 判断题
- 填空题
- 简答题
- 概念辨析题
- 场景分析题
- Debug 排查题
- 代码阅读 / 伪代码题
- 系统设计题
- 项目追问题
- 面试题

具体枚举以当前系统已有题型为准，不要新增一套独立题型体系。

---

### 5.3 生成数量

用户可以选择生成数量：

```text
1 道
2 道
3 道
4 道
5 道
```

规则：

```text
最少生成 1 道
最多生成 5 道
默认生成 1 道
```

如果用户选择多道题，AI 生成的题目之间不能只是简单改写几个词。

---

### 5.4 难度设置

用户可以选择：

```text
保持原难度
降低难度
提高难度
```

默认值：

```text
保持原难度
```

说明：

- 保持原难度：新题难度与当前题目基本一致。
- 降低难度：更偏基础概念和关键点识别。
- 提高难度：更偏工程场景、排查流程、系统设计或面试深挖。

---

### 5.5 生成方向

生成方向提供一个文本输入框。

用户可以手动输入希望加强的方向。

示例：

```text
我想加强 tool_result 写回状态这部分。
```

或者：

```text
重点考察 checkpoint 和 resume 的关系。
```

或者：

```text
生成一道更偏工程排查的题。
```

如果用户没有输入生成方向，则使用默认策略：

```text
优先根据用户答案缺失点、AI 评分扣分点、AI 追问暴露出的薄弱点生成；
如果缺失点不明显，则基于当前题目的核心知识点生成变式题。
```

---

## 6. 生成上下文收集

用户点击“生成题目”后，前端或后端需要收集当前题目下的完整上下文。

### 6.1 当前题目上下文

需要传给 AI：

```text
question_id
module
type
difficulty
knowledge_points
stem
options
answer
reference_answer
explanation
common_mistakes
interview_followups
```

如果部分字段不存在，可以为空，但字段结构需要保持稳定。

---

### 6.2 用户答案上下文

需要传给 AI：

```text
user_answer
is_correct
score
answer_time
```

如果是主观题，还需要包含 AI 评分结果。

---

### 6.3 AI 评分上下文

如果当前题目存在 AI 评分卡，需要传入：

```text
total_score
dimension_scores
covered_points
missing_points
incorrect_points
improvement_suggestions
better_reference_expression
```

其中最重要的是：

```text
missing_points
incorrect_points
improvement_suggestions
```

这些字段应优先影响新题生成方向。

---

### 6.4 AI 对话上下文

需要传入当前题目下的 AI 互动记录：

```text
当前点击的 AI 消息
AI 提示
AI 讲解
AI 追问
用户追问
AI 回答
AI 学习摘要
```

其中“当前点击的 AI 消息”应作为重点上下文。

---

## 7. 生成策略

### 7.1 默认生成策略

如果用户没有填写生成方向，则按以下优先级生成：

```text
第一优先级：用户答案缺失点
第二优先级：AI 评分扣分点
第三优先级：AI 追问中暴露的薄弱点
第四优先级：当前题目的核心知识点
第五优先级：当前题目的常见错误和面试延伸方向
```

目标是生成补弱题，而不是简单复制原题。

---

### 7.2 用户指定方向策略

如果用户填写了生成方向，则 Prompt 中必须明确加入：

```text
用户希望重点加强：{generation_direction}
```

AI 应优先围绕用户指定方向生成题目。

但是仍然需要保证：

- 新题和当前题目有关。
- 新题可以独立作答。
- 新题不是原题的简单改写。
- 新题符合用户选择的题型和难度。

---

## 8. AI 生成 Prompt

### 8.1 System Prompt

```text
你是一个技术面试题库出题助手。

你的任务是基于当前题目的完整作答上下文，为用户生成新的候选题。

你不能随机出题，也不能脱离当前题目上下文出题。

你应该优先根据用户本次作答中暴露出的缺失点、错误点、表达不完整的地方、AI 评分扣分点、AI 追问中暴露出的薄弱点来生成题目。

如果上下文中没有明显缺失点，则根据当前题目的核心知识点生成高质量变式题。

生成的题目必须是可以独立作答的正式题目，不能依赖“上面那道题”或“刚才的对话”才能理解。

输出必须是严格 JSON，不要输出 Markdown，不要输出解释性文本。
```

---

### 8.2 User Prompt 模板

```text
请基于下面的当前题目作答上下文，生成 {count} 道新的候选题。

用户选择的题型：{target_type}
用户选择的难度策略：{difficulty_strategy}
用户输入的生成方向：{generation_direction_or_empty}

如果用户没有输入生成方向，则使用默认策略：
优先根据用户答案缺失点、AI 评分扣分点、AI 追问暴露出的薄弱点生成；
如果缺失点不明显，则基于当前题目的核心知识点生成变式题。

生成要求：
1. 必须生成 {count} 道题。
2. 每道题必须符合用户选择的题型。
3. 每道题必须符合用户选择的难度策略。
4. 每道题必须可以独立作答。
5. 不要复制原题题干。
6. 不要只改几个词制造伪变式。
7. 题干、答案、解析、评分点必须一致。
8. 客观题必须保证答案明确。
9. 单选题只能有一个正确答案。
10. 多选题必须有两个或两个以上正确答案。
11. 主观题必须包含参考答案、关键词、评分点、常见错误和面试追问。
12. Debug 排查题必须包含 diagnosis_steps 和 optimization_points。
13. 系统设计题必须包含 architecture_points、data_flow、evaluation_metrics、risk_points。
14. 输出必须严格符合 JSON Schema。

当前题目上下文：
{question_context}

用户答案上下文：
{answer_context}

AI 评分上下文：
{grading_context}

AI 对话上下文：
{ai_chat_context}
```

---

### 8.3 输出 JSON 示例

```json
{
  "candidates": [
    {
      "type": "scenario_debug",
      "difficulty": "medium",
      "module": "Agent 应用层",
      "knowledge_points": ["工具调用", "Trace", "状态管理"],
      "stem": "某 Agent 在执行工具调用时，trace 中可以看到 tool_call，但最终回答里没有体现 tool_result。请你说明可能原因和排查步骤。",
      "options": null,
      "answer": null,
      "option_analysis": null,
      "reference_answer": "需要从工具调用链路、工具执行结果、状态写回、异常捕获和 trace 完整性几个角度排查。首先确认模型是否只是生成了 tool_call，还是应用层真正执行了工具；其次检查工具执行是否报错或超时；然后检查 tool_result 是否写回 Agent 状态或上下文；最后检查最终回答生成时是否读取到了 tool_result。",
      "answer_keywords": ["tool_call", "tool_result", "状态写回", "异常捕获", "trace", "checkpoint"],
      "scoring_points": [
        {
          "point": "能够区分 tool_call 生成和工具真正执行",
          "score": 2
        },
        {
          "point": "能够检查工具执行是否异常、超时或权限失败",
          "score": 2
        },
        {
          "point": "能够说明 tool_result 需要写回状态或上下文",
          "score": 2
        },
        {
          "point": "能够结合 trace 字段定位问题环节",
          "score": 2
        },
        {
          "point": "能够提出日志和状态管理优化方案",
          "score": 2
        }
      ],
      "diagnosis_steps": [
        "检查 trace 中是否存在 tool_call",
        "检查应用层是否真正执行了该工具",
        "检查工具执行结果是否异常、超时或为空",
        "检查 tool_result 是否写回 Agent 状态",
        "检查最终回答阶段是否读取到了 tool_result"
      ],
      "optimization_points": [
        "补充 tool_call、tool_result、tool_error、latency、status 等 trace 字段",
        "将工具结果写入统一状态对象",
        "对工具执行失败增加可观测日志和重试策略"
      ],
      "common_mistakes": [
        "只看到 tool_call 就认为工具已经成功执行",
        "把所有问题都归因于模型能力不足",
        "忽略 tool_result 没有写回上下文的问题"
      ],
      "interview_followups": [
        "如果 trace 中只有 tool_call，没有 tool_result，你会如何判断问题发生在哪一层？",
        "为什么 tool_result 不能只写日志，而必须进入 Agent 状态？"
      ]
    }
  ]
}
```

---

## 9. 结构校验

结构校验用代码完成，不交给大模型。

建议使用已有 Pydantic Schema 或新增 Candidate Schema。

### 9.1 通用校验

所有题型都必须校验：

```text
type 是否合法
difficulty 是否合法
module 是否存在
knowledge_points 是否为空
stem 是否为空
```

---

### 9.2 客观题校验

单选题、多选题、判断题、填空题等需要校验：

```text
options 是否存在
answer 是否存在
answer 是否在 options 中
option_analysis 是否覆盖所有选项
```

单选题额外校验：

```text
answer 长度必须为 1
```

多选题额外校验：

```text
answer 长度必须大于等于 2
```

---

### 9.3 主观题校验

简答题、概念辨析题、场景分析题、面试题等需要校验：

```text
reference_answer 是否存在
answer_keywords 是否存在
scoring_points 是否存在
interview_followups 是否存在
```

---

### 9.4 Debug 题校验

Debug 排查题需要额外校验：

```text
diagnosis_steps 是否存在
optimization_points 是否存在
```

---

### 9.5 系统设计题校验

系统设计题需要额外校验：

```text
architecture_points 是否存在
data_flow 是否存在
evaluation_metrics 是否存在
risk_points 是否存在
```

---

## 10. 答案一致性与质量评分

结构校验通过后，再调用大模型做答案一致性和质量评分。

### 10.1 注意

该阶段不要传入完整历史上下文。

只传入新生成的题目本身。

原因：

```text
减少 token 消耗
避免校验模型被原题上下文干扰
只检查新题自身是否自洽
```

---

### 10.2 校验输入

传给校验模型：

```text
题型
题干
选项
答案
解析
参考答案
评分点
题型要求
```

---

### 10.3 校验目标

校验模型判断：

```text
题干和答案是否一致
选项是否有歧义
是否存在多个正确答案
解析是否支持答案
评分点是否合理
题目是否可以独立作答
题目是否有面试价值
题目整体质量如何
```

---

### 10.4 校验输出 JSON

```json
{
  "is_consistent": true,
  "quality_score": 8.5,
  "problems": [],
  "suggestions": [
    "题干可以进一步补充 trace 现象，使场景更具体。"
  ]
}
```

如果存在问题：

```json
{
  "is_consistent": false,
  "quality_score": 5.5,
  "problems": [
    "题干问的是工具执行失败，但参考答案主要解释模型规划失败，考察点不一致。"
  ],
  "suggestions": [
    "将题干改成 tool_result 未写回上下文的排查题。"
  ]
}
```

---

## 11. 重复度检测

重复度检测第一版只做题干文本相似度。

### 11.1 检测对象

只比较：

```text
新生成题目的 stem
已有题目的 stem
```

不比较：

```text
选项
答案
解析
知识点
参考答案
```

---

### 11.2 检测结果

对每一道候选题，计算它和已有所有题目的题干相似度。

取相似度最高的 3 道已有题，展示给用户。

展示字段：

```text
question_id
stem
similarity_score
```

---

### 11.3 阈值说明

系统不需要强制阻止入库，只给用户提示。

建议显示规则：

```text
similarity_score >= 90：高度相似
75 <= similarity_score < 90：可能相似
similarity_score < 75：相似度较低
```

但是最终由用户判断是否入库。

---

### 11.4 Python 标准库实现

如果不想新增依赖，可以使用 `difflib.SequenceMatcher`：

```python
from difflib import SequenceMatcher

def calc_stem_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio() * 100


def find_top_similar_questions(new_stem: str, existing_questions: list, top_k: int = 3):
    results = []

    for q in existing_questions:
        score = calc_stem_similarity(new_stem, q.stem)
        results.append({
            "question_id": q.id,
            "stem": q.stem,
            "similarity_score": round(score, 2),
        })

    results.sort(key=lambda item: item["similarity_score"], reverse=True)
    return results[:top_k]
```

---

### 11.5 RapidFuzz 实现

如果可以新增依赖，推荐使用 RapidFuzz：

```bash
pip install rapidfuzz
```

```python
from rapidfuzz import fuzz

def calc_stem_similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return float(fuzz.token_set_ratio(a, b))


def find_top_similar_questions(new_stem: str, existing_questions: list, top_k: int = 3):
    results = []

    for q in existing_questions:
        score = calc_stem_similarity(new_stem, q.stem)
        results.append({
            "question_id": q.id,
            "stem": q.stem,
            "similarity_score": round(score, 2),
        })

    results.sort(key=lambda item: item["similarity_score"], reverse=True)
    return results[:top_k]
```

第一版可以优先使用标准库实现，后续再替换为 RapidFuzz。

---

## 12. AI 候选题确认页

生成完成后，跳转到 AI 候选题确认页。

### 12.1 页面展示

如果生成 1 道题，展示 1 张候选题卡片。

如果生成多道题，展示多张候选题卡片。

每张卡片展示：

```text
题干
题型
难度
知识点
选项 / 参考答案
解析 / 评分点
答案一致性校验结果
质量评分
重复度检测结果
```

---

### 12.2 重复度展示

每道候选题展示相似度最高的 3 道已有题：

```text
相似题 1：相似度 86%
题干：在 Agent 工具调用失败时，如何通过 trace 判断问题发生在哪个环节？

相似题 2：相似度 74%
题干：为什么 tool_call 出现不代表工具已经真正执行成功？

相似题 3：相似度 68%
题干：Agent 多步调用中，tool_result 为什么必须写回上下文？
```

提示文案：

```text
以上是与当前候选题题干最相似的 3 道已有题。请自行判断是否仍要入库。
```

---

### 12.3 操作按钮

每道候选题提供：

```text
加入题库
编辑后加入
取消这道
重新生成这道
```

第一版可以先实现：

```text
加入题库
取消
```

如果时间允许，再做：

```text
编辑后加入
重新生成这道
```

---

## 13. 后端接口建议

### 13.1 生成候选题接口

```http
POST /api/ai/question-generation/generate
```

请求参数：

```json
{
  "question_id": 123,
  "clicked_ai_message_id": "msg_001",
  "target_type": "scenario_debug",
  "count": 3,
  "difficulty_strategy": "keep",
  "generation_direction": "重点加强 tool_result 写回状态这部分。",
  "context": {
    "question": {},
    "user_answer": {},
    "ai_grading": {},
    "ai_chat_messages": []
  }
}
```

返回：

```json
{
  "generation_id": "gen_001",
  "candidates": [
    {
      "candidate_id": "cand_001",
      "question": {},
      "structure_validation": {},
      "ai_validation": {
        "is_consistent": true,
        "quality_score": 8.5,
        "problems": [],
        "suggestions": []
      },
      "similar_questions": [
        {
          "question_id": 12,
          "stem": "已有题干",
          "similarity_score": 86.2
        }
      ]
    }
  ]
}
```

---

### 13.2 确认入库接口

```http
POST /api/ai/question-generation/candidates/{candidate_id}/accept
```

请求参数：

```json
{
  "candidate_id": "cand_001"
}
```

返回：

```json
{
  "question_id": 456,
  "status": "accepted"
}
```

---

### 13.3 取消候选题接口

```http
POST /api/ai/question-generation/candidates/{candidate_id}/reject
```

请求参数：

```json
{
  "candidate_id": "cand_001",
  "reason": "用户取消"
}
```

返回：

```json
{
  "candidate_id": "cand_001",
  "status": "rejected"
}
```

---

## 14. 数据存储建议

虽然当前不需要复杂候选题池，但建议仍然在后端短期保存生成结果。

可以新增轻量候选题表，或者先存前端状态。

如果希望刷新页面后不丢失，建议后端建表：

```text
ai_question_generations
ai_question_candidates
```

### 14.1 ai_question_generations

字段建议：

```text
id
source_question_id
clicked_ai_message_id
target_type
count
difficulty_strategy
generation_direction
created_at
```

---

### 14.2 ai_question_candidates

字段建议：

```text
id
generation_id
candidate_json
structure_validation_json
ai_validation_json
similar_questions_json
status
accepted_question_id
created_at
updated_at
```

status 可选：

```text
pending
accepted
rejected
```

如果第一版不想新增表，也可以先前端临时保存。

但是更建议后端保存，因为用户从候选题确认页刷新后不应该全部丢失。

---

## 15. 前端页面流转

完整流程：

```text
答题页面
  ↓
用户点击某条 AI 消息旁边的“生成题目”
  ↓
弹出生成设置面板
  ↓
用户选择题型、数量、难度、生成方向
  ↓
调用生成接口
  ↓
生成成功
  ↓
跳转 AI 候选题确认页
  ↓
用户查看候选题、质量评分和相似题
  ↓
用户选择加入题库或取消
```

---

## 16. 用户体验细节

### 16.1 生成中状态

生成时显示：

```text
正在基于当前题目上下文生成候选题...
```

如果生成数量较多，显示：

```text
正在生成 3 道候选题，请稍候...
```

---

### 16.2 失败提示

如果 AI 生成失败：

```text
生成失败，请稍后重试。
```

如果结构校验失败：

```text
AI 生成的题目格式不完整，已拦截。请重新生成。
```

如果答案一致性较差：

```text
该候选题可能存在题干与答案不一致的问题，请谨慎入库。
```

---

### 16.3 相似度提示

```text
系统仅根据题干文本相似度检测重复题，不比较答案、选项和知识点。
```

这样用户知道检测逻辑是轻量检测，不是严格语义去重。

---

## 17. 实现优先级

### 第一阶段必须完成

- AI 对话消息旁边增加“生成题目”按钮。
- 生成设置面板。
- 支持题型选择。
- 支持数量选择，最多 5 道。
- 支持难度策略。
- 支持生成方向输入。
- 后端生成候选题接口。
- AI 生成 Prompt。
- 结构校验。
- 答案一致性和质量评分。
- 题干重复度检测。
- 候选题确认页。
- 用户确认加入题库。
- 用户取消候选题。

---

### 第二阶段可选

- 编辑后加入。
- 单道候选题重新生成。
- 候选题后端持久化。
- 候选题生成记录查看。
- RapidFuzz 替换 difflib。
- 更细的题型 Schema 校验。
- 多模型重试修复。
- 质量评分低于某个分数时自动提示重新生成。

---

## 18. 最终原则

```text
AI 题目生成只服务于当前答题上下文。
入口只放在 AI 对话消息旁边。
用户可以选择题型、数量、难度和生成方向。
系统最多生成 5 道候选题。
AI 生成后不直接入库，必须进入候选题确认页。
重复检测只比较题干相似度。
每道候选题展示相似度最高的 3 道已有题。
是否入库由用户最终决定。
```

---

## 19. Codex 实现提示

实现时不要大改现有题库结构。

优先复用当前已有能力：

- 现有题目 Schema
- 现有手动新增题目逻辑
- 现有 AI 调用服务
- 现有 AI 评分 JSON Output 能力
- 现有题型枚举
- 现有前端题目展示组件
- 现有题库入库接口
