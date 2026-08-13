import questionBankGptTemplateV2 from "../../../docs/question-bank-template-v2.md?raw";

const FORMAL_EXAMPLE_HEADER = "<!-- question-bank-format: v2 -->";
const FORMAL_EXAMPLE_SECTION = "## 完整正式题库示例（仅供参照，不要连同本模板输出）";

/**
 * 仅供内部解析测试使用的可导入题库片段，不作为用户入口。
 * 对外让 GPT 使用的唯一完整模板是 QUESTION_BANK_GPT_TEMPLATE_V2。
 */
export const QUESTION_BANK_IMPORT_EXAMPLE_V2 = questionBankGptTemplateV2.slice(
  questionBankGptTemplateV2.indexOf(
    FORMAL_EXAMPLE_HEADER,
    questionBankGptTemplateV2.indexOf(FORMAL_EXAMPLE_SECTION),
  ),
);

/**
 * 对外唯一入口：将此完整模板与原始资料一起交给 GPT；模板本身不可导入。
 * 通过 raw 导入保证运行时内容与 docs/question-bank-template-v2.md 逐字一致。
 */
export const QUESTION_BANK_GPT_TEMPLATE_V2 = questionBankGptTemplateV2;
