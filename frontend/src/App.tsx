import { lazy, Suspense } from "react";
import { LoadingState } from "./components/common/LoadingState";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
const AiQuestionGenerationPage = lazy(() => import("./pages/AiQuestionGenerationPage").then(module => ({ default: module.AiQuestionGenerationPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(module => ({ default: module.DashboardPage })));
const ImportPage = lazy(() => import("./pages/ImportPage").then(module => ({ default: module.ImportPage })));
const PracticePage = lazy(() => import("./pages/PracticePage").then(module => ({ default: module.PracticePage })));
const QuestionBankPage = lazy(() => import("./pages/QuestionBankPage").then(module => ({ default: module.QuestionBankPage })));
const QuestionCreatePage = lazy(() => import("./pages/QuestionCreatePage").then(module => ({ default: module.QuestionCreatePage })));
const QuestionDetailPage = lazy(() => import("./pages/QuestionDetailPage").then(module => ({ default: module.QuestionDetailPage })));
const QuestionDeletedPage = lazy(() => import("./pages/QuestionDeletedPage").then(module => ({ default: module.QuestionDeletedPage })));
const QuestionEditPage = lazy(() => import("./pages/QuestionEditPage").then(module => ({ default: module.QuestionEditPage })));
const QuestionRevisionPage = lazy(() => import("./pages/QuestionRevisionPage").then(module => ({ default: module.QuestionRevisionPage })));
const ReviewPage = lazy(() => import("./pages/ReviewPage").then(module => ({ default: module.ReviewPage })));
const StatsPage = lazy(() => import("./pages/StatsPage").then(module => ({ default: module.StatsPage })));
const StudioPage = lazy(() => import("./pages/StudioPage").then(module => ({ default: module.StudioPage })));
const ModelSettingsPage = lazy(() => import("./pages/ModelSettingsPage").then(module => ({ default: module.ModelSettingsPage })));

export default function App() {
  return (
    <AppLayout>
      <Suspense fallback={<LoadingState />}><Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/settings" element={<ModelSettingsPage />} />
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
      </Routes></Suspense>
    </AppLayout>
  );
}
