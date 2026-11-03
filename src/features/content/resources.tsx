import { ActiveBadge, type Resource } from '@/components/resource';
import type { Schema } from '@/lib/api';

type Faq = Schema<'AdminFaqResponse'>;
type Story = Schema<'AdminVideoStoryResponse'>;

const FAQ_TOPICS = ['GENERAL', 'KITS', 'DELIVERY', 'PAYMENT', 'PANDITS'] as const;
const STORY_KINDS = ['CUSTOMER', 'PANDIT'] as const;

type Name = (key: string) => string;

const active = <T extends { isActive: boolean }>() => ({
  key: 'isActive',
  cell: (row: T) => <ActiveBadge on={row.isActive} />,
  sortValue: (row: T) => row.isActive,
});

const order = <T extends { sortOrder: number }>() => ({
  key: 'sortOrder',
  cell: (row: T) => row.sortOrder,
  sortValue: (row: T) => row.sortOrder,
});

// `name` turns a topic into its label: resources.faqs.topics.<TOPIC>.
export function faqsResource(name: Name): Resource<Faq> {
  return {
    key: 'faqs',
    path: '/admin/faqs',
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => row.questionNe,
    matches: (row, q) =>
      `${row.questionNe} ${row.questionEn} ${row.answerNe} ${row.answerEn}`
        .toLowerCase()
        .includes(q),
    initialSort: { key: 'topic', direction: 'asc' },
    modalSize: 'lg',
    bulk: ['topic', 'questionNe', 'questionEn', 'answerNe', 'answerEn'],
    columns: [
      {
        key: 'topic',
        cell: (row) => name(`topics.${row.topic}`),
        sortValue: (row) => `${row.topic}-${String(row.sortOrder).padStart(5, '0')}`,
      },
      {
        key: 'questionNe',
        cell: (row) => (
          <>
            <div>{row.questionNe}</div>
            <div className="text-xs text-muted-foreground">{row.questionEn}</div>
          </>
        ),
        sortValue: (row) => row.questionNe,
      },
      order<Faq>(),
      active<Faq>(),
    ],
    fields: [
      {
        name: 'topic',
        kind: 'select',
        required: true,
        options: FAQ_TOPICS.map((topic) => ({ value: topic, label: name(`topics.${topic}`) })),
        defaultValue: 'GENERAL',
      },
      { name: 'sortOrder', kind: 'number' },
      { name: 'questionNe', kind: 'text', required: true, max: 300, wide: true },
      { name: 'questionEn', kind: 'text', required: true, max: 300, wide: true },
      { name: 'answerNe', kind: 'html', required: true, max: 2000 },
      { name: 'answerEn', kind: 'html', required: true, max: 2000 },
      { name: 'isActive', kind: 'switch' },
    ],
  };
}

export function storiesResource(name: Name): Resource<Story> {
  return {
    key: 'stories',
    path: '/admin/video-stories',
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.personNe} · ${row.topicNe}`,
    matches: (row, q) =>
      `${row.personNe} ${row.personEn} ${row.topicNe} ${row.topicEn} ${row.place ?? ''}`
        .toLowerCase()
        .includes(q),
    initialSort: { key: 'sortOrder', direction: 'asc' },
    modalSize: 'lg',
    columns: [
      { key: 'kind', cell: (row) => name(`kinds.${row.kind}`), sortValue: (row) => row.kind },
      {
        key: 'personNe',
        cell: (row) => (
          <>
            <div>{row.personNe}</div>
            <div className="text-xs text-muted-foreground">{row.place ?? row.personEn}</div>
          </>
        ),
        sortValue: (row) => row.personNe,
      },
      { key: 'topicNe', cell: (row) => row.topicNe, sortValue: (row) => row.topicNe },
      order<Story>(),
      active<Story>(),
    ],
    fields: [
      {
        name: 'kind',
        kind: 'select',
        required: true,
        options: STORY_KINDS.map((kind) => ({ value: kind, label: name(`kinds.${kind}`) })),
        defaultValue: 'CUSTOMER',
      },
      { name: 'sortOrder', kind: 'number' },
      { name: 'personNe', kind: 'text', required: true, max: 120 },
      { name: 'personEn', kind: 'text', required: true, max: 120 },
      { name: 'place', kind: 'text', max: 120 },
      { name: 'durationSeconds', kind: 'number' },
      { name: 'topicNe', kind: 'text', required: true, max: 200, wide: true },
      { name: 'topicEn', kind: 'text', required: true, max: 200, wide: true },
      { name: 'youtubeId', kind: 'text' },
      { name: 'imageUrl', kind: 'url', max: 2048 },
      { name: 'isActive', kind: 'switch' },
    ],
  };
}
