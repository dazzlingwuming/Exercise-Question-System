import type { Question } from "../../types/question";
import { FillBlankQuestion } from "./FillBlankQuestion";
import { MultipleChoiceQuestion } from "./MultipleChoiceQuestion";
import { SingleChoiceQuestion } from "./SingleChoiceQuestion";
import { SubjectiveQuestion } from "./SubjectiveQuestion";
import { TrueFalseQuestion } from "./TrueFalseQuestion";

// 中文说明：题目渲染分发器，根据 question.type 选择对应题型组件，避免练习页堆叠题型逻辑。
export function QuestionRenderer({
  question,
  answer,
  setAnswer,
}: {
  question: Question;
  answer: string | string[];
  setAnswer: (value: string | string[]) => void;
}) {
  if (question.type === "single_choice") return <SingleChoiceQuestion question={question} value={String(answer)} onChange={setAnswer} />;
  if (question.type === "multiple_choice") {
    return <MultipleChoiceQuestion question={question} value={Array.isArray(answer) ? answer : []} onChange={setAnswer} />;
  }
  if (question.type === "true_false") return <TrueFalseQuestion value={String(answer)} onChange={setAnswer} />;
  if (question.type === "fill_blank") return <FillBlankQuestion value={String(answer)} onChange={setAnswer} />;
  return <SubjectiveQuestion value={String(answer)} onChange={setAnswer} />;
}
