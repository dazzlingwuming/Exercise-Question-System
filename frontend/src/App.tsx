import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AiQuestionGenerationPage } from "./pages/AiQuestionGenerationPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImportPage } from "./pages/ImportPage";
import { PracticePage } from "./pages/PracticePage";
import { QuestionBankPage } from "./pages/QuestionBankPage";
import { QuestionCreatePage } from "./pages/QuestionCreatePage";
import { QuestionDetailPage } from "./pages/QuestionDetailPage";
import { QuestionDeletedPage } from "./pages/QuestionDeletedPage";
import { QuestionEditPage } from "./pages/QuestionEditPage";
import { QuestionRevisionPage } from "./pages/QuestionRevisionPage";
import { ReviewPage } from "./pages/ReviewPage";
import { StatsPage } from "./pages/StatsPage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/questions" element={<QuestionBankPage />} />
        <Route path="/questions/new" element={<QuestionCreatePage />} />
        <Route path="/questions/deleted" element={<QuestionDeletedPage />} />
        <Route path="/questions/:id" element={<QuestionDetailPage />} />
        <Route path="/questions/:id/edit" element={<QuestionEditPage />} />
        <Route path="/questions/:id/revisions" element={<QuestionRevisionPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/ai/question-generation/:generationId" element={<AiQuestionGenerationPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
    </AppLayout>
  );
}
