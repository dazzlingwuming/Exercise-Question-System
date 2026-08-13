# 题库 Markdown 格式说明

## 唯一推荐格式：`question-bank-format: v2`

新题库统一使用 Markdown v2。让 GPT 出题时只需使用唯一的 [GPT 完整生成模板](./question-bank-template-v2.md)：把这份文件全文与原始资料一起发给 GPT。模板顶部已经包含任务、规则和自检清单，底部是所有题型的正式示例，不需要另外拼接提示词。完整字段规范见 [v2 严格规范](./question-bank-format-v2.md)。

一个文件必须以格式声明开头，每一道题使用单独一行的分隔符：

```markdown
<!-- question-bank-format: v2 -->

--- question ---
question_id: q_topic_sc_001
type: single_choice
difficulty: 2
stem: |
  题干内容
options:
  A: 选项 A
  B: 选项 B
answer: A
```

规则：

- `question_id` 必须在文件内唯一，以小写英文字母开头，只含小写字母、数字和下划线。
- `type` 只能使用系统支持的代码，完整清单见 [v2 严格规范](./question-bank-format-v2.md#3-允许的-type)。
- `difficulty` 必须是 `1` 到 `5`。
- 多行正文使用 `field: |`，后续每行缩进两个空格；列表也使用两个空格加 `- `。
- 选项固定写成 `A: 文本`，不要使用 `A.`、`（A）` 或 Markdown 编号列表。
- 单选题有 2–6 个选项，`answer: A` 必须是一个已有选项键；多选题有 2–8 个选项，答案使用列表。
- 判断题不能写 `options`，答案只能为 `正确` 或 `错误`；填空题不能写 `options`，答案使用一个或多个可接受答案的列表。
- 所有主观题不能写 `options` 或 `answer`，并且必须同时提供 `reference_answer` 与 `scoring_standard`。
- `tags`、`directions`、`exam_points`、`explanation` 虽不是全部必填，但缺失会在预览中提示。

不要只复制某一段规则或单独复制底部示例；应把 [GPT 完整生成模板](./question-bank-template-v2.md) 全文一次性交给 GPT。GPT 返回的另一份新 Markdown 才是待导入题库，模板本身不能直接导入。

## 导入流程

导入页会先解析预览，再允许写入：

1. 粘贴 Markdown 或选择本地 `.md` 文件；文件名会预填为本次导入批次名。
2. 选择这批题目的目标集合。批次名只用于审计，不决定题目归档；A/B 批次可以导入同一集合。
3. 查看题型、难度、字段错误、警告和数据库重复检测。
4. 没有阻断问题时，选择“追加导入”。内容完全相同的已有题会跳过；同 ID/`part_id` 但内容不同的题会阻止导入，避免覆盖历史题目。
5. “重置并重新导入”会删除题目、答题记录、历史和 AI 关联记录，但保留集合树；必须输入 `重置题库` 确认。

## 旧格式兼容

`Part N-NNN｜题型｜难度`、`题 N【难度】` 和旧的 `--- question ---` 格式仍可读取，以免历史题库失效。但它们只属于兼容模式，预览会提示迁移；后续新增或让 ChatGPT 生成题库时请使用 v2。

网页中编辑题目后只会更新 SQLite 运行时题库并写入修改历史，不会自动回写原始 Markdown 文件。
