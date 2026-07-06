import { request } from "./client";
import type { StatsSummary } from "../types/stats";

export const getStatsSummary = () => request<StatsSummary>("/stats/summary");
