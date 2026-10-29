import type { PracticeQuestion } from "../../types/question";
import { trueFalseAnswer } from "../../utils/answers";
import { FillBlankQuestion } from "./FillBlankQuestion";
import { MultipleChoiceQuestion } from "./MultipleChoiceQuestion";
import { SingleChoiceQuestion, type AnswerGrade } from "./SingleChoiceQuestion";
import { SubjectiveQuestion } from "./SubjectiveQuestion";
import { TrueFalseQuestion } from "./TrueFalseQuestion";

// 中文说明：题目渲染分发器，根据 question.type 选择对应题型组件，避免练习页堆叠题型逻辑。
export function QuestionRenderer({
  question,
  answer,
  setAnswer,
  grade = null,
  onUploadingChange,
}: {
  question: PracticeQuestion;
  answer: string | string[];
  setAnswer: (value: string | string[]) => void;
  /** 提交后传入，用于给选项标注正确 / 错误。 */
  grade?: AnswerGrade;
  onUploadingChange?: (busy: boolean) => void;
}) {
  if (question.type === "single_choice") {
    return <SingleChoiceQuestion question={question} value={String(answer)} onChange={setAnswer} grade={grade} />;
  }
  if (question.type === "multiple_choice") {
    return (
      <MultipleChoiceQuestion
        question={question}
        value={Array.isArray(answer) ? answer : []}
        onChange={setAnswer}
        grade={grade}
      />
    );
  }
  if (question.type === "true_false") {
    return (
      <TrueFalseQuestion
        value={String(answer)}
        onChange={setAnswer}
        correctValue={grade ? trueFalseAnswer([...grade.correctKeys]) : ""}
      />
    );
  }
  if (question.type === "fill_blank") return <FillBlankQuestion value={String(answer)} onChange={setAnswer} />;
  return <SubjectiveQuestion value={String(answer)} onChange={setAnswer} onUploadingChange={onUploadingChange} />;
}
