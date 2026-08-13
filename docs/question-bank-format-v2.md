# question-bank-format v2 严格规范

唯一的 GPT 模板入口是 [question-bank-template-v2.md](./question-bank-template-v2.md)：将**这一份文件全文**与原始资料一起交给 GPT。该模板本身不能直接导入；只导入 GPT 生成的 UTF-8 `.md`，其第一字符必须是 `<!-- question-bank-format: v2 -->` 中的 `<`，且不能包含导语或外层代码围栏。无需再拼接提示词、格式规范或示例文档。

## 最小骨架

```markdown
<!-- question-bank-format: v2 -->

# 可选：题库标题

--- question ---
question_id: q_topic_sc_001
type: single_choice
difficulty: 2
stem: |
  题干。
options:
  A: 选项 A
  B: 选项 B
answer: A
```

硬性规则：

1. 文件第一行必须是格式声明；声明前不能有空行或导语（仅 UTF-8 BOM 例外）。
2. 每道题必须从独立一行 `--- question ---` 开始；声明与第一题之间只允许一个可选 Markdown 标题。
3. 顶层字段从行首开始，字段名只用小写英文、数字和下划线；不要使用 Tab。
4. `question_id` 在文件内唯一，以小写英文字母开头，只含小写字母、数字、下划线。
5. `difficulty` 只能是 `1` 到 `5` 的整数。不要写 `null`、`N/A`、`待补充` 或未定义字段。

## 缩进：正确与错误

列表、选项字典和 `|` 多行字段中的每一行都固定两个空格；顶层字段绝不缩进。

```markdown
# 正确
tags:
  - Agent
options:
  A: 正确选项（选项正文只能单行）
stem: |
  这一行属于题干。
  下一行也属于题干。

# 错误：顶层字段缩进、列表/选项缩进错误、选项换行
  type: single_choice
tags:
 - Agent
options:
    A: 错误选项
  B: 不能在这里
    换行
```

## 字段总表

| 字段 | 形式 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `question_id` | `q_topic_sc_001` | 是 | 文件内唯一 ID |
| `title` | 单行文本 | 否 | 人可读标题；省略时使用 `question_id` |
| `type` | 单行代码 | 是 | 只能是下表列出的题型 |
| `difficulty` | `1`–`5` | 是 | 整数，1 最基础、5 最困难 |
| `tags` / `directions` / `exam_points` | 两空格缩进的 `- 文本` 列表 | 推荐 | 题库、练习与知识点分类 |
| `stem` | 单行或 `stem: |` | 是 | 完整题干；含 Markdown 时使用 `|` |
| `material` | `material: |` | 否 | 背景、日志、代码、图表或约束 |
| `options` | 两空格缩进的 `A: 文本` 字典 | 单选/多选必填 | 单个大写字母键；每项正文单行 |
| `answer` | 单行或答案列表 | 客观题必填 | 格式随题型而变 |
| `reference_answer` | `reference_answer: |` | 主观题必填 | 参考答案 |
| `scoring_standard` | `scoring_standard: |` | 主观题必填 | 评分点、分值或可执行要求 |
| `explanation` | `explanation: |` | 推荐 | 复盘解析 |
| `common_mistakes` / `follow_up_question` | `字段: |` | 否 | 常见误区、延伸追问 |

## 允许的 `type`

| 类型代码 | 展示题型 | 答案分类 |
| --- | --- | --- |
| `single_choice` | 单选题 | 客观题 |
| `multiple_choice` | 多选题 | 客观题 |
| `true_false` | 判断题 | 客观题 |
| `fill_blank` | 填空题 | 客观题 |
| `short_answer` | 简答题 | 主观题 |
| `essay` | 论述题 | 主观题 |
| `flow_order` | 流程排序题 | 主观题 |
| `concept_analysis` | 概念辨析题 | 主观题 |
| `scenario_analysis` | 场景分析题 | 主观题 |
| `interview` | 面试题 | 主观题 |
| `debug_analysis` | Debug / 日志分析题 | 主观题 |
| `code_reading` | 代码阅读 / 伪代码设计题 | 主观题 |
| `system_design` | 系统设计题 | 主观题 |
| `project_follow_up` | 项目追问模拟 | 主观题 |
| `mock_interview` | 模拟面试套卷 | 主观题 |

## 按题型的强制格式

### 单选题 `single_choice`

```markdown
options:
  A: 选项 A
  B: 选项 B
answer: A
```

`options` 必须有 2–6 项；`answer` 必须恰好匹配一个已有选项键。

### 多选题 `multiple_choice`

```markdown
options:
  A: 选项 A
  B: 选项 B
  C: 选项 C
answer:
  - A
  - C
```

`options` 必须有 2–8 项；`answer` 至少有两个不重复、且存在于 `options` 的键。

### 判断题 `true_false`

```markdown
answer: 正确
```

不得写 `options`；`answer` 只接受 `正确` 或 `错误`。

### 填空题 `fill_blank`

```markdown
answer:
  - 可接受答案 1
  - 可接受答案 2
```

不得写 `options`；列表至少一项，多项表示可接受的同义答案。

### 所有主观题

```markdown
reference_answer: |
  结构化参考回答。
scoring_standard: |
  - 评分点一：5 分
  - 评分点二：5 分
```

不得写 `options` 或 `answer`；`reference_answer` 与 `scoring_standard` 都必须非空。

## Markdown、公式、代码和 Mermaid

`stem`、`material`、`reference_answer`、`explanation`、`common_mistakes`、`follow_up_question`、`scoring_standard` 均可使用 `字段: |` 编写 GFM 多行内容。支持的 GFM 包括加粗、删除线、链接、列表、引用、表格、行内代码和代码围栏。

- 行内公式使用 `$...$`，例如 `$E = mc^2$`；中文逗号、句号等标点放在公式定界符外，例如 `$a^2 + b^2 = c^2$。`
- 块公式使用独占段落的 `$$`，每一行（包括 `$$`）在导入文件中都保留两个空格缩进。
- 代码围栏和 `mermaid` 围栏必须置于 `|` 多行字段中，不能出现在顶层或 `options` 中。
- JavaScript 的反斜杠和模板字符串必须原样写进 Markdown，例如 `/\d+/` 与 `` `Hello, ${name}` ``；只有将 Markdown 模板嵌入 TypeScript 的反引号字符串时，才需额外转义反斜杠、反引号和 `${`，内置模板已正确处理。
- 链接只渲染根相对路径（如 `/questions`）及 `http://` / `https://` 地址；外链在新窗口打开，其他协议和协议相对地址（如 `//example.com`）不会启用。
- 原始 HTML 与外部图片不会渲染；请改用纯文本、代码围栏、公式或 Mermaid。不要使用 `<img>`、`<script>` 或 `![alt](https://...)` 作为题目内容依赖。

完整且可导入的写法请直接参考 [question-bank-template-v2.md](./question-bank-template-v2.md)。

## 提交前清单

- [ ] 文件第一行是 `<!-- question-bank-format: v2 -->`；声明前没有空行或导语，且所有题块有独立分隔行。
- [ ] 顶层字段未缩进；列表、选项和 `|` 内容均为两个空格；没有 Tab。
- [ ] 每个 `question_id` 唯一，`type`、`difficulty`、`stem` 完整。
- [ ] 选项键为单个大写字母，正文单行；客观题和主观题分别使用正确的答案字段。
- [ ] 公式定界完整且中文标点位于定界符外；代码和 Mermaid 都在 `|` 字段内。
- [ ] 没有 ChatGPT 导语、未定义字段、raw HTML 或外部图片依赖；已点击“解析预览”并处理阻断问题。
