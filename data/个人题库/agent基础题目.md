--- question ---

question_id: agent_basic_sc_001
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:

* Agent 定义
* 单轮调用
* 多步执行
* 状态管理

stem: |
关于 Agent 与普通单轮 LLM 调用的区别，下列说法最准确的是：

options:
A: Agent 本质上只是更长的 Prompt。
B: Agent 通常围绕目标进行多步规划、工具调用、状态更新与继续执行。
C: 普通 LLM 调用一定不能访问外部工具。
D: 只要模型够强，Agent 就不再需要应用层逻辑。

answer:

* B

option_analysis:
A: 错误。Agent 不是简单加长 Prompt，而是包含目标驱动、多步决策、工具调用、状态写回和继续执行的运行机制。
B: 正确。Agent 的核心特征是围绕任务目标进行循环式执行，包括规划、调用工具、观察结果、更新状态并决定下一步。
C: 错误。普通 LLM 调用也可以通过应用层接入工具，但它通常不具备完整的多步自主执行闭环。
D: 错误。模型能力不能替代应用层的权限控制、工具执行、状态管理、审批和可观测性。

interview_followups:

* 你如何判断一个系统应该用普通 LLM 调用，还是应该设计成 Agent？
* 如果一个 Agent 只调用一次工具就结束，它和普通工具增强问答的边界在哪里？

--- question ---

question_id: agent_basic_sc_002
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:

* Session
* 工作记忆
* 状态恢复
* 会话上下文

stem: |
在典型 Agent 架构中，负责“跨轮次保留工作上下文、支持恢复执行”的核心组件是：

options:
A: 感知层
B: 工具执行器
C: 记忆 / Session 层
D: 输出渲染层

answer:

* C

option_analysis:
A: 错误。感知层主要负责输入接收、解析、规范化和上下文预处理，不负责长期保存会话状态。
B: 错误。工具执行器负责调用外部能力并返回结果，但不应承担跨轮次状态存储职责。
C: 正确。记忆 / Session 层负责保存会话历史、中间结果、任务状态和恢复执行所需的信息。
D: 错误。输出渲染层负责把结果组织成用户可读形式，不负责状态持久化。

interview_followups:

* Session 中应该保存完整工具返回，还是保存结构化摘要？为什么？
* 如果 Agent 中途失败后需要恢复执行，Session 层至少要保存哪些信息？

--- question ---

question_id: agent_basic_sc_003
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:

* ReAct
* 推理行动循环
* Observation
* 工具反馈

stem: |
ReAct 架构最核心的思想是：

options:
A: 只使用 chain-of-thought，不调用外部环境。
B: 用更大的上下文窗口替代规划。
C: 将推理轨迹与动作执行交错进行。
D: 让多个 Agent 同时投票决定答案。

answer:

* C

option_analysis:
A: 错误。ReAct 并不是只做内部推理，它强调推理与外部动作结合。
B: 错误。更大的上下文窗口不能替代基于观察结果的动态行动与重规划。
C: 正确。ReAct 的关键是 Reasoning 与 Acting 交错执行，通过外部观察修正后续推理和动作。
D: 错误。多 Agent 投票不是 ReAct 的核心思想，ReAct 主要讨论单个模型如何交替推理和行动。

interview_followups:

* ReAct 中 observation 对后续 reasoning 有什么作用？
* ReAct 为什么能在一定程度上减少工具使用场景下的幻觉？

--- question ---

question_id: agent_basic_sc_004
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:

* 多 Agent 协作
* handoff
* agent-as-tool
* 控制权归属

stem: |
当你希望“管理者 Agent 始终拥有最终用户回复的控制权”，最合适的协作方式是：

options:
A: 使用 handoff，把控制权直接转给 specialist。
B: 将 specialist 暴露为 manager 的 tool。
C: 让所有 specialist 并发各答一份。
D: 不允许 specialist 存在。

answer:

* B

option_analysis:
A: 错误。handoff 通常表示把任务或对话控制权转交给另一个 Agent，不符合 manager 始终控制最终回复的要求。
B: 正确。agent-as-tool 模式中，specialist 只是 manager 调用的内部能力，最终回复仍由 manager 统一组织。
C: 错误。并发回答会增加冲突、重复和汇总成本，也不能保证最终控制权清晰。
D: 错误。保留 manager 控制权并不意味着不能使用 specialist，而是要正确设计协作方式。

interview_followups:

* handoff 和 agent-as-tool 在日志、权限和责任归属上有什么区别？
* 在客服系统中，什么场景适合 handoff，什么场景适合 manager 调用 specialist？

--- question ---

question_id: agent_basic_sc_005
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:

* Agent 评测
* GAIA
* Benchmark
* 工具使用

stem: |
如果你要评估“通用 AI 助手”在网页浏览、工具使用、多模态与现实任务上的综合能力，最匹配的 Benchmark 是：

options:
A: MMLU
B: GAIA
C: HumanEval
D: ImageNet

answer:

* B

option_analysis:
A: 错误。MMLU 更偏向知识与学科能力评测，不直接覆盖通用助手的多工具现实任务执行能力。
B: 正确。GAIA 面向通用 AI 助手能力评测，强调现实任务、网页浏览、多模态信息和工具使用。
C: 错误。HumanEval 主要评估代码生成能力，不适合作为通用 Agent 综合能力评测。
D: 错误。ImageNet 是图像分类数据集，与 Agent 的工具使用和任务执行能力不匹配。

interview_followups:

* 为什么传统 NLP 指标很难完整评估 Agent 系统？
* 你会如何为企业内部 Agent 设计一个接近真实业务的评测集？

--- question ---

question_id: agent_basic_sc_006
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:

* Kubernetes
* 无状态服务
* Agent Gateway
* 横向扩展

stem: |
对于“无状态的 Agent Gateway / Orchestrator”服务，最常用、最合适的 Kubernetes 工作负载对象是：

options:
A: StatefulSet
B: DaemonSet
C: Deployment
D: Job

answer:

* C

option_analysis:
A: 错误。StatefulSet 更适合需要稳定网络标识、稳定存储和有序部署的有状态服务。
B: 错误。DaemonSet 适合在每个节点上运行一个副本，例如日志采集或节点监控，不是普通无状态网关的首选。
C: 正确。Deployment 适合无状态服务的副本管理、滚动发布、回滚和横向扩缩容。
D: 错误。Job 适合一次性批处理任务，不适合作为长期在线的 Agent Gateway / Orchestrator。

interview_followups:

* Agent Orchestrator 无状态化时，运行状态应该落到哪里？
* 如果 Agent 服务需要灰度发布和快速回滚，你会如何设计部署策略？

--- question ---

question_id: agent_basic_mc_001
module: Agent 基础与架构
type: multiple_choice
difficulty: 3
knowledge_points:

* Agent Runtime
* 工具调用
* 状态管理
* 规划模块

stem: |
一个生产级 Agent 运行时中，通常应包含哪些核心组件？

options:
A: 感知 / 输入规范化
B: 决策 / 规划模块
C: 工具执行与结果回写
D: 记忆 / Session / State 管理

answer:

* A
* B
* C
* D

option_analysis:
A: 正确。生产级 Agent 需要先对用户输入、上下文、附件、权限和任务意图做规范化处理。
B: 正确。Agent 需要根据目标和当前状态决定下一步动作，规划模块是多步执行的核心。
C: 正确。工具调用后必须把结果写回上下文，否则模型无法基于观察结果继续推理。
D: 正确。Session / State 管理负责保存历史、任务进度、中间结果和恢复执行所需信息。

interview_followups:

* 为什么生产级 Agent 不能只依赖一个超长 Prompt？
* 你会如何设计 tool result 写回格式，避免上下文被工具输出污染？

--- question ---

question_id: agent_basic_mc_002
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:

* 工具调用
* strict schema
* 权限校验
* 安全边界

stem: |
关于 Agent 中的工具调用与安全边界，下列说法正确的是：

options:
A: 工具参数应尽量结构化，并可启用 strict schema。
B: 模型发出的工具调用，仍应由应用层做权限与参数校验。
C: 高风险工具应结合 approval、guardrail 或 allowlist 思路。
D: 工具结果应按需写回上下文，否则后续推理可能失真。

answer:

* A
* B
* C
* D

option_analysis:
A: 正确。结构化参数和 strict schema 能降低参数缺失、类型错误和格式漂移的概率。
B: 正确。模型只能提出调用意图，真正的鉴权、参数校验和执行控制必须由应用层完成。
C: 正确。涉及发邮件、删数据、付款、改配置等高风险操作时，应加入审批、白名单和安全策略。
D: 正确。工具结果如果不写回，模型无法知道外部执行结果；如果写回过多，也可能污染上下文，因此需要按需结构化写回。

interview_followups:

* strict schema 能解决哪些问题？不能解决哪些安全问题？
* 如果一个工具会修改生产数据，你会如何设计审批和审计链路？

--- question ---

question_id: agent_basic_mc_003
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:

* 多 Agent
* handoff
* 终止条件
* 共享上下文

stem: |
关于多 Agent 协作模式，下列说法正确的是：

options:
A: handoff 适合把任务控制权转交给 specialist。
B: manager-as-tool 模式适合保持 manager 对最终答复的控制权。
C: 多 Agent 需要明确终止条件、角色边界与上下文策略。
D: 多个 Agent 可以共享同一 session 以复用会话历史。

answer:

* A
* B
* C
* D

option_analysis:
A: 正确。handoff 的核心是转移任务或对话控制权，适合领域分流和升级处理。
B: 正确。manager-as-tool 中 specialist 是内部能力，最终输出仍由 manager 负责。
C: 正确。没有终止条件、角色边界和上下文策略，多 Agent 容易循环、重复、冲突或争夺控制权。
D: 正确。多个 Agent 可以共享 session 或共享部分历史，但必须控制可见范围和写入策略，避免上下文污染。

interview_followups:

* 多 Agent 系统中如何避免两个 Agent 反复互相转交任务？
* 多个 Agent 共享上下文时，哪些信息应该共享，哪些信息不应该共享？

--- question ---

question_id: agent_basic_mc_004
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:

* 强化学习
* 模仿学习
* Behavior Cloning
* DAgger

stem: |
关于强化学习与模仿学习在 Agent 中的应用，下列说法正确的是：

options:
A: Behavior Cloning 适合已有专家轨迹、奖励难定义的场景。
B: DAgger 用数据聚合缓解 covariate shift / compounding error。
C: 当环境可交互且奖励函数明确定义时，强化学习更有优势。
D: 模仿学习和强化学习可以组合使用，例如先模仿学习冷启动，再用强化学习优化策略。

answer:

* A
* B
* C
* D

option_analysis:
A: 正确。Behavior Cloning 直接学习专家演示，适合奖励函数难以形式化但专家数据较容易获得的任务。
B: 正确。DAgger 通过迭代收集模型访问到的状态并请求专家标注，缓解分布偏移和误差累积。
C: 正确。可交互环境和明确奖励函数有利于强化学习通过试错优化长期回报。
D: 正确。工程上常见路线是先用模仿学习获得可用初始策略，再用强化学习或在线反馈进一步优化。

interview_followups:

* 为什么纯 Behavior Cloning 在长链路任务中容易出现 compounding error？
* 在一个 Agent 工具选择任务中，你会如何定义强化学习的 reward？

--- question ---

question_id: agent_basic_mc_005
module: Agent 基础与架构
type: multiple_choice
difficulty: 3
knowledge_points:

* Prompt 设计
* Reasoning Model
* Few-shot
* 记忆压缩

stem: |
关于 Prompt 设计、链式思维与记忆管理，下列做法正确的是：

options:
A: 对 reasoning models，应先尝试清晰直接的 zero-shot 指令。
B: 使用 markdown/XML 等分隔符，有助于区分输入区块。
C: 当对输出格式和边界情况要求高时，可加入 few-shot 样例。
D: 长会话中应配合记忆检索或压缩，而不是盲目追加上下文。

answer:

* A
* B
* C
* D

option_analysis:
A: 正确。Reasoning models 通常更适合清晰、直接、约束明确的指令，先从 zero-shot 验证是合理起点。
B: 正确。分隔符可以帮助模型区分系统要求、用户输入、检索材料、工具结果和输出格式。
C: 正确。Few-shot 可以给出格式、边界情况和判断标准，适合高一致性输出场景。
D: 正确。长会话应通过检索、摘要和压缩控制上下文质量，盲目追加会增加成本、延迟和冲突信息。

interview_followups:

* 为什么“请一步一步思考”不一定适合所有 reasoning model？
* 你会如何判断一段历史对当前任务是否应该被召回？

--- question ---

question_id: agent_basic_mc_006
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:

* Agent 评测
* Trace
* 工具成功率
* 成本指标

stem: |
评估一个 Agent 系统时，以下哪些指标或手段通常具有实际价值？

options:
A: 任务成功率 / pass rate
B: 工具调用成功率与参数合法率
C: 平均步骤数、延迟、token/cost
D: 人工介入率、失败类型分布、trace 归因

answer:

* A
* B
* C
* D

option_analysis:
A: 正确。任务成功率是评估 Agent 是否真正完成业务目标的核心指标。
B: 正确。工具调用成功率和参数合法率能反映工具 schema、参数生成、权限和执行链路的稳定性。
C: 正确。平均步骤数、延迟和 token/cost 直接影响线上用户体验和系统成本。
D: 正确。人工介入率、失败类型分布和 trace 归因能帮助定位失败来源，而不是只看最终答案对错。

interview_followups:

* 如果任务成功率下降，你会如何通过 trace 区分模型问题和工具问题？
* Agent 评测为什么不能只看最终文本相似度？

--- question ---

question_id: agent_basic_tf_001
module: Agent 基础与架构
type: true_false
difficulty: 2
knowledge_points:

* 上下文窗口
* 记忆压缩
* 长会话
* 信息噪声

stem: |
在 Agent 系统中，只要把上下文做得足够长，效果就一定会更好。

options:
A: 正确
B: 错误

answer:

* B

option_analysis:
A: 错误。上下文变长会带来更高成本、更大延迟和更多噪声信息，甚至可能引入冲突历史。
B: 正确。长会话需要检索、摘要、压缩和选择性注入，而不是无差别追加全部上下文。

interview_followups:

* 长上下文场景下，如何判断哪些历史应该进入当前 prompt？
* 你会如何设计 memory compaction 策略来降低 token 成本？

--- question ---

question_id: agent_basic_tf_002
module: Agent 基础与架构
type: true_false
difficulty: 2
knowledge_points:

* Reasoning Model
* Prompt 设计
* 指令简洁性
* 链式思维

stem: |
对于 reasoning models，在 Prompt 中要求“请一步一步思考”，一定会提升效果。

options:
A: 正确
B: 错误

answer:

* B

option_analysis:
A: 错误。显式要求一步一步思考并不总是提升效果，可能造成冗余推理、格式偏移或干扰模型已有推理机制。
B: 正确。对 reasoning models 更稳妥的做法通常是给出清晰目标、约束、输入边界和输出格式，再根据效果决定是否补充样例。

interview_followups:

* 面对 reasoning model，你会如何设计一个结构化输出 prompt？
* 如果模型推理正确但输出格式不稳定，你会优先改 prompt 还是改解析器？

--- question ---

question_id: agent_basic_tf_003
module: Agent 基础与架构
type: true_false
difficulty: 2
knowledge_points:

* Trace
* 可观测性
* Tool Call
* Guardrail

stem: |
Agent 系统的 tracing 应记录 LLM 生成、tool calls、handoffs、guardrails 等运行事件，以便开发和生产调试。

options:
A: 正确
B: 错误

answer:

* A

option_analysis:
A: 正确。Agent 是多步系统，仅看最终答案无法定位问题；tracing 应覆盖模型生成、工具调用、转交、审批、安全拦截和异常。
B: 错误。不记录这些运行事件会导致失败归因困难，无法判断问题来自模型、工具、状态、权限还是流程设计。

interview_followups:

* 一个 Agent trace 中至少应该记录哪些字段？
* 如果用户反馈 Agent “乱调用工具”，你会如何用 trace 定位？

--- question ---

question_id: agent_basic_cc_001
module: Agent 基础与架构
type: concept_compare
difficulty: 3
knowledge_points:

* Agent
* Workflow
* 控制权
* 工程取舍

stem: |
请辨析 Agent 与 Workflow 的区别，并说明什么场景下优先选 Agent，什么场景下优先选 Workflow。

reference_answer: |
Agent 与 Workflow 的核心区别在于控制权归属和路径是否动态。

Workflow 的执行路径通常由应用层预先定义，步骤、条件分支、重试策略和审批节点都比较明确。它适合流程稳定、规则确定、审计要求高、SLA 要求强的场景，例如报销审批、订单状态流转、固定数据处理流水线。

Agent 更适合目标明确但执行路径不固定的任务。它可以根据中间观察结果选择工具、调整计划、继续追问或重新规划。适用场景包括复杂检索、多工具协同、开放式分析、故障排查和任务规划。

工程实践中，二者并不是对立关系。更常见的方案是用 Workflow 固定主流程和安全边界，在局部节点引入 Agent 做动态决策。

answer_keywords:

* 控制权归属
* 固定流程
* 动态决策
* 工具选择
* 安全边界
* 混合架构

scoring_points:

* 能说明 Workflow 路径由应用层预定义，Agent 具有一定动态选择权。
* 能举出 Workflow 适合强规则、强审计、稳定流程的场景。
* 能举出 Agent 适合路径不固定、多工具、多步推理的场景。
* 能指出生产系统中常采用 Workflow + 局部 Agent 的混合方案。

interview_followups:

* 一个客服退款系统中，哪些部分适合 Workflow，哪些部分适合 Agent？
* 如果 Agent 的行为不稳定，你会如何把部分逻辑收敛成 Workflow？

--- question ---

question_id: agent_basic_cc_002
module: Agent 基础与架构
type: concept_compare
difficulty: 3
knowledge_points:

* 短期记忆
* 长期记忆
* Session
* Memory Retrieval

stem: |
请比较短期记忆 / Working Memory 与长期记忆 / Episodic or Retrieval Memory 在 Agent 中的职责差异。

reference_answer: |
短期记忆主要服务当前任务，通常包括最近多轮对话、当前计划、工具返回、中间变量、执行状态和未完成事项。它强调强相关、低延迟、可快速更新，通常与 Session 或当前 run state 绑定。

长期记忆用于跨任务复用信息，例如用户偏好、历史经验、重要事实、失败教训、项目背景和可检索知识。它强调持久化、可检索、可压缩和可更新，通常需要向量检索、关键词检索、摘要和过期策略。

工程上常见做法是：最近若干轮作为 working set；长期记忆按相关性召回；大段历史先摘要再注入；工具原始结果不一定全部进入上下文，而是保存结构化摘要和引用指针。

answer_keywords:

* Working Memory
* Long-term Memory
* Session
* 检索召回
* 摘要压缩
* 上下文预算

scoring_points:

* 能区分短期记忆服务当前任务，长期记忆服务跨任务复用。
* 能说明短期记忆通常保存最近对话、计划和工具结果。
* 能说明长期记忆通常需要检索、摘要、持久化和更新策略。
* 能提到上下文预算控制，避免全部历史无差别注入。

interview_followups:

* 用户偏好应该放在短期记忆还是长期记忆？为什么？
* 如果长期记忆召回了过时信息，你会如何设计更新和失效机制？

--- question ---

question_id: agent_basic_cc_003
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:

* 强化学习
* 模仿学习
* 奖励函数
* 分布偏移

stem: |
请比较强化学习与模仿学习在 Agent 决策优化中的适用前提、优势与工程代价。

reference_answer: |
强化学习依赖环境交互和奖励反馈，适合任务目标可量化、环境可模拟或可安全试错的场景。它的优势是可以优化长期回报，发现超过专家演示的策略；代价是样本效率低、训练不稳定、奖励设计困难，并且真实环境中的试错可能有安全风险。

模仿学习依赖专家演示数据，适合奖励难定义但专家行为容易收集的场景。它的优势是冷启动快、实现相对直接、风险较低；缺点是容易复制专家数据中的偏差，并在模型遇到训练分布外状态时出现 covariate shift 和 compounding error。

两者可以组合使用。常见路线是先用 Behavior Cloning 学到可用初始策略，再通过 DAgger、在线反馈或强化学习继续优化。

answer_keywords:

* 环境交互
* 奖励函数
* 专家轨迹
* Behavior Cloning
* DAgger
* compounding error

scoring_points:

* 能说明强化学习依赖奖励反馈和环境交互。
* 能说明模仿学习依赖专家演示数据。
* 能指出模仿学习的分布偏移和误差累积问题。
* 能指出强化学习的样本效率、奖励设计和安全试错成本。
* 能提出 BC + RL 或 BC + DAgger 的组合方案。

interview_followups:

* 如果一个 Agent 的工具选择有明确成功/失败反馈，你会选择 RL 还是 IL？
* DAgger 相比普通 Behavior Cloning 解决了什么问题？

--- question ---

question_id: agent_basic_cc_004
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:

* handoff
* agent-as-tool
* Manager Agent
* 责任归属

stem: |
请比较 handoff 与 agent-as-tool / manager orchestration 两种多 Agent 协作方式。

reference_answer: |
handoff 表示把任务控制权或对话所有权转交给另一个 specialist。它适合客服分流、领域升级、人工转接和专业角色接管等场景。handoff 的重点是“谁来继续处理”。

agent-as-tool 表示 specialist 只是 manager 可以调用的一种内部能力。manager 负责拆解任务、调用 specialist、整合结果并生成最终答复。它适合检索、代码检查、摘要、计算、诊断等需要专业能力但不希望失去最终控制权的场景。

两者的工程差异主要体现在控制权、日志归属、上下文传递和终止条件上。handoff 必须明确谁负责结束对话；agent-as-tool 必须明确 specialist 的输入输出契约和 manager 的整合责任。

answer_keywords:

* 控制权转移
* 最终答复控制权
* specialist
* manager orchestration
* 上下文传递
* 终止条件

scoring_points:

* 能说明 handoff 是控制权或对话所有权转移。
* 能说明 agent-as-tool 中 manager 保持最终回复控制权。
* 能给出两种模式各自适合的场景。
* 能提到上下文传递、日志、权限和终止条件的工程差异。

interview_followups:

* 如果 refund agent 处理完成后应该由谁回复用户？你会如何设计？
* specialist 作为 tool 时，输入输出 schema 应该如何约束？

--- question ---

question_id: agent_basic_cc_005
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:

* 反应式决策
* 分层规划
* Planner-Doer
* 重规划

stem: |
请比较反应式单步决策与分层规划 / 层级控制在 Agent 架构中的取舍。

reference_answer: |
反应式单步决策是在每一步基于当前输入、状态和工具结果直接决定下一步动作。它实现简单、响应快、链路短，适合短任务、低风险任务和步骤较少的工具调用场景。但它容易局部最优，对长任务的全局目标保持能力较弱。

分层规划会把任务拆成目标、子任务、计划和执行动作。常见结构是 planner 负责分解任务、制定计划，worker/doer 负责执行具体工具调用。它适合长链路、多约束、多工具和需要重规划的任务，优势是结构清晰、可审计、可插入验证器；缺点是系统复杂度高、延迟更大，并且 planner 可能生成不可执行计划。

工程上通常需要在 planner 和 worker 之间加入计划校验、工具能力约束、失败反馈和 bounded replan 机制。

answer_keywords:

* 单步决策
* 分层规划
* Planner
* Worker
* bounded replan
* 计划校验

scoring_points:

* 能说明反应式决策简单快速但容易局部最优。
* 能说明分层规划适合长任务、多工具和复杂约束。
* 能指出分层规划带来的延迟和复杂度成本。
* 能提出计划校验、工具能力约束和有限重规划机制。

interview_followups:

* planner 生成了不存在的工具调用时，你会如何修复？
* 什么情况下你会把复杂 planner 简化成反应式 Agent？

--- question ---

question_id: agent_basic_sd_001
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:

* Agent Loop
* 停止条件
* 工具重复调用
* Trace 调试

stem: |
某 Agent 成功调用了天气工具，但随后连续重复调用同一工具 5 次，始终不进入最终回答。你会如何排查？

reference_answer: |
这个问题通常不是天气工具本身失败，而是 Agent loop 的完成判定、状态写回或停止条件出现问题。

首先要确认工具调用是否真的成功，并检查工具返回是否被正确写回上下文。其次查看模型在每一轮是否能看到上一次工具结果，以及工具结果是否被截断、格式异常或缺少关键字段。然后检查系统提示词中是否存在“信息不足就继续查询”的强约束，导致模型误判任务未完成。

还需要通过 trace 比对连续 5 次调用的工具名、参数、返回结果和模型决策理由。如果参数完全相同，说明需要加入同参去重和幂等缓存；如果参数变化但目标不变，说明 planner 的完成标准不清晰。

修复方案包括增加 max_steps、同参去重、工具结果摘要、明确 success criteria，以及在工具成功后要求模型优先总结而不是继续查询。

answer_keywords:

* max_steps
* 工具结果写回
* 停止条件
* 同参去重
* success criteria
* trace

scoring_points:

* 能优先检查工具结果是否成功写回上下文。
* 能通过 trace 对比重复调用的参数、结果和模型决策。
* 能指出停止条件或完成判定不明确可能导致循环。
* 能提出 max_steps、去重、幂等缓存和 success criteria 等修复方案。

diagnosis_steps:

* 检查天气工具是否返回成功状态、有效字段和可供回答的信息。
* 检查工具结果是否被写回 messages / state，并在下一轮模型输入中可见。
* 查看 trace 中连续 5 次调用的 tool_name、args、result 和模型动作选择。
* 判断重复调用是同参重复、参数漂移，还是 prompt 中完成条件不清晰。
* 检查是否缺少 max_steps、循环检测、同参去重和最终回答触发规则。

optimization_points:

* 增加 max_steps 和 max_repeated_tool_calls 限制。
* 对同名工具同参数调用做去重和幂等缓存。
* 将工具结果结构化写回，并标记 task_completed_candidate。
* 在系统提示词中明确“拿到必要天气数据后直接总结回答”。
* 对工具循环类失败建立 trace 告警和离线 replay 样本。

interview_followups:

* 如何区分工具失败导致的重试和 Agent 完成判定失败导致的循环？
* 你会把循环检测放在 prompt 中，还是放在应用层 runtime 中？为什么？

--- question ---

question_id: agent_basic_sd_002
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:

* 多 Agent
* handoff 循环
* ownership
* 终止条件

stem: |
一个 triage agent 与 refund agent 之间反复 handoff，用户始终收不到最终答复。你会如何定位问题？

reference_answer: |
这个问题的核心通常是多 Agent 的控制权归属和终止条件不清晰。

首先要查看每次 handoff 的原因、目标 Agent、传递的上下文和接收方判断逻辑。triage agent 可能把退款问题转给 refund agent，但 refund agent 发现信息不完整后又转回 triage agent，形成循环。其次要检查 handoff_description 是否过宽，导致两个 Agent 都认为对方更适合处理。

还要明确谁拥有最终回复责任。如果 refund agent 能完成退款判断，就应该直接返回处理结果或交给 manager 总结，而不是再转回 triage。工程上应设置最大 handoff hops，并在 handoff payload 中传入 reason、summary、required_fields 和 completion_condition。

answer_keywords:

* handoff loop
* 角色边界
* ownership
* max handoff hops
* handoff payload
* completion condition

scoring_points:

* 能识别反复 handoff 是角色边界和控制权设计问题。
* 能检查 handoff_description、上下文传递和接收方判断规则。
* 能提出最大 handoff 次数和明确完成条件。
* 能说明最终回复责任应由 specialist 或 manager 明确承担。

diagnosis_steps:

* 拉取完整 trace，按时间顺序查看 triage 与 refund 的 handoff 事件。
* 检查每次 handoff 的 reason、payload、上下文摘要和目标 Agent。
* 判断两个 Agent 的职责描述是否重叠或过宽。
* 检查 refund agent 是否缺少完成后返回结果的规则。
* 检查系统是否设置 max_handoff_hops 和循环拦截策略。

optimization_points:

* 明确 triage 只负责路由，refund 负责退款判断和结果生成。
* 为每个 handoff 增加 reason、summary、required_fields 和 completion_condition。
* 设置最大 handoff hops，超过阈值后回退到 manager 或人工处理。
* 对 specialist 增加“能完成就输出结论，不能完成才请求补充字段”的规则。
* 将 handoff 循环样本加入回归测试集。

interview_followups:

* 多 Agent 系统中，如何定义“谁负责最终回答”？
* 如果两个 Agent 的能力边界有重叠，你会如何设计路由优先级？

--- question ---

question_id: agent_basic_sd_003
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:

* 长会话
* 记忆压缩
* 上下文污染
* 成本治理

stem: |
一个长会话 Agent 上线后，延迟与 token 成本逐周上升，同时开始出现前后自相矛盾的回答。你会如何治理？

reference_answer: |
这个问题通常来自历史上下文无差别追加、长期记忆召回不受控、工具输出冗余和旧信息未失效。

首先要统计每次请求注入的历史轮数、工具结果长度、长期记忆条数和总 token 数。然后抽样检查上下文中是否存在重复摘要、过期事实、互相冲突的用户偏好或低价值历史。接着根据 trace 对比错误回答与注入上下文，判断矛盾是否来自模型本身，还是来自错误记忆。

治理方案应分层处理：最近若干轮作为 working set；旧对话做摘要压缩；长期记忆按相关性、时间和可信度检索；过期信息设置 TTL；工具长输出只保存摘要和引用指针。上线后监控平均上下文长度、召回命中率、冲突率、延迟和成本。

answer_keywords:

* context compaction
* working set
* 长期记忆召回
* TTL
* 冲突检测
* token 成本

scoring_points:

* 能从上下文长度、历史注入和记忆召回入手定位问题。
* 能识别过期信息、重复摘要和工具长输出对回答质量的影响。
* 能提出 working set、摘要压缩、长期记忆检索和 TTL 策略。
* 能给出延迟、成本、冲突率等治理指标。

diagnosis_steps:

* 统计线上请求的平均 token 数、历史轮数、工具输出长度和长期记忆注入数量。
* 抽样检查上下文中是否存在重复、过期、冲突或低价值内容。
* 通过 trace 关联错误回答与被注入的历史或记忆条目。
* 区分问题来自模型推理、记忆召回、摘要压缩还是工具结果污染。
* 对高成本会话进行 replay，比较压缩前后的质量、延迟和成本变化。

optimization_points:

* 保留最近 n 轮作为 working set，旧历史进入摘要层。
* 长期记忆按相关性、时间衰减和可信度排序召回。
* 对过期偏好和事实设置 TTL、版本号和冲突覆盖策略。
* 工具长输出只保存结构化摘要、关键字段和引用指针。
* 建立上下文长度、记忆命中率、冲突率和单次成本监控。

interview_followups:

* 如果长期记忆中有两条互相冲突的信息，Agent 应该如何处理？
* 你会如何评估记忆压缩是否损失了关键信息？

--- question ---

question_id: agent_basic_sd_004
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:

* 线上评测
* Benchmark 偏差
* 工具链路
* 失败归因

stem: |
你的 Agent 在线下 benchmark 集上表现很好，但上线后任务成功率大幅下降。你会优先怀疑什么？

reference_answer: |
我会优先怀疑线下评测环境与真实运行环境不一致，而不是直接断定模型能力不足。

线下 benchmark 可能使用标准输入、mock 工具、稳定网络和理想权限；线上则会遇到脏输入、超时、权限失败、工具变更、审批中断、prompt injection 和用户目标不明确。首先要把线上失败 trace 按类型切分，区分模型理解失败、工具调用失败、参数非法、权限失败、状态丢失、超时和安全拦截。

接着对比线下评测集与线上流量分布，检查任务类型、输入长度、工具可用性、用户表达和失败模式是否一致。优化上应引入真实工具沙盒、shadow traffic、线上 replay、失败样本回流和更细粒度的评测指标。

answer_keywords:

* distribution shift
* mock tool
* 线上 replay
* shadow traffic
* 失败类型
* 工具超时

scoring_points:

* 能优先考虑线下评测与线上环境的分布差异。
* 能从模型、工具、状态、权限、安全拦截等维度切分失败类型。
* 能提出 shadow traffic、真实工具沙盒和线上 replay。
* 能说明 benchmark 高分不等于生产稳定性。

diagnosis_steps:

* 收集线上失败 trace，按任务类型和失败阶段分类。
* 对比线下 benchmark 的输入分布、工具环境和权限设置。
* 检查线上工具是否存在超时、参数非法、权限失败或返回格式变化。
* 检查线上是否存在 prompt injection、脏数据和用户目标不明确问题。
* 将线上失败样本回放到离线环境，验证是否可复现。

optimization_points:

* 建立线上 replay 数据集，持续回流真实失败样本。
* 在评测中接入真实工具沙盒，而不是只使用理想 mock。
* 引入 shadow traffic，对新版本进行灰度验证。
* 按失败类型分别优化 prompt、工具 schema、权限策略和状态管理。
* 增加任务成功率、工具成功率、超时率、审批中断率等线上指标。

interview_followups:

* 如果离线 replay 无法复现线上失败，你下一步会查什么？
* 你会如何设计一个比 benchmark 更接近真实业务的 Agent 评测集？

--- question ---

question_id: agent_basic_sd_005
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:

* Planner-Worker
* 工具能力边界
* 计划校验
* 重规划

stem: |
一个“planner → worker”分层 Agent 经常生成不可执行的子任务，比如要求 worker 调用根本不存在的工具。如何修复？

reference_answer: |
这类问题通常来自 planner 没有获得真实工具能力边界，或者 planner 输出没有经过可执行性校验。

首先检查 planner 输入中是否包含当前可用工具清单、参数 schema、权限限制、资源约束和禁止事项。其次查看 planner 的输出格式是否只是自然语言计划，如果没有结构化 action 或 tool name，worker 就很难可靠执行。然后检查 worker 失败时是否把失败原因反馈给 planner，还是直接无限重试。

修复方案包括：给 planner 显式注入工具 affordance；要求 planner 输出结构化计划；在执行前加入 plan validator；如果计划不可执行，则返回具体错误让 planner 有界重规划。对于高风险任务，还可以让应用层做最终 feasibility check，而不是完全相信 planner。

answer_keywords:

* tool affordance
* plan validator
* structured plan
* bounded replan
* feasibility check
* 工具 schema

scoring_points:

* 能识别 planner 不知道真实工具边界是主要原因。
* 能检查工具清单、schema、权限和资源约束是否进入 planner 上下文。
* 能提出结构化计划和 plan validator。
* 能设计失败反馈和有限重规划，避免无限循环。

diagnosis_steps:

* 检查 planner 输入是否包含完整、最新的工具清单和参数 schema。
* 抽样查看不可执行子任务，判断是工具不存在、参数非法还是权限不足。
* 检查 planner 输出是否结构化，是否能被 worker 稳定解析。
* 查看 worker 失败后是否将具体失败原因写回 planner。
* 检查是否缺少 plan validation、最大重规划次数和 fallback 策略。

optimization_points:

* 将可用工具、参数约束、权限边界和资源限制结构化注入 planner。
* 要求 planner 输出可验证的 JSON 风格计划。
* 在 worker 执行前加入 plan validator，拦截不存在工具和非法参数。
* worker 失败后返回标准化错误，触发 bounded replan。
* 对高风险动作增加应用层 feasibility check 和人工审批。

interview_followups:

* planner 的工具清单应该动态注入还是写死在系统提示词里？
* 如果 planner 连续三次生成不可执行计划，系统应该如何降级？

--- question ---

question_id: agent_basic_sys_001
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:

* 企业知识助理
* Agent Runtime
* 人工审批
* 可观测性

stem: |
请设计一个企业知识助理 Agent 平台，要求支持工具调用、会话记忆、可观测性、灰度发布与人工审批。

reference_answer: |
这个平台应拆成接入层、编排层、状态层、工具层、安全层和观测层。

接入层由 API Gateway 负责认证、租户识别、限流、请求校验和审计入口。Agent Orchestrator 负责运行 agent loop，包括规划、工具选择、工具结果写回、最终回答生成和错误处理。Session / Memory Store 保存最近会话、任务状态、长期偏好和可恢复执行信息。

Tool Router 统一管理企业搜索、知识库、工单、邮件、日历等工具，负责 schema 校验、超时、重试、熔断、幂等和权限检查。Retriever 负责知识检索和引用材料召回。Guardrails / Approval 层负责输入安全检查、输出合规检查和高风险动作人工审批。Tracing / Metrics / Evals 记录每一次 run、tool call、审批、失败和成本。

部署上，Gateway 和 Orchestrator 应尽量无状态化，通过 Deployment 横向扩展；Session、Memory、Queue 和 Trace Store 使用共享后端；工具适配器可以按业务域微服务化，便于独立扩展和权限隔离。

answer_keywords:

* API Gateway
* Agent Orchestrator
* Session Store
* Tool Router
* Guardrails
* Tracing
* Canary
* Human Approval

scoring_points:

* 能拆出网关、编排、状态、工具、安全审批和可观测性模块。
* 能说明 Orchestrator 负责 agent loop 和工具结果写回。
* 能说明高风险工具必须经过审批和审计。
* 能说明无状态服务横向扩展，状态落共享存储。
* 能覆盖灰度发布、回滚、监控和评测。

interview_followups:

* 如果企业知识库检索结果与长期记忆冲突，Agent 应该优先信哪个？
* 高风险工具审批通过后，如何保证实际执行参数没有被篡改？

architecture_points:

* API Gateway：认证、鉴权、租户隔离、限流、请求校验。
* Agent Orchestrator：规划、agent loop、工具调度、最终回答生成。
* Session / Memory Store：保存会话历史、任务状态、长期记忆和恢复点。
* Tool Router：统一工具注册、schema 校验、超时、重试、熔断和幂等。
* Retriever / KB：企业知识检索、引用材料召回和结果排序。
* Guardrails / Approval：输入输出安全检查、高风险动作审批和策略拦截。
* Tracing / Metrics / Evals：记录运行事件、失败类型、成本、延迟和质量指标。

data_flow:

* 用户请求进入 API Gateway，完成认证、限流和租户识别。
* Gateway 将规范化请求发送到 Agent Orchestrator。
* Orchestrator 读取 Session、长期记忆和检索材料，构造当前上下文。
* Planner 决定是否调用工具、请求补充信息或生成最终回答。
* Tool Router 校验工具名、参数、权限和风险等级。
* 高风险工具进入 Approval；低风险工具直接执行并写回结果。
* Orchestrator 根据工具结果继续推理，直到满足完成条件。
* 最终回答返回用户，同时 trace、metrics 和评测样本写入观测系统。

evaluation_metrics:

* 任务成功率
* 工具调用成功率
* 参数合法率
* 人工审批触发率
* 平均步骤数
* 平均延迟
* 单次 token 成本
* 用户满意度
* 引用命中率
* 失败类型分布

risk_points:

* 工具越权调用导致数据泄露或误操作。
* 长期记忆召回错误或过期信息导致回答冲突。
* 检索结果被 prompt injection 污染。
* 高风险动作绕过审批或审批参数被篡改。
* 工具超时和重试风暴导致系统雪崩。
* 灰度版本缺少回滚策略导致线上质量下降。

--- question ---

question_id: agent_basic_sys_002
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:

* 多 Agent
* 运维故障响应
* 人工审批
* 事后复盘

stem: |
请设计一个多 Agent 的运维故障响应系统，要求支持 triage、日志分析、修复建议、执行审批与事后复盘。

reference_answer: |
该系统应以 triage agent 为入口，由 manager 统一控制风险边界和最终输出。

告警或用户输入进入后，triage agent 负责识别故障类型、影响范围、紧急程度和需要调用的 specialist。日志分析 Agent 负责查询日志、trace 和指标；基础设施诊断 Agent 负责读取 K8s、云监控和 CMDB；Runbook Agent 负责匹配历史预案并生成修复建议。Manager Agent 汇总各 specialist 的结论，形成候选诊断和建议动作。

所有执行类动作必须进入 Human Approval，再由独立 Executor Service 执行。LLM 不应直接拥有生产写权限。执行后，系统写入变更审计，并由 Postmortem Generator 生成事后复盘草稿，包括时间线、根因、影响范围、修复动作和后续预防措施。

answer_keywords:

* Triage Agent
* Log Analysis Agent
* Infra Diagnosis Agent
* Runbook Agent
* Human Approval
* Executor Service
* Postmortem
* 最小权限

scoring_points:

* 能设计 triage、日志分析、基础设施诊断、runbook 和 manager 分工。
* 能明确分析、建议和执行三类动作的边界。
* 能说明生产执行必须经过人工审批和独立 Executor。
* 能覆盖 trace、审计、事后复盘和故障样本回流。
* 能提出防止 handoff 循环和越权执行的机制。

interview_followups:

* 如果日志分析 Agent 和基础设施诊断 Agent 结论冲突，manager 应该如何处理？
* 修复建议从“建议模式”切换到“自动执行模式”需要满足哪些条件？

architecture_points:

* Triage Agent：识别告警类型、优先级、影响范围和路由目标。
* Log Analysis Agent：查询日志、指标、trace，定位异常模式。
* Infra Diagnosis Agent：读取 K8s、云资源、CMDB 和依赖状态。
* Runbook Agent：匹配预案，生成可执行修复建议。
* Manager Agent：汇总 specialist 结论，生成诊断和执行计划。
* Human Approval：审批高风险修复动作和生产变更。
* Executor Service：以最小权限执行被批准的命令或 API 调用。
* Postmortem Generator：生成复盘草稿和改进建议。

data_flow:

* 告警进入系统，triage agent 判断故障类型和严重程度。
* triage agent 将日志、基础设施或 runbook 子任务分配给对应 specialist。
* specialist 只读查询日志、指标、trace、CMDB 和 runbook 库。
* specialist 将证据、判断和置信度返回 manager。
* manager 汇总诊断结论，生成修复候选动作。
* 高风险动作进入人工审批，审批通过后由 Executor Service 执行。
* 执行结果写入审计日志，并回传给 manager。
* 故障结束后生成 postmortem，失败样本进入评测和训练数据集。

evaluation_metrics:

* 告警分类准确率
* 平均定位时间
* 平均恢复时间
* 工具查询成功率
* 修复建议采纳率
* 审批通过率
* 误执行次数
* handoff 循环次数
* 事后复盘完整度
* 人工介入率

risk_points:

* Agent 误判故障根因导致错误修复。
* LLM 直接执行生产操作造成事故扩大。
* specialist 之间反复 handoff，无法收敛。
* 日志或监控数据缺失导致诊断偏差。
* 执行权限过大，不符合最小权限原则。
* 修复脚本缺少幂等和回滚设计。

--- question ---

question_id: agent_basic_sys_003
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:

* 可插拔策略层
* LLM Planner
* RL/IL
* Offline Replay

stem: |
请设计一个“可插拔策略层”的 Agent Runtime 平台，使其既能运行 LLM-based planner，也能逐步接入 RL/IL 优化过的决策模块。

reference_answer: |
关键设计是把决策层抽象成统一的 policy contract，而不是让 Runtime 直接绑定某一个 LLM planner。

Runtime Orchestrator 负责维护 run state、调用策略层、执行工具和写回结果。Policy 接口的输入应包括状态表示、用户目标、可用工具、参数约束、历史摘要、风险等级和上下文特征；输出应是结构化 action，例如调用某个工具、请求补充信息、生成最终回答或进入审批。

初期可以使用 LLM Planner 实现 policy contract。随着 trace、人工标注、专家演示和线上反馈积累，可以构建 Dataset Builder，将 state-action-result-reward_proxy 写入离线数据集。随后用 RL/IL 训练策略服务，并通过 Policy Registry 管理版本。生产中应先采用建议模式或 shadow 模式，再逐步对低风险、高频、可验证的决策点启用 learned policy。

answer_keywords:

* policy contract
* State Encoder
* LLM Planner
* Policy Service
* Dataset Builder
* RLlib
* Policy Registry
* fallback

scoring_points:

* 能提出统一的策略接口，输入 state，输出 action。
* 能区分 LLM planner、RL/IL policy service 和 runtime orchestrator 职责。
* 能说明 trace 如何构建离线训练数据。
* 能提出版本管理、A/B、shadow、回滚和 fallback。
* 能说明 learned policy 应优先用于低风险、高频、可评估决策点。

interview_followups:

* 什么样的 Agent 决策点适合用 RL/IL 替换 LLM planner？
* 如果 learned policy 与 LLM planner 给出不同动作，你会如何仲裁？

architecture_points:

* Runtime Orchestrator：维护 run state，调用策略层，执行工具并写回结果。
* State Encoder：将会话、工具结果、风险等级和任务上下文编码为 policy 输入。
* LLM Planner：实现初期基于 Prompt 的策略决策。
* Policy Service：承载 RL/IL 训练出的策略模型，输出结构化 action。
* Tool Dispatcher：执行工具调用、校验参数、处理超时和重试。
* Tracing & Offline Replay：记录 state、action、tool result、reward proxy 和失败原因。
* Dataset Builder：从 trace 中构造训练、验证和回放数据集。
* Policy Registry：管理策略版本、灰度、回滚和兼容性。

data_flow:

* 用户请求进入 Runtime Orchestrator。
* Orchestrator 从 Session 和工具结果中构造当前 run state。
* State Encoder 将状态转为标准 policy input。
* Policy Router 根据版本、风险等级和实验配置选择 LLM Planner 或 Policy Service。
* 策略层输出结构化 action。
* Tool Dispatcher 执行动作，并将结果写回 state。
* Tracing 系统记录 state、action、结果、延迟、成本和 reward proxy。
* Dataset Builder 从 trace 中生成离线数据，用于 IL/RL 训练。
* 新策略进入 Policy Registry，经 shadow/A-B 验证后逐步上线。

evaluation_metrics:

* 策略动作准确率
* 任务成功率
* 平均步骤数
* 工具误调用率
* 低置信度 fallback 率
* 策略版本回滚率
* reward proxy 提升幅度
* shadow 模式一致率
* 线上事故率
* 单次决策延迟

risk_points:

* state representation 不完整导致策略学习错误。
* reward proxy 与真实业务目标不一致。
* 训练数据来自旧策略，存在偏差和分布漂移。
* learned policy 黑盒化后可解释性下降。
* 高风险动作过早交给自动策略执行。
* 策略版本兼容性不足导致 runtime 解析失败。

--- question ---

question_id: agent_basic_code_001
module: Agent 基础与架构
type: coding_or_pseudocode
difficulty: 4
knowledge_points:

* Agent Loop
* 工具调用
* 审批阻断
* 重复调用去重

stem: |
请写一个最小可运行的 Agent Loop 伪代码，要求支持：最大步数限制、工具调用、审批前阻断、重复调用去重。

reference_answer: |
核心思路是把 Agent 执行过程限制在一个 bounded loop 中。每一轮先调用模型获得动作，如果是 final 就结束；如果是 tool_call，就做工具存在性校验、重复调用检测、审批检查和参数执行。工具结果必须写回上下文，供下一轮模型继续推理。

生产系统中不能让模型无限循环，也不能让模型直接执行高风险工具。max_steps 用来防止无限循环；seen_calls 用来拦截同名同参重复调用；require_approval 用来阻断高风险工具；tool_registry 用来限制模型只能调用已注册工具。

answer_keywords:

* bounded loop
* max_steps
* tool_registry
* require_approval
* dedup_key
* tool result 写回
* paused_for_approval

scoring_points:

* 伪代码包含最大步数限制，避免无限循环。
* 能区分 final answer 和 tool_call。
* 能检查工具是否存在于 tool_registry。
* 能对同名同参数工具调用进行去重。
* 能对高风险工具进入审批阻断。
* 能将工具结果写回 messages 或 state。

interview_followups:

* 重复调用去重应该基于原始参数字符串，还是基于规范化后的参数？为什么？
* 如果工具调用失败，Agent loop 应该重试、返回错误，还是让模型重新规划？

pseudocode: |
def run_agent_loop(model, tool_registry, messages, max_steps=8, require_approval=None):
require_approval = require_approval or set()
seen_calls = set()

```
  for step in range(max_steps):
      action = model.generate(messages)

      if action.type == "final":
          return {
              "status": "ok",
              "answer": action.content,
              "steps": step + 1
          }

      if action.type != "tool_call":
          return {
              "status": "error",
              "reason": "unknown_action",
              "steps": step + 1
          }

      tool_name = action.tool_name
      args = normalize_args(action.args)

      if tool_name not in tool_registry:
          messages.append({
              "role": "tool",
              "name": tool_name,
              "content": "工具不存在，请重新规划。"
          })
          continue

      dedup_key = (tool_name, stable_json_dumps(args))
      if dedup_key in seen_calls:
          messages.append({
              "role": "tool",
              "name": tool_name,
              "content": "重复调用已拦截，请基于已有结果总结或重新规划。"
          })
          continue

      seen_calls.add(dedup_key)

      if tool_name in require_approval:
          approval_id = create_approval_request(tool_name, args)
          return {
              "status": "paused_for_approval",
              "approval_id": approval_id,
              "tool": tool_name,
              "args": args
          }

      try:
          result = tool_registry[tool_name](args)
      except Exception as e:
          result = {
              "ok": False,
              "error": str(e)
          }

      messages.append({
          "role": "tool",
          "name": tool_name,
          "content": serialize_result(result)
      })

  return {
      "status": "max_steps_exceeded",
      "steps": max_steps
  }
```

complexity:
time: O(T + Σ tool_time_i)，其中 T 为 max_steps，tool_time_i 为第 i 次工具调用耗时。
space: O(T + H)，其中 T 为最多循环步数，H 为 messages 历史和 seen_calls 去重集合占用。

test_cases:

* input: |
  model 第 1 步返回 final，内容为 "完成"；max_steps=8；无工具调用。
  expected: |
  返回 status="ok"，answer="完成"，steps=1。
* input: |
  model 连续两次返回同一个 tool_call：tool_name="weather"，args={"city":"深圳"}；tool_registry 中存在 weather。
  expected: |
  第一次执行 weather 并写回结果；第二次被 seen_calls 拦截，不重复执行工具。
* input: |
  model 返回 tool_call：tool_name="send_email"，args={"to":"[a@example.com](mailto:a@example.com)"}；send_email 在 require_approval 中。
  expected: |
  不直接执行工具，返回 status="paused_for_approval" 并包含审批信息。

--- question ---

question_id: agent_basic_code_002
module: Agent 基础与架构
type: coding_or_pseudocode
difficulty: 4
knowledge_points:

* 记忆检索
* Top-K
* 时间衰减
* 上下文压缩

stem: |
请写一个 Python 风格的记忆检索与压缩函数：保留最近 n_recent 条消息；从长期记忆中按“相似度 + 时间衰减”选出 top-k；当上下文超过预算时自动压缩早期消息。

reference_answer: |
核心思路是把上下文构造分为三层：最近消息、长期记忆召回和预算控制。

最近 n_recent 条消息作为 working memory，保证当前任务连续性。长期记忆通过相似度和时间衰减综合打分，避免只召回语义相似但已经过期的信息。使用小顶堆维护 top-k，避免对全部记忆排序带来的额外成本。

构造完成后，需要用 token_budget 控制上下文大小。如果超出预算，就优先压缩较早、价值较低的消息，保留摘要而不是简单丢弃全部信息。

answer_keywords:

* recent window
* long-term memory
* cosine similarity
* recency decay
* heap top-k
* token budget
* summarize

scoring_points:

* 能保留最近 n_recent 条消息作为 working memory。
* 能对长期记忆按相似度和时间衰减综合打分。
* 能用 top-k 选择最相关记忆。
* 能在超过 token_budget 时执行压缩。
* 能说明时间复杂度和空间复杂度。

interview_followups:

* 时间衰减权重过高会带来什么问题？
* 如果压缩摘要丢失了关键工具结果，你会如何设计引用指针或原文回查机制？

pseudocode: |
import heapq
import math

def score_memory(query_vec, memory):
similarity = cosine_similarity(query_vec, memory["vector"])
recency = math.exp(-0.05 * memory["age_days"])
confidence = memory.get("confidence", 1.0)
return 0.75 * similarity + 0.20 * recency + 0.05 * confidence

def build_context(recent_msgs, long_term_memories, query_vec, token_budget, n_recent=8, k=5):
working_set = recent_msgs[-n_recent:]

```
  heap = []
  for memory in long_term_memories:
      score = score_memory(query_vec, memory)
      item = (score, memory["id"], memory)

      if len(heap) < k:
          heapq.heappush(heap, item)
      elif score > heap[0][0]:
          heapq.heapreplace(heap, item)

  retrieved = [
      memory
      for score, memory_id, memory in sorted(heap, key=lambda x: x[0], reverse=True)
  ]

  context = []
  for msg in working_set:
      context.append(msg)

  for memory in retrieved:
      context.append({
          "role": "memory",
          "content": memory["text"],
          "memory_id": memory["id"]
      })

  while estimate_tokens(context) > token_budget and len(context) > 2:
      oldest = context.pop(0)
      summary = summarize_item(oldest)
      context.insert(0, {
          "role": "summary",
          "content": summary,
          "source": "context_compaction"
      })

      if estimate_tokens(context) > token_budget and context[0]["role"] == "summary":
          context[0]["content"] = shorten_summary(context[0]["content"])

  return context
```

complexity:
time: O(m log k + c)，其中 m 为长期记忆数量，k 为召回数量，c 为压缩过程中估算 token 和摘要处理的成本。
space: O(k + n_recent + c)，其中 k 为长期记忆召回数量，n_recent 为最近消息数量，c 为压缩后上下文占用。

test_cases:

* input: |
  recent_msgs 有 10 条；n_recent=3；long_term_memories 有 2 条；token_budget 足够。
  expected: |
  context 中保留最近 3 条消息，并加入按分数排序后的长期记忆。
* input: |
  long_term_memories 有 100 条；k=5；每条 memory 都有 vector、age_days、text；token_budget 足够。
  expected: |
  只召回综合分数最高的 5 条长期记忆。
* input: |
  recent_msgs 和 retrieved memories 拼接后超过 token_budget。
  expected: |
  函数压缩较早消息，插入 summary，直到上下文满足 token_budget 或达到最小保留边界。
