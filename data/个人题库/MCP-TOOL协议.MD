--- question ---

question_id: agent_basic_sc_001
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:
  - Agent 定义
  - Workflow 边界
  - 动态决策

stem: |
  关于 Agent 与 Workflow 的区别，下列说法最准确的是？ fileciteturn0file0

options:
  A: Agent 的核心特征是拥有更长的上下文窗口
  B: Workflow 允许模型在运行时自由决定全部执行路径，因此比 Agent 更动态
  C: Agent 更适合步骤数量与路径不可预先硬编码的开放任务，而 Workflow 更适合预定义顺序的任务
  D: 只要系统调用了工具，就一定属于 Agent，而不是 Workflow

answer:
  - C

option_analysis:
  A: 错误。更长上下文不是 Agent 的本质定义。Anthropic 将 Agent 描述为在任务澄清后能独立规划、调用工具并基于环境反馈循环执行的系统；LangGraph 也将 Workflow 与 Agent 的关键区别定义为“代码路径是否预先确定”，而不是上下文长度。citeturn11view1turn18view1
  B: 错误。Workflow 的特点恰恰是预定代码路径和固定顺序；动态决定过程与工具使用更接近 Agent。citeturn18view1turn11view0
  C: 正确。Anthropic 明确建议在“无法预测所需步数、无法硬编码固定路径”的开放问题中使用 Agent；LangGraph 也明确区分了 Workflow 的预定路径与 Agent 的动态过程定义。citeturn11view1turn18view1
  D: 错误。工具调用不是 Agent 的充分条件。Anthropic 的 prompt chaining、routing 等 workflow 也会调用工具，但依然属于预定义控制流。citeturn11view0turn18view1

interview_followups:
  - 如果一个业务流程 80% 固定、20% 需要模型自主决定，你会如何拆成 Workflow + Agent 的混合架构？
  - 面试中如果你要说服团队不要把某个需求做成 Agent，你会给出哪些工程理由？

--- question ---

question_id: agent_basic_sc_002
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:
  - Augmented LLM
  - Agent 组件
  - 工具与记忆

stem: |
  根据主流官方文档与经典架构总结，Agent 系统最常见的基础构件是什么？

options:
  A: 只能输出自然语言的纯聊天模型
  B: 增强型 LLM，即在 LLM 之上加入工具、检索、记忆等增强能力
  C: 强化学习策略网络，LLM 仅负责解释日志
  D: 只有向量数据库，没有推理模型

answer:
  - B

option_analysis:
  A: 错误。纯聊天模型可以是起点，但官方文档将 Agent 的基础构件描述为带有额外能力的 LLM，而不是只能输出文本的裸模型。citeturn11view0turn18view1
  B: 正确。Anthropic 将 augmented LLM 定义为 agentic systems 的基础 building block，典型增强包括 retrieval、tools、memory；LangGraph 也把 tool calling、structured outputs、short-term memory 视为构建 workflow/agent 的常见 augmentations。citeturn11view0turn18view1
  C: 错误。虽然 RL 可用于训练某些代理，但并不是生产 Agent 的共通基础构件；很多真实系统是“LLM + 工具 + 状态 + 控制逻辑”的方式实现。citeturn11view1turn12view0
  D: 错误。向量数据库通常只是检索或记忆的一部分，不能替代推理、规划、工具选择与状态更新。citeturn11view0turn20view1

interview_followups:
  - 如果你的 Agent 已经有检索能力，为什么还需要工具调用和状态管理？
  - 在一个最小可用的企业 Agent 中，你会优先接入哪两类增强能力，为什么？

--- question ---

question_id: agent_basic_sc_003
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - 环境反馈
  - Agent Loop
  - Ground Truth

stem: |
  在 Agent Loop 中，“环境反馈”最核心的工程价值是什么？

options:
  A: 让模型的输出更长，显得更像推理
  B: 用外部世界返回的真实结果校正下一步决策，而不是只依赖模型内部想象
  C: 让模型自动获得管理员权限执行高风险操作
  D: 让工具调用可以跳过参数校验

answer:
  - B

option_analysis:
  A: 错误。环境反馈的价值不是拉长文本，而是提供来自工具调用、代码执行或环境观察的真实信号。citeturn11view1turn19view0
  B: 正确。Anthropic 强调 agent 在每一步都应从环境中获得“ground truth”以评估进度；ReAct 也强调通过交替 reasoning 与 acting，把外部环境信息纳入后续推理，减少纯内部推理带来的幻觉与错误传播。citeturn11view1turn19view0
  C: 错误。环境反馈不意味着权限升级；高风险操作仍需审批、隔离环境与 guardrails。citeturn12view1turn15view3
  D: 错误。参数校验通常由应用层或中间件负责，环境反馈不能替代输入验证。citeturn12view2turn18view0

interview_followups:
  - 如果工具返回结果本身不可信，你会如何区分“模型错误”和“环境错误”？
  - 你会如何把代码执行结果、HTTP 状态码、数据库写入结果统一抽象成 Agent 可消费的 observation？

--- question ---

question_id: agent_basic_sc_004
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - 并行化
  - Orchestrator-Worker
  - 架构选型

stem: |
  某任务需要先根据用户请求动态拆解出未知数量的子任务，再把子结果汇总成最终答案。下列哪种模式最合适？

options:
  A: Prompt chaining
  B: 固定路由 routing
  C: Orchestrator-worker
  D: 单次调用的 structured output

answer:
  - C

option_analysis:
  A: 错误。Prompt chaining 适合固定、可验证的顺序子任务，而不是运行时动态生成未知数量子任务。citeturn11view0turn18view1
  B: 错误。Routing 的前提是类别可区分且后续流程预先定义；这里关键问题是子任务数量和内容不可预知。citeturn11view0turn11view2
  C: 正确。Anthropic 与 LangGraph 都将 orchestrator-worker 用于“无法预先定义 subtasks”的复杂任务，中央控制器动态拆解、委派并汇总结果。citeturn11view0turn15view1
  D: 错误。单次 structured output 可用于做计划或分类，但不足以支持完整的动态分解、并发执行和汇总流程。citeturn18view1turn15view1

interview_followups:
  - 如果 worker 之间存在依赖关系而不是完全独立，你会如何改造 orchestrator-worker 架构？
  - 在多 worker 并行时，你会如何处理共享状态写冲突和重复工作？

--- question ---

question_id: agent_basic_sc_005
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - Agent 风险
  - Sandboxing
  - Guardrails

stem: |
  下列哪一项最能解释为什么高自主性的 Agent 在生产环境中通常需要 sandbox 和 guardrails？

options:
  A: 因为有 sandbox 后模型就不再需要评估
  B: 因为 Agent 的自主执行会带来更高成本和错误累积风险
  C: 因为 sandbox 能直接提升模型数学推理能力
  D: 因为 guardrails 可以替代所有后端权限系统

answer:
  - B

option_analysis:
  A: 错误。是否使用 sandbox 与是否做评估是两个问题；官方文档反而强调要在加入复杂度前持续测量和测试。citeturn11view2turn18view3
  B: 正确。Anthropic 明确指出 Agent 的自主性意味着更高成本与 compounding errors，因此建议在 sandboxed environments 中充分测试并配置 guardrails。citeturn11view1
  C: 错误。Sandbox 主要解决执行隔离、文件系统/命令运行、安全边界等工程问题，不直接提升模型内在推理能力。citeturn12view2turn15view3
  D: 错误。Guardrails 不能替代后端权限、审批与确定性策略；LangChain 也明确指出有些策略必须确定性执行，而不能只留在 prompt 里。citeturn15view3turn12view1

interview_followups:
  - 你会如何区分“需要 sandbox 的工具”和“普通 HTTP 查询工具”？
  - 如果一个 Agent 需要读写文件和运行 shell，你会设计哪些最小权限原则？

--- question ---

question_id: agent_basic_sc_006
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - 透明性
  - 调试性
  - Agent 原则

stem: |
  在生产 Agent 设计中，下列哪一项最符合官方工程建议？

options:
  A: 尽量增加抽象层，让底层 prompt 与响应对开发者不可见
  B: 优先保持简单，并尽量使规划步骤和执行轨迹可观察、可调试
  C: 只要模型足够强，就不需要记录状态和轨迹
  D: Agent 越复杂越强，因此应默认使用多 Agent 架构

answer:
  - B

option_analysis:
  A: 错误。Anthropic 明确提醒框架过多抽象会遮蔽底层 prompt/response，使系统更难调试。citeturn11view0
  B: 正确。Anthropic 总结的三条核心原则包括保持简单、优先透明、认真设计 agent-computer interface；LangGraph/OpenAI 也都把 tracing、observability、results and state 作为生产能力。citeturn11view2turn12view0turn18view3
  C: 错误。OpenAI Agents SDK 明确指出复杂工作流需要由应用拥有 orchestration、state、approvals；LangGraph 也强调 persistence/debugging。citeturn12view0turn18view3
  D: 错误。Anthropic 强调只有在复杂度能 demonstrably improve outcomes 时再增加复杂度，而不是默认多 Agent。citeturn11view2

interview_followups:
  - 如果业务方要求“尽快上线”，你如何说服他们先加 trace 和状态可视化？
  - 在你做过的项目里，哪些抽象层最容易掩盖 Agent 的真实失败原因？

--- question ---

question_id: agent_basic_mc_001
module: Agent 基础与架构
type: multiple_choice
difficulty: 2
knowledge_points:
  - Agent Loop
  - 任务终止
  - 人类监督

stem: |
  一个最基本的生产级 Agent Loop 通常应包含哪些要素？

options:
  A: 任务目标或用户指令
  B: 基于当前状态做下一步决策
  C: 获取工具或环境反馈后更新状态
  D: 无上限迭代，直到模型“感觉完成”为止

answer:
  - A
  - B
  - C

option_analysis:
  A: 正确。Agent 通常从用户命令或交互式澄清开始，随后进入规划与执行循环。citeturn11view1turn12view0
  B: 正确。无论是 ReAct、官方 SDK 还是 workflow/agent 文档，下一步决策都是循环核心。citeturn19view0turn12view0
  C: 正确。环境反馈和状态更新是 Agent 与单次问答的关键差异之一。citeturn11view1turn18view2
  D: 错误。Anthropic 明确建议设置 stopping conditions，如最大迭代次数；OpenAI/LangChain 文档也都强调 call limits、interrupts、human review 等控制点。citeturn11view1turn15view3turn18view3

interview_followups:
  - 如果 Agent 在第 N 步仍未完成但已经接近上限，你会采用“继续执行”还是“触发回退策略”？
  - 你会把停止条件做成全局统一策略，还是按工具类别与任务类别分别配置？

--- question ---

question_id: agent_basic_mc_002
module: Agent 基础与架构
type: multiple_choice
difficulty: 3
knowledge_points:
  - Agent 适用场景
  - 任务特征
  - 工程边界

stem: |
  下列哪些任务特征通常更适合使用 Agent 而不是纯 Workflow？

options:
  A: 所需步骤数和路径难以预先硬编码
  B: 任务过程中需要根据环境反馈持续调整计划
  C: 任务完全固定，追求强确定性与审计
  D: 任务允许在关键节点引入人类审批或反馈

answer:
  - A
  - B
  - D

option_analysis:
  A: 正确。Anthropic 明确建议在“无法预测所需步数、无法固定路径”的问题上考虑 Agent。citeturn11view1
  B: 正确。ReAct、Reflexion 与官方 Agent 文档都把环境反馈纳入下一步决策，适合动态调整。citeturn19view0turn20view2turn11view1
  C: 错误。完全固定流程、更强调确定性与审计时，Workflow 往往更合适。citeturn18view1turn11view0
  D: 正确。高风险或不确定任务中，Agent 可在 checkpoint 或 blocker 处暂停并请求人类判断。citeturn11view1turn18view3turn12view1

interview_followups:
  - 什么情况下你会把“Agent + 人审”退化成“Workflow + 人审”？
  - 如果业务希望提高自动化率，你会怎样判断可以减少哪些人工 checkpoint？

--- question ---

question_id: agent_basic_mc_003
module: Agent 基础与架构
type: multiple_choice
difficulty: 3
knowledge_points:
  - Workflow 模式
  - 架构模式
  - 任务分解

stem: |
  根据主流官方文档，以下哪些模式通常被视为 Agent 基础架构中的常见 workflow pattern？

options:
  A: Prompt chaining
  B: Routing
  C: Orchestrator-worker
  D: Evaluator-optimizer

answer:
  - A
  - B
  - C
  - D

option_analysis:
  A: 正确。Anthropic 和 LangGraph 都明确列出了 prompt chaining。citeturn11view0turn18view1
  B: 正确。Routing 是官方列出的典型 workflow pattern，用于按类别分流到不同专业化流程。citeturn11view0turn18view1
  C: 正确。Orchestrator-worker 是处理未知子任务分解的常见模式。citeturn11view0turn15view1
  D: 正确。Evaluator-optimizer 是“生成—评估—反馈—再生成”的迭代型 workflow。citeturn11view0turn11view2

interview_followups:
  - 如果你要为一个企业知识分析系统选一个默认模式，你会先试哪一种，为什么？
  - 这些模式中哪一种最容易带来延迟放大？你会如何控制成本？

--- question ---

question_id: agent_basic_mc_004
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:
  - Agent 中间件
  - 生产能力
  - 故障恢复

stem: |
  从生产 Agent 的工程角度看，下面哪些能力通常应由“模型之外”的运行时或中间件负责？

options:
  A: 文件系统、沙箱、代码执行等执行环境
  B: 上下文压缩、记忆加载、技能注入等上下文管理
  C: 重试、限次、回退等故障恢复
  D: 只依靠 prompt 自动实现所有权限和审批控制

answer:
  - A
  - B
  - C

option_analysis:
  A: 正确。LangChain 官方将 execution environment 单独列为 Agent harness 的关键支持能力。citeturn15view3turn18view0
  B: 正确。上下文溢出与长期知识携带通常靠 summarization、memory、skills 等中间件处理，而不是只靠模型临场记忆。citeturn15view3turn18view0turn18view2
  C: 正确。LangChain 官方将 fault tolerance 列为生产 Agent 的独立关注点，包括 retries、fallbacks、call limits。citeturn15view3
  D: 错误。LangChain 明确指出有些策略不能只放在 prompt 中，必须确定性地在 agent loop 中拦截与执行；OpenAI 也强调 server-owned approvals。citeturn15view3turn12view2

interview_followups:
  - 当模型频繁“误用工具”时，你会优先改 prompt、改工具描述，还是加中间件限制？为什么？
  - 你会如何设计一个通用 runtime，使不同业务 Agent 可以复用同一套重试与审批逻辑？

--- question ---

question_id: agent_basic_mc_005
module: Agent 基础与架构
type: multiple_choice
difficulty: 3
knowledge_points:
  - 基准测试
  - Agent 评估
  - 任务类型

stem: |
  关于经典 Agent benchmark 或代表性任务，下列哪些说法是正确的？

options:
  A: GAIA 强调真实世界问题，通常需要推理、多模态处理、浏览与工具使用能力
  B: WebShop 是网页购物环境，要求代理进行导航、查询改写和策略探索
  C: SWE-bench 的核心任务是给定代码库与 issue，生成修改以解决真实软件问题
  D: 这些 benchmark 都主要评估静态单轮问答，不涉及环境交互

answer:
  - A
  - B
  - C

option_analysis:
  A: 正确。GAIA 在摘要中明确强调 reasoning、multi-modality、web browsing 和 tool-use proficiency。citeturn22view2
  B: 正确。WebShop 是模拟电商网页环境，摘要明确提到 query reformulation、网页文本理解和 strategic exploration。citeturn21view2
  C: 正确。SWE-bench 的任务定义就是给定代码库与 issue，编辑代码来解决真实 GitHub 问题。citeturn22view1
  D: 错误。上述 benchmark 的共同点恰恰是强调交互、环境反馈、长链路推理或执行，而不是单轮静态问答。citeturn22view2turn21view2turn22view1

interview_followups:
  - 如果你要评估企业内部 Agent，为何不能只看 GAIA 或 SWE-bench 的分数？
  - 你会如何设计一个更贴近你所在业务的“私有 benchmark”？

--- question ---

question_id: agent_basic_mc_006
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:
  - 记忆架构
  - 短期记忆
  - 长期记忆

stem: |
  关于 Agent 记忆架构，下列哪些说法是正确的？

options:
  A: 短期记忆通常是 thread/session 级别，维护当前对话和中间状态
  B: 长期记忆通常跨 session 共享，可保存用户事实、经验或规则
  C: 长上下文足够大时，记忆层就完全没有必要
  D: 反思文本、经验轨迹或 few-shot 经验都可以视为某种可复用的记忆形态

answer:
  - A
  - B
  - D

option_analysis:
  A: 正确。LangGraph 将 short-term memory 定义为 thread-scoped memory，作为 agent state 的一部分，并通过 checkpointer 持久化。citeturn18view2
  B: 正确。LangGraph 明确区分 long-term memory 为跨会话、跨 thread 的用户级或应用级数据；CoALA 也强调 modular memory components。citeturn18view2turn20view1
  C: 错误。LangGraph 明确指出即使模型支持长上下文，多数模型在长上下文上仍会被陈旧或离题内容“分心”，造成更高成本和更差表现，因此仍需要记忆管理。citeturn18view2
  D: 正确。Reflexion 使用 episodic memory buffer 保存反思文本；LangGraph 也将 episodic memory 与 few-shot example prompting 联系起来。citeturn20view2turn14view1

interview_followups:
  - 什么时候你会把“长期记忆”做成 profile，什么时候做成 document collection？
  - 如果长期记忆写入错误信息，会对 Agent 造成什么长期伤害？你如何治理？

--- question ---

question_id: agent_basic_tf_001
module: Agent 基础与架构
type: true_false
difficulty: 2
knowledge_points:
  - 上下文工程
  - 记忆管理

stem: |
  在 Agent 系统中，只要模型支持更长上下文，把所有历史消息和工具结果全部塞进去，效果通常就会更好。

options:
  A: 正确
  B: 错误

answer:
  - B

option_analysis:
  A: 错误。LangGraph 明确指出长对话会让模型被陈旧或离题内容分散注意力，同时带来更高延迟和成本；上下文工程强调筛选、压缩与注入，而不是无脑增长。citeturn18view2turn18view0
  B: 正确。短期记忆与上下文管理的目标是保留当前任务真正需要的信息，并通过 summarization、memory、skills 等方式控制噪声。citeturn18view0turn18view2

interview_followups:
  - 工具结果很长但只关注其中几项字段时，你会如何压缩？
  - 如果你发现上下文越长答案越飘，你会优先检查哪些位置？

--- question ---

question_id: agent_basic_tf_002
module: Agent 基础与架构
type: true_false
difficulty: 2
knowledge_points:
  - Agent 风险
  - 人类监督

stem: |
  生产 Agent 一旦具备自动规划和工具调用能力，就不再需要显式的人类审批点或停止条件。

options:
  A: 正确
  B: 错误

answer:
  - B

option_analysis:
  A: 错误。Anthropic 明确建议设置 stopping conditions；OpenAI 和 LangChain 也都把 human review/approval 作为高风险流程的重要控制面。citeturn11view1turn12view1turn15view3
  B: 正确。自主规划不会自动保证安全、合规和正确，尤其在高影响操作上仍应能暂停、审批、回滚。citeturn11view1turn12view2turn18view3

interview_followups:
  - 你会如何决定哪些工具必须审批、哪些工具可以自动执行？
  - 如果业务抱怨审批太慢，你会如何用分级风控来优化？

--- question ---

question_id: agent_basic_tf_003
module: Agent 基础与架构
type: true_false
difficulty: 3
knowledge_points:
  - ReAct
  - 交错推理

stem: |
  ReAct 的关键思想是把推理与行动完全分离，先完成全部推理，再一次性执行所有动作。

options:
  A: 正确
  B: 错误

answer:
  - B

option_analysis:
  A: 错误。ReAct 的核心恰恰是让 reasoning traces 与 actions 交错出现，从而“reason to act, act to reason”。citeturn19view0
  B: 正确。论文明确提出 interleaved manner，让模型在推理与行动之间动态切换，并利用环境信息更新计划。citeturn19view0

interview_followups:
  - 如果只保留 ReAct 的 action 而去掉 thought，会带来哪些常见失败模式？
  - 在真实系统里，你会保留全部 thought 供调试，还是做摘要存储？为什么？

--- question ---

question_id: agent_basic_cc_001
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - Agent
  - Workflow
  - 控制权

stem: |
  请系统比较 Agent 与 Workflow 的区别，并说明在企业应用中如何做选型。

reference_answer: |
  可以从“控制权归属、路径可预测性、状态复杂度、风险与成本”四个维度来比较。

  第一，控制权。Workflow 的控制权主要在应用层，执行路径通常由代码预先固定；Agent 则允许模型在约束下动态决定下一步做什么、是否调用工具、是否继续搜索或回到用户确认。Anthropic 和 LangGraph 都把这一点视为二者最核心的分界。citeturn11view0turn18view1

  第二，路径可预测性。Workflow 适合步骤可以清晰分解、顺序稳定、便于验证的任务，例如固定审批流、固定数据处理流程、标准化客服分流。Agent 更适合所需步数不确定、需要根据环境反馈持续调整的任务，例如复杂调研、跨文件代码修改、开放式搜索分析。citeturn11view1turn15view1

  第三，状态复杂度。Workflow 更多是有限状态机式过程，状态通常简单、过渡明确；Agent 往往需要维护更复杂的上下文、工具结果、短期状态和长期记忆。LangGraph/OpenAI 文档都将 state、persistence、results、human review 视为 agent runtime 的一等公民。citeturn12view0turn18view3turn18view2

  第四，成本与风险。Agent 的收益是灵活性和自主性，但代价是更高 token 成本、更多失败路径、更重的 observability 与安全需求。Anthropic 明确提醒只有当复杂度 demonstrably improves outcomes 时才增加复杂度。citeturn11view2

  工程选型上，我会先问三个问题：任务路径是否稳定、是否必须强确定性审计、以及环境反馈是否对下一步决策至关重要。如果答案分别是“稳定、必须、不是”，优先 Workflow；如果答案是“无法预测、允许动态、非常关键”，再考虑 Agent。很多企业系统最终会采用“外层 Workflow，局部节点使用 Agent”的混合架构。citeturn11view0turn18view1

answer_keywords:
  - 控制权
  - 预定义路径
  - 动态决策
  - 环境反馈
  - 成本风险
  - 混合架构

scoring_points:
  - 能准确说明 Workflow 是预定义代码路径、Agent 是动态过程
  - 能结合典型任务说明各自适用场景
  - 能指出 Agent 的成本、风险、可观测性与审批需求
  - 能给出企业中常见的混合式设计思路

interview_followups:
  - 如果你的经理说“所有复杂任务都上 Agent”，你会如何反驳并给出替代方案？
  - 一个固定流程里只有一步需要模型判断，你会把它建成完整 Agent 还是 Workflow 节点？请给出理由。

--- question ---

question_id: agent_basic_cc_002
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - ReAct
  - CoT
  - Act-only

stem: |
  请比较 ReAct、纯 Chain-of-Thought 和纯动作驱动 Act-only 三种范式的差异，并说明各自的失败模式。

reference_answer: |
  三者的核心区别在于“是否显式推理”和“是否利用环境交互”。

  纯 Chain-of-Thought 主要依赖模型内部知识生成中间推理步骤，优点是实现简单，适合静态问题；但缺点是无法天然访问外部真实世界，容易在知识不足时产生幻觉，并且错误会沿推理链传播。ReAct 论文在知识密集型任务上就把这一点作为出发点。citeturn19view0

  Act-only 更强调直接输出动作或计划，适合动作空间受限、环境反馈强的任务，但往往缺少显式的高层状态跟踪与异常处理机制。ReAct 论文指出这类方法通常不会让模型以语言形式维持高层计划或工作记忆，因此在复杂任务中会更容易迷失方向。citeturn19view0

  ReAct 的关键是把 reasoning 和 acting 交错起来：推理帮助模型生成、更新和修正行动计划；行动帮助模型从 Wikipedia、工具、环境中获取外部信息，再反过来支撑后续推理。这样能同时改善可解释性与鲁棒性。论文还报告了在 HotpotQA、Fever、ALFWorld、WebShop 上相对仅 reasoning 或仅 acting 的优势。citeturn19view0

  失败模式方面，CoT 容易“自信地错”、缺少外部纠偏；Act-only 容易在复杂任务中反复试探、缺少清晰计划；ReAct 则会面临轨迹变长、成本增加、工具误用和上下文膨胀等工程问题，因此通常要配合 stopping conditions、trace、state 管理与工具约束。citeturn19view0turn11view1turn18view0

answer_keywords:
  - 内部推理
  - 外部交互
  - 交错推理
  - 幻觉
  - 异常处理
  - 工程成本

scoring_points:
  - 能解释三种方法在推理与行动两个维度上的差异
  - 能说明 ReAct 为什么更适合需要外部信息和动态调整的任务
  - 能指出三者各自的典型失败模式
  - 能把论文思想落到生产工程约束上

interview_followups:
  - 如果你的模型调用工具不稳定，你会退回 CoT，还是继续做 ReAct 但加强约束？为什么？
  - 你会如何判断一个任务是“只要 CoT 就够了”，还是“必须要 ReAct”？

--- question ---

question_id: agent_basic_cc_003
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - 短期记忆
  - 长期记忆
  - 状态管理

stem: |
  请比较 Agent 的短期记忆与长期记忆，并说明它们在架构设计中的接口边界。

reference_answer: |
  短期记忆和长期记忆最大的区别是“作用范围”和“更新时机”。

  短期记忆通常是 thread 或会话范围，用来保存当前任务进行中需要的对话历史、工具结果、上传文件、生成中的中间产物等。LangGraph 将这部分视为 agent state 的一部分，并通过 checkpointer 做持久化，以便中断后恢复。citeturn18view2turn18view3

  长期记忆则跨 session 与 thread 保存用户级或应用级知识，例如用户偏好、账户特征、过去经验总结、可复用规则等。LangGraph 文档把它定义为跨会话共享的 namespace-scoped memory，并进一步细分为 semantic、episodic、procedural 等类型。CoALA 也强调语言代理应具备模块化记忆组件。citeturn14view1turn20view1

  接口边界上，短期记忆更像 runtime state，需要高频读写、强一致恢复与上下文压缩；长期记忆更像外部知识层，重点在召回策略、更新策略、冲突消解和可解释性。短期记忆不应该被长期历史淹没，长期记忆也不应在每次调用时全文注入。更合理的做法是：运行时状态走 checkpointer，跨会话信息走 store 或 profile/collection，并在需要时按检索规则加载。citeturn18view2turn18view0

  工程上还要注意“写什么、何时写、谁来写”。LangGraph 文档提到长期记忆既可以在 hot path 中同步写入，也可以异步后台生成；而 Reflexion、Generative Agents 这类研究则展示了反思文本、经验和观察如何被转化为可复用记忆。citeturn14view1turn20view2turn21view0

answer_keywords:
  - thread-scoped
  - cross-session
  - state
  - checkpointer
  - semantic episodic procedural
  - hot path

scoring_points:
  - 能准确区分短期记忆与长期记忆的作用范围
  - 能说明二者在存储形态、载入策略与更新时机上的差异
  - 能给出 runtime state 与 memory store 的接口边界
  - 能提到错误记忆写入、冲突更新和召回噪声等风险

interview_followups:
  - 如果用户长期偏好变更了，你会如何让长期记忆可覆盖旧值而不污染历史？
  - 你会把工具执行日志放在短期记忆、长期记忆，还是 trace 系统？为什么？

--- question ---

question_id: agent_basic_cc_004
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - 并行化
  - Orchestrator-Worker
  - 任务编排

stem: |
  请比较 Parallelization 与 Orchestrator-worker 两种架构模式，并说明它们的工程取舍。

reference_answer: |
  两者都可能出现“多个子调用并发执行”，但关键差别不在并发，而在子任务是否可预定义。

  Parallelization 适合把一个任务拆成若干彼此独立、边界已知的子问题，例如多维度审核、多个 reviewer 投票、多个 guardrail 检查。Anthropic 把它分成 sectioning 与 voting 两类：前者并行处理不同部分，后者对同一任务多次尝试以提高信心。citeturn11view0turn11view2

  Orchestrator-worker 则用于输入到来后，先由 orchestrator 决定要拆出哪些 worker、每个 worker 做什么，再综合结果。它更灵活，尤其适合更新多个未知文件、跨源检索、复杂报告生成等“不知道会有多少 subtasks”的任务。Anthropic 与 LangGraph 都这样定义过。citeturn11view0turn15view1

  工程取舍上，parallelization 更容易做容量规划和 SLA 预估，因为任务数相对稳定；orchestrator-worker 更强大，但更容易出现过度拆分、上下文重复、共享状态合并困难和成本不可控。LangGraph 的 Send API 之所以重要，就是为了支持运行时动态创建 worker 及其隔离状态。citeturn15view1

  选择时我会看三个条件：子任务边界是否事先已知、结果是否主要靠“汇总”还是靠“再规划”、以及共享状态是否复杂。若边界已知，优先 parallelization；若拆分本身需要推理，优先 orchestrator-worker。citeturn11view0turn15view1

answer_keywords:
  - 预定义子任务
  - 动态分解
  - sectioning
  - voting
  - Send API
  - 成本控制

scoring_points:
  - 能准确指出两者差异不只是“是否并发”
  - 能分别举出适用场景
  - 能说明 orchestrator-worker 的灵活性与代价
  - 能提到动态 worker、共享状态与成本控制问题

interview_followups:
  - 如果 orchestrator 总是把任务拆得过细造成成本暴涨，你会怎么调？
  - 多 worker 输出相互矛盾时，你会如何做去重、仲裁或再评审？

--- question ---

question_id: agent_basic_cc_005
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - 反思机制
  - 经验学习
  - 自我改进

stem: |
  请比较“基于环境反馈的即时纠偏”和“基于反思记忆的跨轮改进”两种 Agent 提升策略。

reference_answer: |
  这两种策略都利用反馈，但时间尺度与作用位置不同。

  即时纠偏发生在同一轮执行过程中，典型形式是 Agent 获取工具结果、代码执行结果、网页观察或错误消息后，立刻调整下一步动作。Anthropic 把这种来自环境的 ground truth 视为 agent loop 的核心；ReAct 也把 act-to-reason 作为核心机制。citeturn11view1turn19view0

  反思记忆则更强调跨轮次学习。Reflexion 的做法不是更新模型权重，而是把对失败原因和改进策略的语言化总结放入 episodic memory buffer，供下一次任务或下一次尝试时调用。Voyager 进一步把经验沉淀为可复用技能库；Generative Agents 也展示了 observation、planning、reflection 三者组合对长期行为的重要性。citeturn20view2turn22view3turn21view0

  前者的优势是闭环快、对单次执行帮助直接；后者的优势是能够跨任务积累经验，提高长期样本效率。但后者也更容易把错误经验固化到记忆中，因此需要评估、筛选和版本管理。citeturn20view2turn14view1

  在工程实践中，两者通常应结合：同轮内靠环境反馈减小当前错误，跨轮靠反思或技能沉淀减少未来重复错误。citeturn11view1turn22view3

answer_keywords:
  - 环境反馈
  - 反思记忆
  - episodic memory
  - skill library
  - 即时闭环
  - 跨轮改进

scoring_points:
  - 能区分两类反馈机制的时间尺度
  - 能引用 Reflexion、Voyager 或 Generative Agents 的思路
  - 能说明各自收益与风险
  - 能给出组合使用的工程策略

interview_followups:
  - 反思文本应该长期保留，还是定期蒸馏成技能或规则？
  - 如果反思内容和真实环境反馈冲突，你会以哪个为准，为什么？

--- question ---

question_id: agent_basic_sd_001
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - Agent Loop 排障
  - 停止条件
  - 工具误用

stem: |
  一个检索型 Agent 经常在“搜索—总结—再搜索”之间循环，单次任务会调用十几次工具，成本很高，但最终答案提升并不明显。请说明你会如何定位问题并优化。

reference_answer: |
  我会先把问题拆成“是否真的需要这么多步”和“这些步是否有效”两个层面来排查。

  从现象上看，这很像缺少明确 stopping condition、缺少成功判据，或者 evaluator/critic 质量不足导致的重复搜索。Anthropic 明确建议为 Agent 设置最大迭代等 stopping conditions，并强调只有在复杂度 demonstrably improves outcomes 时才增加复杂度。citeturn11view1turn11view2

  其次要看每一次搜索是不是在引入新的 ground truth，还是在重复检索同类内容。ReAct 强调环境反馈应帮助更新计划；如果 observation 没有改变后续决策，说明 loop 只是机械重复。citeturn19view0

  工程上，我会重点检查：搜索 query 是否在变化、搜索结果是否进入了状态、总结是否真正提炼了未满足的信息缺口、agent 是否具备“已足够回答”的终止规则，以及是否有 trace 能看到每一步的收益。OpenAI/LangGraph 官方都把 state、observability、trace 视为生产排障基础。citeturn12view0turn18view3

  优化时，可以引入最大步数、最低信息增益阈值、去重缓存、query 多样性约束、完成判别器，或者把该任务从 Agent 降级为固定的 prompt chaining / evaluator-optimizer。citeturn11view0turn11view2

answer_keywords:
  - stopping condition
  - 信息增益
  - query 去重
  - state 检查
  - trace
  - 降级策略

scoring_points:
  - 能先确认症状并区分“步数过多”和“每步无效”两类问题
  - 能提出有顺序的排查路径
  - 能给出降低成本但不显著伤害效果的优化方案
  - 能说明何时应把 Agent 降级为 Workflow

diagnosis_steps:
  - 检查是否配置最大迭代、最大工具调用数、超时与 budget
  - 统计每一步搜索 query 是否重复或高度相似
  - 检查搜索结果是否真正进入状态，并影响下一步决策
  - 检查总结节点是否提炼“信息缺口”而不是重复复述
  - 通过 trace 对比高质量任务与低质量任务的轨迹差异
  - 评估增加步骤后答案质量是否真实提升

optimization_points:
  - 设置最大步数与预算上限
  - 引入搜索结果去重与缓存
  - 定义“信息增益不足即停止”的规则
  - 增加完成判别器或 evaluator
  - 将部分场景改成固定的两段式或三段式 workflow
  - 对 query 生成加多样性与约束

interview_followups:
  - 你会如何定义“信息增益”这个指标，避免它过于主观？
  - 如果业务坚持“多搜几轮更稳”，你如何用实验数据反驳或验证？

--- question ---

question_id: agent_basic_sd_002
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - Grounding
  - ReAct 排障
  - 最终生成错误

stem: |
  一个 ReAct 风格 Agent 已经拿到了正确的工具结果，但最终回答仍然错误，且经常夹带模型臆测。你会如何定位根因？

reference_answer: |
  这种问题通常不在“有没有拿到答案”，而在“答案有没有被正确消费”。

  第一类根因是状态与上下文注入问题。工具结果虽然返回了，但可能没有写回到 agent state，或者在上下文中位置过后，被后续无关内容稀释。LangGraph/OpenAI 都强调 state 与 results surface 的重要性。citeturn12view0turn18view2

  第二类根因是 prompt/控制逻辑问题。ReAct 的价值在于让 action 与 observation 改变后续 reasoning；如果最终生成阶段没有明确要求“优先依据 observation 回答”“不确定时拒答”，模型可能回退到内部先验。citeturn19view0

  第三类根因是轨迹污染。过长历史、重复失败尝试、过多无关工具结果都会让模型在最后一步被噪声干扰。LangGraph 明确指出长上下文会导致模型被 stale or off-topic content 分心。citeturn18view2

  因此排障时，我会同时看：工具结果是否结构化进入状态、最终回答节点是否只消费必要证据、是否存在对抗性的旧轨迹、以及是否需要在最终回答前加一层 grounded answer synthesizer 或 verifier。citeturn19view0turn18view0

answer_keywords:
  - 状态写回
  - 最终消费
  - observation 优先
  - 轨迹污染
  - grounded synthesis
  - verifier

scoring_points:
  - 能区分“工具成功”与“最终答案正确”不是同一问题
  - 能给出状态、prompt、上下文三层排查路径
  - 能提出 grounded answer 或 verifier 等优化方案
  - 能说明如何验证优化是否生效

diagnosis_steps:
  - 确认工具结果是否完整写回状态与轨迹
  - 核查最终回答节点看到的上下文是否包含正确 observation
  - 检查最终回答 prompt 是否明确要求基于证据作答
  - 分析中间失败轨迹是否污染最终上下文
  - 对比“直接喂工具结果给模型”与“完整轨迹后生成”的答案差异
  - 通过 ablation 分别移除历史步骤、仅保留关键信息验证根因

optimization_points:
  - 把工具结果结构化并显式标注可信来源
  - 最终生成前做上下文裁剪与证据优先排序
  - 加入 grounded answer synthesizer
  - 增加低置信度拒答或引用约束
  - 对最终回答增加 verifier 或二次检查

interview_followups:
  - 如果 verifier 和 answer generator 结论冲突，你会让谁拥有最终裁决权？
  - 你会如何在 trace 中标记“证据已拿到但未被消费”的失败类型？

--- question ---

question_id: agent_basic_sd_003
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - 上下文溢出
  - 短期记忆
  - 长任务稳定性

stem: |
  一个长任务 Agent 在前几步表现正常，步骤一多就开始忘记用户约束，甚至重复做过的工作。请说明你的排查顺序与优化策略。

reference_answer: |
  这是典型的“短期状态失控”问题，不能只怪模型。

  首先要检查上下文是否在持续膨胀，导致旧消息、冗余 observation 和大段工具结果稀释了真正关键的用户约束。LangGraph 明确指出长上下文会引发分心、变慢和成本上升。citeturn18view2

  其次要检查状态表示是否混杂：用户原始目标、当前 todo、已完成步骤、失败原因、工具产物是否都被塞进同一个 message history，而没有结构化状态。OpenAI Agents SDK 与 LangGraph 都强调 state/persistence 的重要性。citeturn12view0turn18view3

  再次要确认是否存在中期压缩机制，例如 summarization、task board、checkpoint、skills 注入。LangChain 官方明确把 summarization、memory、skills 作为 context management 的核心中间件。citeturn18view0

  优化上，应把“聊天历史”与“任务状态”分离：前者做摘要化，后者做结构化；同时把已完成步骤同步到 todo/state，避免模型通过回忆判断是否做过。若任务跨 session，还应把稳定偏好和规则进入长期记忆，而不是让模型每轮重新记住。citeturn18view2turn14view1

answer_keywords:
  - 上下文膨胀
  - 结构化状态
  - summarization
  - checkpoint
  - todo board
  - 记忆分层

scoring_points:
  - 能提出“消息历史”和“任务状态”分离的思路
  - 能体现先定位再优化的顺序
  - 能说明为什么仅靠更大上下文不是根治方案
  - 能给出适合长任务的状态压缩与恢复机制

diagnosis_steps:
  - 统计每一步输入 token 与关键指令覆盖率
  - 检查已完成步骤是否以结构化状态存在，而非仅存在于自然语言历史
  - 排查长工具结果是否未经裁剪直接注入上下文
  - 检查是否有总结、checkpoint、任务板等中期压缩机制
  - 对比“完整历史”与“摘要 + 结构化状态”两种输入的表现差异

optimization_points:
  - 对历史消息做分层摘要
  - 用结构化字段保存目标、约束、todo、done、blocked
  - 对工具结果只保留关键字段与引用
  - 为长任务引入 checkpoint 与 resumable state
  - 将跨任务稳定信息写入长期记忆
  - 对重复工作增加去重与已完成校验

interview_followups:
  - 如果摘要本身丢失了关键信息，你会如何发现并修复？
  - 你会选择“每步摘要”还是“每 N 步摘要”，为什么？

--- question ---

question_id: agent_basic_sd_004
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - 框架抽象
  - 调试性
  - 可观测性

stem: |
  团队用某个高层 Agent 框架快速搭了系统，结果线上问题很多，但大家说不清到底是 prompt、工具、状态还是框架封装导致的。你会如何开展排障？

reference_answer: |
  这类问题的共性是“抽象层太厚而可见性不足”。

  Anthropic 直接提醒，框架虽然便于起步，但额外抽象层可能遮蔽底层 prompt 与 responses，使系统更难调试，甚至诱导团队过早增加复杂度。citeturn11view0

  因此第一步不是盲目调 prompt，而是把一次运行拆成可观测的事件链：输入、系统提示、工具 schema、模型工具选择、工具参数、工具结果、状态变更、最终输出。OpenAI 与 LangGraph 文档都把 results/state/observability 视为生产能力。citeturn12view0turn18view3

  第二步是做最小复现实验。把线上失败案例回放到最小组件组合：仅模型、模型 + 单工具、模型 + 工具 + 状态、完整框架，逐层二分定位。若在“裸 API + 简单 loop”下正常，而在框架下异常，通常说明问题出在框架默认 prompt、状态合并、history trimming 或 middleware hook。citeturn11view0turn18view0

  第三步是去除不必要抽象。对关键高风险路径，宁可下沉为一层更直接的 runtime 控制，也不要继续在看不清行为的封装上硬修。citeturn11view2turn18view3

answer_keywords:
  - 事件链
  - 最小复现
  - 二分定位
  - prompt 可见性
  - 状态变更
  - 去抽象

scoring_points:
  - 能先解决“看不见”的问题，而不是直接调参
  - 能提出分层回放与二分实验方案
  - 能覆盖 prompt、工具、状态、框架四层
  - 能给出何时下沉抽象层的判断

diagnosis_steps:
  - 为每次运行生成完整 trace_id 与 step 日志
  - 导出实际下发给模型的 prompt 与工具定义
  - 记录每次工具选择、参数、结果与状态 diff
  - 用失败案例做最小复现并逐层剥离框架能力
  - 对比成功运行与失败运行的轨迹差异
  - 定位是默认 prompt、状态裁剪、hook 还是工具执行层的问题

optimization_points:
  - 建立统一 trace 与 state diff 记录规范
  - 对高风险路径减少框架魔法默认值
  - 将 prompt、工具、状态注入逻辑显式配置化
  - 为关键 hook 增加单元测试与回放测试
  - 在必要时下沉到更简单的原生 Agent loop

interview_followups:
  - 如果框架厂商说“这是模型问题”，你会如何设计实验反证？
  - 你会保留哪些高层框架能力，哪些能力会自己重写？

--- question ---

question_id: agent_basic_sd_005
module: Agent 基础与架构
type: scenario_debug
difficulty: 5
knowledge_points:
  - 人类审批
  - 高风险动作
  - 安全边界

stem: |
  一个文件操作 Agent 偶尔会在没有明确用户确认的情况下修改关键配置文件。系统已经有 prompt 提示“重要操作前先确认”，但仍有误操作。请说明你会如何定位和修复。

reference_answer: |
  根因通常不是“模型不够听话”，而是把确定性约束错误地寄托在 prompt 上。

  LangChain 官方明确指出，有些策略不能只存在于 prompt 中，而必须在 agent loop 中被确定性地拦截执行；OpenAI Agents SDK 也把 guardrails and human review 描述为会 block 或 pause risky work 的能力。citeturn15view3turn12view1

  排障时我会先确认写文件动作是如何触发的：是否工具定义本身没有区分 read/write，是否 write 工具没有被 human review middleware 拦截，是否状态中缺少“已批准”标志，还是框架默认允许自动执行。其次检查 trace，确认是模型误判、审批漏接、还是后端根本没做权限判断。citeturn12view2turn18view0

  修复时，不能再依赖“先确认”的自然语言提示，而要把高风险动作改为双阶段：模型先提出意图，后端或中间件检查 risk policy；未批准则只生成待执行计划，不允许真正落盘。批准后再携带 approval token 执行。必要时把写操作放进 sandbox、限制目录、支持 diff 展示和回滚。citeturn12view1turn15view3turn11view1

  验证时要做红队测试：模糊要求、间接指令、上下文污染、工具名混淆、先读后写链路、以及多轮会话中的“继承确认”问题。citeturn12view1turn18view3

answer_keywords:
  - prompt 不足
  - deterministic guardrail
  - human review
  - approval token
  - 双阶段执行
  - rollback

scoring_points:
  - 能指出 prompt 不能替代确定性控制
  - 能提出完整的定位顺序
  - 能给出权限、审批、回滚与隔离等修复措施
  - 能说明如何验证安全边界

diagnosis_steps:
  - 明确区分读工具与写工具、低风险与高风险动作
  - 回放误操作案例，确认是否经过审批节点
  - 检查后端是否存在真正的权限判定与 approval 状态
  - 检查框架是否默认自动执行工具
  - 审核 trace 中的模型意图、工具参数与执行时机
  - 复现多轮对话下“旧确认被滥用”的情况

optimization_points:
  - 为高风险动作建立确定性审批中间件
  - 引入“计划生成”和“动作执行”两阶段分离
  - 使用 approval token、防重放和过期时间
  - 限制可写目录并支持沙箱、diff、回滚
  - 加入针对间接指令与上下文注入的红队测试
  - 将高风险工具与普通工具分级管理

interview_followups:
  - “用户刚才说过可以改配置了”这种跨轮确认你会怎么建模？
  - 如果业务方要求完全自动写文件，你会给出哪些最低安全前置条件？

--- question ---

question_id: agent_basic_sys_001
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:
  - Agent Runtime
  - 状态管理
  - 生产架构

stem: |
  请设计一个企业级通用 Agent Runtime，要求支持多步任务执行、工具调用、状态恢复、人类审批和基础可观测性。

reference_answer: |
  我会把这个 Runtime 设计成“模型层、控制层、执行层、状态层、治理层”五层结构。

  模型层负责 LLM 调用、结构化输出和工具选择；控制层负责 agent loop、停止条件、预算控制、任务切换与路径选择；执行层负责工具执行、文件系统、沙箱和外部服务访问；状态层负责 thread-scoped state、checkpoints、长期记忆和 resumable runs；治理层负责 trace、评估、审批、权限、红队和审计。这样的分层与 Anthropic 的 simplicity/transparency/ACI 原则，以及 OpenAI/LangGraph 对 state、guardrails、observability、persistence 的强调是一致的。citeturn11view2turn12view0turn18view3

  执行流程上，用户请求进入后先生成 run_id / thread_id，读取短期状态和必要的长期记忆；控制层根据任务类型决定走 workflow 还是 agent loop；模型层产出动作意图或答案；若是工具调用，执行层先做权限检查和审批判断，再执行工具并把 observation 写回状态；每一步都记录 trace 与 state diff；满足完成条件、预算上限或审批阻塞时结束。citeturn11view1turn12view2turn18view2

  在选型上，我会优先让“确定性逻辑归应用层”，而不是相信模型自发遵守所有规则。OpenAI 官方就建议在应用拥有 orchestration、tool execution、state、approvals 的场景下使用 Agents SDK；LangGraph 也强调 durable execution、human-in-the-loop 和 persistence。citeturn12view0turn18view3

architecture_points:
  - 请求入口与任务分类器
  - Agent Controller
  - Model Adapter
  - Tool Executor
  - Sandbox / Filesystem Layer
  - State Store / Checkpointer
  - Long-term Memory Store
  - Approval & Policy Engine
  - Trace / Metrics / Audit Pipeline

data_flow:
  - 用户请求进入后生成 run_id、thread_id、user_id
  - 读取短期状态、历史 checkpoints 与必要长期记忆
  - 任务分类器判断走固定 workflow 还是动态 agent loop
  - 模型层输出回答、计划或工具调用意图
  - Policy Engine 判断是否允许自动执行、是否需要审批
  - Tool Executor 执行工具并返回 observation
  - observation、state diff、token/cost、错误信息写入 trace 与状态库
  - 满足完成条件或达到预算/步数上限后输出最终结果

evaluation_metrics:
  - 任务成功率
  - 平均步数
  - 工具调用成功率
  - 工具参数合法率
  - 平均延迟
  - 平均成本
  - 人工介入率
  - 中断后恢复成功率
  - 高风险动作误执行率

risk_points:
  - 过度依赖 prompt 而缺少确定性权限控制
  - 状态恢复不完整导致重复执行或漏执行
  - 长上下文污染导致任务偏移
  - trace 缺失导致无法归因
  - 高风险工具没有审批与回滚
  - 多租户隔离不足导致数据泄露

answer_keywords:
  - agent runtime
  - orchestration
  - state and approvals
  - persistence
  - trace
  - policy engine

scoring_points:
  - 能给出分层架构而不是只列组件
  - 能说清数据流、状态恢复和审批阻塞点
  - 能覆盖可观测性、安全与高风险工具控制
  - 能给出一组可落地的评估指标

interview_followups:
  - 如果你只能先做三件事上线 MVP，你会优先做哪些模块，为什么？
  - 当不同业务想共享同一个 Runtime 时，你会如何做租户隔离与工具权限隔离？

--- question ---

question_id: agent_basic_sys_002
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:
  - Coding Agent
  - 环境反馈
  - 测试闭环

stem: |
  请设计一个面向代码仓库问题修复的 Coding Agent 架构，要求支持跨文件修改、测试反馈闭环和人工审查。

reference_answer: |
  我会把 Coding Agent 设计成“仓库理解、计划分解、受控执行、验证回路、审查发布”五段。

  首先，仓库理解层负责索引代码结构、读取 issue、定位可能相关文件，并构建 task state。SWE-bench 之所以适合作为代表任务，就是因为它经常要求模型跨函数、跨类、甚至跨文件理解和修改代码，并与执行环境交互。citeturn22view1

  其次，计划分解层通常适合 orchestrator-worker 风格：主控根据 issue 决定要调查哪些文件、修改哪些模块，再把子任务派给 worker。Anthropic 与 LangGraph 都把复杂代码修改视为 orchestrator-worker 的典型场景。citeturn11view0turn15view1

  然后，执行层必须运行在受控沙箱中，提供文件读写、依赖安装、测试运行、补丁应用与回滚能力，而不是直接在生产仓库上执行。LangChain/OpenAI 官方都把 sandbox、filesystem、runtime behavior 视为独立控制面。citeturn12view2turn15view3

  验证层则形成 evaluator-optimizer 闭环：运行单测、静态检查、lint、类型检查，把失败信息作为 observation 写回，再驱动下一轮修复。Anthropic 的 evaluator-optimizer 与 ReAct 的环境反馈思想都适合这里。citeturn11view2turn19view0

  最后，人工审查层要求在落盘前生成 patch diff、风险摘要、受影响文件列表和测试证据，由 reviewer 决定是否合并。这样可以把“自主修复能力”和“工程审计需求”兼容起来。citeturn11view1turn12view1

architecture_points:
  - Issue Parser 与 Repo Indexer
  - Planner / Orchestrator
  - File Investigator Workers
  - Sandboxed Tool Executor
  - Patch Generator
  - Test Runner / Static Analyzer
  - Critic / Verifier
  - Human Review Gateway
  - Trace & Artifact Store

data_flow:
  - 接收 issue、仓库快照与运行配置
  - 仓库理解层定位相关文件与符号
  - Planner 生成修改计划并拆给若干 worker
  - worker 在沙箱中读取文件、生成修改建议
  - Patch Generator 产出补丁并应用到沙箱副本
  - 测试与分析工具运行，失败日志回写到状态
  - Critic 决定继续修复、回退或提交人工审查
  - Reviewer 查看 diff、测试结果和风险说明后决定是否合并

evaluation_metrics:
  - issue 修复成功率
  - 测试通过率
  - 平均修改文件数
  - 平均迭代轮数
  - 回滚率
  - 人工接受率
  - 单任务平均成本
  - 高风险文件误改率

risk_points:
  - 误删文件或写错目录
  - 只为通过测试而破坏更广泛语义
  - 沙箱与真实仓库不一致
  - 单测覆盖不足导致“伪成功”
  - 自动安装依赖带来的供应链风险
  - 长任务状态丢失导致重复修复

answer_keywords:
  - coding agent
  - sandbox
  - orchestrator-worker
  - test feedback
  - human review
  - patch diff

scoring_points:
  - 能把代码修复问题拆成理解、计划、执行、验证、审查几个层次
  - 能说明为什么需要沙箱与测试反馈闭环
  - 能覆盖跨文件修改与人工审查
  - 能提出合理的评估指标与风险点

interview_followups:
  - 如果测试很慢，你会如何设计分层验证策略？
  - 当 issue 描述本身不充分时，你会让 Agent 如何提出澄清而不是乱改代码？

--- question ---

question_id: agent_basic_sys_003
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:
  - 记忆系统
  - 持久化
  - 人类监督

stem: |
  请设计一个支持长时任务与跨会话个性化的 Agent Memory 子系统，要求同时覆盖短期状态、长期记忆和人工可干预能力。

reference_answer: |
  我会把 Memory 子系统拆成三部分：短期状态层、长期记忆层、记忆治理层。

  短期状态层保存 thread-scoped 的任务信息，包括消息历史、当前目标、约束、todo、已完成步骤、关键 observation 和中间产物，并通过 checkpointer 持久化，使任务可以恢复继续执行。LangGraph 官方就是这样定义 short-term memory 与 state 的。citeturn18view2turn18view3

  长期记忆层则按 namespace 保存跨会话知识，可分为 semantic、episodic、procedural 三类：用户偏好与事实、过去成功轨迹与失败教训、可复用规则/技能。LangGraph 的 memory 文档与 CoALA 都支持这种分层理解；Reflexion、Voyager 也展示了经验与技能沉淀的价值。citeturn14view1turn20view1turn20view2turn22view3

  记忆治理层负责写入触发、冲突消解、版本控制、人工审查和召回策略。因为长期记忆一旦写错，会在后续任务中持续污染模型，所以不能让模型无约束地写入。更稳妥的方案是：对高价值 memory 采用结构化 schema、反向验证、人工审核抽样和过期/置信机制。citeturn14view1turn18view0

architecture_points:
  - Thread State Store
  - Checkpointer
  - Long-term Memory Store
  - Namespace / Tenant Manager
  - Memory Writer
  - Memory Retriever
  - Conflict Resolver
  - Human Review Console
  - Audit & Version Store

data_flow:
  - Agent 启动时读取 thread state 与候选长期记忆
  - Retriever 根据当前任务检索相关 semantic / episodic / procedural memories
  - 控制层将检索结果摘要后注入模型上下文
  - 运行过程中新的 observation 和反思进入 Memory Writer
  - Writer 根据策略选择热路径同步写入或后台异步写入
  - Conflict Resolver 处理覆盖、合并、弃用与置信度变化
  - 人工平台可查看、修正、冻结或删除记忆条目

evaluation_metrics:
  - 记忆召回相关性
  - 记忆写入准确率
  - 记忆污染率
  - 个性化命中率
  - 长任务恢复成功率
  - 平均上下文压缩比
  - 错误记忆修复时延

risk_points:
  - 错误事实长期污染后续答案
  - 长期记忆与短期状态边界不清导致冗余注入
  - 召回过多引入噪声与隐私泄露
  - 缺少版本控制导致无法回滚错误记忆
  - 多租户 namespace 隔离不足
  - 模型伪造“看似合理”的记忆项

answer_keywords:
  - short-term state
  - long-term memory
  - semantic episodic procedural
  - checkpointer
  - governance
  - versioning

scoring_points:
  - 能区分短期状态与长期记忆的存储职责
  - 能设计合理的写入、召回与治理机制
  - 能覆盖人工可干预与回滚
  - 能提出记忆污染与隐私泄露等风险控制

interview_followups:
  - 如果用户要求“忘记我之前说过的话”，你会如何同时处理短期状态、长期记忆和审计要求？
  - 你会如何判断某条新信息应该进入长期记忆，而不是只保留在当前 thread 中？

--- question ---

question_id: agent_basic_code_001
module: Agent 基础与架构
type: coding_or_pseudocode
difficulty: 4
knowledge_points:
  - Agent Loop
  - 停止条件
  - 状态更新

stem: |
  请用 Python 风格伪代码实现一个最小可用的 Agent Loop。要求支持：
  1. 读取当前状态
  2. 调用模型决定是回答用户还是调用工具
  3. 执行工具后把观察结果写回状态
  4. 支持最大迭代次数和预算上限
  5. 在高风险动作前触发人工审批

reference_answer: |
  核心思路是把 Agent 看成一个“受控循环”：每轮先读取状态，再由模型基于状态决定下一步；若输出的是工具意图，则先过 policy/approval，再执行工具并把 observation 写回状态；若输出的是最终答案，则结束。这样可以对应 Anthropic 所说的“LLM using tools based on environmental feedback in a loop”，同时满足 stopping conditions、human feedback checkpoints 和 stateful runtime 的要求。citeturn11view1turn12view0turn18view3

  实现上，关键不在模型调用本身，而在外层控制逻辑：预算、步数、审批、异常处理、状态写回都必须在应用层而不是模型层。citeturn12view2turn15view3

pseudocode: |
  class State:
      def __init__(self, user_goal):
          self.user_goal = user_goal
          self.messages = []
          self.observations = []
          self.completed = False
          self.final_answer = None
          self.total_cost = 0
          self.step_count = 0
          self.approvals = set()

  def run_agent(state, llm, tool_registry, max_steps, max_cost):
      while True:
          if state.completed:
              return state.final_answer

          if state.step_count >= max_steps:
              return {"status": "stopped", "reason": "max_steps_exceeded"}

          if state.total_cost >= max_cost:
              return {"status": "stopped", "reason": "budget_exceeded"}

          llm_input = build_context_from_state(state)
          decision, cost = llm.decide_next_action(llm_input)
          state.total_cost += cost
          state.step_count += 1

          if decision["type"] == "final_answer":
              state.final_answer = decision["content"]
              state.completed = True
              return state.final_answer

          if decision["type"] == "tool_call":
              tool_name = decision["tool_name"]
              args = decision["args"]

              validate_tool_args(tool_name, args)

              if is_high_risk(tool_name, args):
                  approved = request_human_approval(tool_name, args, state)
                  if not approved:
                      state.observations.append({
                          "type": "approval_denied",
                          "tool_name": tool_name,
                          "args": args
                      })
                      continue

              result = safe_execute_tool(tool_registry, tool_name, args)
              state.observations.append({
                  "type": "tool_result",
                  "tool_name": tool_name,
                  "args": args,
                  "result": result
              })
              continue

          if decision["type"] == "clarify":
              return {"status": "needs_user_input", "question": decision["content"]}

          state.observations.append({
              "type": "unexpected_decision",
              "payload": decision
          })

complexity:
  time: O(T * (C_llm + C_tool))，其中 T 为迭代步数上限，C_llm 与 C_tool 分别表示单轮模型与工具执行代价
  space: O(H + O)，其中 H 为保留的历史状态大小，O 为 observation 数量

test_cases:
  - input:
      user_goal: 查询天气并总结
      model_behavior: 第一步调用 weather_tool，第二步返回最终答案
      max_steps: 5
      max_cost: 100
    expected: 成功返回答案，并在状态中包含一次 tool_result
  - input:
      user_goal: 修改配置文件
      model_behavior: 第一步调用高风险 write_file
      approval: 拒绝
      max_steps: 3
      max_cost: 100
    expected: 不执行写文件，状态写入 approval_denied，任务可继续或终止
  - input:
      user_goal: 无限搜索
      model_behavior: 每步都重复调用 search
      max_steps: 2
      max_cost: 100
    expected: 在达到 max_steps 后停止，返回 stopped/max_steps_exceeded

answer_keywords:
  - agent loop
  - state update
  - stop condition
  - approval gate
  - tool result write-back
  - application-level control

scoring_points:
  - 伪代码必须体现“模型决策—工具执行—状态写回”的循环
  - 必须包含最大步数、预算限制和审批逻辑
  - 要体现应用层校验与安全执行，而不是直接信任模型
  - 参考答案应说明复杂度与关键边界条件

interview_followups:
  - 如果工具执行抛异常，你会在 loop 内重试、降级还是直接失败？依据是什么？
  - 你会把状态全部存内存，还是每步落 checkpoint？为什么？

--- question ---

question_id: agent_basic_code_002
module: Agent 基础与架构
type: coding_or_pseudocode
difficulty: 4
knowledge_points:
  - 动态选路
  - Workflow 选择
  - 任务分类

stem: |
  请用 Python 风格伪代码实现一个“Agent 架构路由器”。输入为任务描述，输出为应采用的执行模式：
  - prompt_chaining
  - routing
  - parallelization
  - orchestrator_worker
  - evaluator_optimizer
  - agent
  要求同时考虑任务是否固定、是否需要未知子任务分解、是否需要多轮外部反馈、是否高风险需要审批。

reference_answer: |
  这道题考察的不是机器学习分类器本身，而是你能否把架构选型显式化。Anthropic 官方文档已经给出不同模式的适用前提：固定可拆解适合 prompt chaining；按类别分流适合 routing；独立子问题适合 parallelization；未知子任务适合 orchestrator-worker；可明确评价并迭代改进适合 evaluator-optimizer；无法预定义路径且依赖外部反馈时才真正进入 agent。citeturn11view0turn11view2

  高风险审批不是单独一种模式，而是附加的执行策略，因此路由器应输出主模式加上 policy flags。citeturn12view1turn15view3

pseudocode: |
  def choose_execution_mode(task):
      """
      task:
        {
          "has_fixed_steps": bool,
          "needs_classification": bool,
          "subtasks_independent": bool,
          "subtasks_unknown_until_runtime": bool,
          "has_clear_eval_criteria": bool,
          "needs_iterative_refinement": bool,
          "needs_external_feedback_loop": bool,
          "risk_level": "low" | "medium" | "high"
        }
      """
      result = {
          "mode": None,
          "require_human_review": False
      }

      if task["risk_level"] == "high":
          result["require_human_review"] = True

      if task["needs_classification"]:
          result["mode"] = "routing"
          return result

      if task["has_fixed_steps"]:
          result["mode"] = "prompt_chaining"
          return result

      if task["subtasks_independent"]:
          result["mode"] = "parallelization"
          return result

      if task["subtasks_unknown_until_runtime"]:
          result["mode"] = "orchestrator_worker"
          return result

      if task["has_clear_eval_criteria"] and task["needs_iterative_refinement"]:
          result["mode"] = "evaluator_optimizer"
          return result

      if task["needs_external_feedback_loop"]:
          result["mode"] = "agent"
          return result

      result["mode"] = "prompt_chaining"
      return result

complexity:
  time: O(1)
  space: O(1)

test_cases:
  - input:
      has_fixed_steps: true
      needs_classification: false
      subtasks_independent: false
      subtasks_unknown_until_runtime: false
      has_clear_eval_criteria: false
      needs_iterative_refinement: false
      needs_external_feedback_loop: false
      risk_level: low
    expected:
      mode: prompt_chaining
      require_human_review: false
  - input:
      has_fixed_steps: false
      needs_classification: false
      subtasks_independent: false
      subtasks_unknown_until_runtime: true
      has_clear_eval_criteria: false
      needs_iterative_refinement: false
      needs_external_feedback_loop: true
      risk_level: medium
    expected:
      mode: orchestrator_worker
      require_human_review: false
  - input:
      has_fixed_steps: false
      needs_classification: false
      subtasks_independent: false
      subtasks_unknown_until_runtime: false
      has_clear_eval_criteria: true
      needs_iterative_refinement: true
      needs_external_feedback_loop: true
      risk_level: high
    expected:
      mode: evaluator_optimizer
      require_human_review: true

answer_keywords:
  - 架构路由
  - 模式选择
  - 外部反馈
  - 未知子任务
  - clear eval criteria
  - human review flag

scoring_points:
  - 必须把不同模式的判定条件写清楚
  - 要体现“主模式”和“高风险审批标志”是两回事
  - 伪代码应可执行、顺序清晰
  - 参考答案应解释为什么不同判断条件映射到不同模式

interview_followups:
  - 如果一个任务同时满足“未知子任务分解”和“清晰评估标准”，你会优先选哪种模式？为什么？
  - 你会不会让这个路由器本身由 LLM 决定？如果会，如何避免误路由？

