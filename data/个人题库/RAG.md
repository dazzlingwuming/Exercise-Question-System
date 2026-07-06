--- question ---

question_id: agent_basic_sc_001
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:
  - RAG 基础定义
  - 参数化记忆
  - 非参数化记忆

stem: |
  关于 RAG 的核心思想，下列说法最准确的是？
  Lewis 等人在提出 RAG 时，将其描述为把参数化记忆与可检索的非参数化记忆结合起来，用于知识密集型任务。 citeturn1academia0 fileciteturn0file0

options:
  A: RAG 的本质是通过增大上下文窗口，把所有知识直接塞给模型
  B: RAG 的本质是把参数化模型与外部可检索知识源结合，用检索到的证据辅助生成
  C: RAG 的本质是让模型在训练阶段记住更多知识，因此在线阶段不需要检索
  D: RAG 的本质是把所有文档做关键词匹配后原样返回，不需要生成模型参与

answer:
  - B

option_analysis:
  A: 错误。更长上下文可能是实现手段之一，但不是 RAG 的定义核心；RAG 的关键在于把生成模型与外部检索记忆结合，而不是单纯扩上下文。 citeturn1academia0turn11academia1
  B: 正确。RAG 的代表性定义就是融合参数化记忆与非参数化记忆，并通过检索到的证据辅助回答知识密集型问题。 citeturn1academia0
  C: 错误。RAG 的价值恰恰在于在线访问外部知识，以缓解参数记忆更新难、来源不可追溯等问题。 citeturn1academia0
  D: 错误。仅返回关键词匹配结果属于检索系统，不构成完整的 retrieval-augmented generation；RAG 仍包含生成阶段。 citeturn1academia0turn17view3

interview_followups:
  - 如果业务知识每天更新一次，为什么纯微调往往不如 RAG 更合适？
  - 你会怎样向面试官解释“参数化记忆”和“非参数化记忆”的工程边界？

--- question ---

question_id: agent_basic_sc_002
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - RAG-Sequence
  - RAG-Token
  - 生成条件化

stem: |
  关于 Lewis 等论文中的 RAG-Sequence 与 RAG-Token，下列说法最准确的是？
  论文区分了“整段生成过程共享同一组检索文档”和“每个 token 可依赖不同检索文档”两种 formulation。 citeturn1academia0

options:
  A: RAG-Sequence 允许每个生成 token 单独更换检索文档，RAG-Token 不允许
  B: 两者完全等价，只是训练损失名字不同
  C: RAG-Sequence 在整段生成中固定同一组检索文档，RAG-Token 允许按 token 动态依赖不同文档
  D: RAG-Token 只适用于 BM25，RAG-Sequence 只适用于向量检索

answer:
  - C

option_analysis:
  A: 错误。这个描述把两者说反了。按 token 动态依赖不同文档的是 RAG-Token。 citeturn1academia0
  B: 错误。两者在条件化方式上不同，论文明确把它们作为两种 RAG formulation 来比较。 citeturn1academia0
  C: 正确。RAG-Sequence 整个输出序列共享同一批检索结果；RAG-Token 则可在 token 级别依赖不同的证据。 citeturn1academia0
  D: 错误。论文中的区分不在于 BM25 还是向量检索，而在于生成时如何使用已检索到的证据。 citeturn1academia0

interview_followups:
  - 从工程角度看，为什么大多数生产 RAG 更像 RAG-Sequence，而不是严格实现 RAG-Token？
  - 如果要做多跳问答，你会如何借鉴 RAG-Token 的思想而不把系统做得太重？

--- question ---

question_id: agent_basic_sc_003
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - Dense Retrieval
  - DPR
  - 语义检索

stem: |
  关于 Dense Passage Retrieval 与传统稀疏检索的关系，下列说法最准确的是？
  DPR 论文表明，双塔式 dense retriever 在多个 open-domain QA 数据集上，相比强 BM25 基线能显著提升 top-20 passage retrieval accuracy。 citeturn11academia2

options:
  A: Dense Retrieval 只能做重排，不能做第一阶段召回
  B: Dense Retrieval 的优势之一是能处理语义改写与同义表达，不必完全依赖词面重合
  C: Dense Retrieval 一定在所有领域都稳定优于 BM25，因此不需要混合检索
  D: Dense Retrieval 不需要向量索引，直接字符串匹配即可

answer:
  - B

option_analysis:
  A: 错误。DPR 的重要贡献之一就是证明 dense dual-encoder 可以直接用于第一阶段召回。 citeturn11academia2
  B: 正确。Dense Retrieval 通过语义向量空间匹配 query 与 passage，因此在同义表达、改写表达等场景往往优于纯词项重合方法。 citeturn11academia2
  C: 错误。BEIR 显示 BM25 仍是强而稳健的 baseline，且不同域泛化下 dense 并非总是最好，因此工程上常见 dense、sparse、rerank 组合。 citeturn0academia0turn10view3
  D: 错误。Dense Retrieval 正是把文本编码成向量，再做近邻搜索。 citeturn11academia2turn6view0

interview_followups:
  - 你在项目里什么时候会保留 BM25，而不是只上 dense retrieval？
  - 如果 query 很短、术语很多、专有名词多，dense 与 sparse 会分别遇到什么问题？

--- question ---

question_id: agent_basic_sc_004
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - 向量索引
  - Faiss
  - 精确检索与近似检索

stem: |
  关于向量检索库 Faiss 的描述，下列哪一项最准确？
  Faiss 官方文档明确说明，它同时支持精确搜索与近似搜索、支持 L2 与最大内积搜索，并可在速度、内存与精度之间做权衡。 citeturn6view0

options:
  A: Faiss 只支持精确最近邻，不支持任何近似搜索
  B: Faiss 只支持 CPU，不支持 GPU
  C: Faiss 只能做欧氏距离，不能做内积搜索
  D: Faiss 可支持多种索引结构，并允许以一定召回损失换取更快速度或更低内存

answer:
  - D

option_analysis:
  A: 错误。Faiss 的核心价值之一就是提供大量 ANN 与压缩索引方法，而不只是精确扫描。 citeturn6view0
  B: 错误。Faiss 文档明确提到部分最有用的算法在 GPU 上也有实现。 citeturn6view0
  C: 错误。Faiss 官方写明支持 maximum inner product search，并对其他距离也有一定支持。 citeturn6view0
  D: 正确。Faiss 的设计重点之一就是在速度、召回率和内存之间做可控 trade-off。 citeturn6view0

interview_followups:
  - 如果一套 RAG 系统从 10 万片段增长到 5 亿片段，你会如何从 FLAT 演进到 ANN 索引？
  - 为什么做向量检索时，索引结构往往和 embedding 模型同样重要？

--- question ---

question_id: agent_basic_sc_005
module: Agent 基础与架构
type: single_choice
difficulty: 4
knowledge_points:
  - Hybrid Search
  - Pinecone
  - Score Normalization

stem: |
  在 Pinecone 官方 hybrid search 文档里，如果你把 dense 与 sparse 信号放在同一个索引中，为什么通常需要显式做 alpha 加权？
  Pinecone 指出 dense 与 sparse 的原始分数范围不同，未加权时 sparse 端很容易主导 combined score。 citeturn10view3turn10view4

options:
  A: 因为同一个索引不支持并发查询，只能靠 alpha 解决
  B: 因为 dense 与 sparse 的分数分布尺度不同，不加权时混合分数会失衡
  C: 因为 alpha 的作用是让 top-k 变成 top-1，从而降低延迟
  D: 因为只要做了 alpha，加权后就不再需要任何评估与调参

answer:
  - B

option_analysis:
  A: 错误。alpha 解决的是融合打分问题，不是并发能力问题。 citeturn10view3turn10view4
  B: 正确。Pinecone 文档明确说明 dense 分数常接近有界范围，而 BM25/稀疏权重是无界正值；若不做显式加权，稀疏部分会主导结果。 citeturn10view3turn10view4
  C: 错误。alpha 用于控制 dense 与 sparse 信号占比，不是改变 top-k 的定义。 citeturn10view3turn10view4
  D: 错误。alpha 只是融合参数，仍需基于数据集离线评测和线上反馈调优。 citeturn10view3turn10view4turn0academia0

interview_followups:
  - 你会如何系统地搜索 alpha，而不是凭感觉拍一个值？
  - 如果线上日志显示长尾精确词查询被 dense 覆盖掉了，你会怎么调 hybrid 策略？

--- question ---

question_id: agent_basic_sc_006
module: Agent 基础与架构
type: single_choice
difficulty: 3
knowledge_points:
  - 长上下文利用
  - Lost in the Middle
  - 证据排序

stem: |
  关于长上下文 RAG 中“检索到了正确证据但模型仍答错”的一个常见原因，下列哪项最符合研究与工程经验？
  “Lost in the Middle” 研究发现，相关信息位于长上下文中部时，模型利用效果可能明显下降。 citeturn11academia1

options:
  A: 只要把 top-k 提高到 50，模型就一定不会再忽略正确信息
  B: 正确片段位于上下文中部、且周围噪声较多时，模型可能没有有效利用证据
  C: 只要检索阶段命中，生成阶段就必然正确
  D: 长上下文中所有位置的重要性天然相同，因此排序无关紧要

answer:
  - B

option_analysis:
  A: 错误。增加 top-k 往往会带来更多噪声，并不能保证利用到正确证据。 citeturn11academia1turn17view3
  B: 正确。长上下文利用并不均匀，相关证据位置与噪声密度都会影响生成质量。 citeturn11academia1
  C: 错误。召回正确证据只是必要条件，不是充分条件；还受上下文构造、提示约束、模型能力等影响。 citeturn11academia1turn17view2
  D: 错误。研究恰恰说明上下文不同位置的利用效果并不对称。 citeturn11academia1

interview_followups:
  - 在不提升模型规模的前提下，你会如何重排证据以降低“中间丢失”风险？
  - 如果模型总是引用最前面的 chunk，但正确答案在后面，你会怎么改 prompt 与 packing 策略？

--- question ---

question_id: agent_basic_mc_001
module: Agent 基础与架构
type: multiple_choice
difficulty: 3
knowledge_points:
  - Chunking
  - 文档切分
  - 召回质量

stem: |
  关于 RAG 中 chunk 切分策略，下列哪些说法是正确的？
  LangChain 的 RAG 教程把文档切分作为独立的 indexing 步骤；工程上 chunk 大小、重叠与语义边界都会影响召回与生成质量。 citeturn16view0turn17view3

options:
  A: chunk 过大可能导致单块包含太多噪声，降低检索精度
  B: chunk 过小可能破坏语义完整性，使答案证据被切裂
  C: 合理 overlap 可以缓解跨 chunk 语义断裂问题
  D: chunk 只影响离线存储，不影响线上召回与回答

answer:
  - A
  - B
  - C

option_analysis:
  A: 正确。过大的 chunk 往往把多个主题混在一起，虽然覆盖率高，但 precision 可能下降。 citeturn16view0turn11academia1
  B: 正确。过小的 chunk 容易把定义、条件、结论拆散，导致单个检索结果无法自洽支持回答。 citeturn16view0turn17view3
  C: 正确。适度 overlap 是工程中常见补救手段，尤其适合段落边界不稳定或答案跨段分布的文档。 citeturn16view0
  D: 错误。chunk 直接决定索引单元、召回粒度、上下文 packing 和后续生成可用证据。 citeturn16view0turn17view3

interview_followups:
  - 你会如何为 FAQ、API 文档、法务合同分别设计 chunk 策略？
  - 如果上线后发现召回经常命中“半句定义”，你会先改 chunk 还是先加 reranker？

--- question ---

question_id: agent_basic_mc_002
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:
  - 向量索引选型
  - FLAT
  - HNSW
  - IVF_PQ

stem: |
  根据 Milvus 与 Faiss 的文档，下列关于常见向量索引取舍的说法哪些是正确的？ citeturn9view0turn6view0

options:
  A: FLAT 适合追求 100% recall 的较小规模集合，但查询代价通常最高
  B: HNSW 常用于高召回与高速度场景，但内存开销一般较大
  C: IVF_PQ 通过量化压缩降低内存和搜索开销，但通常会带来一定召回损失
  D: 所有索引在速度、内存和召回上的表现都完全一致，差别只在 API 命名

answer:
  - A
  - B
  - C

option_analysis:
  A: 正确。Milvus 文档把 FLAT 作为小规模、要求 100% recall 的精确基线；它不压缩向量，搜索通常最慢。 citeturn9view0
  B: 正确。Milvus 将 HNSW 描述为适合高速度与高召回、但需要较大内存资源的选择。 citeturn9view0
  C: 正确。Faiss 与 Milvus 都把 PQ 类方法定位为以压缩换速度和内存的典型方案，并承认其会有精度损失。 citeturn6view0turn9view0
  D: 错误。索引选型的核心就是在延迟、内存、构建成本与召回之间做 trade-off。 citeturn6view0turn9view0

interview_followups:
  - 如果你必须在 64GB 内存内承载 2 亿向量，你会优先考虑哪些索引和压缩策略？
  - 线上系统里你会如何定义“召回损失在可接受范围内”？

--- question ---

question_id: agent_basic_mc_003
module: Agent 基础与架构
type: multiple_choice
difficulty: 3
knowledge_points:
  - Agentic RAG
  - 2-Step RAG
  - 检索编排

stem: |
  关于 2-Step RAG、Agentic RAG 与 Hybrid RAG，下列哪些说法是正确的？
  LangChain 文档把 2-Step RAG 归纳为“快且可预测”，把 Agentic RAG 归纳为“更灵活但延迟更可变”，并把 Hybrid RAG 描述为带有查询增强、检索验证或后处理检查的折中方案。 citeturn17view3turn17view4turn17view5

options:
  A: 2-Step RAG 的一个优点是执行路径更固定、最大 LLM 调用次数更可控
  B: Agentic RAG 通常允许模型在推理过程中决定是否检索、检索多少次以及调用哪些工具
  C: Hybrid RAG 只等于“同时用 dense 和 sparse”，与流程控制无关
  D: Agentic RAG 比 2-Step RAG 更灵活，但延迟和成本一般更不稳定

answer:
  - A
  - B
  - D

option_analysis:
  A: 正确。2-Step RAG 的典型优势就是调用链短、路径确定、延迟更可预测。 citeturn17view3
  B: 正确。Agentic RAG 的核心就是把“是否检索、如何检索、何时停止”部分交给 agent 决策。 citeturn17view4
  C: 错误。LangChain 文档中的 Hybrid RAG 指流程上的混合编排，如 query enhancement、retrieval validation、post-generation checks，而不只是稀疏+稠密混搜。 citeturn17view5
  D: 正确。Agentic RAG 提升灵活性，但多步推理与动态工具调用也会带来更高的方差。 citeturn17view3turn17view4

interview_followups:
  - 如果一个 FAQ 机器人非要做成 Agentic RAG，你会如何反驳这种设计？
  - 你会给面试官举一个必须用 Agentic RAG 的任务吗？为什么？

--- question ---

question_id: agent_basic_mc_004
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:
  - 检索失败归因
  - Embedding 质量
  - Query Reformulation
  - Metadata Filter

stem: |
  当用户确认“知识库里明明有答案，但系统经常检索不到”时，下列哪些原因是高概率且真实存在的？ citeturn11academia2turn0academia0turn16view0

options:
  A: chunk 切分把完整证据拆坏，导致单块关联度不足
  B: embedding 模型与领域术语不匹配，导致语义空间失真
  C: 元数据过滤条件过严，导致正确候选在召回前就被过滤掉
  D: 只要知识库中存在该答案，任何 retriever 都必然能在 top-k 召回

answer:
  - A
  - B
  - C

option_analysis:
  A: 正确。切分不当会让本来完整的答案变成多个低相关片段，直接损害召回。 citeturn16view0
  B: 正确。领域外 embedding 或语义表示不稳定时，向量空间邻近关系可能并不反映业务相关性。 citeturn11academia2turn0academia0
  C: 正确。过滤器是常见“静默杀伤”源头，很多线上漏召回是先被 metadata filter 排掉，而不是 ANN 本身的问题。 Pinecone 与向量库文档都强调基于 schema/metadata 做搜索约束。 citeturn9view2turn9view3
  D: 错误。知识存在只是必要条件，并不保证 top-k 召回成功。模型、索引、chunk、过滤、查询改写都会影响结果。 citeturn11academia2turn0academia0turn16view0

interview_followups:
  - 如果你只能先排查一个环节，你会优先查 query、index、chunk 还是 filter？为什么？
  - 你会怎样设计一个 failure bucket 体系，把“检索不到”拆成更可执行的子问题？

--- question ---

question_id: agent_basic_mc_005
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:
  - RAG 评估
  - 检索指标
  - 生成指标
  - 端到端评估

stem: |
  关于 RAG 系统评估，下列哪些做法是合理的？ citeturn0academia0turn1academia0

options:
  A: 将评估拆成检索层和生成层，分别看 recall / hit-rate 与答案正确性 / 引用一致性
  B: 用 FLAT 或高召回设置作为近似“上界”基线，帮助判断 ANN 是否损失过大
  C: 只看最终用户打分即可，不需要离线评测集
  D: 对开放域或跨域场景，参考 BEIR 一类异构 benchmark 的思想做多数据集验证

answer:
  - A
  - B
  - D

option_analysis:
  A: 正确。RAG 不是单模型任务，分层评估能区分“没找到”与“找到了但没答好”。 citeturn1academia0turn0academia0
  B: 正确。FLAT 或更高召回配置能帮助判断问题到底来自 ANN 近似损失，还是来自 embedding / chunk / prompt。 citeturn9view0turn6view0
  C: 错误。只看主观反馈会导致定位效率低；离线可重复评测是检索系统调优的基础。 citeturn0academia0
  D: 正确。BEIR 的贡献之一就是强调异构数据集上的零样本泛化评估，而不是只在单一数据集上自我感觉良好。 citeturn0academia0

interview_followups:
  - 你的离线评测集中，如何构造 hard negative？
  - 如果线上满意度下降而离线 recall 没变，你会优先怀疑哪一层？

--- question ---

question_id: agent_basic_mc_006
module: Agent 基础与架构
type: multiple_choice
difficulty: 4
knowledge_points:
  - Hybrid Search
  - Pinecone
  - 稀疏与稠密融合
  - 系统权衡

stem: |
  根据 Pinecone hybrid search 文档，下列哪些说法是正确的？ citeturn10view3turn10view4turn10view6

options:
  A: 单索引同时存 dense 与 sparse 的方案通常架构更简单、运维负担更低
  B: 当需要 sparse-only 查询或分别独立重排时，分离索引方案更有灵活性
  C: 在单索引方案中，不做显式归一或加权时，稀疏分数可能主导结果
  D: 分离索引必然比单索引延迟更低、实现更简单

answer:
  - A
  - B
  - C

option_analysis:
  A: 正确。Pinecone 文档明确推荐多数场景优先考虑单索引方案，因为操作与请求路径更简单。 citeturn10view6
  B: 正确。需要 sparse-only、集成 sparse model 或分别 rerank 时，双索引更灵活。 citeturn10view6
  C: 正确。Pinecone 专门强调了 dense 与 sparse 分数尺度不同，不加权会导致失衡。 citeturn10view3turn10view4
  D: 错误。分离索引会增加请求、合并和去重逻辑，通常更复杂，不是“必然更低延迟”。 citeturn10view6

interview_followups:
  - 如果你要做法律检索，为什么 hybrid 常比 pure dense 更稳？
  - 双索引 merge 时你会用 RRF、线性加权还是 learned-to-rank？理由是什么？

--- question ---

question_id: agent_basic_tf_001
module: Agent 基础与架构
type: true_false
difficulty: 2
knowledge_points:
  - Top-k
  - 上下文噪声
  - 检索召回

stem: |
  在 RAG 中，只要把 top-k 调得更大，最终回答质量就一定更好。 citeturn11academia1turn17view3

options:
  A: 正确
  B: 错误

answer:
  - B

option_analysis:
  A: 错误。更大的 top-k 可能提高覆盖率，但也会增加噪声、稀释关键证据，并放大长上下文利用问题。 citeturn11academia1turn17view3
  B: 正确。top-k 是召回与噪声的权衡参数，必须结合 re-rank、context packing 与任务特性调优。 citeturn11academia1turn0academia0

interview_followups:
  - 在什么情况下你会故意把 top-k 从 10 降到 3？
  - 如果 top-k 很小导致漏召回，你会先改 top-k 还是先改 query rewrite？

--- question ---

question_id: agent_basic_tf_002
module: Agent 基础与架构
type: true_false
difficulty: 3
knowledge_points:
  - 证据利用
  - 幻觉
  - 生成阶段

stem: |
  如果检索阶段已经命中包含正确答案的 chunk，那么生成模型最终一定能答对。 citeturn11academia1turn17view2

options:
  A: 正确
  B: 错误

answer:
  - B

option_analysis:
  A: 错误。命中正确 chunk 只是前提，生成阶段仍可能因为证据排序、提示词、上下文噪声、位置偏置或注入攻击而答错。 citeturn11academia1turn17view2
  B: 正确。RAG 的失败经常发生在“检索正确但使用错误”这一步，因此必须分层评估。 citeturn11academia1turn0academia0

interview_followups:
  - 你会如何在线上日志里区分“召回失败”和“证据利用失败”？
  - 如果命中正确 chunk 但模型继续胡编，你会先改 prompt 还是先加 verifier？

--- question ---

question_id: agent_basic_tf_003
module: Agent 基础与架构
type: true_false
difficulty: 3
knowledge_points:
  - 相似度度量
  - 归一化向量
  - 余弦与欧氏距离

stem: |
  当向量都做了单位归一化后，基于余弦相似度的近邻排序与基于欧氏距离的近邻排序可以保持单调等价，因此两者往往可互相转换理解。 citeturn3search0turn7view0turn5academia1

options:
  A: 正确
  B: 错误

answer:
  - A

option_analysis:
  A: 正确。单位向量上，余弦相似度与欧氏距离存在单调关系；Annoy 文档也明确写出 normalized vectors 下 cosine distance 与 Euclidean 的等价形式。 citeturn3search0turn7view0turn5academia1
  B: 错误。若向量已单位化，这个结论通常成立；但若未归一化，点积、余弦与欧氏的含义就可能明显不同。 citeturn3search0turn5academia1

interview_followups:
  - 如果 embedding 提供方建议用 dot product，你会不会自己偷偷做 normalize？为什么？
  - 线上索引 metric 选错时，通常会表现出哪些异常症状？

--- question ---

question_id: agent_basic_cc_001
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - 2-Step RAG
  - Agentic RAG
  - Hybrid RAG
  - 流程控制

stem: |
  请比较 2-Step RAG、Agentic RAG 与 Hybrid RAG 的核心差异，并说明各自更适合什么业务场景。可结合延迟、可控性、成本、效果与可观测性展开。 citeturn17view3turn17view4turn17view5

reference_answer: |
  可以从“控制权在哪里、执行路径多稳定、检索是否固定发生”三个维度来比较。

  第一，2-Step RAG 的核心特征是“先检索、后生成”，执行路径固定，LLM 调用次数通常可控，延迟更稳定，工程实现也更简单。这类方案适合 FAQ、API 文档问答、内部知识库问答等单跳信息需求明显的场景。LangChain 文档也把它总结为 fast and predictable。 citeturn17view3

  第二，Agentic RAG 的核心特征是“由 agent 决定何时检索、检索几次、调用哪类工具”。它更适合研究助理、多跳问题、需要先澄清再检索、需要在多个知识源之间路由的任务。代价是延迟、成本和行为方差更难控。LangChain 将其描述为更高灵活性但更可变的 latency。 citeturn17view4turn17view3

  第三，Hybrid RAG 不是单指 dense+sparse 混搜，而是流程层面的折中方案。它通常保留部分固定流程，同时引入 query enhancement、retrieval validation、post-generation checks 等中间步骤。适合那些对质量有要求、但又不希望完全放开 agent 自由度的生产场景。 citeturn17view5

  工程取舍上，如果问题类型稳定、SLA 严格、审计要求高，优先 2-Step RAG；如果问题复杂、知识源多样、需要动态选择工具，才考虑 Agentic RAG；如果想兼顾可控性与质量，Hybrid RAG 常是更稳妥的中间解。真正的生产系统往往不是三选一，而是分路由：简单问题走 2-Step，复杂问题升级到 Agentic 或 Hybrid。 citeturn17view3turn17view4turn17view5

answer_keywords:
  - 2-Step RAG
  - Agentic RAG
  - Hybrid RAG
  - 可控性
  - 延迟
  - 灵活性
  - 工具调用

scoring_points:
  - 能明确说明 2-Step RAG 是固定检索再生成
  - 能明确说明 Agentic RAG 是动态决定检索与工具使用
  - 能解释 Hybrid RAG 是流程级折中，而不只是 dense+sparse
  - 能结合具体业务场景给出架构取舍
  - 能指出延迟、成本、可观测性等工程差异

interview_followups:
  - 如果一个团队只有一周时间上线第一个知识库问答版本，你会推荐哪种架构？为什么？
  - 什么时候 Hybrid RAG 反而会变成“复杂但不必要”的过度设计？

--- question ---

question_id: agent_basic_cc_002
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - Dense Retrieval
  - BM25
  - Hybrid Search
  - 零样本泛化

stem: |
  请比较 dense retrieval、BM25 与 hybrid retrieval 的优缺点，并说明为什么很多生产系统不会只保留其中一种。可结合 BEIR、DPR 和混合检索实践回答。 citeturn11academia2turn0academia0turn10view3turn10view6

reference_answer: |
  Dense retrieval 的优势是语义匹配能力强，能够覆盖改写表达、近义表达和低词面重合问题；DPR 证明 dense dual-encoder 可以直接作为第一阶段召回器，并在多个 open-domain QA 数据集上显著优于强 BM25 基线。 citeturn11academia2

  BM25 的优势是词项精确匹配、可解释性强、实现简单、对专有名词和高精度关键词常常更稳。BEIR 结果说明 BM25 仍是非常强的零样本 baseline，不应该轻易被忽视。很多 dense 模型在跨域泛化上并不总能稳定压过 BM25。 citeturn0academia0

  Hybrid retrieval 的价值在于把 dense 的语义覆盖与 BM25/稀疏检索的词项精确性结合起来。Pinecone 文档进一步提醒，dense 与 sparse 分数尺度不同，融合时要注意显式加权与归一，否则某一侧可能主导结果。 citeturn10view3turn10view4

  为什么生产系统常做混合？因为真实查询分布不是单一的：有的问题靠语义近似，有的问题靠专有名词，有的问题需要 both。单一路径在长尾查询上容易翻车。工程上常见做法是 dense+sparse 召回后再 rerank，或者按 query 类型路由不同检索器。 citeturn0academia0turn10view6

  常见误区是把 dense 视作“更先进因此一定更好”。更准确的说法是：dense 更擅长语义召回，BM25 更擅长词项约束，hybrid 更擅长覆盖真实世界的多样查询分布。 citeturn11academia2turn0academia0

answer_keywords:
  - Dense Retrieval
  - BM25
  - Hybrid Retrieval
  - 语义召回
  - 词项匹配
  - 分数归一
  - 零样本泛化

scoring_points:
  - 能说明 dense 的语义优势与 BM25 的词项优势
  - 能引用 BEIR 对 BM25 baseline 的启示
  - 能解释 hybrid 的业务价值与分数融合问题
  - 能结合真实 query 分布给出架构理由
  - 能指出“更先进模型不等于总是更好”的误区

interview_followups:
  - 面试里如果被问“为什么不用纯 dense”，你会怎么用一个实际案例回答？
  - 如果 hybrid 已经上线，但线上的品牌词 query 仍然不稳定，你会怎么继续拆问题？

--- question ---

question_id: agent_basic_cc_003
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - Retriever
  - Reranker
  - 多阶段检索
  - ColBERT

stem: |
  请比较 retriever 与 reranker 的职责差异，并说明为什么很多高质量 RAG 会采用“两阶段检索”。可以结合 ColBERT 与 BEIR 的结论作答。 citeturn11academia0turn0academia0

reference_answer: |
  Retriever 的职责是“高效召回候选”，通常面对的是大规模全库搜索，因此更强调吞吐、延迟和可扩展性。它可以是 BM25、dense dual-encoder，也可以是 hybrid first-stage recall。 citeturn11academia2turn0academia0

  Reranker 的职责是“精细排序候选”。它通常只处理一个较小候选集，因此可以使用更重、更精细的交互式模型。ColBERT 就是典型例子：它保留细粒度 late interaction，相比只用单向量的双塔召回，能更好建模 query 与文档 token 级细节，同时又比传统全交互 BERT 排序更高效。 citeturn11academia0

  为什么两阶段常见？因为单阶段很难同时兼顾“全库高召回”和“细粒度高精排”。BEIR 的结果也表明，re-ranking 和 late-interaction 方法平均上效果更强，但计算成本也更高；dense/sparse 第一阶段方法更高效，却可能损失效果。两阶段就是用便宜的 retriever 做宽召回，再让重模型只看少量候选。 citeturn0academia0turn11academia0

  工程上，retriever 更像粗筛，reranker 更像复核。常见误区是把 reranker 当成“救命药”，希望它弥补所有召回问题。实际上，如果第一阶段完全漏掉正确文档，reranker 无能为力。因此两阶段检索要求分别评估 first-stage recall 与 final ranking quality。 citeturn0academia0

answer_keywords:
  - Retriever
  - Reranker
  - Two-stage Retrieval
  - ColBERT
  - late interaction
  - recall
  - ranking

scoring_points:
  - 能清晰区分召回与精排职责
  - 能解释为何两阶段能在效率与效果间折中
  - 能提到 ColBERT 的 late interaction 特性
  - 能指出 reranker 不能弥补完全漏召回
  - 能说明评估要分 first-stage 与 second-stage

interview_followups:
  - 如果只能保留一阶段，你会优先保留 retriever 还是 reranker？为什么？
  - 在什么数据规模下，你会认为 cross-encoder rerank 的成本已经不可接受？

--- question ---

question_id: agent_basic_cc_004
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - FLAT
  - HNSW
  - IVF_PQ
  - 内存与召回

stem: |
  请比较 FLAT、HNSW 与 IVF_PQ 三类向量索引的适用场景与工程取舍。回答时请重点说明：精度、速度、内存、索引构建成本，以及它们在 RAG 系统中的角色。 citeturn9view0turn6view0

reference_answer: |
  FLAT 是精确检索基线。它逐个比较向量，不做压缩，优点是结果最准确、行为最可解释；缺点是大规模下延迟与资源成本最高。Milvus 文档把 FLAT 定位为小规模且要求 100% recall 的场景，也常作为其他 ANN 方案的对照基线。 citeturn9view0

  HNSW 是图索引路线，通常具有很高召回和很快查询速度，适合对线上延迟敏感、同时希望保持较高质量的服务。但代价通常是较大内存占用与一定构建成本；Milvus 也把它归为高速度、高召回、较大内存资源的选择。 citeturn9view0turn6view0

  IVF_PQ 是聚类加量化路线。它先做 coarse partition，再用 product quantization 压缩向量，因此特别适合大规模、内存敏感的场景。代价是召回常低于 FLAT/HNSW，需要通过 nlist、nprobe、m、nbits 等参数细调。Faiss 与 Milvus 都强调这类方法是在精度与资源之间做主动 trade-off。 citeturn6view0turn9view0

  在 RAG 系统中，这三者分别扮演不同角色：FLAT 适合小规模知识库或离线评测上界；HNSW 适合中大规模、质量优先的在线检索；IVF_PQ 适合海量向量、资源受限或冷数据场景。真正的生产环境往往不是“哪种最好”，而是“哪种最符合你的规模、SLA 与预算”。 citeturn9view0turn6view0

answer_keywords:
  - FLAT
  - HNSW
  - IVF_PQ
  - 精确检索
  - 图索引
  - 产品量化
  - 召回与内存

scoring_points:
  - 能分别说明三类索引的原理级差异
  - 能说明 FLAT 的基线作用
  - 能说明 HNSW 的高召回高内存特征
  - 能说明 IVF_PQ 的压缩与召回损失
  - 能结合数据规模与 SLA 给出选型思路

interview_followups:
  - 如果你的系统现在用 HNSW，但成本超预算，你会怎么平滑迁到更省内存的方案？
  - 如何避免把“索引召回差”误判成“embedding 模型差”？

--- question ---

question_id: agent_basic_cc_005
module: Agent 基础与架构
type: concept_compare
difficulty: 4
knowledge_points:
  - Single-vector Retrieval
  - Late Interaction
  - ColBERT
  - 表示粒度

stem: |
  请比较“单向量 dense retrieval”和“late-interaction retrieval”在表示粒度、效果、索引成本和适用任务上的差异。可结合 ColBERT 的思路回答。 citeturn11academia0turn11academia2

reference_answer: |
  单向量 dense retrieval 的典型代表是 DPR 一类双塔模型：query 编成一个向量，document 或 passage 也编成一个向量，然后通过向量相似度做召回。它的优点是索引简单、查询快、适合大规模第一阶段召回。缺点是一个 passage 被压缩成单个向量后，会丢失一部分细粒度匹配信息。 citeturn11academia2

  Late-interaction retrieval 的代表是 ColBERT。它先分别编码 query token 和 doc token，再在匹配阶段做轻量但更细粒度的交互。这样既保留了预计算文档表示的能力，又比完全 cross-encoder 的全交互高效得多。ColBERT 论文强调其兼顾效果与效率，并能直接结合向量索引做端到端检索。 citeturn11academia0

  工程取舍是：单向量更适合第一阶段海量召回；late interaction 更适合对语义细节、词项对齐和高精度排序更敏感的任务。代价是索引体积、存储复杂度和查询成本通常更高。很多系统会采用“dense first-stage + late-interaction / rerank second-stage”的组合，而不是二选一。 citeturn11academia0turn0academia0

  常见误区是把 late interaction 理解为“只是更大的 embedding”。实际上它改变的是匹配机制，将表示粒度从 document-level 拉回 token-level 或近 token-level。 citeturn11academia0

answer_keywords:
  - 单向量检索
  - Late Interaction
  - ColBERT
  - 表示粒度
  - token 级匹配
  - 第一阶段召回
  - 精排

scoring_points:
  - 能说明 DPR 类单向量方案的特点
  - 能说明 ColBERT 的 late interaction 机制
  - 能指出两者在索引体积与效果上的差异
  - 能结合一阶段召回与二阶段精排给出使用场景
  - 能纠正常见误解

interview_followups:
  - 如果业务对专有术语的字面精度极敏感，纯 single-vector 检索会有什么风险？
  - 你会如何向非算法面试官解释“为什么 ColBERT 更细”？

--- question ---

question_id: agent_basic_sd_001
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - RAG 排障
  - 证据利用
  - 上下文构造
  - 幻觉控制

stem: |
  某企业知识库问答系统中，离线排查发现检索阶段已经把包含正确答案的 chunk 放进了 top-5，但模型最终回答仍然产生幻觉。请给出你的排查路径与优化方案。可结合“Lost in the Middle”和 RAG 安全问题说明。 citeturn11academia1turn17view2

reference_answer: |
  这类问题首先要明确：它不再是“纯召回失败”，而更可能是“证据利用失败”或“上下文被污染”。排查应从最终 prompt 入手，而不是只看 retriever 日志。

  第一步，确认正确 chunk 是否真的进入最终 prompt，而不是只在检索结果日志里出现。很多系统在 packing 时会因为 token budget、重复去重、模板截断，把正确证据挤掉。第二步，检查正确 chunk 在上下文中的位置。如果正确证据被放在中间，且前后包围大量低相关片段，就存在典型的 lost-in-the-middle 风险。第三步，检查 prompt 是否明确要求“基于证据回答；证据不足则拒答”。LangChain 官方也专门提醒 RAG 会受到间接 prompt injection 影响，检索内容里可能出现“忽略之前指令”一类伪指令。 citeturn11academia1turn17view2

  优化上，优先做三件事：一是 rerank 或 evidence-first packing，把最关键证据放在开头；二是减少无关 chunk，必要时先做 context compression；三是让回答必须绑定引用或证据摘要，降低模型脱离证据自由发挥的概率。若仍不稳，可增加 answer verification、self-check 或低置信拒答。 citeturn11academia1turn17view5

  最后要验证优化是否有效：不仅看最终正确率，也要看“命中正确证据时的条件正确率”“引用一致性”“拒答准确率”等指标。否则容易把一部分幻觉变成另一种错误形式。 citeturn0academia0

answer_keywords:
  - 证据利用失败
  - packing
  - Lost in the Middle
  - prompt injection
  - rerank
  - refusal
  - citation grounding

scoring_points:
  - 能先区分检索失败与生成失败
  - 能按顺序排查“最终 prompt 是否真的含正确证据”
  - 能提到证据位置与上下文噪声问题
  - 能提到提示约束、引用绑定或拒答机制
  - 能给出可验证的评估指标

diagnosis_steps:
  - 检查 top-k 结果与最终 prompt 是否一致
  - 检查 token budget、去重和模板截断是否丢失正确 chunk
  - 检查正确证据在上下文中的排序位置
  - 检查是否存在大量低相关 chunk 稀释证据
  - 检查提示词是否要求基于证据回答与证据不足时拒答
  - 检查检索内容中是否混入可能影响输出的注入式文本
  - 检查回答是否真正引用了检索证据

optimization_points:
  - 增加 reranker
  - evidence-first context packing
  - context compression
  - 引用约束与答案校验
  - 低置信拒答
  - 间接提示注入防护
  - 分层离线评测

interview_followups:
  - 如果正确 chunk 在 top-1 仍答错，你会优先怀疑什么？
  - 你会如何设计一个自动化脚本，批量找出“召回对了但回答错了”的样本？

--- question ---

question_id: agent_basic_sd_002
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - Embedding 迁移
  - 索引重建
  - Metric 对齐
  - 回归测试

stem: |
  一个 RAG 系统把 embedding 模型从旧版本切换到新版本后，线上召回质量明显下降，但代码层面没有报错。请说明你的排查顺序，并指出最容易被忽略的工程问题。 citeturn9view2turn6view0turn9view1

reference_answer: |
  这种“无报错但质量骤降”的迁移问题，最常见原因不是 SDK，而是“嵌入空间、索引配置和数据版本不同步”。

  首先检查是否发生了“query 用新 embedding，索引还是旧 embedding”的不一致。只要 query/document 不在同一向量空间，即使维度相同，近邻关系也会失真。其次检查索引 metric 是否仍与新模型推荐一致，例如 cosine、IP、L2 是否对齐，是否做了该做的 normalize。Pinecone 与 Milvus 的索引配置都要求在建索引时明确 metric / dimension；这些不是可忽略细节。 citeturn9view2turn9view1turn6view0

  第三，检查是否完整重建索引而不是局部增量插入。若一部分文档是旧向量，一部分是新向量，线上质量会表现为“偶尔非常差且难以复现”。第四，检查 ANN 参数是否需要重新调优。不同模型的向量分布不同，HNSW、IVF、ScaNN 等索引在新分布下未必还能维持原来的 recall-latency 平衡。 citeturn9view0turn7view6

  最后做回归验证：固定一批 query，对比 old/new 的 first-stage hit rate、top-k overlap、答案正确率、延迟与成本。不能只看几条主观样例。BEIR 的启示同样适用于内部评测：数据集要覆盖多个 query 类型，而不是只测最熟悉的一类。 citeturn0academia0

answer_keywords:
  - embedding 空间一致性
  - 索引重建
  - metric 对齐
  - normalize
  - ANN 参数回归
  - query/document 同步

scoring_points:
  - 能先检查 query/document 向量空间是否一致
  - 能检查 metric、dimension 与 normalize
  - 能指出混用新旧向量的风险
  - 能提到 ANN 参数要重新调优
  - 能给出离线回归方法而不是只看主观样例

diagnosis_steps:
  - 核对 query 侧与 document 侧 embedding 版本
  - 核对索引 dimension 与 metric 配置
  - 核对是否需要单位归一化
  - 检查是否混入旧索引或旧缓存数据
  - 检查索引是否完整重建
  - 对比新旧模型的 top-k overlap 与 hit rate
  - 观察 ANN 参数变化对 recall/latency 的影响

optimization_points:
  - 全量重嵌入并重建索引
  - 明确 embedding 版本管理
  - metric 与 normalize 显式配置
  - 做 shadow evaluation 与灰度发布
  - 调整 HNSW/IVF/ScaNN 参数
  - 建立迁移前后的离线回归集

interview_followups:
  - 如果新模型效果理论更强，但你只能保留旧 metric 配置，会有哪些风险？
  - 怎样防止线上读流量在灰度期间击中“新 query + 旧索引”的危险组合？

--- question ---

question_id: agent_basic_sd_003
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - 多语言检索
  - BEIR
  - 语种归一
  - 查询改写

stem: |
  一个多语言知识库支持中英混合检索。中文问题检索英文文档时效果很差，但英文问英文基本正常。你会如何定位问题并优化？可结合 multilingual RAG 与基准构建思路作答。 citeturn1academia1turn0academia0

reference_answer: |
  这类问题通常要从“语言桥接失败”与“评测集失真”两方面排查。

  首先确认 embedding 模型是否具备跨语言对齐能力。如果使用的是主要面向英文的 embedding，把中文 query 与英文文档放到同一空间后，语义邻近关系可能并不稳定。其次检查文档预处理是否把中英混合术语、缩写、代码片段错误切分，导致真正关键 token 丢失。再检查 query rewrite 或 query translation 流程是否存在质量问题，比如把专业术语翻译错，反而破坏检索。多语言 RAG 近年研究也指出：直接翻译 query、直接跨语言检索、或先翻译文档后生成，各自都有 coverage 与 consistency 的 trade-off。 citeturn1academia1

  评测上不能只看英文集。BEIR 的价值就在于提醒我们：异构数据与跨域泛化需要分开验证。多语言环境下至少要构造“中文问英文答”“英文问中文答”“同语问同语答”三类样本，分别看召回与最终正确率。 citeturn0academia0turn1academia1

  优化路径包括：换跨语言 embedding；对 query 做术语保护式翻译或双路检索；对关键实体采用 sparse / lexical 补强；必要时分语言建索引并在上层做路由与 merge。不要把问题粗暴归因为“中文 LLM 不行”。很多跨语言检索问题其实出在 embedding 与 indexing 层。 citeturn1academia1turn10view6

answer_keywords:
  - 跨语言 embedding
  - query translation
  - 双路检索
  - 术语保护
  - sparse 补强
  - 多语言评测

scoring_points:
  - 能识别问题可能出在 embedding 而不是 LLM 本身
  - 能提出跨语言评测集拆分方法
  - 能想到 query translation / dual retrieval / language routing
  - 能兼顾专有名词与术语保护
  - 能提出可执行的验证方法

diagnosis_steps:
  - 确认 embedding 是否支持跨语言对齐
  - 检查 query 翻译与术语保真度
  - 检查文档切分是否破坏中英混合片段
  - 分语言对比 top-k hit rate
  - 构造跨语言与同语言基准样本
  - 分析失败样本属于术语问题还是语义问题
  - 验证 lexical 补强后的提升幅度

optimization_points:
  - 采用跨语言 embedding
  - 术语保护式 query translation
  - 中文 query 走翻译+原文双路检索
  - hybrid retrieval 补强专有名词
  - 分语言索引与上层 merge
  - 构建多语言离线回归集

interview_followups:
  - 如果你只能保留一个 embedding 模型，你会怎么证明它真的适合跨语言检索？
  - 中文 query 命中了英文文档但最终答案还是错，这时你会排查哪一层？

--- question ---

question_id: agent_basic_sd_004
module: Agent 基础与架构
type: scenario_debug
difficulty: 4
knowledge_points:
  - Hybrid Search
  - 分数失衡
  - Alpha 调参
  - Query 分类

stem: |
  你上线了 dense+sparse 的 hybrid search。结果发现：自然语言问答效果变好，但品牌词、型号词、报错码一类精确查询反而被稀释，或者出现排名异常。请给出排查与优化方案。 citeturn10view3turn10view4

reference_answer: |
  这类问题一般不是 hybrid 思路本身错了，而是“同一个融合规则试图覆盖所有 query 类型”。首先要检查是否对 dense 与 sparse 做了显式权重控制。Pinecone 文档强调，如果在单索引中混合 dense 与 sparse，而不做 alpha 加权，分数尺度会失衡。即便做了加权，也不代表一个固定 alpha 适合所有 query。 citeturn10view3turn10view4

  第二步，按 query 类型做切片分析。把 query 至少分成自然语言问句、品牌词/型号词、精确错误码、短关键词组合等类别，分别看 dense-only、sparse-only、hybrid 的 hit rate 与 NDCG。你会发现某些查询天然更适合 sparse，某些更适合 dense。 citeturn0academia0turn10view6

  第三步，决定是做动态 alpha，还是做 query routing。对于品牌词、SKU、报错码，一般应提高 sparse 权重，甚至直接走 sparse-first；对于描述性自然语言问题，可提高 dense 权重。若系统允许，也可以 dense 与 sparse 各自召回，再用 RRF 或 learned rerank 合并。 citeturn10view3turn10view6

  最后，不要忘记检查预处理：是否把连字符、大小写、空格、特殊符号标准化过头，导致精确词信号被破坏。很多“hybrid 不稳”本质上是 lexical branch 输入先被错误清洗。 citeturn10view4

answer_keywords:
  - alpha
  - query 分类
  - dynamic weighting
  - sparse-first
  - RRF
  - lexical normalization

scoring_points:
  - 能先识别分数尺度与 alpha 问题
  - 能提出按 query 类型切片评测
  - 能提出动态 alpha 或 query routing
  - 能想到精确词预处理问题
  - 能给出可执行的合并与重排方案

diagnosis_steps:
  - 检查是否做了 dense/sparse 显式加权
  - 统计不同 query 类型的失败分布
  - 对比 dense-only、sparse-only、hybrid 的分桶指标
  - 检查 lexical 分支预处理是否损伤关键词
  - 分析 top-k 中哪一路信号主导排序
  - 评估固定 alpha 与动态 alpha 的差异
  - 验证 rerank 或 RRF 的改善效果

optimization_points:
  - 动态 alpha
  - query routing
  - sparse-first for exact terms
  - dense-first for natural language
  - RRF 或二阶段 rerank
  - 改善 lexical 预处理
  - 分桶离线评测与线上监控

interview_followups:
  - 你会如何自动判断一个 query 更像“语义问句”还是“精确关键词”？
  - 如果产品经理只允许一个统一入口，你会怎样在后端做无感路由？

--- question ---

question_id: agent_basic_sd_005
module: Agent 基础与架构
type: scenario_debug
difficulty: 5
knowledge_points:
  - Agentic RAG
  - 迭代检索
  - 成本控制
  - 停止条件

stem: |
  一个 Agentic RAG 研究助手支持 query rewrite、二次检索、网页抓取、知识库查询和自检。上线后效果还不错，但平均延迟和成本失控，部分请求会陷入多轮检索-改写循环。请设计你的排障路径与优化方案。 citeturn17view4turn17view5turn14academia4

reference_answer: |
  这类问题的本质是：系统把“质量提升手段”无限放宽，却没有把“预算约束与停止判据”做成一等公民。Agentic RAG 的价值在于动态决策，但缺点同样是动态决策容易失控。LangChain 文档就指出 Agentic RAG 的 latency 更可变，而 Hybrid RAG 常通过验证与校正步骤来维持控制。近期 agentic RAG 研究实践也经常引入 evidence sufficiency、retry rubric 与质量检查，以避免盲目迭代。 citeturn17view3turn17view5turn14academia4

  排查上，先用 trace 把一次请求拆成步骤：每一步用了什么工具、检索了多少次、每次是否真正提升了证据质量、最终是否改变了答案。若发现多轮 rewrite 带来的 top-k overlap 很高，说明系统在“重复找相同东西”。若抓网页步骤大量返回无关长文档，说明外部检索策略与预算完全失衡。 citeturn17view4turn14academia4

  优化上要做四类约束。第一，预算约束：限制最大迭代轮数、最大工具调用数、最大 token 消耗、最大外部抓取数。第二，收益判据：只有当新一轮检索在证据覆盖率、rerank 分数、答案置信度上显著提升时才继续。第三，分层路由：简单问题先走 2-step，复杂问题再升级 agentic。第四，缓存与去重：相同 query reformulation、相同抓取 URL、相同 top-k overlap 不应重复付费。 citeturn17view3turn17view5turn14academia4

  最后验证时，不能只看平均正确率，要同时看 p95 latency、平均工具调用数、失败重试率、成本上限命中率与“额外一步是否真的提升正确率”。否则系统只是“更贵地做同样的事”。 citeturn17view3turn14academia4

answer_keywords:
  - trace
  - budget
  - stop condition
  - evidence sufficiency
  - top-k overlap
  - routing
  - cache

scoring_points:
  - 能识别问题不只是“模型贵”，而是流程缺少约束
  - 能提出基于 trace 的逐步归因
  - 能设计预算、收益与停止条件
  - 能提出简单问题降级为 2-Step 的路由策略
  - 能定义成本与延迟相关指标

diagnosis_steps:
  - 采集完整 trace 与工具调用序列
  - 统计平均与 p95 工具调用次数
  - 分析多轮 rewrite 后 top-k overlap
  - 检查抓取网页是否产生大量无效长文本
  - 检查每轮检索是否对答案产生实质改进
  - 识别死循环触发模式与缺失的停止条件
  - 切片分析简单 query 是否被过度 agent 化

optimization_points:
  - 设置最大迭代轮数与 token 预算
  - 设置基于证据增益的停止条件
  - 引入 top-k overlap 去重
  - 引入 URL 抓取缓存
  - 简单问题走 2-Step，复杂问题走 Agentic
  - 外部工具分级与白名单
  - 监控 p95 latency、cost per answer、tool-call count

interview_followups:
  - 如果业务方坚持“宁可慢一点也要尽量答对”，你会如何给出一个有边界的折中？
  - 你会如何定义“新一轮检索是否值得继续”的量化收益指标？

--- question ---

question_id: agent_basic_sys_001
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:
  - 企业 RAG
  - 引用回答
  - 检索评估
  - 安全边界

stem: |
  请设计一个面向企业内部知识库的 RAG 问答系统。要求支持权限过滤、引用回答、拒答机制、版本更新和离线评估。请说明核心模块、数据流、评估方式与风险边界。可参考 LangChain 的 RAG 流程、Faiss/Milvus 向量索引能力以及 RAG 安全问题。 citeturn16view0turn6view0turn9view0turn17view2

reference_answer: |
  这个系统可以拆成“离线索引层、在线检索层、生成与校验层、观测与治理层”。

  离线索引层负责文档接入、权限标签抽取、清洗、chunk 切分、embedding 生成、元数据写入和索引构建。LangChain 的 RAG 教程把 indexing 明确为独立过程，这是合理的工程分层。向量索引可以根据规模选择 FLAT、HNSW 或 IVF/PQ；若使用 Milvus/Faiss，要把 metric、维度、索引参数和重建策略明确记录。 citeturn16view0turn9view0turn6view0

  在线查询层先做 query 预处理和权限校验，再执行检索。推荐采用 hybrid first-stage recall 或 dense/sparse 可切换架构，随后用 reranker 精排。上下文构造阶段要做 token budget packing，把高置信证据排前，并保留 source metadata。生成层要求模型“仅依据证据回答，无法支持则拒答”，输出引用片段与来源。必要时加入 answer verifier 或 citation checker。 citeturn10view6turn11academia1turn17view2

  观测与治理层包括：trace、检索命中率、答案正确率、引用一致性、拒答准确率、权限误泄率、延迟和成本。离线评估需分为 retrieval metrics 与 answer metrics；FLAT 或高召回配置可作为 ANN 的参考上界。 citeturn0academia0turn9view0

  风险边界至少有四类：一是权限泄漏，必须在检索前过滤而不是回答后删除；二是间接 prompt injection，不能把检索文本当作指令；三是版本漂移，文档更新后要有增量或全量重嵌入策略；四是证据不足时的幻觉，必须支持拒答。企业场景里，“答不上来但不乱答”通常比“偶尔能猜中”更重要。 citeturn17view2turn16view0

answer_keywords:
  - indexing pipeline
  - 权限过滤
  - hybrid retrieval
  - reranker
  - citation
  - refusal
  - trace
  - 版本更新

scoring_points:
  - 能覆盖离线索引、在线检索、生成校验、观测治理
  - 能说明权限过滤必须前置
  - 能说明引用回答与拒答机制
  - 能提出离线+线上评估体系
  - 能指出注入、权限、版本漂移等风险

architecture_points:
  - 文档接入与清洗
  - 权限与元数据抽取
  - chunk 切分与 embedding
  - 向量索引与关键词索引
  - first-stage retrieval
  - reranker
  - 上下文构造与引用生成
  - 答案校验与拒答
  - trace 与评估平台

data_flow:
  - 文档入库后清洗并切分为 chunk
  - 为 chunk 生成 embedding 并写入索引与元数据存储
  - 用户查询先做权限与 query 预处理
  - 执行 dense / sparse / hybrid 召回
  - 对候选执行 rerank
  - 按 token budget 打包证据并附 source metadata
  - 生成答案、引用和拒答判定
  - 记录检索与生成 trace 供评估与回放

evaluation_metrics:
  - retrieval hit rate
  - recall@k
  - MRR 或 NDCG
  - answer accuracy
  - citation faithfulness
  - refusal precision / recall
  - permission leakage rate
  - p95 latency
  - cost per answer

risk_points:
  - 权限过滤错误导致越权召回
  - 检索文本中的间接 prompt injection
  - 文档更新但索引未同步
  - top-k 过大导致噪声淹没证据
  - ANN 配置变更引起隐藏式召回下降
  - 引用与答案不一致
  - 高风险场景拒答不足

interview_followups:
  - 如果公司要求“所有回答必须带出处”，你会如何防止模型编造引用？
  - 当权限模型非常复杂时，你会把过滤做在索引层、检索层还是应用层？为什么？

--- question ---

question_id: agent_basic_sys_002
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:
  - Agentic RAG
  - 多工具检索
  - 自纠错
  - 成本治理

stem: |
  请设计一个 Agentic RAG 研究助手。它需要能够：先判断问题类型，再在本地知识库、网页、论文元数据服务之间动态检索，必要时多轮改写 query，自检引用一致性，并在预算受限下停止。请说明系统架构与执行流程。 citeturn17view4turn17view5turn14academia4

reference_answer: |
  这是一个典型的“受预算约束的多工具 Agentic RAG”问题。系统应分为路由层、检索工具层、证据评估层、生成层与治理层。

  路由层先判断问题是事实问答、文献综述、特定实体查找，还是需要外部最新资料。若本地知识库足够，就优先走本地检索；若证据不足，再升级到网页或论文元数据工具。LangChain 对 Agentic RAG 的定义就是让 agent 在推理中决定何时以及如何检索，这里可通过工具集和策略提示落地。 citeturn17view4

  检索工具层至少包含三个能力：本地向量 / hybrid 检索、受白名单限制的网页抓取、论文搜索接口。证据评估层负责判断当前证据的相关性与充分性；若不足，可触发 query rewrite 或工具切换。Hybrid RAG 的关键思想正是把 retrieval validation、post-check 等中间步骤作为显式节点，而不是让 agent 永远自由发挥。近期 agentic RAG 实践也普遍引入 evidence sufficiency 和 citation verification。 citeturn17view5turn14academia4

  生成层要求所有回答绑定引用，并输出“结论—证据—来源”结构。回答后再做 citation checker：检查每条结论是否能在已检索证据中找到支持；若不行，则降级为不确定或触发一次受限重试。治理层负责预算与停止条件，包括最大检索轮数、最大外部抓取数、最大 token、最大时间。没有预算边界的 agentic 流程，线上几乎一定会膨胀。 citeturn14academia4turn17view3

  评估不仅看最终答对率，还应看“首次检索即成功率”“升级到外部工具比例”“每次问答平均工具调用数”“引用一致性”和“额外检索的边际收益”。这是衡量 agentic 设计是否真的值得的关键。 citeturn17view3turn14academia4

answer_keywords:
  - 路由
  - 多工具检索
  - evidence sufficiency
  - query rewrite
  - citation verification
  - budget
  - stop condition

scoring_points:
  - 能设计多工具与路由层
  - 能设计证据充分性评估与自纠错步骤
  - 能设计 budget 与 stop condition
  - 能说明引用一致性校验
  - 能提出反映 agentic 价值的指标

architecture_points:
  - 问题分类与路由器
  - 本地知识库检索器
  - 网页抓取工具
  - 论文元数据检索工具
  - query rewrite 模块
  - 证据充分性评估器
  - 生成器与引用校验器
  - 成本与预算控制器
  - trace / observability

data_flow:
  - 用户问题进入问题分类器
  - 根据类别选择本地检索或多工具检索起点
  - 检索结果进入证据充分性评估
  - 若不足则触发 query rewrite 或切换工具
  - 汇总证据并构造受预算约束的上下文
  - 生成“结论+证据+来源”
  - 执行引用一致性检查
  - 通过或拒答并记录全流程 trace

evaluation_metrics:
  - answer accuracy
  - citation faithfulness
  - first-pass success rate
  - average tool calls
  - external tool escalation rate
  - marginal gain per extra retrieval step
  - p95 latency
  - cost per resolved query

risk_points:
  - 外部网页带来间接 prompt injection
  - query rewrite 漂移导致主题偏航
  - 多工具结果冲突
  - 预算失控
  - 引用与结论错配
  - 工具白名单配置不当
  - 复杂流程导致可观测性不足

interview_followups:
  - 如果外部网页与内部知识库证据冲突，你会如何解决？
  - 为什么“证据充分性评估”应该是独立模块，而不是让 LLM 顺手判断一下？

--- question ---

question_id: agent_basic_sys_003
module: Agent 基础与架构
type: system_design
difficulty: 5
knowledge_points:
  - 大规模向量检索
  - 索引分层
  - 热冷分离
  - 召回基线

stem: |
  请设计一个支持十亿级文本片段的向量检索基础设施，用于多个 RAG 应用共用。要求考虑索引选型、热冷数据分层、增量更新、精度评估和回滚策略。你可以参考 Faiss、ScaNN、Milvus 与 Annoy 的已知能力。 citeturn6view0turn7view6turn9view0turn7view3

reference_answer: |
  十亿级检索系统不应把所有数据放在同一个索引、同一种 SLA 下处理。推荐做分层架构：热数据层强调低延迟与高召回，冷数据层强调高密度存储和成本优化。

  热数据层可以优先采用高召回 ANN，例如 HNSW 或高性能 ScaNN 路线，用于最近更新、访问最频繁的 chunk。Milvus 文档将 HNSW 定位为高速度高召回但内存需求较高；ScaNN 文档强调其在大规模向量相似搜索上的高效性，并使用 pruning 与 quantization。冷数据层则更适合 IVF_PQ / 压缩索引，甚至按业务分桶后放磁盘型或更节省内存的结构。Faiss 的研究基础也表明 PQ、IVF 等方法正是为大规模非穷举搜索设计。 citeturn9view0turn7view6turn6view0

  数据更新策略上，新增文档先进入热层并快速可检索，定时做 compaction、重聚类和量化后下沉到冷层。嵌入版本变更时，要支持并行双写新旧索引，避免直接覆盖造成不可回滚。对超大索引，Annoy 风格的 mmap / 磁盘友好特性在部分只读场景也有价值，但其维度与能力边界要结合业务评估。 citeturn7view3turn7view0

  评估与回滚方面，必须保留小规模精确基线集合或 FLAT 子集，用于周期性估算真实 recall@k。否则你只能知道“变快了”，不知道“丢了多少真邻居”。每次索引参数或 embedding 变更，都应该做 shadow traffic、分桶评测和可一键回退的版本化发布。 citeturn9view0turn6view0turn0academia0

  最终，这类基础设施不是单一“向量数据库选型题”，而是存储分层、索引策略、更新策略、评估机制和发布机制的组合系统。 citeturn6view0turn9view0turn7view6

answer_keywords:
  - 热冷分层
  - HNSW
  - ScaNN
  - IVF_PQ
  - PQ
  - 增量更新
  - shadow traffic
  - recall baseline

scoring_points:
  - 能提出热冷分层或多索引分层思路
  - 能结合 HNSW / IVF_PQ / ScaNN 做分工
  - 能设计增量更新与下沉策略
  - 能提出精确基线和回滚机制
  - 能体现多租户或多应用共用基础设施意识

architecture_points:
  - 热层高召回索引
  - 冷层压缩索引
  - 索引版本管理
  - embedding 版本管理
  - 增量写入与 compaction
  - 评测子集与基线索引
  - 灰度发布与回滚
  - 统一查询网关

data_flow:
  - 新文档先进入预处理与 embedding 流水线
  - 向量优先写入热层索引以保证新鲜度
  - 周期性将低频数据量化压缩并下沉到冷层
  - 查询网关先查热层，再按策略查冷层或并行查两层
  - 对结果进行 merge、去重和重排
  - 发布新 embedding / 新索引时走 shadow 与灰度
  - 评测系统周期性对比精确基线估算 recall 损失

evaluation_metrics:
  - recall@k
  - latency p50/p95/p99
  - memory footprint
  - build time
  - index freshness lag
  - update throughput
  - cost per million vectors
  - rollback success rate

risk_points:
  - 只看延迟不看 recall
  - 新旧 embedding 混索引
  - 热冷层 merge 结果重复或漏召回
  - compaction 期间可用性下降
  - 版本切换不可回滚
  - 多租户资源争抢
  - 极端长尾 query 在冷层表现差

interview_followups:
  - 如果业务要求“新增文档 5 分钟内可搜到”，你会如何设计写入与下沉节奏？
  - 当热层与冷层返回冲突结果时，你会怎么定义最终排序逻辑？

--- question ---

question_id: agent_basic_code_001
module: Agent 基础与架构
type: coding_or_pseudocode
difficulty: 4
knowledge_points:
  - Hybrid Retrieval
  - RRF
  - 结果融合
  - 去重

stem: |
  请设计一个用于 RAG 的结果融合函数：输入为 dense retriever 返回的 top-k 列表和 sparse retriever 返回的 top-k 列表，每个元素含 doc_id 与 rank；输出为融合后的最终排序。要求：
  1. 使用 Reciprocal Rank Fusion 思想；
  2. 对重复 doc_id 去重并累积分数；
  3. 返回 top_n 结果。
  请写 Python 风格伪代码，并说明为什么它常比直接线性相加 rank 更稳。可联系 hybrid retrieval 的工程背景作答。 citeturn10view6turn0academia0

reference_answer: |
  核心思路是使用 RRF，把每个检索器给出的排名转换为 1 / (k + rank) 形式的分数，再把同一 doc_id 的分数相加。这样做有两个优点：第一，它不要求不同检索器的原始分数可比；第二，它更关注“排名靠前的一致候选”，在 dense 与 sparse 分数尺度差异较大时，比直接线性加分数更稳。对于 hybrid retrieval，这是一种常见且工程上易落地的 late fusion 方法。 citeturn10view6turn10view4

  伪代码里应包含：遍历 dense 列表加分、遍历 sparse 列表加分、用哈希表按 doc_id 聚合、最后按累计分数排序并取 top_n。若同一文档只出现在一路中，也应保留其对应贡献。边界情况包括：两路列表为空、top_n 大于候选数、某条结果重复出现、存在相同累计分。 citeturn10view6turn0academia0

answer_keywords:
  - RRF
  - reciprocal rank fusion
  - late fusion
  - rank-based merge
  - 去重
  - hybrid retrieval

scoring_points:
  - 给出正确的 RRF 形式
  - 能按 doc_id 聚合分数
  - 能处理重复与边界情况
  - 能解释 RRF 为何不依赖原始分数可比性
  - 能联系 hybrid retrieval 的实际用途

pseudocode: |
  def rrf_merge(dense_results, sparse_results, top_n, k_const=60):
      # dense_results / sparse_results:
      # [{"doc_id": "d1", "rank": 1}, {"doc_id": "d2", "rank": 2}, ...]

      score_map = {}   # doc_id -> fused score
      source_map = {}  # doc_id -> set of sources

      for item in dense_results:
          doc_id = item["doc_id"]
          rank = item["rank"]
          score = 1.0 / (k_const + rank)
          if doc_id not in score_map:
              score_map[doc_id] = 0.0
              source_map[doc_id] = set()
          score_map[doc_id] += score
          source_map[doc_id].add("dense")

      for item in sparse_results:
          doc_id = item["doc_id"]
          rank = item["rank"]
          score = 1.0 / (k_const + rank)
          if doc_id not in score_map:
              score_map[doc_id] = 0.0
              source_map[doc_id] = set()
          score_map[doc_id] += score
          source_map[doc_id].add("sparse")

      merged = []
      for doc_id, score in score_map.items():
          merged.append({
              "doc_id": doc_id,
              "fused_score": score,
              "sources": sorted(list(source_map[doc_id]))
          })

      merged.sort(
          key=lambda x: (-x["fused_score"], x["doc_id"])
      )

      return merged[:top_n]

complexity:
  time: O(m + n + u log u)，其中 m 和 n 分别为 dense 与 sparse 结果数量，u 为去重后的文档数
  space: O(u)

test_cases:
  - input: |
      dense_results = [{"doc_id": "A", "rank": 1}, {"doc_id": "B", "rank": 2}]
      sparse_results = [{"doc_id": "B", "rank": 1}, {"doc_id": "C", "rank": 2}]
      top_n = 3
    expected: |
      B 应因为两路同时命中而获得更高 fused_score；A 和 C 次之，最终返回 3 条去重结果。
  - input: |
      dense_results = []
      sparse_results = [{"doc_id": "X", "rank": 1}]
      top_n = 5
    expected: |
      返回仅包含 X 的结果，不报错。
  - input: |
      dense_results = [{"doc_id": "A", "rank": 1}]
      sparse_results = [{"doc_id": "A", "rank": 3}]
      top_n = 1
    expected: |
      A 只出现一次，分数为两路贡献之和。

interview_followups:
  - 为什么很多系统在线上更愿意先用 RRF，而不是直接训练一个融合模型？
  - 如果你拿到了 dense 和 sparse 的原始相似度分数，为什么仍然可能不想直接线性相加？

--- question ---

question_id: agent_basic_code_002
module: Agent 基础与架构
type: coding_or_pseudocode
difficulty: 4
knowledge_points:
  - Context Packing
  - Token Budget
  - 证据排序
  - 去重

stem: |
  请设计一个“证据打包”伪代码函数，用于把检索到的候选 chunk 组装进 LLM 上下文。每个 chunk 含：
  - chunk_id
  - score
  - token_len
  - source_id
  - is_must_keep
  要求：
  1. 在总 token_budget 内尽量优先保留高分 chunk；
  2. must_keep 片段优先放入；
  3. 避免同一 source_id 被过度占满上下文；
  4. 返回最终排序后的 chunk 列表。
  请解释该策略如何缓解“召回对了但上下文不好用”的问题。 citeturn11academia1turn16view0

reference_answer: |
  这道题的核心不是 knapsack 的最优解，而是体现 RAG 中 context packing 的工程目标：有限 token 预算下，把更可能支撑答案的证据放到更容易被模型利用的位置，同时避免单一来源垄断上下文。Lost in the Middle 研究说明，证据位置与噪声对最终答案有显著影响，因此“召回到了什么”与“如何打包进去”同样重要。 citeturn11academia1

  可行做法是：先放 must_keep；再对剩余 chunk 按分数排序，但加入 source diversity 约束，比如每个 source 设最大配额；每加入一个 chunk 都检查 token_budget；最后把最关键的证据排在前面。若需要进一步稳健，可以在同一 source 内只保留最强若干块，减少冗余噪声。 citeturn16view0turn11academia1

answer_keywords:
  - token budget
  - must_keep
  - source diversity
  - evidence-first
  - context packing
  - 去重

scoring_points:
  - 能优先处理 must_keep
  - 能在预算内按分数选择
  - 能限制同源过度占比
  - 能体现最终顺序的重要性
  - 能解释 packing 对最终生成质量的影响

pseudocode: |
  def pack_context(chunks, token_budget, max_per_source=2):
      # chunks: list of dict
      # {chunk_id, score, token_len, source_id, is_must_keep}

      selected = []
      used_tokens = 0
      source_count = {}

      def can_add(chunk):
          if used_tokens + chunk["token_len"] > token_budget:
              return False
          if source_count.get(chunk["source_id"], 0) >= max_per_source:
              return False
          return True

      # Step 1: 先放 must_keep，分数高的优先
      must_keep_chunks = [c for c in chunks if c["is_must_keep"]]
      must_keep_chunks.sort(key=lambda x: -x["score"])

      for chunk in must_keep_chunks:
          if can_add(chunk):
              selected.append(chunk)
              used_tokens += chunk["token_len"]
              source_count[chunk["source_id"]] = source_count.get(chunk["source_id"], 0) + 1

      # Step 2: 放非 must_keep，按分数从高到低
      other_chunks = [c for c in chunks if not c["is_must_keep"]]
      other_chunks.sort(key=lambda x: -x["score"])

      for chunk in other_chunks:
          # 去重：避免重复 chunk_id
          if any(s["chunk_id"] == chunk["chunk_id"] for s in selected):
              continue
          if can_add(chunk):
              selected.append(chunk)
              used_tokens += chunk["token_len"]
              source_count[chunk["source_id"]] = source_count.get(chunk["source_id"], 0) + 1

      # Step 3: 最终把关键证据排前面
      selected.sort(
          key=lambda x: (
              0 if x["is_must_keep"] else 1,
              -x["score"],
              x["token_len"]
          )
      )

      return selected

complexity:
  time: O(n log n + n * s)，其中 n 为 chunk 数，s 为已选 chunk 数；若额外维护哈希去重可降到 O(n log n)
  space: O(n)

test_cases:
  - input: |
      chunks = [
        {"chunk_id": "c1", "score": 0.95, "token_len": 300, "source_id": "s1", "is_must_keep": True},
        {"chunk_id": "c2", "score": 0.93, "token_len": 400, "source_id": "s1", "is_must_keep": False},
        {"chunk_id": "c3", "score": 0.90, "token_len": 250, "source_id": "s2", "is_must_keep": False}
      ]
      token_budget = 600
    expected: |
      c1 应优先保留；若继续加入 c3 可满足预算且提升来源多样性，则 c3 比 c2 更可能被保留。
  - input: |
      chunks = [
        {"chunk_id": "a", "score": 0.91, "token_len": 200, "source_id": "doc1", "is_must_keep": False},
        {"chunk_id": "b", "score": 0.89, "token_len": 210, "source_id": "doc1", "is_must_keep": False},
        {"chunk_id": "c", "score": 0.88, "token_len": 220, "source_id": "doc1", "is_must_keep": False}
      ]
      token_budget = 1000
      max_per_source = 2
    expected: |
      同一 source 最多保留 2 个 chunk，避免单文档垄断上下文。
  - input: |
      chunks = [
        {"chunk_id": "m1", "score": 0.50, "token_len": 900, "source_id": "s9", "is_must_keep": True}
      ]
      token_budget = 800
    expected: |
      由于预算不足，返回空列表或触发上层降级逻辑，但不能超预算塞入。

interview_followups:
  - 如果 must_keep 太大导致预算被占满，你会如何做降级？
  - 你会如何把 reranker 分数、来源多样性和时效性一起纳入 packing 逻辑？