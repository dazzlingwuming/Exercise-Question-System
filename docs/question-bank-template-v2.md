# Question Bank v2：交给 GPT 的唯一完整模板

将**本文件全文**与需要整理的原始题目、笔记或资料一起交给 GPT。它不是可直接导入的题库；请导入 GPT 生成并保存为 UTF-8 编码 `.md` 的结果。若 GPT 无法附文件，它只能返回无外层代码围栏的原始 Markdown。

## 你的任务

你是一名严谨的中文题库编辑。请把我随后提供的原始题目、笔记或资料整理成 `question-bank-format v2` 题库 Markdown。

## 硬性规则

1. 最终回复的**第一字符**必须是 `<!-- question-bank-format: v2 -->` 中的 `<`；格式声明必须完整地位于第一行。声明前不得有空行、BOM、标题、导语或任何其他字符。
2. 最终回复只能包含可导入的题库 Markdown：不得有解释、分析、道歉、导语、结语、注释或题库格式之外的内容；不得在整份题库首尾添加三个反引号，也不得用外层 `markdown` 代码围栏包裹题库。题目内容需要代码围栏时，只能放在 `|` 多行字段内部。
3. 每道题均以独立一行 `--- question ---` 开始。格式声明与第一题之间最多只放一个可选 Markdown 标题。
4. 所有顶层字段必须零缩进、从行首开始；禁止使用 Tab。`tags`、`directions`、`exam_points` 以及多选题/填空题的 `answer` 列表，每项固定以**两个 ASCII 空格**加 `- ` 开头；`options` 的每项也固定两个 ASCII 空格。所有 `字段: |` 的内容行（包括空行以外的每一行、代码围栏、Mermaid 和块公式定界符）固定两个 ASCII 空格缩进。
5. 只允许使用以下字段，不能臆造、翻译或加入其他字段：`question_id`、`title`、`type`、`difficulty`、`tags`、`directions`、`exam_points`、`stem`、`material`、`options`、`answer`、`reference_answer`、`scoring_standard`、`explanation`、`common_mistakes`、`follow_up_question`。
6. `question_id` 在本文件内唯一，以小写英文字母开头，且只含小写字母、数字和下划线；`difficulty` 必须是 1–5 的整数；`type` 只能是 `single_choice`、`multiple_choice`、`true_false`、`fill_blank`、`short_answer`、`essay`、`flow_order`、`concept_analysis`、`scenario_analysis`、`interview`、`debug_analysis`、`code_reading`、`system_design`、`project_follow_up` 或 `mock_interview`。
7. 严格按题型填写答案：
   - `single_choice`：必须有 2–6 个 `options`，每个键为单个大写字母、正文单行；`answer` 必须是一个已有选项键，例如 `answer: A`。
   - `multiple_choice`：必须有 2–8 个 `options`；`answer` 必须是至少两个不重复且都存在于 `options` 中的列表。
   - `true_false`：不得有 `options`；只能写 `answer: 正确` 或 `answer: 错误`。
   - `fill_blank`：不得有 `options`；`answer` 必须是至少一项的列表，多项仅表示可接受的同义答案。
   - 所有其余主观题：不得有 `options` 或 `answer`；必须同时提供非空的 `reference_answer: |` 和 `scoring_standard: |`。
8. 题干、材料、参考答案、解析、评分标准等需要多行 Markdown 时使用 `字段: |`；选项正文不能换行。公式用 `$...$` 或独占段落的 `$$...$$`，中文逗号、句号等标点必须写在公式定界符外，例如 `$a^2 + b^2 = c^2$。`。代码围栏和 Mermaid 只能放在 `|` 多行字段内部。
9. 保留原始资料的事实与题意；缺少可靠信息时宁可省略可选字段，也不要编造。客观题必须给出可验证答案；主观题必须给出可执行的评分标准。

## 输出前自检

在内部逐项自检：第一字符和第一行、题块分隔、零缩进、两个 ASCII 空格、无 Tab、允许字段、题型答案格式、公式标点和 `question_id` 唯一性。任何一项不满足，都先在内部修正，再只输出最终题库 Markdown。

## 缩进对照（仅用于理解，绝不能原样输出）

正确：

```
tags:
  - Agent
options:
  A: 正确选项（选项正文只能单行）
stem: |
  这一行属于题干。
  下一行也属于题干。
```

错误：

```
  type: single_choice
tags:
 - Agent
options:
    A: 错误选项
  B: 不能在这里
    换行
```

## 完整正式题库示例（仅供参照，不要连同本模板输出）

<!-- question-bank-format: v2 -->

# Question Bank v2 全题型与富文本示例

--- question ---
question_id: q_example_sc_001
title: 示例单选题
type: single_choice
difficulty: 2
tags:
  - 示例
directions:
  - 基础练习
exam_points:
  - 单选题答案格式
stem: |
  下列哪一项符合 question-bank-format v2 的单选题答案格式？
options:
  A: answer 下列出两个或以上选项键
  B: answer: A
  C: answer: 正确
answer: B
explanation: |
  单选题的 answer 必须是一个已存在的选项键，因此此题答案为 B。
common_mistakes: |
  把单选题答案写成列表，或把选项正文而不是选项键写入 answer。
follow_up_question: |
  如果选项键不是 A、B、C，而是 1、2、3，会通过 v2 校验吗？

--- question ---
question_id: q_example_mc_001
title: 示例多选题
type: multiple_choice
difficulty: 3
tags:
  - 示例
directions:
  - 基础练习
exam_points:
  - 多选题答案格式
stem: |
  下列哪些规则属于 **question-bank-format v2** 对多选题的要求？请注意行内代码 `answer` 的写法。
options:
  A: 至少提供两个选项
  B: answer 只能写一个选项键
  C: answer 使用两项或以上的列表
  D: 每个答案键都必须存在于 options 中
answer:
  - A
  - C
  - D
explanation: |
  多选题需要 2–8 个选项，answer 是至少两个已有选项键组成的列表。

--- question ---
question_id: q_example_tf_001
title: 示例判断题
type: true_false
difficulty: 1
tags:
  - 示例
directions:
  - 基础练习
exam_points:
  - 判断题答案格式
stem: |
  判断题在 v2 中可以使用 A/B 作为标准答案。
answer: 错误
explanation: |
  判断题不能写 options，answer 只能是“正确”或“错误”。

--- question ---
question_id: q_example_blank_001
title: 示例填空题
type: fill_blank
difficulty: 2
tags:
  - 示例
directions:
  - 基础练习
exam_points:
  - 填空题答案格式
stem: |
  用于增强大模型外部知识检索的典型技术缩写是 ____。
answer:
  - RAG
  - Retrieval-Augmented Generation
explanation: |
  填空题不能写 options；answer 使用列表表示多个可接受的同义答案。

--- question ---
question_id: q_example_design_001
title: Markdown、公式、代码与 Mermaid 示例主观题
type: system_design
difficulty: 4
tags:
  - 示例
  - 系统设计
directions:
  - 工程化
exam_points:
  - 状态机
  - 可观测性
stem: |
  请设计一个可恢复的异步任务执行系统。题干可使用 **加粗**、[链接](https://example.com)、~~删除线~~ 与行内代码 `trace_id`。
  行内公式使用 $E = mc^2$；中文句号放在公式外：$a^2 + b^2 = c^2$。
material: |
  系统需要调用外部工具；工具调用可能超时，并且重复执行可能造成副作用。

  块公式单独成段，并使用 $$ 定界：
  $$
  P(\text{success}) = 1 - P(\text{timeout})
  $$

  代码和 Mermaid 都必须放在 `|` 多行字段中：
  ```ts
  const pattern = /\d+/;
  const greeting = `Hello, ${name}`;
  ```

  ```mermaid
  stateDiagram-v2
    [*] --> pending
    pending --> running
    running --> succeeded
    running --> failed
  ```
reference_answer: |
  使用显式任务状态机，持久化输入、状态迁移、幂等键和错误分类。
  可重试错误采用退避策略，非重试错误进入人工处理；以 trace_id 串联模型、工具和状态事件。
scoring_standard: |
  - 状态机与恢复点完整：3 分
  - 幂等性与重试策略合理：3 分
  - 观测和审计信息完整：4 分
explanation: |
  重点是把任务状态和副作用边界持久化，而不是只依赖聊天记录。
common_mistakes: |
  只保存聊天记录，不保存工具调用幂等键和状态迁移，恢复后会重复产生副作用。
follow_up_question: |
  如果工具调用跨多个服务，trace_id、审计日志和重试状态应如何关联？
