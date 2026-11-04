'use client';

import { useMemo } from 'react';

import { ResourceScreen, useResourceText } from '@/components/resource';

import { menusResource } from '../menus';
import { faqsResource, storiesResource } from '../resources';

export function FaqsScreen() {
  const t = useResourceText('faqs');
  const resource = useMemo(() => faqsResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}

export function StoriesScreen() {
  const t = useResourceText('stories');
  const resource = useMemo(() => storiesResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}

export function MenusScreen() {
  const t = useResourceText('menuItems');
  const resource = useMemo(() => menusResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}
