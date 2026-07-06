"""中文说明：覆盖各题型答案归一化和判分。"""

from app.services.answer_checker import check_answer


def test_single_choice_checker() -> None:
    """中文说明：单选题忽略大小写和空格。"""

    result = check_answer("single_choice", "B", " b ")
    assert result.is_correct is True
    assert result.normalized_user_answer == "B"


def test_multiple_choice_checker() -> None:
    """中文说明：多选题兼容多种分隔符，并要求完全一致。"""

    ok = check_answer("multiple_choice", "A、B、D", "d b a")
    bad = check_answer("multiple_choice", "A、B、D", "AB")
    assert ok.is_correct is True
    assert bad.is_correct is False


def test_true_false_checker() -> None:
    """中文说明：判断题兼容中英文真假表达。"""

    assert check_answer("true_false", "正确", "T").is_correct is True
    assert check_answer("true_false", "错", "false").is_correct is True


def test_fill_blank_checker() -> None:
    """中文说明：填空题支持多个可接受答案和大小写归一。"""

    result = check_answer("fill_blank", "上下文工程 / context engineering / Context Engineering", " Context Engineering ")
    assert result.is_correct is True


def test_subjective_checker_requires_self_review() -> None:
    """中文说明：主观题不自动判分，进入自评模式。"""

    result = check_answer("short_answer", "参考答案", "我的答案")
    assert result.is_correct is None
    assert result.requires_self_review is True
