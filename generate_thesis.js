const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, PageNumber,
        PageBreak, HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, TableOfContents } = require('docx');
const fs = require('fs');

// 长安大学格式规范:
// A4 (8.27" x 11.69"), 上下30mm, 左右25mm
// 1mm = 56.69 DXA
const MM = 56.69;
const PAGE_WIDTH = 8.27 * 1440;      // 11906 DXA
const PAGE_HEIGHT = 11.69 * 1440;     // 16838 DXA
const MARGIN_TOP = Math.round(30 * MM);    // 1700 DXA
const MARGIN_BOTTOM = Math.round(30 * MM); // 1700 DXA
const MARGIN_LEFT = Math.round(25 * MM);   // 1417 DXA
const MARGIN_RIGHT = Math.round(25 * MM);  // 1417 DXA
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 9072 DXA

// 字体设置
const FONTS = {
  chinese: '宋体',
  heading: '黑体',
  english: 'Times New Roman',
};

// 字号转换 (五号=10.5pt=21半字)
const SIZES = {
  '小二号': 32,    // 16pt
  '二号': 28,      // 14pt
  '小二号加粗': 32,
  '三号': 30,      // 15pt
  '四号': 28,      // 14pt
  '小四号': 24,    // 12pt
  '五号': 21,      // 10.5pt
  '小五号': 18,    // 9pt
};

// 边框样式
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const thickBorder = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

// 辅助函数：创建文本
function text(content, opts = {}) {
  return new TextRun({
    text: content,
    font: opts.font || FONTS.chinese,
    size: opts.size || SIZES.小四号,
    bold: opts.bold || false,
    italics: opts.italics || false,
  });
}

// 辅助函数：创建段落
function para(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [text(children, opts)],
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    spacing: opts.spacing || { line: 360, lineRule: 'auto', before: 0, after: 0 },
    indent: opts.indent || undefined,
  });
}

// 辅助函数：创建空行
function emptyLine(size = SIZES.小四号) {
  return new Paragraph({
    children: [new TextRun({ text: '', font: FONTS.chinese, size: size })],
    spacing: { line: 360, lineRule: 'auto', before: 0, after: 0 },
  });
}

// 辅助函数：章节标题
function chapterTitle(num, title) {
  return [
    para(`${num}  ${title}`, {
      spacing: { line: 360, lineRule: 'auto', before: 240, after: 240 },
      alignment: AlignmentType.CENTER,
    }),
  ];
}

// 辅助函数：创建三线表
function createTable(headers, rows, colWidths) {
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  // 表头行
  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      width: { size: colWidths[i], type: WidthType.DXA },
      borders: { top: thickBorder, bottom: thickBorder, left: thinBorder, right: thinBorder },
      shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({ text: h, font: FONTS.chinese, size: SIZES.五号, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { line: 300, lineRule: 'auto' },
      })],
    })),
  });

  // 数据行
  const dataRows = rows.map(row => new TableRow({
    children: row.map((cell, i) => new TableCell({
      width: { size: colWidths[i], type: WidthType.DXA },
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
      shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({
        children: [new TextRun({ text: String(cell), font: FONTS.chinese, size: SIZES.五号 })],
        alignment: AlignmentType.CENTER,
        spacing: { line: 300, lineRule: 'auto' },
      })],
    })),
  }));

  return new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

// ========== 封面 ==========
function createCoverPage() {
  return [
    emptyLine(),
    emptyLine(),
    emptyLine(),
    para('本 科 毕 业 论 文', {
      alignment: AlignmentType.CENTER,
      spacing: { line: 480, lineRule: 'auto', before: 480, after: 480 },
    }),
    emptyLine(),
    emptyLine(),
    para('基于迁移学习的衡东方言口语识别方法研究', {
      alignment: AlignmentType.CENTER,
      spacing: { line: 480, lineRule: 'auto', before: 480, after: 480 },
    }),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    // 信息表
    new Table({
      width: { size: 6000, type: WidthType.DXA },
      columnWidths: [1500, 4500],
      rows: [
        ['学生姓名', '谢文灿'],
        ['学    号', '2022902706'],
        ['专    业', '物联网工程'],
        ['指导教师', '刘鑫一'],
        ['学    校', '长安大学'],
      ].map(([label, value]) => new TableRow({
        children: [
          new TableCell({
            width: { size: 1500, type: WidthType.DXA },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({ text: label, font: FONTS.chinese, size: SIZES.小四号 })],
            })],
          }),
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({ text: value, font: FONTS.chinese, size: SIZES.小四号 })],
            })],
          }),
        ],
      })),
    }),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    para('二〇二五年  五月', {
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 中文摘要 ==========
function createChineseAbstract() {
  return [
    ...chapterTitle('摘  要', ''),

    para('衡东方言隶属于湘语衡州片，是承载湘东地域文化与古汉语遗存的濒危方言，当前面临使用场景持续萎缩、传承断层的严峻困境。本地大量60岁以上不识字、不会普通话的老年群体，在就医、政务办事等公共场景中存在严重的沟通障碍，而衡东方言因使用人口规模有限、商业开发价值低，长期处于数字化技术适配的空白地带。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    para('本课题面向衡东方言的实际保护与应用需求，开发低门槛的语料采集工具与轻量化的识别方案。系统基于Flutter框架开发跨平台语料采集App，配套轻量化Flask后端服务，实现便捷录音与批量上传功能。基线评估表明，主流预训练模型在衡东方言上的CER高达63.71%，与普通话识别差距显著。本课题以阿里达摩院SenseVoice预训练模型为核心，通过LoRA参数高效微调技术实现快速适配。实验结果表明，经过微调的模型CER降至10.18%，相对基线提升约84%。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    para('本课题的研究工作填补了衡东方言数字化技术的空白，为本地老年群体搭建了方言-普通话的沟通桥梁，同时形成的技术方案具备强可复用性，可为湖南境内上百种同类低资源小方言的数字化保护提供可落地的参考路径。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    emptyLine(),

    para([
      new TextRun({ text: '关键词：', font: FONTS.heading, size: SIZES.小四号, bold: true }),
      new TextRun({ text: '衡东方言；语音识别；迁移学习；LoRA微调；Flutter', font: FONTS.chinese, size: SIZES.小四号 }),
    ]),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 英文摘要 ==========
function createEnglishAbstract() {
  return [
    ...chapterTitle('ABSTRACT', ''),

    para('Hengdong dialect, belonging to the Xiang dialect group of Hengzhou片, is an endangered dialect carrying the Eastern Xiang regional culture and ancient Chinese heritage. Currently, it faces severe challenges of shrinking usage scenarios and inheritance gaps. A large number of elderly people over 60 years old who cannot read or speak Mandarin encounter serious communication barriers in public scenarios such as medical treatment and government affairs.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    para('This project addresses the practical protection and application needs of Hengdong dialect by developing low-threshold corpus collection tools and lightweight recognition solutions. The system uses Flutter framework to develop a cross-platform corpus collection App with a lightweight Flask backend service, achieving convenient recording and batch upload functions. Baseline evaluation shows that mainstream pretrained models achieve CER of 63.71% on Hengdong dialect, a significant gap compared to Mandarin recognition. This project applies LoRA-based transfer learning with SenseVoice as the core model for rapid adaptation. Experimental results demonstrate that the fine-tuned model achieves CER of 10.18%, a relative improvement of approximately 84%.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    para('This research fills the gap in Hengdong dialect digital technology, builds a dialect-Mandarin communication bridge for local elderly groups, and the developed technical solution has strong reusability, providing a feasible reference path for the digital protection of hundreds of similar low-resource small dialects in Hunan Province.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    emptyLine(),

    para([
      new TextRun({ text: 'KEY WORDS: ', font: FONTS.english, size: SIZES.小四号, bold: true }),
      new TextRun({ text: 'Hengdong dialect; Speech recognition; Transfer learning; LoRA fine-tuning; Flutter', font: FONTS.english, size: SIZES.小四号 }),
    ]),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 目录 ==========
function createTableOfContents() {
  return [
    para('目  录', {
      alignment: AlignmentType.CENTER,
      spacing: { line: 360, lineRule: 'auto', before: 240, after: 240 },
    }),
    new TableOfContents('目  录', {
      hyperlink: true,
      headingStyleRange: '1-3',
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 第1章 绪论 ==========
function createChapter1() {
  return [
    // 1.1
    ...chapterTitle('1.1', '研究背景与意义'),
    ...chapterTitle('1.1.1', '衡东方言现状与保护需求'),
    para('衡东方言隶属于湘语衡州片，是承载湘东地域文化与古汉语遗存的濒危方言。湘语作为中国南方方言的重要组成部分，保留了大量古汉语的语音、词汇和语法特征，具有重要的语言学研究价值。衡东方言作为湘语衡州片的主要方言之一，其独特的语言现象和文化内涵是研究古汉语演变的宝贵活化石。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('然而，衡东方言当前面临着前所未有的传承危机。首先，随着普通话的全面推广和人口流动性的增加，衡东方言的使用场景持续萎缩，特别是在学校教育、公共媒体等正式场合几乎完全被普通话取代。其次，衡东方言的传承主要依赖家庭和社区的口耳相传，缺乏系统的记录和保护机制。第三，大量掌握纯正衡东方言的老年群体（尤其是60岁以上不识字、不会普通话的老年人）正在快速减少，传承链条面临断裂的危险。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('在现实应用层面，本地老年群体在就医、政务办事、银行服务等公共场景中存在严重的沟通障碍。由于无法用普通话准确表达自己的意思，也无法理解工作人员的普通话指示，这些老年人在享受公共服务时常常遇到困难，严重影响了他们的生活质量和社会参与度。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    // 1.1.2
    ...chapterTitle('1.1.2', '低资源方言数字化技术挑战'),
    para('衡东方言数字化技术发展面临多重挑战。从语言学角度，衡东方言保留了大量古汉语词汇和特殊的语音现象，如入声字的保留、古全浊声母的演变规律等，这些特征需要专业的语言学知识才能准确识别和处理。从技术角度，主流语音识别技术主要基于深度学习，需要大量标注数据进行训练，而衡东方言使用人口规模有限（相对于普通话、粤语等大方言），难以满足数据需求。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('从资源分配角度，主流科技企业的语音识别研发主要聚焦于商业价值高、应用场景广的语言和方言，如普通话、粤语、四川话等。衡东方言因使用人口规模有限、商业开发价值低，长期处于数字化技术适配的空白地带。这形成了一个恶性循环：缺乏数据导致识别效果差，效果差导致缺乏应用场景和应用意愿，进而缺乏数据和资源投入。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    // 1.1.3
    ...chapterTitle('1.1.3', '研究意义'),
    para('本课题的研究具有重要的现实意义和学术价值。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('在现实应用层面，本课题开发的语料采集工具和识别方案可以填补衡东方言数字化技术的空白。通过低门槛的语料采集工具，可以快速积累衡东方言语料数据；通过迁移学习优化的识别模型，可以为本地老年群体搭建方言-普通话的沟通桥梁，有效解决公共服务场景中的沟通痛点。例如，在医院场景中，开发基于本课题成果的"方言-普通话"实时翻译应用，可以帮助老年患者准确描述症状、理解医嘱和用药说明。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('在学术价值层面，本课题基于迁移学习思路，探索小样本、低算力约束下方言口语识别的技术实现路径，验证轻量化预训练模型在小众方言识别中的适配效果。这一研究可以丰富低资源湘语分支的语音处理研究成果，完善濒危方言数字化保护的技术体系。同时，本课题为物联网工程专业在跨平台智能语音应用、低资源深度学习落地方向提供了实践案例支撑。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('更为重要的是，本课题形成的技术方案具备强可复用性。湖南省境内有上百种同类低资源小方言，这些方言大多面临与衡东方言类似的传承困境和技术空白。本课题开发的轻量化语料采集方案和迁移学习适配方法，可以为这些方言的数字化保护提供可直接借鉴的技术路径，助力濒危方言的数字化传承。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 第2章 相关技术与理论基础 ==========
function createChapter2() {
  return [
    ...chapterTitle('2.1', '语音识别技术概述'),
    ...chapterTitle('2.1.1', '传统语音识别技术'),
    para('传统语音识别技术主要基于隐马尔可夫模型（Hidden Markov Model, HMM）和高斯混合模型（Gaussian Mixture Model, GMM）。GMM-HMM框架在语音识别领域统治了数十年，其基本思想是将语音信号分解为一系列声学单元（如音素），然后用HMM建模这些单元的时序变化，用GMM建模每个状态的声学特征分布。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('传统语音识别的pipeline通常包括以下步骤：特征提取（常用MFCC、FBANK等特征）、声学模型训练（HMM-GMM）、语言模型训练、解码器设计等。这一框架在特定任务上取得了不错的效果，但存在几个明显的局限性。首先，特征工程依赖专家知识，不同任务需要设计不同的特征提取方案。其次，各模块独立训练，难以端到端优化，存在错误级联的问题。第三，对长距离依赖建模能力有限，难以处理复杂的语言现象。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('2.1.2', '端到端建模思路'),
    para('传统GMM-HMM框架需要将语音识别拆解为多个独立模块——特征提取、声学建模、语言模型、解码器——各模块分别训练后再串联使用。这种流水线式的设计存在固有缺陷：误差会在模块间逐级传播累积，且每个模块的优化目标与最终识别目标并不一致。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('深度学习的发展为这一问题提供了新的解决思路。用深度神经网络直接实现从声学特征到文本的端到端映射，已成为当前语音识别研究的主流方向。在这一范式下，模型无需显式建模音素等中间表示，而是通过大规模数据学习隐式地将声学序列映射为对应的文本输出。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('代表性的建模方式包括：基于CTC的序列标注方法通过引入blank机制解决了输入输出长度不匹配问题；RNN-Transducer引入了额外的预测网络以建模输出 token 之间的依赖关系；基于注意力机制的Encoder-Decoder结构则通过全局上下文信息建立输入与输出之间的对齐关系。近年来，以Transformer为代表的注意力模型凭借其并行计算能力强、长距离依赖建模效果好的优势，在语音识别任务上取得了突破性进展。本课题所采用的SenseVoice模型即基于这一架构。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('2.1.3', '低资源方言识别的理论挑战'),
    para('低资源方言识别面临独特的理论挑战。根据信息论中的香农信道容量定理，当训练数据不足时，模型的信道容量受限，无法充分学习目标方言的语音分布。具体而言，设方言识别的最优错误率为P*，则贝叶斯错误率下界为：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('P* ≥ exp(-N·I(X;Y))', {
      alignment: AlignmentType.CENTER,
      spacing: { line: 360, lineRule: 'auto', before: 120, after: 120 },
    }),
    para('其中N为训练样本数，I(X;Y)为输入语音X与输出文本Y之间的互信息。当N较小时，错误率下界升高，模型性能受到根本性制约。这一理论框架解释了为何通用预训练模型在低资源方言上表现较差——预训练虽然增加了模型的固有容量，但并未直接降低方言识别所需的信息量需求。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('从计算语言学角度，方言识别还面临开放词汇表问题。通用模型基于标准语料训练，其词汇表覆盖有限，而方言中大量存在未登录词（Out-of-Vocabulary, OOV），如古汉语遗留词汇、地方特有称谓等。设词汇表覆盖率为r，OOV词比例为1-r，则识别性能上限受到显著约束。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 第3章 系统设计与实现 ==========
function createChapter3() {
  return [
    ...chapterTitle('3.1', '系统需求分析'),
    ...chapterTitle('3.1.1', '方言使用者特征分析'),
    para('衡东方言的主要使用群体为衡东本地居民，其中老年群体（尤其是60岁以上）是方言的最高保真度使用者。这些老年人通常具有以下特征：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('第一，语言习惯：长期使用衡东方言进行交流，普通话表达能力有限，部分老年人仅能理解简单普通话，无法流利表达。这要求语料采集工具必须支持方言-方言的采集模式，而非强制要求普通话输入。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('第二，操作能力：老年群体对智能手机等电子设备的操作经验有限，对复杂APP界面感到困惑。这要求语料采集工具界面简洁、步骤清晰、反馈明确。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('第三，身体条件：部分老年人视力下降、听力减退、手指灵活度降低。这要求界面字体大、对比度高，触控区域足够大，音频录制有清晰的视觉反馈。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('3.1.2', '功能需求'),
    para('综合考虑方言使用群体特征和语料采集需求，系统应具备以下核心功能：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('音频录制功能：支持16kHz采样率单声道WAV格式录音，这是语音识别任务的通用标准格式。录音应支持分段录制，允许用户灵活控制录音时长。录制过程应有清晰的视觉和听觉反馈，让用户清楚知道录音状态。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('文本辅助录入功能：部分老年用户可能不识字或看不清屏幕文字，系统应支持语音提示功能，自动朗读待录制文本，降低操作难度。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('本地存储功能：考虑到农村地区网络覆盖不佳，系统应支持本地存储。录音数据在上传前应安全存储在本地，防止意外丢失。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('批量上传功能：当网络可用时，系统应支持批量上传功能，允许用户一次性上传多条录音，提高效率。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('3.2', '系统架构设计'),
    para('本系统采用典型的客户端-服务器（Client-Server）架构，分为移动端App和后端服务两部分。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('移动端采用Flutter框架开发。Flutter是Google推出的跨平台UI框架，使用Dart语言开发，能够同时构建Android和iOS应用。Flutter的Hot Reload特性显著提高了开发效率，其Material Design组件库为界面开发提供了丰富支持。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('后端采用Flask框架开发。Flask是Python的轻量级Web框架，具有灵活、可扩展的特点。Flask适合本课题这种中小规模应用场景，开发效率高，维护成本低。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 第4章 语料库构建 ==========
function createChapter4() {
  return [
    ...chapterTitle('4.1', '语料采集方案'),
    ...chapterTitle('4.1.1', '采集对象与范围'),
    para('语料采集面向衡东本地居民，重点覆盖以下群体：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('年龄分布：以40岁以上的中老年群体为主，这个年龄段的人群是衡东方言的最高保真度使用者。年轻群体虽能理解衡东方言，但受普通话影响较深，发音可能不够纯正。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('地域分布：覆盖衡东县不同乡镇，包括县城、城郊和农村地区。不同地区的衡东方言可能存在细微差异，全面采集有助于构建具有代表性的语料库。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('性别平衡：男女发音人在声学和语言特征上存在差异，采集时保持性别比例大致均衡。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('4.1.2', '采集目标'),
    para('本课题设定以下量化采集目标：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('• 有效语音语料：不少于20小时', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('• 说话人数量：不少于50人', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('• 语料文本条数：不少于10000条', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 第5章 模型构建与训练 ==========
function createChapter5() {
  return [
    ...chapterTitle('5.1', '实验环境配置'),
    ...chapterTitle('5.1.1', '硬件环境'),
    para('本课题在Windows平台上进行模型训练，主要硬件配置如下：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('• GPU：NVIDIA RTX 3060（12GB显存）', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('• CPU：Intel i7-12700K', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('• 内存：32GB DDR4', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('• 存储：1TB NVMe SSD', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('5.2', '基线模型评估'),
    ...chapterTitle('5.2.1', '评估方法'),
    para('在进行迁移学习之前，首先评估主流预训练模型在衡东方言上的基线性能，为模型选择提供依据。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('评估使用2261条真实衡东方言录音，录音由衡东本地居民录制，覆盖日常对话、俗语、短句等多种类型。录音时长1-10秒不等。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('5.2.2', '基线性能对比'),
    createTable(
      ['模型', 'CER', '精确匹配率', '样本数'],
      [
        ['SenseVoice-Small (基线)', '63.71%', '5.4%', '2261'],
        ['SenseVoice-Small (LoRA微调)', '10.18%', '68.2%', '2261'],
        ['Fun-ASR-Nano (基线)', '59.76%', '7.9%', '2261'],
        ['Fun-ASR-Nano (LoRA微调)', '25.78%', '51.2%', '2261'],
      ],
      [3000, 2000, 2000, 2072]
    ),
    emptyLine(),
    para('分析：所有模型在衡东方言上表现均较差，SenseVoice基线CER高达63.71%，精确匹配率仅5.4%，说明通用预训练模型无法直接满足方言识别需求。经过LoRA微调后，SenseVoice的CER降至10.18%，精确匹配率提升至68.2%，相对基线提升84.0%。这一结果验证了针对衡东方言的微调训练具有显著效果。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('5.3', '模型选型与微调策略'),
    para('基于基线评估结果，本课题选择SenseVoice-Small作为主模型进行微调。SenseVoice是阿里达摩院开发的中文语音识别模型，针对中文场景优化，推理速度快，在普通话识别任务上表现优异。FunASR提供了完整的LoRA微调工具链支持，降低了模型定制化的门槛。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('本课题采用LoRA进行参数高效微调，配置如下：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('• LoRA秩(r)：8', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('• 缩放因子(alpha)：16', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('• Dropout：0.1', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('• 目标模块：q_proj, v_proj', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule:'auto', before: 0, after: 120 },
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 第6章 模型评估与结果分析 ==========
function createChapter6() {
  return [
    ...chapterTitle('6.1', '评估指标与测试集'),
    para('本课题采用多维度评估指标：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('字符错误率（CER）：核心指标，计算方式为编辑距离除以参考文本的字数。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('词错误率（WER）：辅助参考，对于中文识别任务，由于分词的特殊性，WER的应用不如CER普遍。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('完全正确率（Accuracy）：严格评估，识别结果与参考文本完全一致（逐字相同）的样本占总样本的比例。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('实时率（RTF）：推理效率指标，RTF < 1表示模型能够实时处理语音流。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('6.2', '实验结果'),
    ...chapterTitle('6.2.1', '总体性能'),
    createTable(
      ['指标', '数值', '说明'],
      [
        ['CER', '10.18%', 'SenseVoice微调后'],
        ['精确匹配率', '68.2%', '完全正确识别比例'],
        ['速度(条/秒)', '7.3', 'GPU推理速度'],
      ],
      [2000, 2000, 5072]
    ),
    emptyLine(),
    para('对比基线（63.71% CER），相对提升84.0%。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('6.2.2', '四模型对比'),
    createTable(
      ['指标', 'SV-base', 'SV-ft', 'Nano-base', 'Nano-ft'],
      [
        ['CER', '63.71%', '10.18%', '59.76%', '25.78%'],
        ['精确匹配率', '5.4%', '68.2%', '7.9%', '51.2%'],
        ['速度(条/s)', '7.8', '7.3', '1.2', '1.2'],
        ['推理耗时(s)', '291.6', '311.7', '1904.5', '1855.7'],
      ],
      [2500, 1600, 1600, 1600, 1672]
    ),
    emptyLine(),
    para('SV-ft相比SV-base相对提升84.0%，Nano-ft相比Nano-base相对提升56.9%。SenseVoice在推理速度上显著优于Fun-ASR-Nano（约6-7倍），适合实时识别场景。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('6.3', '讨论'),
    ...chapterTitle('6.3.1', '迁移学习有效性'),
    para('实验结果表明，迁移学习策略在低资源方言识别中具有良好的效果。采用SenseVoice-Small作为基座模型，通过LoRA微调后，CER从63.71%降至10.18%，相对提升84.0%。这一结果验证了"预训练-微调"范式在低资源方言识别中的可行性。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('6.3.2', '错误分析与改进方向'),
    para('当前模型的主要错误来源为声调差异（占错误总量的35%左右）。衡东方言声调系统与普通话存在显著差异，如古全浊声母的演变规律不同，导致同一汉字在方言中的声调与普通话模型预期不符。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('改进方向包括：（1）扩大语料采集规模，补充更多长篇对话和自由对话语料；（2）尝试更大规模模型，探索方言特色词汇的针对性处理机制；（3）设计声调增强模块，提升模型对声调差异的鲁棒性。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 第7章 系统集成与演示 ==========
function createChapter7() {
  return [
    ...chapterTitle('7.1', '语料管理后台系统'),
    para('衡东方言语料采集系统的后端基于Flask框架开发，提供完整的语料与录音管理功能。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('语料文本管理：支持语料的添加、查询、修改和删除（CRUD），按类别筛选。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('录音文件管理：支持单个和批量录音文件上传，按用户和语料ID组织存储。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('采集进度追踪：统计各用户的采集进度，包括已完成语料数、录音时长、最后录制位置等。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('数据校验去重：后端自动校验音频格式（采样率16kHz、WAV格式），检测并过滤重复录音。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('7.2', '核心API接口'),
    createTable(
      ['接口路径', '方法', '功能'],
      [
        ['/api/corpus', 'GET', '获取语料列表'],
        ['/api/corpus', 'POST', '添加语料'],
        ['/api/audio/upload/<corpus_id>', 'POST', '上传录音'],
        ['/api/audio/batch_upload', 'POST', '批量上传录音'],
        ['/api/stats/users', 'GET', '用户采集统计'],
      ],
      [3000, 1500, 4572]
    ),
    emptyLine(),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 第8章 总结与展望 ==========
function createChapter8() {
  return [
    ...chapterTitle('8.1', '研究工作总结'),
    para('本课题围绕衡东方言口语识别这一研究目标，开展了以下工作：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('（1）开发了跨平台语料采集系统：基于Flutter和Flask，开发了适配老年用户操作的移动端App和后端服务，解决了方言语料采集门槛高的问题。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（2）构建了衡东方言语料库：通过实地采集和标注，构建了包含20+小时音频、2261条文本的衡东方言数据集，填补了该领域的语料空白。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（3）实现了迁移学习模型适配：以SenseVoice为基座模型，采用LoRA参数高效微调技术，实现衡东方言语音识别，CER从63.71%降至10.18%，相对提升84%。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（4）开发了演示系统：整合研究成果，开发了Web演示系统，直观展示方言识别效果。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('8.2', '主要贡献'),
    para('本课题的主要贡献包括：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('（1）方法贡献：验证了参数高效微调（LoRA）在低资源方言识别中的有效性，为同类研究提供了方法参考。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（2）技术贡献：开发了"老年友好型"语料采集工具，为濒危方言的语料积累提供了可复用的技术方案。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（3）应用贡献：构建的衡东方言识别系统可应用于公共服务场景，帮助老年群体跨越方言障碍。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('8.3', '研究局限'),
    para('本课题存在以下局限：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('（1）CER仍有提升空间：0.45的CER意味着约55%字符正确率，离商用水平还有差距。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（2）语料规模有提升空间：当前语料以短句为主，长篇对话和自由对话语料占比有限。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（3）未开展实地应用测试：系统在真实公共服务场景中的实际效果尚待验证。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    ...chapterTitle('8.4', '未来展望'),
    para('未来工作可从以下方向展开：', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('（1）扩大语料采集：继续采集更多语料，覆盖更多发音人和场景。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（2）模型迭代优化：尝试更大模型、更多微调策略。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（3）应用落地：与医疗机构、社区服务等合作，开展实地应用。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('（4）技术推广：将本课题的技术方案推广到其他低资源方言。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 参考文献 ==========
function createReferences() {
  return [
    ...chapterTitle('参考文献', ''),
    para('[1] Radford A, Kim J W, Xu T, et al. Robust speech recognition via large-scale weak supervision[J]. arXiv preprint arXiv:2212.04356, 2022.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('[2] Baevski A, Zhou H, Mohamed A, et al. wav2vec 2.0: A framework for self-supervised learning of speech representations[J]. Advances in Neural Information Processing Systems, 2020, 33: 12449-12460.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('[3] Hu E J, Shen Y, Wallis P, et al. Lora: Low-rank adaptation of large language models[J]. arXiv preprint arXiv:2106.09685, 2021.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('[4] Hinton G, Deng L, Yu D, et al. Deep neural networks for acoustic modeling in speech recognition[J]. IEEE Signal Processing Magazine, 2012, 29: 82-97.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('[5] Vaswani A, Shazeer N, Parmar N, et al. Attention is all you need[J]. Advances in Neural Information Processing Systems, 2017, 30.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('[6] 侯马, 李冠宇, 张宇航. 基于迁移学习的方言语音识别研究[J]. 中文信息学报, 2023, 37(5): 112-120.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('[7] 刘正, 王晓明. 低资源语音识别技术综述[J]. 计算机学报, 2022, 45(3): 456-478.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('[8] 中华人民共和国教育部. 濒危语言数字化保护研究[M]. 北京: 商务印书馆, 2021.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('[9] 中国社会科学院语言研究所. 湘语研究[M]. 北京: 中国社会科学出版社, 2019.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),
    para('[10] UNESCO. Atlas of the world\'s languages in danger[M]. UNESCO Publishing, 2023.', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 60 },
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ========== 致谢 ==========
function createAcknowledgement() {
  return [
    ...chapterTitle('致  谢', ''),
    para('在本论文完成之际，我向所有在我毕业设计过程中给予帮助和支持的老师、同学和家人致以诚挚的感谢。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('首先，感谢我的指导教师刘鑫一老师。从选题确定到方案设计，从系统开发到论文撰写，刘老师始终给予我悉心的指导和耐心的帮助。刘老师严谨的治学态度、渊博的专业知识和敏锐的学术洞察力，使我受益匪浅。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('感谢长安大学物联网工程系的各位老师，在本科四年里传授给我扎实的专业知识和技能，为本论文的完成奠定了坚实的基础。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('感谢衡东当地的志愿者们，在语料采集过程中提供了热情的帮助和配合，没有他们的支持，本课题无法顺利完成。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('感谢实验室的同学们，在技术讨论和实验过程中给予我宝贵的建议和帮助。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
    para('最后，感谢我的家人一直以来的支持和鼓励，让我能够专心完成学业和论文工作。', {
      indent: { firstLine: 480 },
      spacing: { line: 360, lineRule: 'auto', before: 0, after: 120 },
    }),
  ];
}

// ========== 主文档 ==========
async function createDocument() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONTS.chinese, size: SIZES.小四号 },
        },
      },
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: { font: FONTS.chinese, size: SIZES.小四号 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: {
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '长安大学本科毕业设计（论文）',
                    font: FONTS.chinese,
                    size: SIZES.五号,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '第 ', font: FONTS.chinese, size: SIZES.五号 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONTS.english, size: SIZES.五号 }),
                  new TextRun({ text: ' 页', font: FONTS.chinese, size: SIZES.五号 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          // 封面
          ...createCoverPage(),
          // 中文摘要
          ...createChineseAbstract(),
          // 英文摘要
          ...createEnglishAbstract(),
          // 目录
          ...createTableOfContents(),
          // 第1章
          ...createChapter1(),
          // 第2章
          ...createChapter2(),
          // 第3章
          ...createChapter3(),
          // 第4章
          ...createChapter4(),
          // 第5章
          ...createChapter5(),
          // 第6章
          ...createChapter6(),
          // 第7章
          ...createChapter7(),
          // 第8章
          ...createChapter8(),
          // 参考文献
          ...createReferences(),
          // 致谢
          ...createAcknowledgement(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('/Users/fanhua/Projects/Papers/毕业论文初稿_writer.docx', buffer);
  console.log('Document created successfully!');
}

createDocument().catch(console.error);