"""中文说明：AI 自由追问的轻量意图识别。"""

ANSWER_LEAK_WORDS = ["答案是什么", "选什么", "标准答案", "直接告诉", "完整答案", "该选", "正确选项"]
HINT_WORDS = ["提示", "思路", "怎么想", "切入点"]
EXPLAIN_WORDS = ["讲解", "解析", "为什么"]
DIAGNOSIS_WORDS = ["哪里错", "错因", "差距", "少了什么"]
EXAMPLE_WORDS = ["工程", "项目", "实际场景", "例子"]
INTERVIEW_WORDS = ["面试", "追问", "面试官"]


def detect_intent(content: str) -> str:
    text = content.strip()
    if any(word in text for word in ANSWER_LEAK_WORDS):
        return "answer_leak_request"
    if any(word in text for word in HINT_WORDS):
        return "hint_request"
    if any(word in text for word in EXPLAIN_WORDS):
        return "explanation_request"
    if any(word in text for word in DIAGNOSIS_WORDS):
        return "diagnosis_request"
    if any(word in text for word in EXAMPLE_WORDS):
        return "engineering_example_request"
    if any(word in text for word in INTERVIEW_WORDS):
        return "interview_followup_request"
    return "concept_clarification"
