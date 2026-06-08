export type TipBlock = Record<string, any>;

export type TipTemplate = {
  key: string;
  name: string;
  description: string;
  blocks: () => TipBlock[];
};

const blockId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createBlock = (type: string): TipBlock => {
  switch (type) {
    case 'heading':
      return { id: blockId(), type, level: 2, text: '' };
    case 'paragraph':
      return { id: blockId(), type, text: '' };
    case 'image':
      return { id: blockId(), type, url: '', caption: '' };
    case 'image_text':
      return { id: blockId(), type, title: '', text: '', image_url: '', image_position: 'left' };
    case 'gallery':
      return { id: blockId(), type, title: '', images: [] };
    case 'video':
      return { id: blockId(), type, url: '', title: '', description: '' };
    case 'quote':
      return { id: blockId(), type, quote: '', author: '' };
    case 'checklist':
      return { id: blockId(), type, title: '', items: [] };
    case 'list':
      return { id: blockId(), type, title: '', ordered: false, items: [] };
    case 'faq':
      return { id: blockId(), type, title: '', items: [] };
    case 'table':
      return { id: blockId(), type, title: '', headers: [], rows: [] };
    case 'toc':
      return { id: blockId(), type, title: 'Mục lục', max_items: 20 };
    case 'products':
      return { id: blockId(), type, title: 'Sản phẩm liên quan', items: [] };
    case 'divider':
      return { id: blockId(), type };
    case 'spacer':
      return { id: blockId(), type, height: 40 };
    case 'callout':
      return { id: blockId(), type, title: '', text: '', tone: 'info' };
    case 'cta':
      return {
        id: blockId(),
        type,
        title: '',
        description: '',
        button_text: '',
        button_url: '',
      };
    default:
      return { id: blockId(), type: 'paragraph', text: '' };
  }
};

export const TIP_TEMPLATES: TipTemplate[] = [
  {
    key: 'classic-guide',
    name: 'Classic Guide',
    description: 'Bài viết chuẩn dạng hướng dẫn từng bước với tiêu đề + đoạn văn.',
    blocks: () => [
      createBlock('heading'),
      createBlock('paragraph'),
      createBlock('heading'),
      createBlock('paragraph'),
      createBlock('checklist'),
    ],
  },
  {
    key: 'hero-story',
    name: 'Hero Story',
    description: 'Mở đầu bằng ảnh lớn, sau đó kể chuyện và chốt CTA.',
    blocks: () => [createBlock('image'), createBlock('paragraph'), createBlock('quote'), createBlock('cta')],
  },
  {
    key: 'step-by-step',
    name: 'Step By Step',
    description: 'Dùng cho bài hướng dẫn thao tác theo trình tự rõ ràng.',
    blocks: () => [
      createBlock('heading'),
      createBlock('paragraph'),
      createBlock('image_text'),
      createBlock('image_text'),
      createBlock('checklist'),
    ],
  },
  {
    key: 'before-after',
    name: 'Before / After',
    description: 'So sánh trước và sau với ảnh + mô tả.',
    blocks: () => [
      { ...createBlock('image_text'), image_position: 'left' },
      { ...createBlock('image_text'), image_position: 'right' },
      createBlock('callout'),
    ],
  },
  {
    key: 'visual-gallery',
    name: 'Visual Gallery',
    description: 'Bài thiên về hình ảnh với gallery + ghi chú ngắn.',
    blocks: () => [createBlock('gallery'), createBlock('paragraph'), createBlock('gallery')],
  },
  {
    key: 'video-explainer',
    name: 'Video Explainer',
    description: 'Ưu tiên video nhúng, đi kèm phần tóm tắt nội dung.',
    blocks: () => [createBlock('video'), createBlock('paragraph'), createBlock('checklist')],
  },
  {
    key: 'qa-format',
    name: 'Q&A Format',
    description: 'Dạng hỏi đáp nhanh cho các câu hỏi thường gặp.',
    blocks: () => [
      createBlock('heading'),
      createBlock('paragraph'),
      createBlock('heading'),
      createBlock('paragraph'),
      createBlock('heading'),
      createBlock('paragraph'),
    ],
  },
  {
    key: 'checklist-playbook',
    name: 'Checklist Playbook',
    description: 'Checklist chi tiết phù hợp bài chăm sóc theo ngày/tuần.',
    blocks: () => [createBlock('heading'), createBlock('checklist'), createBlock('checklist'), createBlock('cta')],
  },
  {
    key: 'warning-and-tips',
    name: 'Warning & Tips',
    description: 'Nhấn mạnh lỗi thường gặp và mẹo xử lý đúng.',
    blocks: () => [
      { ...createBlock('callout'), tone: 'warning' },
      createBlock('paragraph'),
      { ...createBlock('callout'), tone: 'success' },
      createBlock('paragraph'),
    ],
  },
  {
    key: 'product-spotlight',
    name: 'Product Spotlight',
    description: 'Giới thiệu sản phẩm nổi bật kết hợp ảnh, quote và CTA.',
    blocks: () => [createBlock('image_text'), createBlock('quote'), createBlock('image'), createBlock('cta')],
  },
];

export const buildTemplateBlocks = (templateKey?: string | null): TipBlock[] => {
  const tpl = TIP_TEMPLATES.find((item) => item.key === templateKey);
  if (!tpl) return [];
  return tpl.blocks().map((block) => ({ ...block, id: block.id || blockId() }));
};

export const getTemplateByKey = (templateKey?: string | null): TipTemplate | undefined => {
  return TIP_TEMPLATES.find((item) => item.key === templateKey);
};
